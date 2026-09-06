(function () {
    const routes = [
        { id: 'home', label: 'Home', path: '~/home' },
        { id: 'about', label: 'About me', path: '~/about' },
        { id: 'projects', label: 'Projects', path: '~/projects' },
        { id: 'project-subaquea', label: 'SubAquea', path: '~/projects/subaquea' },
        { id: 'project-opera-omnia', label: 'Opera Omnia', path: '~/projects/opera-omnia' },
        { id: 'project-pathfinder', label: 'Pathfinder', path: '~/projects/pathfinder' },
        { id: 'project-s-os', label: 'S_OS', path: '~/projects/s-os' },
        { id: 'project-straight-outta-napule', label: 'Straight Outta Napule', path: '~/projects/straight-outta-napule' },
        { id: 'project-fede-link', label: 'Fede Link', path: '~/projects/fede-link' }
    ];
    const input = document.getElementById('address-input');
    const toggle = document.getElementById('address-menu-toggle');
    const menu = document.getElementById('address-menu');
    const bar = input.closest('.nav-address-bar');
    const panel = document.querySelector('.terminal-window');
    let filtered = routes;
    let active = -1;
    const current = () => routes.find(route => route.id === location.hash.slice(1)) || routes[0];
    const normalize = text => text.trim().toLowerCase().replace(/^#/, '').replace(/^~?\//, '');

    function place() {
        const rect = bar.getBoundingClientRect();
        const width = Math.min(Math.max(rect.width, 260), innerWidth - 24);
        const below = innerHeight - rect.bottom - 18;
        const above = rect.top - 18;
        const flip = below < 180 && above > below;
        const height = Math.max(60, Math.min(430, flip ? above : below));
        menu.style.width = width + 'px';
        menu.style.left = Math.max(12, Math.min(rect.left, innerWidth - width - 12)) + 'px';
        menu.style.maxHeight = height + 'px';
        menu.style.top = (flip ? Math.max(12, rect.top - menu.offsetHeight - 6) : rect.bottom + 6) + 'px';
    }
    function close() {
        menu.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        active = -1;
    }
    function select(index) {
        active = index;
        [...menu.querySelectorAll('[role="option"]')].forEach((option, i) => {
            option.setAttribute('aria-selected', String(i === active));
            if (i === active) {
                input.setAttribute('aria-activedescendant', option.id);
                option.scrollIntoView({ block: 'nearest' });
            }
        });
    }
    function navigate(route) {
        input.value = route.path;
        close();
        location.hash = route.id;
        input.blur();
    }
    function open(query = '') {
        const term = normalize(query);
        filtered = routes.filter(route => (route.label + ' ' + route.path + ' ' + route.id).toLowerCase().includes(term));
        active = -1;
        input.removeAttribute('aria-activedescendant');
        menu.replaceChildren();
        filtered.forEach((route, index) => {
            const option = document.createElement('a');
            option.id = 'address-option-' + route.id;
            option.className = 'address-option';
            option.href = '#' + route.id;
            option.tabIndex = -1;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            if (route.id === current().id) option.setAttribute('aria-current', 'page');
            const label = document.createElement('span');
            const path = document.createElement('small');
            label.textContent = route.label;
            path.textContent = route.path;
            option.append(label, path);
            option.addEventListener('pointerdown', event => event.preventDefault());
            option.addEventListener('click', event => { event.preventDefault(); navigate(route); });
            option.addEventListener('pointermove', () => select(index));
            menu.append(option);
        });
        if (!filtered.length) {
            const empty = document.createElement('div');
            empty.className = 'address-empty';
            empty.textContent = 'No matching path';
            menu.append(empty);
        }
        menu.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-expanded', 'true');
        place();
    }
    input.addEventListener('focus', () => open());
    input.addEventListener('click', () => { if (menu.hidden) open(); });
    input.addEventListener('input', () => open(input.value));
    toggle.addEventListener('click', () => {
        if (!menu.hidden) { close(); return; }
        input.focus();
        open();
    });
    input.addEventListener('keydown', event => {
        if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End'].includes(event.key)) event.stopPropagation();
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (menu.hidden) open();
            if (filtered.length) select((active + (event.key === 'ArrowDown' ? 1 : active < 0 ? 0 : -1) + filtered.length) % filtered.length);
        } else if (!menu.hidden && (event.key === 'Home' || event.key === 'End')) {
            event.preventDefault();
            if (filtered.length) select(event.key === 'Home' ? 0 : filtered.length - 1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const term = normalize(input.value);
            const route = !menu.hidden && active >= 0 ? filtered[active] :
                routes.find(route => [route.id, normalize(route.path), route.label.toLowerCase()].includes(term)) ||
                (term === '' ? routes[0] : null);
            if (route) navigate(route);
            else open(input.value);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            input.value = current().path;
            close();
        } else if (event.key === 'Tab') close();
    });
    document.addEventListener('pointerdown', event => {
        if (!bar.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener('focusin', event => {
        if (!bar.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener('scroll', event => {
        if (!menu.contains(event.target)) close();
    }, true);
    window.addEventListener('resize', close);
    window.addEventListener('hashchange', () => { close(); input.value = current().path; });
    panel.addEventListener('portfolio:geometrychange', close);
})();
