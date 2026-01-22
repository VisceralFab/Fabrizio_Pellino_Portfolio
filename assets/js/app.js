const appContainer = document.getElementById('app-container');
const terminalTitle = document.querySelector('.terminal-title');
const terminalWindow = document.querySelector('.terminal-window');

// Navigation elements
const navBack = document.getElementById('nav-back');
const navForward = document.getElementById('nav-forward');
const navRefresh = document.getElementById('nav-refresh');
const addressInput = document.getElementById('address-input');

// History management
let navigationHistory = [];
let historyIndex = -1;
let isTraversingHistory = false;

// Track visited pages to skip animations
let visitedPages = new Set();

// Image zoom overlay elements
let zoomOverlay = null;
let zoomOverlayImg = null;
let zoomOverlayLens = null;
let isLensActive = false;

// Simple Router
async function loadPage(addToHistory = true) {
    let hash = window.location.hash.replace('#', '');

    // Default to home if empty
    if (!hash) {
        hash = 'home';
    }

    // Manage history
    if (addToHistory) {
        if (isTraversingHistory) {
            // If traversing, don't modify history array, just reset flag
            isTraversingHistory = false;
        } else {
            // Remove forward history if navigating to new page
            if (historyIndex < navigationHistory.length - 1) {
                navigationHistory = navigationHistory.slice(0, historyIndex + 1);
            }
            navigationHistory.push(hash);
            historyIndex = navigationHistory.length - 1;
        }
    }

    // Determine file to load
    const fileName = hash + '.html';
    const filePath = 'assets/html/' + fileName;

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        appContainer.innerHTML = html;

        // Post-load logic
        updateUI(hash);
        updateNavButtons();

        // Check if this page has been visited before
        const isFirstVisit = !visitedPages.has(hash);
        
        // Mark page as visited
        visitedPages.add(hash);

        // Trigger animations only on first visit, but wait for loading screen to be hidden
        const startAnimations = () => {
            if (hash === 'home' && isFirstVisit) {
                setTimeout(() => animateHomeKernel(), 50);
            } else if (hash === 'home' && !isFirstVisit) {
                // Show home content instantly without animation
                showHomeInstant();
            } else if (hash === 'about' && isFirstVisit) {
                setTimeout(() => animateAbout(), 100);
            } else if (hash === 'about' && !isFirstVisit) {
                // Show about content instantly without animation
                showAboutInstant();
            }
        };

        // If loading screen is already hidden, start animations immediately
        if (window.loadingScreenHidden) {
            startAnimations();
        } else {
            // Wait for loading screen to be hidden before starting animations
            window.addEventListener('loadingScreenHidden', startAnimations, { once: true });
        }

        // Initialize interactive behaviors for the newly injected content
        initProjectImageZoom();
        initMediaSlider();
    } catch (error) {
        console.error('Failed to load page:', error);
        appContainer.innerHTML = `<p style="color: #ff5f56; font-family: 'Fira Code', monospace;">Error loading module: ${hash}. System halted.</p>`;
    }
}

function updateUI(sectionName) {
    // Determine section name for title (pretty printing)
    let displaySection = sectionName;
    if (sectionName.startsWith('project-')) {
        displaySection = sectionName.replace('project-', 'projects/');
    }

    // Update terminal title
    if (sectionName === 'home') {
        terminalTitle.innerHTML = 'Fabrizio_Pellino@portfolio:~/home';
    } else {
        terminalTitle.innerHTML = 'Fabrizio_Pellino@portfolio:~/' + displaySection;
    }

    // Update address bar
    addressInput.value = '~/' + displaySection;

    // Toggle internal scrolling for projects (except Fede Link which is single page)
    if ((sectionName.startsWith('project') && sectionName !== 'project-fede-link') || sectionName === 'projects') {
        terminalWindow.classList.add('scroll-mode');
        terminalWindow.classList.remove('no-scroll');
    } else {
        terminalWindow.classList.remove('scroll-mode');
        terminalWindow.classList.add('no-scroll');
    }
}

