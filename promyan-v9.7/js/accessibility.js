// Announcements, accessible card names and keyboard focus helpers.
    // V9.5: accessibility only; no calculation or astrological rules are changed.
    function preferredScrollBehavior() {
        return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    }
    function showAppMessage(message, isError = false) {
        const error = document.getElementById('app-error');
        const status = document.getElementById('app-status');
        error.hidden = !isError;
        error.textContent = isError ? message : '';
        status.textContent = isError ? '' : message;
    }
    function captureFocusKey() {
        const el = document.activeElement;
        if (!el) return null;
        if (el.id) return { id: el.id };
        for (const name of ['data-age','data-seven-age','data-graph12-age']) {
            if (el.hasAttribute(name)) return { name, value: el.getAttribute(name) };
        }
        return null;
    }
    function restoreFocusKey(key) {
        if (!key) return;
        const el = key.id ? document.getElementById(key.id)
            : document.querySelector('[' + key.name + '="' + key.value + '"]');
        if (el && el.getClientRects().length) el.focus({ preventScroll:true });
    }
    function refreshAccessibility() {
        const statusNames = {VG:'ดีมาก', G:'ดี', N:'ปานกลาง', B:'ร้าย', VB:'ร้ายมาก'};
        document.querySelectorAll('#main-board .card-item[data-code], #graph12-card-area .graph12-card').forEach(card => {
            const graph12 = card.classList.contains('graph12-card');
            const row = Number(card.dataset.row);
            const interactive = graph12 || row === 5 || row === 7
                || (mainViewMode === 'seven' && card.classList.contains('click-to-highlight-seven-group'));
            const position = card.querySelector('.pos-label')?.textContent || card.dataset.pos || 'ตำแหน่ง ' + (Number(card.dataset.col)-1);
            const status = statusNames[getCardBaseStatus(card.dataset.code)];
            const markers = [];
            if (card.querySelector('.sri-overlay')) markers.push('ศรี');
            if (card.querySelector('.kalee-wrapper')) markers.push('กาลี');
            const age = card.querySelector('.age-text-overlay, .graph12-age-overlay')?.textContent;
            if (age) markers.push('อายุ ' + age);
            const label = position + ' ไพ่ ' + card.dataset.code + ' ระดับ' + status + (markers.length ? ' ' + markers.join(' ') : '');
            card.setAttribute('aria-label', label);
            if (interactive) {
                card.setAttribute('role','button');
                card.tabIndex = 0;
                const selected = graph12 ? card.classList.contains('is-linked')
                    : row === 5 ? activeGraphHighlightCols.includes(card.dataset.col)
                    : row === 7 ? activeSevenCols.includes(card.dataset.col)
                    : card.classList.contains('highlighted');
                card.setAttribute('aria-pressed',String(selected));
            } else {
                card.setAttribute('role','group');
                card.removeAttribute('tabindex');
                card.removeAttribute('aria-pressed');
            }
        });
        document.querySelectorAll('.age-button, .seven-only-age-button').forEach(button => {
            button.setAttribute('aria-label','พิจารณาอายุ ' + button.textContent.trim() + ' ปี');
        });
    }
