// Register events after all dependencies have loaded. Keep this script last.
    window.addEventListener('resize', scheduleLayoutScaleRefresh);
    document.addEventListener('load', event => {
        if (event.target instanceof HTMLImageElement) {
            scheduleLayoutScaleRefresh();
            scheduleSevenPairRelationships();
        }
    }, true);


    document.addEventListener('keydown', event => {
        const card = event.target.closest('#main-board .card-item[role="button"]');
        if (card && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            if (!event.repeat) card.click();
        }
    });
    document.addEventListener('click', event => {
        const control = event.target.closest('button, .card-item[role="button"]');
        if (!control) return;
        queueMicrotask(() => {
            refreshAccessibility();
            if (control.classList.contains('card-item')) {
                showAppMessage((control.getAttribute('aria-label') || '') +
                    (control.getAttribute('aria-pressed') === 'true' ? ' เลือกแล้ว' : 'ยกเลิกการเลือกแล้ว'));
            }
        });
    });


    window.addEventListener('resize', scheduleGraphDiagonalGuides);
    if (document.fonts?.ready) document.fonts.ready.then(() => {
        scheduleGraphDiagonalGuides();
        scheduleSevenPairRelationships();
    });

    verifyNineBaseGoldenTest();