function updateNavButtons() {
    navBack.disabled = historyIndex <= 0;
    navForward.disabled = historyIndex >= navigationHistory.length - 1;
}

// Navigation event handlers
navBack.addEventListener('click', () => {
    if (historyIndex > 0) {
        isTraversingHistory = true;
        historyIndex--;
        const targetHash = navigationHistory[historyIndex];
        window.location.hash = targetHash;
        // loadPage is triggered by hashchange
    }
});

navForward.addEventListener('click', () => {
    if (historyIndex < navigationHistory.length - 1) {
        isTraversingHistory = true;
        historyIndex++;
        const targetHash = navigationHistory[historyIndex];
        window.location.hash = targetHash;
        // loadPage is triggered by hashchange
    }
});

navRefresh.addEventListener('click', () => {
    loadPage(false);
});

// Address bar interaction
addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let inputVal = addressInput.value.trim();

        // Remove '~/' prefix if present
        if (inputVal.startsWith('~/')) {
            inputVal = inputVal.substring(2);
        }

        // Handle 'projects/' prefix
        if (inputVal.startsWith('projects/')) {
            inputVal = inputVal.replace('projects/', 'project-');
        }

        // Handle empty or root
        if (!inputVal || inputVal === 'home') {
            window.location.hash = 'home';
        } else {
            window.location.hash = inputVal;
        }

        // Blur to show completion
        addressInput.blur();
    }
});

window.addEventListener('hashchange', () => loadPage(true));

document.addEventListener('DOMContentLoaded', () => {
    // Reset to home on page load
    window.location.hash = '#home';
    loadPage(true);
});

// ----- Image Zoom ("At a Glance") -----

function ensureZoomOverlay() {
    if (zoomOverlay) return;

    zoomOverlay = document.createElement('div');
    zoomOverlay.className = 'image-zoom-overlay';
    zoomOverlay.innerHTML = `
        <div class="image-zoom-content">
            <img class="image-zoom-img" alt="Zoomed project image">
            <div class="image-zoom-lens"></div>
            <div class="image-zoom-hint">
                Hold left click to inspect details. Press Esc or click outside to close.
            </div>
        </div>
    `;

    document.body.appendChild(zoomOverlay);

    zoomOverlayImg = zoomOverlay.querySelector('.image-zoom-img');
    zoomOverlayLens = zoomOverlay.querySelector('.image-zoom-lens');

    // Close when clicking the dim background
    zoomOverlay.addEventListener('click', (e) => {
        if (e.target === zoomOverlay) {
            hideZoomOverlay();
        }
    });

    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && zoomOverlay.classList.contains('is-visible')) {
            hideZoomOverlay();
        }
    });

    // Lens interactions - zoom on mousemove, lens on mousedown
    zoomOverlayImg.addEventListener('mousemove', (e) => {
        updateLensPosition(e);
    });

    zoomOverlayImg.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isLensActive = true;
        zoomOverlayLens.classList.add('is-active');
        zoomOverlayImg.classList.add('lens-active');
    });

    window.addEventListener('mouseup', () => {
        isLensActive = false;
        zoomOverlayLens.classList.remove('is-active');
        zoomOverlayImg.classList.remove('lens-active');
    });


    zoomOverlayImg.addEventListener('mouseleave', () => {
        if (!zoomOverlay) return;
        zoomOverlayImg.classList.remove('zoom-active');
        zoomOverlayLens.classList.remove('is-active');
        isLensActive = false;
    });
}

function showZoomOverlayFromImage(sourceImg) {
    ensureZoomOverlay();
    if (!zoomOverlay || !zoomOverlayImg) return;

    zoomOverlayImg.src = sourceImg.src;
    zoomOverlayImg.classList.remove('zoom-active');
    zoomOverlay.classList.add('is-visible');
}

