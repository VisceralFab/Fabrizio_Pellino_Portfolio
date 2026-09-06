// Pointer-driven window movement with a small, damped elastic response.
(function () {
    const panel = document.querySelector('.terminal-window');
    const handle = panel?.querySelector('.terminal-header');
    if (!handle) return;
    const resetButton = document.getElementById('reset-window-size');
    const markAdjusted = () => resetButton.classList.add('is-visible');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const position = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let pointer = null;
    let frame = 0;
    let previousTime = 0;
    let tilt = 0;
    let tiltVelocity = 0;
    let skew = 0;
    let skewVelocity = 0;
    let layoutChanging = false;
    let layoutVersion = 0;
    let resizePointer = null;
    let resizeFrame = 0;
    let arrangementVersion = 0;

    const clamp = (value, min, max) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value));
    const maximized = () => panel.classList.contains('is-maximized') && !panel.classList.contains('is-minimized');
    const movable = () => panel.classList.contains('is-visible') && !maximized() && !layoutChanging;

    // Layout coordinates exclude drag translation and the decorative wobble.
    function bounds() {
        const left = panel.offsetLeft - panel.offsetWidth / 2;
        const top = panel.offsetTop - panel.offsetHeight / 2;
        return {
            minX: 80 - left - panel.offsetWidth,
            maxX: window.innerWidth - 80 - left,
            minY: 12 - top,
            maxY: window.innerHeight - 50 - top
        };
    }

    function constrain(point, limits) {
        point.x = clamp(point.x, limits.minX, limits.maxX);
        point.y = clamp(point.y, limits.minY, limits.maxY);
    }

    function paint() {
        panel.style.setProperty('--window-x', position.x.toFixed(2) + 'px');
        panel.style.setProperty('--window-y', position.y.toFixed(2) + 'px');
        panel.style.setProperty('--window-tilt', tilt.toFixed(3) + 'deg');
        panel.style.setProperty('--window-skew', skew.toFixed(3) + 'deg');
    }

    function resetDeformation() {
        tilt = skew = tiltVelocity = skewVelocity = 0;
    }

    function animate(now) {
        frame = 0;
        const dt = Math.min(1 / 30, Math.max(1 / 240, (now - previousTime) / 1000));
        previousTime = now;
        const dx = target.x - position.x;
        const dy = target.y - position.y;

        if (reducedMotion.matches) {
            position.x = target.x;
            position.y = target.y;
            resetDeformation();
        } else {
            // Position follows the pointer exactly; only the shape has inertia.
            position.x = target.x;
            position.y = target.y;
            const desiredTilt = pointer ? clamp(dx * 0.09 + dy * 0.025, -3, 3) : 0;
            const desiredSkew = pointer ? clamp(-dx * 0.22 + dy * 0.06, -7, 7) : 0;
            tiltVelocity += ((desiredTilt - tilt) * 220 - tiltVelocity * 12) * dt;
            skewVelocity += ((desiredSkew - skew) * 180 - skewVelocity * 10) * dt;
            tilt += tiltVelocity * dt;
            skew += skewVelocity * dt;
        }

        const moving = Math.abs(target.x - position.x) + Math.abs(target.y - position.y) > 0.15;
        const wobbling = Math.abs(tilt) + Math.abs(skew) + Math.abs(tiltVelocity) + Math.abs(skewVelocity) > 0.015;
        if (!pointer && !moving && !wobbling) {
            position.x = target.x;
            position.y = target.y;
            resetDeformation();
            panel.classList.remove('is-settling');
        } else if (moving || wobbling) {
            frame = requestAnimationFrame(animate);
        }
        paint();
    }

    function schedule() {
        if (!frame) {
            previousTime = performance.now();
            frame = requestAnimationFrame(animate);
        }
    }

    function releasePointer() {
        if (!pointer) return;
        if (target.x !== pointer.startX || target.y !== pointer.startY) markAdjusted();
        const id = pointer.id;
        pointer = null;
        panel.classList.remove('is-dragging');
        panel.classList.add('is-settling');
        if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
        schedule();
    }

    function reconcile() {
        if (resizePointer) return;
        releasePointer();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        resetDeformation();
        panel.classList.remove('is-settling');
        if (!maximized()) {
            const limits = bounds();
            constrain(target, limits);
            position.x = target.x;
            position.y = target.y;
        }
        paint();
    }

    async function geometryChanged() {
        // Preserve the floating position during maximize/restore transitions.
        // Intermediate animated sizes are not the final bounds.
        finishResize(false);
        const version = ++layoutVersion;
        layoutChanging = true;
        releasePointer();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        resetDeformation();
        paint();
        await Promise.allSettled(panel.getAnimations().map(animation => animation.finished));
        if (version !== layoutVersion) return;
        layoutChanging = false;
        reconcile();
    }

    handle.addEventListener('pointerdown', event => {
        if (!movable() || event.button !== 0 || event.isPrimary === false ||
            event.target.closest('button, a, input') || pointer || resizePointer) return;
        event.preventDefault();
        reconcile();
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y };
        handle.setPointerCapture(event.pointerId);
        handle.focus({ preventScroll: true });
        panel.style.transformOrigin = `${event.clientX - (panel.offsetLeft - panel.offsetWidth / 2 + position.x)}px ${event.clientY - (panel.offsetTop - panel.offsetHeight / 2 + position.y)}px`;
        panel.classList.add('is-dragging');
        panel.classList.remove('is-settling');
    });

    handle.addEventListener('pointermove', event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        target.x = pointer.startX + event.clientX - pointer.x;
        target.y = pointer.startY + event.clientY - pointer.y;
        if (target.x !== pointer.startX || target.y !== pointer.startY) markAdjusted();
        schedule();
    });
    handle.addEventListener('pointerup', event => {
        if (pointer?.id !== event.pointerId) return;
        target.x = pointer.startX + event.clientX - pointer.x;
        target.y = pointer.startY + event.clientY - pointer.y;
        releasePointer();
    });
    handle.addEventListener('pointercancel', releasePointer);
    handle.addEventListener('lostpointercapture', releasePointer);
    window.addEventListener('blur', releasePointer);
    window.addEventListener('blur', () => finishResize());
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            finishResize();
            reconcile();
        }
    });

    // An accessible alternative to dragging, without intercepting content keys.
    handle.addEventListener('keydown', event => {
        if (event.target !== handle || !movable() || resizePointer) return;
        const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        event.stopPropagation();
        const distance = event.shiftKey ? 50 : 20;
        target.x += direction[0] * distance;
        target.y += direction[1] * distance;
        markAdjusted();
        panel.classList.add('is-settling');
        schedule();
    });

    function floatingRect() {
        return {
            left: panel.offsetLeft - panel.offsetWidth / 2 + position.x,
            top: panel.offsetTop - panel.offsetHeight / 2 + position.y,
            width: panel.offsetWidth,
            height: panel.offsetHeight
        };
    }

    function resizeRect(start, direction, dx, dy) {
        const minWidth = Math.min(420, start.width, window.innerWidth - 24);
        const minHeight = Math.min(320, start.height, window.innerHeight - 24);
        let left = start.left;
        let top = start.top;
        let right = left + start.width;
        let bottom = top + start.height;
        if (direction.includes('w')) left = clamp(left + dx, 12, right - minWidth);
        if (direction.includes('e')) right = clamp(right + dx, left + minWidth, window.innerWidth - 12);
        if (direction.includes('n')) top = clamp(top + dy, 12, bottom - minHeight);
        if (direction.includes('s')) bottom = clamp(bottom + dy, top + minHeight, window.innerHeight - 12);
        return { left, top, width: right - left, height: bottom - top };
    }

    function applySize(rect) {
        const current = floatingRect();
        if (Math.abs(rect.width - current.width) < 0.5 && Math.abs(rect.height - current.height) < 0.5 &&
            Math.abs(rect.left - current.left) < 0.5 && Math.abs(rect.top - current.top) < 0.5) return;
        markAdjusted();
        panel.classList.add('is-user-sized');
        panel.style.setProperty('--user-width', rect.width + 'px');
        panel.style.setProperty('--user-height', rect.height + 'px');
        // Width changes the centered CSS anchor. Compensate so the opposite
        // edge stays fixed, even on a window that has already been dragged.
        position.x = rect.left - (panel.offsetLeft - panel.offsetWidth / 2);
        position.y = rect.top - (panel.offsetTop - panel.offsetHeight / 2);
        target.x = position.x;
        target.y = position.y;
        resetDeformation();
        paint();
    }

    function renderResize() {
        resizeFrame = 0;
        if (!resizePointer) return;
        const state = resizePointer;
        applySize(resizeRect(state.rect, state.direction, state.lastX - state.x, state.lastY - state.y));
    }

    function finishResize(commit = true) {
        if (!resizePointer) return;
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
        if (commit) renderResize();
        const { element, id } = resizePointer;
        resizePointer = null;
        panel.classList.remove('is-resizing');
        document.documentElement.classList.remove('is-window-resizing');
        document.documentElement.style.removeProperty('--resize-cursor');
        if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    }

    const cursors = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
    for (const [direction, cursor] of Object.entries(cursors)) {
        const edge = document.createElement(direction === 'se' ? 'button' : 'div');
        edge.className = 'window-resize-handle resize-' + direction;
        edge.style.cursor = cursor;
        if (direction === 'se') {
            edge.type = 'button';
            edge.setAttribute('aria-label', 'Resize window. Use arrow keys; hold Shift for larger steps.');
            edge.title = 'Drag to resize';
        } else {
            edge.setAttribute('aria-hidden', 'true');
        }
        panel.appendChild(edge);

        edge.addEventListener('pointerdown', event => {
            if (!movable() || panel.classList.contains('is-minimized') || pointer || resizePointer ||
                event.button !== 0 || event.isPrimary === false) return;
            event.preventDefault();
            event.stopPropagation();
            reconcile();
            panel.classList.add('is-resizing');
            resizePointer = { element: edge, id: event.pointerId, direction,
                x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, rect: floatingRect() };
            edge.setPointerCapture(event.pointerId);
            document.documentElement.style.setProperty('--resize-cursor', cursor);
            document.documentElement.classList.add('is-window-resizing');
        });
        edge.addEventListener('pointermove', event => {
            if (resizePointer?.id !== event.pointerId || resizePointer.element !== edge) return;
            resizePointer.lastX = event.clientX;
            resizePointer.lastY = event.clientY;
            if (!resizeFrame) resizeFrame = requestAnimationFrame(renderResize);
        });
        edge.addEventListener('pointerup', event => {
            if (resizePointer?.id !== event.pointerId || resizePointer.element !== edge) return;
            resizePointer.lastX = event.clientX;
            resizePointer.lastY = event.clientY;
            finishResize();
        });
        edge.addEventListener('pointercancel', () => finishResize(false));
        edge.addEventListener('lostpointercapture', () => finishResize(false));
        if (direction === 'se') {
            edge.addEventListener('keydown', event => {
                if (!movable() || panel.classList.contains('is-minimized') || pointer || resizePointer) return;
                const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
                const delta = directions[event.key];
                if (!delta) return;
                event.preventDefault();
                event.stopPropagation();
                reconcile();
                const step = event.shiftKey ? 50 : 20;
                panel.classList.add('is-resizing');
                applySize(resizeRect(floatingRect(), 'se', delta[0] * step, delta[1] * step));
                panel.classList.remove('is-resizing');
            });
        }
    }

    async function arrangeWindow(resetSize) {
        const version = ++arrangementVersion;
        finishResize(false);
        releasePointer();
        panel.dispatchEvent(new Event('portfolio:restore-request'));
        if (resetSize) {
            panel.classList.remove('is-user-sized');
            panel.style.removeProperty('--user-width');
            panel.style.removeProperty('--user-height');
        }
        await geometryChanged();
        if (version !== arrangementVersion) return;
        resetButton.classList.remove('is-visible');
        handle.focus({ preventScroll: true });
        {
            target.x = 0;
            target.y = 0;
            constrain(target, bounds());
            panel.classList.add('is-settling');
            schedule();
        }
    }
    resetButton.addEventListener('click', () => arrangeWindow(true));

    panel.addEventListener('portfolio:geometrychange', geometryChanged);
    window.addEventListener('resize', geometryChanged);
    reducedMotion.addEventListener('change', reconcile);
    // Size transitions and browser zoom can change bounds after a resize event.
    const observer = new ResizeObserver(() => {
        if (!layoutChanging && !resizePointer && !pointer) reconcile();
    });
    observer.observe(panel);
    reconcile();
})();
