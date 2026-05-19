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

let isTypingHome = false;

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
            if (hash === 'home') {
                const terminalWin = document.querySelector('.terminal-window');
                // Only run home animation if terminal is already visible!
                // If not visible yet, enterPortfolio() will trigger it!
                if (terminalWin && terminalWin.classList.contains('is-visible')) {
                    if (isFirstVisit) {
                        setTimeout(() => animateHomeKernel(), 50);
                    } else {
                        showHomeInstant();
                    }
                } else {
                    // Pre-fill elements to be ready, but don't animate yet
                    const nameTextElement = document.querySelector('.name-text');
                    if (nameTextElement) {
                        nameTextElement.textContent = '';
                    }
                }
            } else if (hash === 'about' && isFirstVisit) {
                setTimeout(() => animateAbout(), 100);
            } else if (hash === 'about' && !isFirstVisit) {
                // Show about content instantly without animation
                showAboutInstant();
            }
        };
        // Start animations immediately
        startAnimations();

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

function enterPortfolio() {
    const landingWrapper = document.getElementById('landing-wrapper');
    const landingCenter = document.querySelector('.landing-center');
    const globeTarget = document.getElementById('globe-target');
    const landingHint = document.querySelector('.landing-hint');
    const terminalWin = document.querySelector('.terminal-window');
    const musicCtrl = document.getElementById('musicControl');

    if (landingCenter) landingCenter.classList.add('fade-out');
    if (globeTarget) globeTarget.classList.add('fade-out');
    if (landingHint) landingHint.classList.add('fade-out');
    if (musicCtrl) musicCtrl.classList.add('is-visible');

    if (landingWrapper) {
        setTimeout(() => {
            landingWrapper.style.pointerEvents = 'none';
        }, 800);
    }

    if (terminalWin) {
        terminalWin.classList.add('is-visible');
    }

    // Trigger home typewriter animation on entrance
    animateHomeKernel();

    // Play site audio
    const audio = document.getElementById('siteAudio');
    if (audio) {
        audio.play().then(() => {
            const toggle = document.getElementById('musicToggle');
            if (toggle) {
                toggle.setAttribute('aria-pressed', 'true');
                const icon = toggle.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-pause';
            }
        }).catch(err => {
            console.log('Autoplay pending user action:', err);
        });
    }
}

function exitPortfolio() {
    const landingWrapper = document.getElementById('landing-wrapper');
    const landingCenter = document.querySelector('.landing-center');
    const globeTarget = document.getElementById('globe-target');
    const landingHint = document.querySelector('.landing-hint');
    const terminalWin = document.querySelector('.terminal-window');
    const musicCtrl = document.getElementById('musicControl');

    if (landingCenter) landingCenter.classList.remove('fade-out');
    if (globeTarget) globeTarget.classList.remove('fade-out');
    if (landingHint) landingHint.classList.remove('fade-out');
    if (musicCtrl) musicCtrl.classList.remove('is-visible');

    if (landingWrapper) {
        landingWrapper.style.pointerEvents = 'auto';
    }

    if (terminalWin) {
        terminalWin.classList.remove('is-visible');
    }

    // Reset typewriter state so it can animate next time
    isTypingHome = false;
    const nameTextElement = document.querySelector('.name-text');
    if (nameTextElement) {
        nameTextElement.textContent = '';
    }
    const bioSection = document.querySelector('.bio-section');
    const navSection = document.querySelector('.navigation-section');
    if (bioSection) bioSection.style.opacity = '0';
    if (navSection) navSection.style.opacity = '0';
}

document.addEventListener('DOMContentLoaded', () => {
    // Reset to home on page load
    window.location.hash = '#home';
    loadPage(true);

    // Click anywhere on landing wrapper to continue (exactly like OutOfTune)
    const landingWrapper = document.getElementById('landing-wrapper');
    if (landingWrapper) {
        landingWrapper.addEventListener('click', enterPortfolio);
    }

    // Continue button text hint click listener
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent duplicate trigger from bubbling
            enterPortfolio();
        });
    }

    // Close button interaction
    const closeBtn = document.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', exitPortfolio);
    }
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
                let wasMusicPlaying = false; // Track if music was playing before video started
                
                video.addEventListener('play', () => {
                    const audio = document.getElementById('siteAudio');
                    if (audio) {
                        wasMusicPlaying = !audio.paused; // Store music state before pausing
                        if (wasMusicPlaying) {
                            audio.pause();
                            // Update music toggle icon to play
                            const musicToggle = document.querySelector('.music-toggle i');
                            if (musicToggle) {
                                musicToggle.className = 'fa-solid fa-play';
                            }
                        }
                    }
                });
                
                video.addEventListener('pause', () => {
                    const audio = document.getElementById('siteAudio');
                    if (audio && wasMusicPlaying) { // Only resume if music was playing before
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
    if (isTypingHome) return; // Guard against concurrent animations

    const nameTextElement = document.querySelector('.name-text');
    const bioSection = document.querySelector('.bio-section');
    const navSection = document.querySelector('.navigation-section');

    if (nameTextElement) {
        isTypingHome = true;
        nameTextElement.textContent = '';
        const fullName = 'Fabrizio Pellino';
        let nameIndex = 0;

        function typeName() {
            if (nameIndex < fullName.length) {
                nameTextElement.textContent += fullName.charAt(nameIndex);
                nameIndex++;
                setTimeout(typeName, 65);
            } else {
                isTypingHome = false;
                if (bioSection) {
                    bioSection.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    bioSection.style.opacity = '1';
                }
                if (navSection) {
                    navSection.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    navSection.style.opacity = '1';
                }
            }
        }

        setTimeout(typeName, 300);
    } else {
        if (bioSection) bioSection.style.opacity = '1';
        if (navSection) navSection.style.opacity = '1';
    }
}

// Show home page instantly without animations (for repeat visits)
function showHomeInstant() {
    isTypingHome = false;
    const nameTextElement = document.querySelector('.name-text');
    const bioSection = document.querySelector('.bio-section');
    const navSection = document.querySelector('.navigation-section');

    if (nameTextElement) {
        nameTextElement.textContent = 'Fabrizio Pellino';
    }
    if (bioSection) bioSection.style.opacity = '1';
    if (navSection) navSection.style.opacity = '1';
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
    // Phase 3: Details and Contact fade in with staggered elegance
    const elements = [
        ...document.querySelectorAll('.profile-detail'),
        ...document.querySelectorAll('.contact-item')
    ];

    elements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('fade-in-visible');
            el.style.opacity = '1';
        }, index * 80); // Fast, sleek stagger
    });

    // Stagger transition to info sections
    setTimeout(animateInfoSections, elements.length * 80 + 150);
}

function animateInfoSections() {
    // Phase 4 & 5: Biography text paragraphs fade in with staggered ease
    const contentDiv = document.querySelector('.about-text');
    if (!contentDiv) {
        animateSkillsPanel();
        return;
    }

    const children = Array.from(contentDiv.children);
    children.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('fade-in-visible');
            el.style.opacity = '1';
        }, index * 100); // Super clean staggered fade-in
    });

    // Start skills panel fade-in after paragraphs begin appearing
    setTimeout(animateSkillsPanel, children.length * 100 + 150);
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