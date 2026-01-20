// Linux Kernel Boot-Style Loading Screen
(function () {
    const loadingScreen = document.getElementById('loading-screen');
    const bootMessages = document.querySelector('.boot-messages');
    const bootPrompt = document.querySelector('.boot-prompt');
    const clickHint = document.querySelector('.click-hint');
    const datetimeEl = document.querySelector('.datetime');

    // Hide prompt and hint initially - they'll show after boot completes
    if (bootPrompt) bootPrompt.style.display = 'none';
    if (clickHint) clickHint.style.display = 'none';

    // Update datetime in CET
    function updateDateTime() {
        const now = new Date();
        const options = {
            timeZone: 'Europe/Paris', // CET timezone
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const formatter = new Intl.DateTimeFormat('en-GB', options);
        const parts = formatter.formatToParts(now);

        const date = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
        const time = `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;

        datetimeEl.textContent = `${date} ${time} CET`;
    }

    // Update datetime every second
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Kernel boot messages (Linux-style)
    const bootLogs = [
        '[    0.000000] Initializing kernel subsystems...',
        '[    0.012345] CPU: Intel Core i9-13600KF detected',
        '[    0.023456] Memory: 32GB RAM available',
        '[    0.034567] PCI: Scanning bus',
        '[    0.045678] ACPI: Core system tables loaded',
        '[    0.056789] USB: Registering controllers',
        '[    0.123456] Loading device drivers',
        '[    0.234567] Mounting filesystems',
        '[    0.345678] ext4: Mounted root filesystem',
        '[    0.456789] Network: Initializing interfaces',
        '[    0.567890] eth0: Link detected',
        '[    0.678901] Sound: ALSA drivers loaded',
        '[    0.789012] Graphics: Framebuffer initialized',
        '[    0.890123] Input: Keyboard and mouse detected',
        '[    1.001234] Security: SELinux initialized',
        '[    1.112345] Init: Starting system services',
        '[    1.223456] systemd: Starting default target',
        '[    1.334567] Portfolio: Loading assets',
        '[    1.445678] Portfolio: Compiling shaders',
        '[    1.556789] Portfolio: Initializing UI',
        '[    1.667890] Portfolio: Ready',
        '[    1.778901] System boot complete'
    ];

    let currentLine = 0;
    let progress = 0;
    let bootComplete = false;

    function showBootLine() {
        if (currentLine >= bootLogs.length) {
            bootComplete = true;
            completeLoading();
            return;
        }

        const line = document.createElement('div');
        line.className = 'boot-line';
        line.textContent = bootLogs[currentLine];
        bootMessages.appendChild(line);

        currentLine++;

        // Variable delay for realism (faster at start, slower at end)
        const delay = currentLine < bootLogs.length * 0.5 ?
            Math.random() * 100 + 50 :  // 50-150ms for first half
            Math.random() * 200 + 100;  // 100-300ms for second half

        setTimeout(showBootLine, delay);
    }

    function completeLoading() {
        // Show prompt after a longer delay to ensure all messages are visible
        setTimeout(() => {
            if (bootPrompt) {
                bootPrompt.style.display = 'block';
                bootPrompt.classList.add('show');
            }
            if (clickHint) {
                clickHint.style.display = 'block';
                clickHint.classList.add('show');
            }
        }, 1000);

        // Enable click to enter
        loadingScreen.style.cursor = 'pointer';
        loadingScreen.addEventListener('click', enterSystem);

        // Also allow Enter key
        document.addEventListener('keydown', function enterKeyHandler(e) {
            if (e.key === 'Enter' && bootComplete) {
                enterSystem();
                document.removeEventListener('keydown', enterKeyHandler);
            }
        });
    }

    function enterSystem() {
        if (!bootComplete) return;

        // Start music
        const audio = document.getElementById('siteAudio');
        if (audio) {
            audio.play().catch(err => {
                console.log('Audio autoplay prevented:', err);
            });

            // Update music toggle to pause icon since music is playing
            const musicToggle = document.querySelector('.music-toggle i');
            if (musicToggle) {
                musicToggle.className = 'fa-solid fa-pause';
            }
            const toggleButton = document.getElementById('musicToggle');
            if (toggleButton) {
                toggleButton.setAttribute('aria-pressed', 'true');
            }
        }

        // Hide loading screen
        loadingScreen.classList.add('hidden');

        // Signal that loading screen is hidden
        window.loadingScreenHidden = true;
        window.dispatchEvent(new CustomEvent('loadingScreenHidden'));

        // Remove from DOM after transition
        setTimeout(() => {
            loadingScreen.remove();
        }, 800);
    }

    // Start boot sequence after page loads
    window.addEventListener('load', () => {
        setTimeout(showBootLine, 300);
    });

    // Fallback if window already loaded
    if (document.readyState === 'complete') {
        setTimeout(showBootLine, 300);
    }
})();
