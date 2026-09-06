// Entry flow and desktop-style portfolio window controls.
(function () {
    const landing = document.getElementById('landing-wrapper');
    const intro = document.getElementById('intro-step');
    const musicStep = document.getElementById('music-step');
    const continueButton = document.getElementById('continue-btn');
    const enterButton = document.getElementById('enter-btn');
    const choices = [...document.querySelectorAll('[data-music-choice]')];
    const portfolio = document.querySelector('.terminal-window');
    const content = document.getElementById('terminal-content');
    const closeButton = document.querySelector('.btn-close');
    const minimizeButton = document.querySelector('.btn-minimize');
    const maximizeButton = document.querySelector('.btn-maximize');
    const reopenButton = document.getElementById('reopen-portfolio');
    const player = document.getElementById('musicControl');
    let step = 'welcome';
    let musicChoice = null;

    function showMusicChoice() {
        if (step !== 'welcome') return;
        step = 'music';
        landing.dataset.step = step;
        landing.setAttribute('aria-labelledby', 'music-question');
        intro.classList.remove('is-active');
        intro.inert = true;
        intro.setAttribute('aria-hidden', 'true');
        musicStep.inert = false;
        musicStep.removeAttribute('aria-hidden');
        musicStep.classList.add('is-active');
        document.getElementById('music-question').focus({ preventScroll: true });
    }

    function setMinimized(minimized) {
        portfolio.classList.toggle('is-minimized', minimized);
        content.inert = minimized;
        content.setAttribute('aria-hidden', String(minimized));
        minimizeButton.setAttribute('aria-expanded', String(!minimized));
        minimizeButton.setAttribute('aria-label', minimized ? 'Restore portfolio' : 'Minimize portfolio');
        minimizeButton.title = minimizeButton.getAttribute('aria-label');
        if (minimized) pauseVideos();
        portfolio.dispatchEvent(new Event('portfolio:geometrychange'));
    }

    function setMaximized(maximized) {
        portfolio.classList.toggle('is-maximized', maximized);
        maximizeButton.setAttribute('aria-pressed', String(maximized));
        maximizeButton.setAttribute('aria-label', maximized ? 'Restore window size' : 'Maximize portfolio');
        maximizeButton.title = maximizeButton.getAttribute('aria-label');
        portfolio.dispatchEvent(new Event('portfolio:geometrychange'));
    }

    function pauseVideos() {
        portfolio.querySelectorAll('video').forEach(video => video.pause());
    }

    function openPortfolio() {
        reopenButton.hidden = true;
        portfolio.inert = false;
        portfolio.setAttribute('aria-hidden', 'false');
        portfolio.classList.add('is-visible');
        portfolio.dispatchEvent(new Event('portfolio:geometrychange'));
        closeButton.focus({ preventScroll: true });
    }

    function enterPortfolio() {
        if (step !== 'music' || musicChoice === null) return;
        step = 'entered';
        landing.dataset.step = step;
        landing.inert = true;
        landing.setAttribute('aria-hidden', 'true');
        landing.classList.add('is-dismissed');
        document.body.classList.add('experience-entered');
        document.getElementById('desktop-tools').hidden = false;
        player.inert = false;
        player.classList.add('is-visible');
        window.siteMusic?.setEnabled(musicChoice);
        window.siteMusic?.play();
        openPortfolio();
        animateHomeKernel();
    }

    landing.addEventListener('click', showMusicChoice);
    continueButton.addEventListener('click', showMusicChoice);
    choices.forEach(button => {
        button.addEventListener('click', () => {
            if (step !== 'music') return;
            musicChoice = button.dataset.musicChoice === 'yes';
            choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
            enterButton.hidden = false;
        });
    });
    enterButton.addEventListener('click', enterPortfolio);

    // Keep keyboard navigation inside the active introduction screen.
    landing.addEventListener('keydown', event => {
        if (step === 'welcome' && event.target === landing &&
            (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            showMusicChoice();
            return;
        }
        if (event.key !== 'Tab' || step === 'entered') return;
        const activePanel = step === 'welcome' ? intro : musicStep;
        const buttons = [...activePanel.querySelectorAll('button:not([hidden])')];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || !buttons.includes(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !buttons.includes(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    });

    closeButton.addEventListener('click', () => {
        pauseVideos();
        portfolio.classList.remove('is-visible');
        portfolio.dispatchEvent(new Event('portfolio:geometrychange'));
        portfolio.inert = true;
        portfolio.setAttribute('aria-hidden', 'true');
        reopenButton.hidden = false;
        reopenButton.focus({ preventScroll: true });
    });
    reopenButton.addEventListener('click', () => {
        setMinimized(false);
        openPortfolio();
    });
    minimizeButton.addEventListener('click', () => {
        setMinimized(!portfolio.classList.contains('is-minimized'));
    });
    maximizeButton.addEventListener('click', () => {
        if (portfolio.classList.contains('is-minimized')) {
            setMinimized(false);
            setMaximized(true);
        } else {
            setMaximized(!portfolio.classList.contains('is-maximized'));
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && portfolio.classList.contains('is-maximized')) {
            setMaximized(false);
        }
    });
    portfolio.addEventListener('portfolio:restore-request', () => {
        if (step !== 'entered') return;
        setMinimized(false);
        setMaximized(false);
        if (!portfolio.classList.contains('is-visible')) openPortfolio();
    });
    landing.focus({ preventScroll: true });
})();
