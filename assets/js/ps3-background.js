// PlayStation 3 XMB-inspired background renderer.
// The renderer is kept behind the portfolio UI and fails quietly when WebGL2
// is unavailable, leaving the CSS fallback background visible.
(function () {
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

        function frame(now) {
            const delta = Math.max(0, (now - previousTime) / 1000);
            previousTime = now;
            splineTime += delta;
            particlesTime += delta;

            splineLayer.render(splineTime);
            particlesLayer.render(particlesTime);
            window.requestAnimationFrame(frame);
        }

        window.requestAnimationFrame(frame);
    } catch (error) {
        console.error('PS3 background failed to initialize:', error);
        canvas.classList.add('is-unavailable');
    }
})();
