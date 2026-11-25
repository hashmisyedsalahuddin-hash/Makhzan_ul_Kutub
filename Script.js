(function() {
    if (localStorage.getItem('makhzan_theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    if (window.location.protocol !== 'https:' && window.location.protocol !== 'http:') return;

    const VER_KEY = 'makhzan_live_ver_v1';
    const RELOAD_KEY = 'makhzan_reloaded_ver_v1';
    let lastCheck = 0;
    let updating = false;

    try {
        const u = new URL(window.location.href);
        if (u.searchParams.has('_u')) {
            u.searchParams.delete('_u');
            history.replaceState(history.state, '', u.pathname + u.search + u.hash);
        }
    } catch (e) {}

    function showToast(msg) {
        let t = document.getElementById('awraadExitToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'awraadExitToast';
            t.className = 'exit-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
    }

    function fetchLiveVer() {
        return fetch('./version.json?chk=' + Date.now(), { cache: 'no-store' })
            .then(r => { if (!r.ok) throw new Error('no version'); return r.json(); })
            .then(d => ({ build: String(d.build || ''), stamp: 'b:' + (d.build || '') + ':' + (d.sha || '') + ':' + (d.ts || '') }))
            .catch(() => null);
    }

    function triggerUpdate(info) {
        if (updating || !info || !info.stamp) return;
        updating = true;
        try {
            localStorage.setItem(VER_KEY, info.stamp);
            sessionStorage.setItem(RELOAD_KEY, info.stamp);
        } catch (e) {}
        showToast('Naya update available — Updating...');

        const tasks = [];
        if (window.caches && caches.keys) {
            tasks.push(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).catch(() => {}));
        }
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            tasks.push(navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).catch(() => {}));
        }
        Promise.all(tasks).finally(() => {
            try {
                const next = new URL(window.location.href);
                next.searchParams.set('_u', info.build || String(Date.now()));
                window.location.replace(next.toString());
            } catch (e) {
                window.location.reload();
            }
        });
    }

    function checkUpdate(force) {
        if (updating || navigator.onLine === false) return;
        const now = Date.now();
        if (!force && (now - lastCheck) < 20000) return;
        lastCheck = now;

        const meta = document.querySelector('meta[name="makhzan-build"]');
        const loadedBuild = meta ? (meta.getAttribute('content') || '').trim() : '';

        fetchLiveVer().then(info => {
            if (!info || !info.stamp) return;
            const saved = localStorage.getItem(VER_KEY) || '';
            const reloaded = sessionStorage.getItem(RELOAD_KEY) || '';
            if (loadedBuild && info.build && loadedBuild !== info.build && reloaded !== info.stamp) {
                triggerUpdate(info);
                return;
            }
            if (!saved) { localStorage.setItem(VER_KEY, info.stamp); return; }
            if (saved !== info.stamp && reloaded !== info.stamp) triggerUpdate(info);
        }).catch(() => {});
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => checkUpdate(true));
    else checkUpdate(true);

    setInterval(() => { if (document.visibilityState === 'visible') checkUpdate(false); }, 25000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(true); });
    window.addEventListener('pageshow', () => checkUpdate(true));
    window.addEventListener('online', () => checkUpdate(true));
})();