function hideZoomOverlay() {
    if (!zoomOverlay) return;
    zoomOverlay.classList.remove('is-visible');
    if (zoomOverlayImg) {
        zoomOverlayImg.classList.remove('zoom-active');
    }
    if (zoomOverlayLens) {
        zoomOverlayLens.classList.remove('is-active');
    }
    isLensActive = false;
}

function updateLensPosition(event) {
    if (!zoomOverlayImg || !zoomOverlayLens || !isLensActive) return;

    const img = zoomOverlayImg;
    const rect = img.getBoundingClientRect();

    // Mouse position relative to image
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    // Clamp
    x = Math.max(0, Math.min(rect.width, x));
    y = Math.max(0, Math.min(rect.height, y));

    // Move lens
    zoomOverlayLens.style.left = `${event.clientX}px`;
    zoomOverlayLens.style.top = `${event.clientY}px`;

    // Scale ratios
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    // Real pixel position in original image
    const realX = x * scaleX;
    const realY = y * scaleY;

    const zoom = 2.4; // magnification level

    // Apply lens background
    zoomOverlayLens.style.backgroundImage = `url(${img.src})`;
    zoomOverlayLens.style.backgroundSize = `
        ${img.naturalWidth * zoom}px
        ${img.naturalHeight * zoom}px
    `;

    const lensSize = zoomOverlayLens.offsetWidth / 2;

    zoomOverlayLens.style.backgroundPosition = `
        ${-(realX * zoom) + lensSize}px
        ${-(realY * zoom) + lensSize}px
    `;
}



function initProjectImageZoom() {
    if (!appContainer) return;

    const images = appContainer.querySelectorAll('.project-image img');
    if (!images.length) return;

    ensureZoomOverlay();

    images.forEach((img) => {
        if (img.dataset.zoomBound === 'true') return;
        img.dataset.zoomBound = 'true';

        img.style.cursor = 'zoom-in';

        img.addEventListener('click', (e) => {
            // Direct click opens "At a Glance" behavior (previously required Ctrl + Click)
            e.preventDefault();
            showZoomOverlayFromImage(img);
        });
    });
}
function initMediaSlider() {
    const sliders = document.querySelectorAll('.project-media-slider');
    
    sliders.forEach(slider => {
        const track = slider.querySelector('.project-media-track');
        const slides = slider.querySelectorAll('.project-media-slide');
        const prevBtn = slider.querySelector('.media-arrow-prev');
        const nextBtn = slider.querySelector('.media-arrow-next');
        const indicators = slider.querySelectorAll('.media-indicator');
        
        if (!track || slides.length === 0) return;
        
        let currentSlide = 0;
        const totalSlides = slides.length;
        
        function updateSlider() {
            // Move the track
            const translateValue = -currentSlide * 100;
            track.style.transform = `translateX(${translateValue}%)`;
            
            console.log(`Slider update: currentSlide=${currentSlide}, translateX=${translateValue}%`);
            
            // Update indicators
            indicators.forEach((indicator, index) => {
                if (index === currentSlide) {
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                }
            });
            
            // Update slider data attributes for arrow hiding
            slider.setAttribute('data-slide', currentSlide);
            if (currentSlide === totalSlides - 1) {
                slider.setAttribute('data-last-slide', 'true');
            } else {
                slider.removeAttribute('data-last-slide');
            }
            
            // Pause all videos except the current one
            slides.forEach((slide, index) => {
                const video = slide.querySelector('video');
                if (video) {
                    if (index === currentSlide) {
                        // Current slide - don't autoplay, let user control it
                    } else {
                        // Other slides - pause them
                        video.pause();
                    }
                }
            });
        }
        
        function goToSlide(index) {
            if (index < 0 || index >= totalSlides) return;
            currentSlide = index;
            updateSlider();
        }
        
        function nextSlide() {
            if (currentSlide < totalSlides - 1) {
                currentSlide++;
                updateSlider();
            }
        }
        
        function prevSlide() {
            if (currentSlide > 0) {
                currentSlide--;
                updateSlider();
            }
        }
        
        // Event listeners
        if (prevBtn) {
            prevBtn.addEventListener('click', prevSlide);
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', nextSlide);
        }
        
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                goToSlide(index);
            });
        });
        
        // Add video play/pause listeners for background music control
        slides.forEach((slide) => {
            const video = slide.querySelector('video');
            if (video) {
                video.addEventListener('play', () => {
                    const audio = document.getElementById('siteAudio');
                    if (audio) {
                        audio.pause();
                        // Update music toggle icon to play
                        const musicToggle = document.querySelector('.music-toggle i');
                        if (musicToggle) {
                            musicToggle.className = 'fa-solid fa-play';
                        }
                    }
                });
                
                video.addEventListener('pause', () => {
                    const audio = document.getElementById('siteAudio');
                    if (audio) {
                        audio.play().catch(err => {
                            console.log('Audio autoplay prevented:', err);
                        });
                        // Update music toggle icon to pause
                        const musicToggle = document.querySelector('.music-toggle i');
                        if (musicToggle) {
                            musicToggle.className = 'fa-solid fa-pause';
                        }
                    }
                });
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        });
        
        // Initialize
        updateSlider();
    });
}

