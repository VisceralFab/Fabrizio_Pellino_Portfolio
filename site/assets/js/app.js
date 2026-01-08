const appContainer = document.getElementById('app-container');
const terminalTitle = document.querySelector('.terminal-title');
const terminalWindow = document.querySelector('.terminal-window');

// Simple Router
async function loadPage() {
    let hash = window.location.hash.replace('#', '');

    // Default to home if empty
    if (!hash) {
        hash = 'home';
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

    // Toggle internal scrolling for projects
    if (sectionName.startsWith('project') || sectionName === 'projects') {
        terminalWindow.classList.add('scroll-mode');
    } else {
        terminalWindow.classList.remove('scroll-mode');
    }
}

window.addEventListener('hashchange', loadPage);
document.addEventListener('DOMContentLoaded', loadPage);
