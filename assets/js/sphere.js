// 3D Wireframe Sphere (Exactly matching OutOfTune core layout)

(function () {
    const target = document.getElementById('globe-target');
    if (!target) return;

    // Create scene
    const scene = new THREE.Scene();

    // Helper to calculate exact sizes
    function safeSize(el, fallbackW, fallbackH) {
        const w = Math.max(1, el.offsetWidth || el.clientWidth || fallbackW || 1);
        const h = Math.max(1, el.offsetHeight || el.clientHeight || fallbackH || 1);
        return {
            w,
            h,
            aspect: w / h
        };
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const gs = safeSize(target, 400, 400);

    // Setup camera exactly like OutOfTune
    const camera = new THREE.PerspectiveCamera(75, gs.aspect, 0.1, 1000);
    camera.position.z = 4.2;

    // WebGL Renderer setup
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(gs.w, gs.h);
    target.appendChild(renderer.domElement);

    // Single simple detailed wireframe globe (Exactly like OutOfTune)
    const globe = new THREE.Mesh(
        new THREE.IcosahedronGeometry(2.5, 3),
        new THREE.MeshBasicMaterial({
            color: 0x00dcf8,
            wireframe: true,
            transparent: true,
            opacity: 0.90
        })
    );
    scene.add(globe);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Simple smooth rotations exactly like OutOfTune
        globe.rotation.y += 0.002;
        globe.rotation.x += 0.001;

        renderer.render(scene, camera);
    }

    // Resize handler
    window.addEventListener('resize', () => {
        const gs2 = safeSize(target, 400, 400);
        camera.aspect = gs2.aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(gs2.w, gs2.h);
    });

    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => {
            const gs2 = safeSize(target, 400, 400);
            camera.aspect = gs2.aspect;
            camera.updateProjectionMatrix();
            renderer.setSize(gs2.w, gs2.h);
        }).observe(target);
    }

    // Start rendering
    animate();

    // Export globe reference
    window.siteSphere = {
        globe,
        scene,
        camera,
        renderer
    };
})();