// Media slider is initialized in loadPage() after content is loaded

// Typewriter Utility
function typeWriter(element, text, speed = 20, callback) {
    let i = 0;
    element.textContent = '';
    element.classList.add('typing-cursor');

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            element.classList.remove('typing-cursor');
            if (callback) callback();
        }
    }
    type();
}

// Linux Kernel Boot Style Animation
function animateHomeKernel() {
    const nameTextElement = document.querySelector('.name-text');
    const loadingLines = document.querySelectorAll('.loading-line');
    const bioSection = document.querySelector('.bio-section');
    const descriptionElement = document.querySelector('.description-line .description');
    const navSection = document.querySelector('.navigation-section');

    if (!nameTextElement) return;

    // Clear any existing text to prevent duplication
    nameTextElement.textContent = '';

    // Step 1: Type name (instant typewriter effect)
    const fullName = 'Fabrizio Pellino';
    let nameIndex = 0;

    function typeName() {
        if (nameIndex < fullName.length) {
            nameTextElement.textContent += fullName.charAt(nameIndex);
            nameIndex++;
            setTimeout(typeName, 30);
        } else {
            // Step 2: After name, wait 400ms then show loading lines
            setTimeout(processLoadingLines, 400);
        }
    }

    function processLoadingLines() {
        let lineDelay = 0;
        const lineInterval = 600; // Time between each line starting

        loadingLines.forEach((line) => {
            const statusOk = line.querySelector('.status-ok');

            // 1. Show the line (text visible, status hidden)
            setTimeout(() => {
                line.style.opacity = '1';

                // 2. Show [ OK ] shortly after text appears
                setTimeout(() => {
                    if (statusOk) statusOk.style.opacity = '1';
                }, 400);

            }, lineDelay);

            lineDelay += lineInterval;
        });

        // After all loading lines are done (approx), show bio section
        setTimeout(showBioSection, lineDelay + 400);
    }

    function showBioSection() {
        if (bioSection) {
            bioSection.style.opacity = '1';
        }

        if (descriptionElement) {
            // Hardcoded typewriter logic for the specific text to handle the <br>
            // " UI-UX Designer with a background" + <br> + "of product, usability and visual."
            const line1 = " UI-UX Designer with a background";
            const line2 = "of product, usability and visual.";

            descriptionElement.innerHTML = ''; // Clear text
            descriptionElement.classList.add('typing-cursor');

            let i = 0;
            function typeLine1() {
                if (i < line1.length) {
                    descriptionElement.innerHTML += line1.charAt(i);
                    i++;
                    setTimeout(typeLine1, 20);
                } else {
                    // Line 1 done, add BR
                    descriptionElement.innerHTML += '<br>';
                    // Start Line 2
                    setTimeout(() => {
                        let j = 0;
                        function typeLine2() {
                            if (j < line2.length) {
                                descriptionElement.innerHTML += line2.charAt(j);
                                j++;
                                setTimeout(typeLine2, 20);
                            } else {
                                descriptionElement.classList.remove('typing-cursor');
                                // Show navigation after typing is done
                                setTimeout(showNav, 200);
                            }
                        }
                        typeLine2();
                    }, 100);
                }
            }
            typeLine1();
        } else {
            // Fallback if element missing
            setTimeout(showNav, 300);
        }
    }

    function showNav() {
        if (navSection) {
            navSection.style.opacity = '1';
        }
    }

    // Start the animation
    typeName();
}

