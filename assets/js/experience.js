// Entry flow and desktop-style portfolio window controls.
(function () {
    const landing = document.getElementById('landing-wrapper');
    const intro = document.getElementById('intro-step');
    const musicStep = document.getElementById('music-step');
    const choices = [...document.querySelectorAll('[data-music-choice]')];
    const portfolio = document.querySelector('.terminal-window');
    const content = document.getElementById('terminal-content');
    const closeButton = document.querySelector('.btn-close');
    const minimizeButton = document.querySelector('.btn-minimize');
    const maximizeButton = document.querySelector('.btn-maximize');
    const reopenButton = document.getElementById('reopen-portfolio');
    const welcomeProgress = document.getElementById('welcome-progress');
    const player = document.getElementById('musicControl');
    let step = 'music';
    let welcomeTimer;
    let progressFrame;
    const welcomeDuration = 5000;
    let musicChoice = false;
    function showWelcome() {
        if (step !== 'music') return;
        step = 'welcome';
        landing.dataset.step = step;
        landing.setAttribute('aria-labelledby', 'intro-title');
        musicStep.classList.remove('is-active');
        musicStep.inert = true;
        musicStep.setAttribute('aria-hidden', 'true');
        intro.inert = false;
        intro.removeAttribute('aria-hidden');
        intro.classList.add('is-active');
        document.getElementById('intro-title').focus({ preventScroll: true });
        const started = performance.now();
        function updateProgress(now) {
            const percent = Math.min(100, (now - started) / welcomeDuration * 100);
            welcomeProgress.style.setProperty('--progress', percent + '%');
            welcomeProgress.setAttribute('aria-valuenow', String(Math.round(percent)));
            if (step === 'welcome' && percent < 100) progressFrame = requestAnimationFrame(updateProgress);
        }
        progressFrame = requestAnimationFrame(updateProgress);
        welcomeTimer = window.setTimeout(enterPortfolio, welcomeDuration);
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
        player.classList.toggle('is-suppressed', maximized);
        player.inert = maximized;
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
        if (step !== 'welcome') return;
        window.clearTimeout(welcomeTimer);
        cancelAnimationFrame(progressFrame);
        welcomeProgress.style.setProperty('--progress', '100%');
        welcomeProgress.setAttribute('aria-valuenow', '100');
        step = 'entered';
        landing.dataset.step = step;
        landing.inert = true;
        landing.setAttribute('aria-hidden', 'true');
        landing.classList.add('is-dismissed');
        document.body.classList.add('experience-entered');
        player.inert = false;
        player.classList.add('is-visible');
        window.siteMusic?.setEnabled(musicChoice);
        if (musicChoice) window.siteMusic?.playWithFade();
        openPortfolio();
        animateHomeKernel();
    }

    choices.forEach(button => {
        button.addEventListener('click', () => {
            if (step !== 'music') return;
            musicChoice = button.dataset.musicChoice === 'yes';
            choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
            showWelcome();
        });
    });

    // Keep keyboard navigation inside the active introduction screen.
    landing.addEventListener('keydown', event => {
        if (event.key !== 'Tab' || step === 'entered') return;
        const activePanel = step === 'welcome' ? intro : musicStep;
        const buttons = [...activePanel.querySelectorAll('button:not([hidden])')];
        if (!buttons.length) {
            event.preventDefault();
            document.getElementById('intro-title').focus({ preventScroll: true });
            return;
        }
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
        setMinimized(false);
        setMaximized(false);
        if (!portfolio.classList.contains('is-visible')) openPortfolio();
    });
    landing.focus({ preventScroll: true });
})();
