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
    const resetWindowButton = document.getElementById('reset-window-size');
    const player = document.getElementById('musicControl');
    let step = 'music';
    let welcomeTimer;
    let musicChoice = false;
    let dragState = null;
    let hasUserAdjustedWindow = false;

    function showWindowReset() {
        if (hasUserAdjustedWindow) resetWindowButton.classList.add('is-visible');
    }

    function resetWindowSize() {
        portfolio.classList.remove('is-user-positioned');
        portfolio.style.removeProperty('top');
        portfolio.style.removeProperty('left');
        portfolio.style.removeProperty('width');
        portfolio.style.removeProperty('height');
        portfolio.style.removeProperty('transform');
        hasUserAdjustedWindow = false;
        resetWindowButton.classList.remove('is-visible');
    }

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
        welcomeTimer = window.setTimeout(enterPortfolio, 5000);
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
        if (maximized) resetWindowSize();
        portfolio.classList.toggle('is-maximized', maximized);
        player.classList.toggle('is-suppressed', maximized);
        player.inert = maximized;
        if (maximized) resetWindowButton.classList.remove('is-visible');
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
    resetWindowButton.addEventListener('click', resetWindowSize);

    document.querySelector('.terminal-header').addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button') || portfolio.classList.contains('is-maximized')) return;
        const bounds = portfolio.getBoundingClientRect();
        hasUserAdjustedWindow = true;
        portfolio.classList.add('is-user-positioned');
        portfolio.style.left = `${bounds.left}px`;
        portfolio.style.top = `${bounds.top}px`;
        portfolio.style.width = `${bounds.width}px`;
        portfolio.style.height = `${bounds.height}px`;
        portfolio.style.transform = 'none';
        dragState = { offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    });
    document.querySelector('.terminal-header').addEventListener('pointermove', event => {
        if (!dragState) return;
        portfolio.style.left = `${event.clientX - dragState.offsetX}px`;
        portfolio.style.top = `${event.clientY - dragState.offsetY}px`;
    });
    document.querySelector('.terminal-header').addEventListener('pointerup', event => {
        if (!dragState) return;
        dragState = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        showWindowReset();
    });
    portfolio.addEventListener('pointerdown', event => {
        if (portfolio.classList.contains('is-maximized')) return;
        const bounds = portfolio.getBoundingClientRect();
        if (event.clientX >= bounds.right - 24 && event.clientY >= bounds.bottom - 24) {
            hasUserAdjustedWindow = true;
        }
    });
    new ResizeObserver(() => showWindowReset()).observe(portfolio);
    landing.focus({ preventScroll: true });
})();