// Show home page instantly without animations (for repeat visits)
function showHomeInstant() {
    const nameTextElement = document.querySelector('.name-text');
    const loadingLines = document.querySelectorAll('.loading-line');
    const bioSection = document.querySelector('.bio-section');
    const descriptionElement = document.querySelector('.description-line .description');
    const navSection = document.querySelector('.navigation-section');

    if (nameTextElement) {
        nameTextElement.textContent = 'Fabrizio Pellino';
    }

    loadingLines.forEach((line) => {
        line.style.opacity = '1';
        const statusOk = line.querySelector('.status-ok');
        if (statusOk) statusOk.style.opacity = '1';
    });

    if (bioSection) {
        bioSection.style.opacity = '1';
    }

    if (descriptionElement) {
        descriptionElement.innerHTML = ' UI-UX Designer with a background<br>of product, usability and visual.';
    }

    if (navSection) {
        navSection.style.opacity = '1';
    }
}

// About Me Animation - SPED UP VERSION
function animateAbout() {
    // 1. Photo/Rect fade in
    const photo = document.querySelector('.profile-photo');
    if (photo) photo.classList.add('fade-in-visible');

    // 2. UID types first
    const uidElement = document.querySelector('.profile-name');
    if (!uidElement) return;

    uidElement.innerHTML = '';
    uidElement.style.opacity = '1';

    const labelText = "UID: ";
    const nameText = "Fabrizio Pellino";

    let step = 0;
    uidElement.classList.add('typing-cursor');

    function typeUid() {
        if (step < labelText.length) {
            // Typing label
            if (step === 0) {
                const span = document.createElement('span');
                span.className = 'uid-label';
                uidElement.appendChild(span);
            }
            uidElement.querySelector('.uid-label').textContent += labelText.charAt(step);
            step++;
            setTimeout(typeUid, 15); // Sped up from 30ms
        } else if (step < labelText.length + nameText.length) {
            // Typing name
            const charIndex = step - labelText.length;
            if (charIndex === 0) {
                const textNode = document.createTextNode('');
                uidElement.appendChild(textNode);
            }
            uidElement.lastChild.textContent += nameText.charAt(charIndex);
            step++;
            setTimeout(typeUid, 15); // Sped up from 30ms
        } else {
            uidElement.classList.remove('typing-cursor');
            // Phase 3: Simultaneous typing of sub-text
            animateAboutDetails();
        }
    }

    // Start UID typing after a smaller delay
    setTimeout(typeUid, 300); // Reduced from 500ms
}

