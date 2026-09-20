// PNG capture and restoration helpers.
    function waitForGraph12Images(target) {
        const images = Array.from(target.querySelectorAll('img'));
        return Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
            });
        }));
    }

    function waitForCaptureReady(target) {
        const fontsReady = document.fonts?.ready
            ? document.fonts.ready.catch(() => undefined)
            : Promise.resolve();
        return Promise.all([waitForGraph12Images(target), fontsReady])
            .then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }

    function saveGraph12AsImage() {
        if (typeof html2canvas !== 'function') {
            alert('ไม่สามารถโหลดระบบบันทึกภาพได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่');
            return;
        }

        const target = document.getElementById('graph12-capture');
        const saveButton = document.getElementById('graph12-save-button');
        const restoreScale = prepareFullScaleCapture('graph12-capture', 'graph12-capture-wrapper', graph12LayoutScale);
        saveButton.disabled = true;
        saveButton.textContent = 'กำลังบันทึกภาพ...';
        target.setAttribute('aria-busy', 'true');
        showAppMessage('กำลังสร้างภาพฐานกราฟ 12 ใบ');
        target.classList.add('capture-safe-mode');

        waitForCaptureReady(target)
            .then(() => html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true }))
            .then(canvas => {
                const link = document.createElement('a');
                const dayLabel = GRAPH12_DAY_LABELS[activeGraph12Day] || 'วันเกิด';
                link.download = `ฐานกราฟ12ใบ-${dayLabel}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                showAppMessage('สร้างภาพฐานกราฟ 12 ใบแล้ว โปรดตรวจไฟล์ดาวน์โหลด');
            })
            .catch(() => showAppMessage('ไม่สามารถบันทึกภาพได้ กรุณาลองใหม่อีกครั้ง', true))
            .finally(() => {
                target.classList.remove('capture-safe-mode');
                target.removeAttribute('aria-busy');
                restoreScale();
                saveButton.disabled = false;
                saveButton.textContent = 'บันทึกเป็นภาพ';
            });
    }


    function saveAsImage() {
        if (typeof html2canvas !== 'function') {
            alert('ไม่สามารถโหลดระบบบันทึกภาพได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่');
            return;
        }
        const target = document.getElementById('export-area');
        const saveButton = document.querySelector('.btn-save-image');
        if (saveButton.disabled) return;
        const focusKey = captureFocusKey();
        saveButton.disabled = true;
        target.setAttribute('aria-busy', 'true');
        showAppMessage('กำลังสร้างภาพแผนผัง');
        const restoreScale = prepareFullScaleCapture('export-area', 'main-wrapper', mainBoardScale);
        target.classList.add('capture-safe-mode');
        document.querySelectorAll('.number-dropdown, .manual-input, .client-info-box').forEach(el => {
            let span = document.createElement('span'); span.className = 'temp-span';
            el.dataset.captureDisplay = el.style.display || '';
            if (el.classList.contains('client-info-box')) { span.innerText = el.value || (el.placeholder ? el.placeholder : " "); span.style.cssText = "color:#FFFFFF; font-weight:bold; font-size:1.4vw; font-family:'Sarabun', sans-serif; display:block; padding:10px 15px;"; } 
            else { span.innerText = el.value || ""; span.style.cssText = `color:${el.style.color}; font-weight:900; font-size:1.6vw; font-family:'Sarabun', sans-serif; display:flex; align-items:center; justify-content:center; width:100%; height:100%;`; }
            el.style.display = 'none'; el.parentNode.appendChild(span);
        });

        renderGraphDiagonalGuides();
        waitForCaptureReady(target).then(() => html2canvas(target, { scale: 2, backgroundColor: "#293A4B", useCORS: true })).then(canvas => {
            let link = document.createElement('a'); link.download = 'กราฟชีวิต-หมอวิทยา.png'; link.href = canvas.toDataURL(); link.click();
            showAppMessage('สร้างภาพแผนผังแล้ว โปรดตรวจไฟล์ดาวน์โหลด');
        }).catch(error => {
            console.error('saveAsImage failed', error);
            showAppMessage('ไม่สามารถบันทึกภาพได้ กรุณาลองใหม่อีกครั้ง', true);
        }).finally(() => {
            document.querySelectorAll('.temp-span').forEach(s => s.remove());
            document.querySelectorAll('.number-dropdown, .manual-input, .client-info-box').forEach(el => {
                el.style.display = el.dataset.captureDisplay || '';
                delete el.dataset.captureDisplay;
            });
            target.classList.remove('capture-safe-mode');
            target.removeAttribute('aria-busy');
            saveButton.disabled = false;
            restoreScale();
            scheduleGraphDiagonalGuides();
            restoreFocusKey(focusKey);
        });
    }


