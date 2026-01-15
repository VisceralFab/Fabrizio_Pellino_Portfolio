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

        // Trigger home animation if on home page
        if (hash === 'home') {
            setTimeout(() => animateHomeKernel(), 50);
        } else if (hash === 'about') {
            setTimeout(() => animateAbout(), 100);
        }

        // Initialize interactive behaviors for the newly injected content
        initProjectImageZoom();
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
    } else {
        terminalWindow.classList.remove('scroll-mode');
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
document.addEventListener('DOMContentLoaded', () => loadPage(true));

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
// Linux Kernel Boot Style Animation
function animateHomeKernel() {
    const nameTextElement = document.querySelector('.name-text');
    const loadingLines = document.querySelectorAll('.loading-line');
    const bioSection = document.querySelector('.bio-section');
    const descriptionElement = document.querySelector('.description-line .description');
    const navSection = document.querySelector('.navigation-section');

    if (!nameTextElement) return;

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

// About Me Animation
function animateAbout() {
    // 1. Photo/Rect fade in
    const photo = document.querySelector('.profile-photo');
    if (photo) photo.classList.add('fade-in-visible');

    // 2. UID types first
    const uidElement = document.querySelector('.profile-name');
    if (!uidElement) return;

    // Store original text
    const fullUidText = uidElement.innerText; // "UID: Fabrizio Pellino"
    // But we need to keep the span structure? 
    // The user wants "UID Fabrizio Pellino" animated. 
    // Structure: <span class="uid-label">UID:</span> Fabrizio Pellino
    // We can type the whole text content, or preserve HTML?
    // Simplest approach: Type text content, then restore innerHTML or just keep text styled if possible.
    // Given the span, we should reconstruct it or type into it. 
    // Let's create a Helper to type into a container while preserving/creating structure if needed.
    // Or simpler: Clear content, type "UID: " (wrap in span), then type "Fabrizio Pellino".

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
            setTimeout(typeUid, 30);
        } else if (step < labelText.length + nameText.length) {
            // Typing name
            const charIndex = step - labelText.length;
            if (charIndex === 0) {
                const textNode = document.createTextNode('');
                uidElement.appendChild(textNode);
            }
            uidElement.lastChild.textContent += nameText.charAt(charIndex);
            step++;
            setTimeout(typeUid, 30);
        } else {
            uidElement.classList.remove('typing-cursor');
            // Phase 3: Simultaneous typing of sub-text
            animateAboutDetails();
        }
    }

    // Start UID typing after a small delay for photo
    setTimeout(typeUid, 500);
}

function animateAboutDetails() {
    // Phase 3: Details (Class, Degree) and Contact (Speaks, Email, Phone) simultaneous
    // Select all these elements
    const elementsToType = [
        ...document.querySelectorAll('.profile-detail'), // Class and Degree
        ...document.querySelectorAll('.contact-item')    // Speaks, Email, Phone
    ];

    elementsToType.forEach(el => {
        // We need to preserve the <span> labels (Class:, Degree:, Speaks: etc)
        // Similar logic to UID: Extract label and content, clear, then re-type.

        const labelSpan = el.querySelector('span');
        const labelText = labelSpan ? labelSpan.textContent : '';
        const fullText = el.textContent; // "Class: Designer"
        const contentText = fullText.substring(labelText.length).trim(); // "Designer" assuming simple structure
        // Note: textContent strips HTML tags. 
        // Let's grab the actual text node after the span.

        // Reset element
        el.innerHTML = '';
        el.style.opacity = '1'; // Ensure visible

        // Create label span
        const newSpan = document.createElement('span');
        newSpan.className = labelSpan ? labelSpan.className : '';
        newSpan.textContent = ''; // Start empty
        el.appendChild(newSpan);

        // Create text node for content
        const newText = document.createTextNode('');
        el.appendChild(newText);

        // Typewriter logic for this element
        let i = 0;
        const totalLen = labelText.length + (contentText ? contentText.length : 0) + 1; // +1 for space

        // We will type the Label first, then the content

        function typeChar() {
            // Logic to type label then content
            // Simple approach: Construct the full string and append char to correct node

            // Re-constructing targets:
            // 1. Label
            // 2. Space? (Usually "Class: Designer" has " " in text node)
            // 3. Content

            // Let's simplify: Type labelText into span, then type contentText into textNode.

            if (i < labelText.length) {
                newSpan.textContent += labelText.charAt(i);
                i++;
                setTimeout(typeChar, 10);
            } else {
                // Space logic
                if (i === labelText.length) {
                    newText.textContent += ' '; // Add space
                    i++;
                    setTimeout(typeChar, 10);
                } else {
                    const contentIndex = i - labelText.length - 1;
                    if (contentIndex < contentText.length) {
                        newText.textContent += contentText.charAt(contentIndex);
                        i++;
                        setTimeout(typeChar, 10); // Faster typing for details
                    } else {
                        // Done with this element
                    }
                }
            }
        }

        typeChar();
    });

    // Trigger Phase 4 (Info sections) shortly after starting details
    // "Info_about_me" and description appear after details start? 
    // User said: "Per quanto riguarda info_about_me ... voglio che sia animata in typing dopo le animazioni descritte in precedenza."
    // So we wait for Phase 3 to finish? Or start it sequentially?
    // "le scritte sotto siano animate in simultanea"
    // "info_about_me ... dopo"

    // Estimate time for longest detail ~ 50 chars * 10ms = 500ms. Let's wait 800ms.
    setTimeout(animateInfoSections, 1500);
}

function animateInfoSections() {
    // Phase 4: info_about_me -> paragraphs
    // Phase 5: info_skills -> paragraph

    const contentDiv = document.querySelector('.about-text');
    if (!contentDiv) return;

    const children = Array.from(contentDiv.children); // h3, p, p, p, h3, p...

    // We need to animate them sequentially.
    let index = 0;

    function processNext() {
        if (index >= children.length) {
            // Done with info text.
            // Phase 6: Skills Panel fade in
            setTimeout(animateSkillsPanel, 500);
            return;
        }

        const el = children[index];
        const text = el.textContent.trim();

        // Reset element
        el.textContent = '';
        el.style.opacity = '1';
        el.classList.add('typing-cursor');

        let charIdx = 0;
        function type() {
            if (charIdx < text.length) {
                el.textContent += text.charAt(charIdx);
                charIdx++;
                setTimeout(type, 5); // Fast typing for long text
            } else {
                el.classList.remove('typing-cursor');
                index++;
                processNext(); // Start next paragraph immediately after
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

    // Phase 7: Icons stagger 1-2-3
    const icons = panel.querySelectorAll('.skill-item');
    icons.forEach((icon, i) => {
        setTimeout(() => {
            icon.classList.add('fade-in-visible');
        }, i * 150); // 150ms delay between each
    });
}