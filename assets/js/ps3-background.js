// PlayStation 3 XMB-inspired background renderer.
// The renderer is kept behind the portfolio UI and fails quietly when WebGL2
// is unavailable, leaving the CSS fallback background visible.
(function () {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let targetBrightness = 1;
    let clockTimer;

    // Local civil time, including daylight saving time. No geolocation needed.
    function updateLocalTheme() {
        const now = new Date();
        const night = now.getHours() >= 20 || now.getHours() < 8;
        targetBrightness = night ? 0.6 : 1;
        root.dataset.sky = night ? 'night' : 'day';

        // Match the default PS3 gradient even when WebGL is unavailable.
        const settings = window.SPLINE_SETTINGS;
        const base = settings ? [settings.colorR, settings.colorG, settings.colorB] : [37, 89, 179];
        const top = settings?.gradientTopMul ?? 0.09;
        const bottom = settings?.gradientBotMul ?? 0.62;
        const rgb = (multiplier, blueBoost = 1) => base.map((channel, index) =>
            (channel * multiplier * targetBrightness * (index === 2 ? blueBoost : 1)).toFixed(3)
        ).join(' ');
        root.style.setProperty('--ps3-gradient-top', 'rgb(' + rgb(top, 1.2) + ')');
        root.style.setProperty('--ps3-gradient-bottom', 'rgb(' + rgb(bottom) + ')');

        const boundary = new Date(now);
        if (now.getHours() < 8) boundary.setHours(8, 0, 0, 0);
        else if (now.getHours() < 20) boundary.setHours(20, 0, 0, 0);
        else {
            boundary.setDate(boundary.getDate() + 1);
            boundary.setHours(8, 0, 0, 0);
        }
        clearTimeout(clockTimer);
        // Also detect local clock/time-zone changes while the tab remains open.
        clockTimer = setTimeout(updateLocalTheme, Math.min(60000, boundary - now));
    }
    updateLocalTheme();
    window.addEventListener('focus', updateLocalTheme);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateLocalTheme();
    });

    const canvas = document.getElementById('ps3-background');
    if (!canvas || typeof window.createSplineLayer !== 'function' || typeof window.createParticlesLayer !== 'function') {
        return;
    }

    const gl = canvas.getContext('webgl2', {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    });

    if (!gl) {
        canvas.classList.add('is-unavailable');
        return;
    }

    gl.getExtension('OES_texture_float_linear');
    gl.getExtension('EXT_color_buffer_float');

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    try {
        const splineLayer = window.createSplineLayer(gl, canvas);
        const particlesLayer = window.createParticlesLayer(gl, canvas);
        let previousTime = performance.now();
        let splineTime = 0;
        let particlesTime = Math.random() * 1000;
        let waveOpacity = 0;
        let brightness = targetBrightness;
        const portfolio = document.querySelector('.terminal-window');
        const mouse = { x: 0, y: 0, present: false };
        const interaction = { x: 0, y: 0, flowX: 0, flowY: 0, strength: 0, width: 1, height: 1, safeRect: [0, 0, 0, 0], protected: false };
        let lastMouseX = 0;
        let lastMouseY = 0;
        let following = false;
        let motionCharge = 0;
        let strengthVelocity = 0;
        window.addEventListener('pointermove', event => {
            mouse.present = event.pointerType === 'mouse' && event.buttons === 0;
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        }, { passive: true });
        const leave = () => { mouse.present = false; };
        window.addEventListener('pointerdown', leave, { passive: true });
        document.documentElement.addEventListener('pointerleave', leave);
        window.addEventListener('blur', leave);
        document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });

        function updateInteraction(delta, entered) {
            interaction.width = window.innerWidth;
            interaction.height = window.innerHeight;
            interaction.protected = !!portfolio?.classList.contains('is-visible');
            let blocked = false;
            // Read live bounds: also covers resize, maximize and the decorative wobble.
            if (interaction.protected) {
                const rect = portfolio.getBoundingClientRect();
                interaction.safeRect = [rect.left, rect.top, rect.right, rect.bottom];
                blocked = mouse.x >= rect.left && mouse.x <= rect.right && mouse.y >= rect.top && mouse.y <= rect.bottom;
            }
            const hit = mouse.present ? document.elementFromPoint(mouse.x, mouse.y) : null;
            blocked ||= !!hit?.closest('.terminal-window, #musicControl, #reset-window-size, #reopen-portfolio, #address-menu, .image-zoom-overlay');
            blocked ||= portfolio?.classList.contains('is-dragging') || portfolio?.classList.contains('is-resizing');
            const active = entered && mouse.present && !blocked && !reducedMotion.matches && !document.hidden;
            const vx = active && following ? (mouse.x - lastMouseX) / Math.max(delta, 0.008) : 0;
            const vy = active && following ? (mouse.y - lastMouseY) / Math.max(delta, 0.008) : 0;
            const speed = Math.hypot(vx, vy);
            // A passing stroke excites the surface; a stationary cursor lets it recover.
            // Retain the passing stroke briefly, then let it dissolve over several seconds.
            motionCharge *= Math.exp(-delta * 1.15);
            if (active) motionCharge = Math.max(motionCharge, following ? Math.min(1, speed / 220) : 0.65);
            const pull = Math.min(24, speed * 0.035) / Math.max(1, speed);
            const easing = 1 - Math.exp(-delta * 3);
            interaction.flowX += (vx * pull - interaction.flowX) * easing;
            interaction.flowY += (vy * pull - interaction.flowY) * easing;
            lastMouseX = mouse.x;
            lastMouseY = mouse.y;
            if (active) {
                const follow = following || interaction.strength > 0.02 ? 1 - Math.exp(-delta * 6) : 1;
                interaction.x += (mouse.x - interaction.x) * follow;
                interaction.y += (mouse.y - interaction.y) * follow;
            }
            following = active;
            // Critically damped spring: gradual expansion and a smooth return, without bouncing.
            // The analytic step remains stable at low frame rates.
            const desiredStrength = active ? motionCharge : 0;
            // Slow, critically damped recovery: no snap-back or overshoot.
            const omega = 3;
            const displacement = interaction.strength - desiredStrength;
            const spring = strengthVelocity + omega * displacement;
            const decay = Math.exp(-omega * delta);
            interaction.strength = desiredStrength + (displacement + spring * delta) * decay;
            strengthVelocity = (strengthVelocity - omega * spring * delta) * decay;
            if (motionCharge < 0.0001 && interaction.strength < 0.0001 && Math.abs(strengthVelocity) < 0.0001) {
                interaction.strength = strengthVelocity = motionCharge = 0;
            }
            if (reducedMotion.matches) {
                interaction.strength = 0;
                interaction.flowX = interaction.flowY = 0;
                motionCharge = strengthVelocity = 0;
            }
        }

        function frame(now) {
            const delta = Math.min(0.1, Math.max(0, (now - previousTime) / 1000));
            previousTime = now;
            if (!reducedMotion.matches) {
                splineTime += delta;
                particlesTime += delta;
            }

            const entered = document.body.classList.contains('experience-entered');
            waveOpacity = reducedMotion.matches ? Number(entered) :
                Math.min(1, waveOpacity + (entered ? delta / 1.4 : 0));
            brightness += (targetBrightness - brightness) * (reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 3));
            const reveal = waveOpacity * waveOpacity * (3 - 2 * waveOpacity);

            updateInteraction(delta, entered);
            splineLayer.render(splineTime, { waveOpacity: reveal, backgroundBrightness: brightness, interaction });
            if (reveal > 0) particlesLayer.render(particlesTime, reveal);
            window.requestAnimationFrame(frame);
        }

        window.requestAnimationFrame(frame);
    } catch (error) {
        console.error('PS3 background failed to initialize:', error);
        canvas.classList.add('is-unavailable');
    }
})();