function animateAboutDetails() {
    // Phase 3: Details (Class, Degree) and Contact (Speaks, Email, Phone) simultaneous
    const elementsToType = [
        ...document.querySelectorAll('.profile-detail'),
        ...document.querySelectorAll('.contact-item')
    ];

    elementsToType.forEach(el => {
        const labelSpan = el.querySelector('span');
        const labelText = labelSpan ? labelSpan.textContent : '';
        
        // Get all text content after the span element
        let contentText = '';
        for (let node of el.childNodes) {
            if (node !== labelSpan && node.nodeType === Node.TEXT_NODE) {
                contentText += node.textContent;
            }
        }
        contentText = contentText.trim();

        el.innerHTML = '';
        el.style.opacity = '1';

        const newSpan = document.createElement('span');
        newSpan.className = labelSpan ? labelSpan.className : '';
        newSpan.textContent = '';
        el.appendChild(newSpan);

        const newText = document.createTextNode('');
        el.appendChild(newText);

        let i = 0;

        function typeChar() {
            if (i < labelText.length) {
                newSpan.textContent += labelText.charAt(i);
                i++;
                setTimeout(typeChar, 5);
            } else {
                if (i === labelText.length) {
                    newText.textContent += ' ';
                    i++;
                    setTimeout(typeChar, 5);
                } else {
                    const contentIndex = i - labelText.length - 1;
                    if (contentIndex < contentText.length) {
                        newText.textContent += contentText.charAt(contentIndex);
                        i++;
                        setTimeout(typeChar, 5);
                    }
                }
            }
        }

        typeChar();
    });

    // Reduced wait time before info sections
    setTimeout(animateInfoSections, 800); // Reduced from 1500ms
}

function animateInfoSections() {
    // Phase 4 & 5: Info sections - MUCH FASTER
    const contentDiv = document.querySelector('.about-text');
    if (!contentDiv) return;

    const children = Array.from(contentDiv.children);
    let index = 0;

    function processNext() {
        if (index >= children.length) {
            setTimeout(animateSkillsPanel, 200); // Reduced from 500ms
            return;
        }

        const el = children[index];
        const text = el.textContent.trim();

        el.textContent = '';
        el.style.opacity = '1';
        el.classList.add('typing-cursor');

        let charIdx = 0;
        function type() {
            if (charIdx < text.length) {
                el.textContent += text.charAt(charIdx);
                charIdx++;
                setTimeout(type, 2); // MUCH FASTER - was 5ms, now 2ms
            } else {
                el.classList.remove('typing-cursor');
                index++;
                // Start next immediately - no delay
                processNext();
            }
        }
        type();
    }

    processNext();
}

function animateSkillsPanel() {
    // Phase 6: Skills layout fade in
    const panel = document.querySelector('.skills-panel');
    if (!panel) return;

    panel.classList.add('fade-in-visible');

    // Phase 7: Icons stagger - faster
    const icons = panel.querySelectorAll('.skill-item');
    icons.forEach((icon, i) => {
        setTimeout(() => {
            icon.classList.add('fade-in-visible');
        }, i * 80); // Faster - reduced from 150ms
    });
}

// Show about page instantly without animations (for repeat visits)
function showAboutInstant() {
    // Show photo
    const photo = document.querySelector('.profile-photo');
    if (photo) photo.classList.add('fade-in-visible');

    // Show UID instantly
    const uidElement = document.querySelector('.profile-name');
    if (uidElement) {
        uidElement.style.opacity = '1';
        // Content is already in HTML, just make sure it's visible
    }

    // Show all details and contact info instantly
    const elementsToShow = [
        ...document.querySelectorAll('.profile-detail'),
        ...document.querySelectorAll('.contact-item')
    ];
    elementsToShow.forEach(el => {
        el.style.opacity = '1';
    });

    // Show all info sections instantly
    const contentDiv = document.querySelector('.about-text');
    if (contentDiv) {
        const children = Array.from(contentDiv.children);
        children.forEach(el => {
            el.style.opacity = '1';
        });
    }

    // Show skills panel and icons instantly
    const panel = document.querySelector('.skills-panel');
    if (panel) {
        panel.classList.add('fade-in-visible');
        const icons = panel.querySelectorAll('.skill-item');
        icons.forEach(icon => {
            icon.classList.add('fade-in-visible');
        });
    }
// Media Slider Functionality
}