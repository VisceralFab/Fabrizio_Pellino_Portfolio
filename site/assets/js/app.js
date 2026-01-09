const appContainer = document.getElementById('app-container');
const terminalTitle = document.querySelector('.terminal-title');
const terminalWindow = document.querySelector('.terminal-window');

// Navigation elements
const navBack = document.getElementById('nav-back');
const navForward = document.getElementById('nav-forward');
const navRefresh = document.getElementById('nav-refresh');
const breadcrumbHome = document.getElementById('breadcrumb-home');
const breadcrumbPath = document.getElementById('breadcrumb-path');

// History management
let navigationHistory = [];
let historyIndex = -1;

// Simple Router
async function loadPage(addToHistory = true) {
    let hash = window.location.hash.replace('#', '');

    // Default to home if empty
    if (!hash) {
        hash = 'home';
    }

    // Manage history
    if (addToHistory) {
        // Remove forward history if navigating to new page
        if (historyIndex < navigationHistory.length - 1) {
            navigationHistory = navigationHistory.slice(0, historyIndex + 1);
        }
        navigationHistory.push(hash);
        historyIndex = navigationHistory.length - 1;
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

    // Update breadcrumb
    updateBreadcrumb(sectionName);

    // Toggle internal scrolling for projects (except Fede Link which is single page)
    if ((sectionName.startsWith('project') && sectionName !== 'project-fede-link') || sectionName === 'projects') {
        terminalWindow.classList.add('scroll-mode');
    } else {
        terminalWindow.classList.remove('scroll-mode');
    }
}

function updateBreadcrumb(sectionName) {
    let displayName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);

    if (sectionName.startsWith('project-')) {
        const projectName = sectionName.replace('project-', '').split('-').map(
            word => word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        displayName = 'Projects › ' + projectName;
    }

    breadcrumbPath.textContent = displayName;
}

function updateNavButtons() {
    navBack.disabled = historyIndex <= 0;
    navForward.disabled = historyIndex >= navigationHistory.length - 1;
}

// Navigation event handlers
navBack.addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        const targetHash = navigationHistory[historyIndex];
        window.location.hash = targetHash;
        loadPage(false);
    }
});

navForward.addEventListener('click', () => {
    if (historyIndex < navigationHistory.length - 1) {
        historyIndex++;
        const targetHash = navigationHistory[historyIndex];
        window.location.hash = targetHash;
        loadPage(false);
    }
});

navRefresh.addEventListener('click', () => {
    loadPage(false);
});

breadcrumbHome.addEventListener('click', () => {
    window.location.hash = 'home';
});

breadcrumbPath.addEventListener('click', () => {
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash.startsWith('project-')) {
        window.location.hash = 'projects';
    }
});

window.addEventListener('hashchange', () => loadPage(true));
document.addEventListener('DOMContentLoaded', () => loadPage(true));

