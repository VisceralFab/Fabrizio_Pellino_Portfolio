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

// Home Animation Sequence
function animateHome() {
    const nameElement = document.querySelector('.terminal-name');
    const loadingLines = document.querySelectorAll('.loading-line');
    const bioText = document.querySelector('.bio-text');

    if (!nameElement || !bioText) return;

    // 1. Prepare elements (hide content initially)

    // Handle Name: Keep the prompt, type the rest
    const namePrompt = nameElement.querySelector('.cursor-prompt');
    const fullNametext = nameElement.childNodes[nameElement.childNodes.length - 1].textContent.trim();
    nameElement.childNodes[nameElement.childNodes.length - 1].textContent = '';

    // Hide the prompt cursor while typing the name
    if (namePrompt) namePrompt.classList.add('cursor-hidden');

    // Handle Loading Lines
    loadingLines.forEach(line => {
        line.style.opacity = '0';
    });

    // Handle Bio
    const bioPrompt = bioText.querySelector('.root-prompt');
    let fullBioText = '';
    if (bioText.lastChild && bioText.lastChild.nodeType === 3) {
        fullBioText = bioText.lastChild.textContent.trim();
        bioText.lastChild.textContent = '';
    }

    // 2. Start Animations Concurrently

    // Animation A: Type Name
    const nameSpan = document.createElement('span');
    nameElement.appendChild(nameSpan);
    typeWriter(nameSpan, fullNametext, 30, () => {
        // Optional: restore prompt cursor or keep it on name?
        // We let the cursor disappear as focus moves to other lines
    });

    // Animation B: Reveal Loading Lines (Staggered)
    loadingLines.forEach((line, index) => {
        setTimeout(() => {
            line.style.opacity = '1';
            const textSpan = line.querySelector('.loading-text');
            if (textSpan) {
                const originalText = textSpan.textContent;
                typeWriter(textSpan, originalText, 10);
            }
        }, 200 + (index * 400));
    });

    // Animation C: Type Bio (Starts after a short delay)
    setTimeout(() => {
        const bioContentSpan = document.createElement('span');
        bioText.appendChild(bioContentSpan);
        typeWriter(bioContentSpan, fullBioText, 15);
    }, 800);
}

// Update loadPage to trigger animation
const originalLoadPage = loadPage;
loadPage = async function (addToHistory = true) {
    await originalLoadPage(addToHistory);
    let hash = window.location.hash.replace('#', '');
    if (!hash) hash = 'home';

    if (hash === 'home') {
        animateHome();
    }
};
