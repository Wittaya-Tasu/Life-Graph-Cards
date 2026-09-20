// View mode, display scaling and capture scale helpers.
    function applyMainViewMode() {
        const appView = document.getElementById('main-app-view');
        const board = document.getElementById('main-board');
        const isSevenOnly = mainViewMode === 'seven';
        if (!appView) return;

        appView.classList.toggle('seven-only-view', isSevenOnly);
        document.querySelectorAll('.main-view-mode-button').forEach(button => {
            const isActive = button.dataset.mainViewMode === mainViewMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        const title = document.getElementById('main-view-title');
        if (title) {
            title.textContent = isSevenOnly
                ? '🔮 กระดานพยากรณ์ เลขเจ็ดตัว 9 ฐาน'
                : '🔮 กระดานพยากรณ์ กราฟชีวิต & เลขเจ็ดตัว 9 ฐาน';
        }

        if (isSevenOnly && board) {
            clearGraphHighlight();
            activeR5Filter = null;
            applyR5Filter();
            sevenLabelsVisible = true;
            applySevenLabelVisibility();
        }
        applySevenStrengthVisuals();
        scheduleLayoutScaleRefresh();
        scheduleSevenPairRelationships();
    }

    function setMainViewMode(mode) {
        if (mode !== 'combined' && mode !== 'seven') return;
        mainViewMode = mode;
        applyMainViewMode();
    }

    function normalizeLayoutScale(value) {
        const numericValue = parseInt(value, 10);
        return LAYOUT_SCALE_OPTIONS.includes(numericValue) ? numericValue : 100;
    }

    function applyScaledLayout(targetId, wrapperId, percent) {
        const target = document.getElementById(targetId);
        const wrapper = document.getElementById(wrapperId);
        if (!target || !wrapper) return;
        const scale = normalizeLayoutScale(percent) / 100;
        target.style.transform = scale === 1 ? 'none' : `scale(${scale})`;
        const unscaledHeight = target.offsetHeight;
        if (!unscaledHeight) return;
        wrapper.style.height = scale === 1 ? '' : `${Math.ceil(unscaledHeight * scale)}px`;
    }

    function setMainBoardScale(value) {
        mainBoardScale = normalizeLayoutScale(value);
        const control = document.getElementById('main-layout-scale');
        if (control) control.value = String(mainBoardScale);
        applyScaledLayout('export-area', 'main-wrapper', mainBoardScale);
        scheduleGraphDiagonalGuides();
        scheduleSevenPairRelationships();
    }

    function setGraph12LayoutScale(value) {
        graph12LayoutScale = value === 'fit' ? 'fit' : normalizeLayoutScale(value);
        const control = document.getElementById('graph12-layout-scale');
        if (control) control.value = String(graph12LayoutScale);
        applyGraph12LayoutScale();
    }

    // Fit only the four card rows; title and age controls retain readable sizes.
    function applyGraph12LayoutScale() {
        const view = document.getElementById('graph12-view');
        const capture = document.getElementById('graph12-capture');
        if (!view || view.hidden || capture.hasAttribute('aria-busy')) return;
        const area = document.getElementById('graph12-card-area');
        const viewport = document.getElementById('graph12-card-viewport');
        const fit = graph12LayoutScale === 'fit';
        capture.classList.toggle('is-fit-screen', fit);
        area.style.transform = 'none';
        area.style.setProperty('--graph12-fit-scale', '1');
        viewport.style.height = '';
        applyScaledLayout('graph12-capture', 'graph12-capture-wrapper', fit ? 100 : graph12LayoutScale);
        if (!fit || !area.offsetHeight) return;

        // Document coordinates avoid changing the scale when the user scrolls.
        const top = viewport.getBoundingClientRect().top + window.scrollY;
        const footer = capture.lastElementChild;
        const footerStyle = getComputedStyle(footer);
        const bottomSpace = footer.offsetHeight + parseFloat(footerStyle.marginTop)
            + parseFloat(getComputedStyle(capture).paddingBottom)
            + parseFloat(getComputedStyle(view).paddingBottom) + 14;
        const available = Math.max(80, window.innerHeight - top - bottomSpace);
        // Leave room for focus outlines, link badges and highlighted card growth.
        // Labels stay at a readable screen size. Solve the scale including their height.
        let low = 0.01, high = 1;
        for (let step = 0; step < 12; step++) {
            const candidate = (low + high) / 2;
            area.style.setProperty('--graph12-fit-scale', String(candidate));
            if (area.offsetHeight * candidate <= available - 24) low = candidate;
            else high = candidate;
        }
        const scale = low;
        area.style.setProperty('--graph12-fit-scale', String(scale));
        area.style.transform = `scale(${scale})`;
        viewport.style.height = `${Math.ceil(area.offsetHeight * scale) + 24}px`;
    }

    function refreshLayoutScales() {
        layoutScaleRenderFrame = null;
        applyScaledLayout('export-area', 'main-wrapper', mainBoardScale);
        applyGraph12LayoutScale();
        scheduleGraphDiagonalGuides();
        scheduleSevenPairRelationships();
    }

    function scheduleLayoutScaleRefresh() {
        if (layoutScaleRenderFrame !== null) cancelAnimationFrame(layoutScaleRenderFrame);
        layoutScaleRenderFrame = requestAnimationFrame(refreshLayoutScales);
    }

    function prepareFullScaleCapture(targetId, wrapperId, displayScale) {
        const target = document.getElementById(targetId);
        if (!target) return () => {};
        const graphCapture = targetId === 'graph12-capture';
        if (graphCapture) {
            target.classList.remove('is-fit-screen');
            document.getElementById('graph12-card-area').style.transform = 'none';
            document.getElementById('graph12-card-viewport').style.height = '';
        }
        const previousInlineTransition = target.style.transition;
        target.style.transition = 'none';
        applyScaledLayout(targetId, wrapperId, 100);
        void target.offsetHeight;
        return () => {
            if (graphCapture) applyGraph12LayoutScale();
            else applyScaledLayout(targetId, wrapperId, displayScale);
            void target.offsetHeight;
            target.style.transition = previousInlineTransition;
            scheduleLayoutScaleRefresh();
        };
    }

