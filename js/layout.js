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
        graph12LayoutScale = normalizeLayoutScale(value);
        const control = document.getElementById('graph12-layout-scale');
        if (control) control.value = String(graph12LayoutScale);
        applyScaledLayout('graph12-capture', 'graph12-capture-wrapper', graph12LayoutScale);
    }

    function refreshLayoutScales() {
        layoutScaleRenderFrame = null;
        applyScaledLayout('export-area', 'main-wrapper', mainBoardScale);
        applyScaledLayout('graph12-capture', 'graph12-capture-wrapper', graph12LayoutScale);
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
        const previousInlineTransition = target.style.transition;
        target.style.transition = 'none';
        applyScaledLayout(targetId, wrapperId, 100);
        void target.offsetHeight;
        return () => {
            applyScaledLayout(targetId, wrapperId, displayScale);
            void target.offsetHeight;
            target.style.transition = previousInlineTransition;
            scheduleLayoutScaleRefresh();
        };
    }

