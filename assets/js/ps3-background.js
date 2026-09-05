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

            splineLayer.render(splineTime, { waveOpacity: reveal, backgroundBrightness: brightness });
            if (reveal > 0) particlesLayer.render(particlesTime, reveal);
            window.requestAnimationFrame(frame);
        }

        window.requestAnimationFrame(frame);
    } catch (error) {
        console.error('PS3 background failed to initialize:', error);
        canvas.classList.add('is-unavailable');
    }
})();
