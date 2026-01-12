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
                Ctrl + Click on any project image to open. Hold left click to inspect details. Press Esc or click outside to close.
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
            // Use Ctrl + Click to mimic Zen Browser's "At a Glance" behavior
            if (!e.ctrlKey) return;
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
function animateHomeKernel() {
    const nameTextElement = document.querySelector('.name-text');
    const loadingLines = document.querySelectorAll('.loading-line');
    const bioSection = document.querySelector('.bio-section');
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
            setTimeout(showLoadingLines, 400);
        }
    }

    function showLoadingLines() {
        // Show each loading line with 400ms delay between them (NO typewriter animation)
        loadingLines.forEach((line, index) => {
            setTimeout(() => {
                line.style.opacity = '1';
            }, index * 400);
        });

        // After all loading lines, show bio section
        setTimeout(showBioSection, loadingLines.length * 400 + 400);
    }

    function showBioSection() {
        if (bioSection) {
            bioSection.style.opacity = '1';
        }

        // Show navigation section shortly after
        setTimeout(() => {
            if (navSection) {
                navSection.style.opacity = '1';
            }
        }, 300);
    }

    // Start the animation
    typeName();
}