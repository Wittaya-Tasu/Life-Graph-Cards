// Twelve-card graph view and its controls.
    function getGraph12SourceStyleClass(index, code) {
        const supportedClasses = [
            "card-default", "card-very-good", "card-good", "card-neutral-status", "card-bad",
            "card-very-bad", "card-dark-gray", "card-black", "card-red", "card-gold-zone"
        ];
        const sourceCard = document.querySelector(`#main-board .card-item[data-row="5"][data-col="${index + 2}"]`);
        if (sourceCard) {
            const sourceClass = supportedClasses.find(className => sourceCard.classList.contains(className));
            if (sourceClass) return sourceClass;
        }
        return getCardStyleClass(code, ROW_8_TITLES[index]);
    }

    function renderGraph12Cards() {
        const cardArea = document.getElementById('graph12-card-area');
        cardArea.innerHTML = "";

        currentBoardData.GRAPH_BASE.forEach((code, index) => {
            const title = GRAPH12_TITLES[index];
            const styleClass = getGraph12SourceStyleClass(index, code);
            const card = document.createElement('article');
            card.className = `card-item graph12-card ${styleClass} ${GRAPH12_LAYOUT_CLASSES[index]}`;
            card.dataset.pos = title;
            card.dataset.code = String(code);
            card.dataset.graphIndex = String(index);
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `${title} ไพ่หมายเลข ${code}`);
            card.onclick = () => handleGraph12CardClick(title);
            card.onkeydown = event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!event.repeat) card.click();
                }
            };
            card.innerHTML = `
                <span class="graph12-link-badge" aria-hidden="true">🔗</span>
                <span class="pos-label">${title}</span>
                <img src="images/${code}.jpg" onerror="this.onerror=null;this.src='images/back.jpg';" alt="ไพ่ตำแหน่ง${title}">
            `;
            cardArea.appendChild(card);
        });
    }

    function getGraph12AgeState() {
        if (!currentBoardData) return { baseAge: 0, selectedAge: 0 };
        const baseAge = Number(currentBoardData.BASE_AGE ?? currentBoardData.AGE ?? 0);
        const selectedAge = Number(currentBoardData.SELECTED_AGE ?? baseAge);
        return { baseAge, selectedAge };
    }

    function renderGraph12AgeControls() {
        const container = document.getElementById('graph12-age-controls');
        if (!container) return;
        const { baseAge, selectedAge } = getGraph12AgeState();
        container.innerHTML = '';

        if (!Number.isInteger(baseAge) || baseAge <= 0) {
            container.innerHTML = '<div class="graph12-age-message">กรุณาระบุปี พ.ศ. เกิด เพื่อแสดงตำแหน่งอายุ</div>';
            return;
        }

        for (let offset = 0; offset < 12; offset++) {
            const age = baseAge + offset;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'graph12-age-button';
            button.dataset.graph12Age = String(age);
            button.textContent = String(age);
            button.title = age === baseAge ? `อายุปัจจุบัน ${age} ปี` : `ดูอายุ ${age} ปี`;
            button.setAttribute('aria-label', button.title);
            button.classList.toggle('is-current', age === baseAge);
            button.classList.toggle('is-selected', age === selectedAge);
            button.setAttribute('aria-pressed', String(age === selectedAge));
            button.onclick = () => selectGraph12Age(age);
            container.appendChild(button);
        }
    }

    function applyGraph12AgeOverlay() {
        document.querySelectorAll('#graph12-card-area .graph12-age-overlay').forEach(overlay => overlay.remove());
        document.querySelectorAll('#graph12-card-area .graph12-card').forEach(card => card.classList.remove('has-age'));
        updateGraph12AgeToggle();
        if (!graph12AgeVisible) return;

        const { selectedAge } = getGraph12AgeState();
        if (!Number.isInteger(selectedAge) || selectedAge <= 0) return;
        const graphIndex = (selectedAge - 1) % 12;
        const targetCard = document.querySelector(`#graph12-card-area .graph12-card[data-graph-index="${graphIndex}"]`);
        if (!targetCard) return;

        const overlay = document.createElement('span');
        overlay.className = 'graph12-age-overlay';
        overlay.textContent = String(selectedAge);
        overlay.setAttribute('aria-label', `อายุ ${selectedAge} ปี`);
        targetCard.classList.add('has-age');
        targetCard.appendChild(overlay);
    }

    function updateGraph12AgeToggle() {
        const button = document.getElementById('graph12-age-toggle');
        if (!button) return;
        button.classList.toggle('is-hidden', !graph12AgeVisible);
        button.setAttribute('aria-pressed', String(graph12AgeVisible));
        button.title = graph12AgeVisible ? 'ปิดการแสดงอายุบนไพ่' : 'เปิดการแสดงอายุบนไพ่';
    }

    function toggleGraph12AgeVisibility() {
        graph12AgeVisible = !graph12AgeVisible;
        applyGraph12AgeOverlay();
    }

    function selectGraph12Age(age) {
        selectPredictionAge(age);
    }

    function updateGraph12Controls() {
        document.querySelectorAll('.graph12-day-button').forEach(button => {
            const isActive = button.dataset.graph12Day === activeGraph12Day;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        document.querySelectorAll('.graph12-filter-button').forEach(button => {
            const isActive = button.dataset.graph12Filter === activeGraph12Filter;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        const activeDayLabel = GRAPH12_DAY_LABELS[activeGraph12Day] || "-";
        const birthDayLabel = GRAPH12_DAY_LABELS[graph12BirthDay] || "-";
        const caption = activeGraph12Day === graph12BirthDay
            ? `วันเกิดเจ้าชะตา: ${birthDayLabel} — แสดงความสัมพันธ์ตามวันเกิดอัตโนมัติ`
            : `วันเกิดเจ้าชะตา: ${birthDayLabel} — กำลังดูความสัมพันธ์: ${activeDayLabel}`;
        document.getElementById('graph12-caption').textContent = caption;
    }

    function applyGraph12Display() {
        const groups = GRAPH12_RELATION_GROUPS[activeGraph12Day] || [];
        const linkablePositions = new Set(groups.flat());
        const cards = document.querySelectorAll('#graph12-card-area .graph12-card');

        cards.forEach(card => {
            const position = card.dataset.pos;
            const status = getCardBaseStatus(card.dataset.code);
            card.classList.remove('is-linkable', 'is-linked', 'is-dimmed');
            card.classList.toggle('is-linkable', linkablePositions.has(position));

            if (activeGraph12Group) {
                if (activeGraph12Group.includes(position)) card.classList.add('is-linked');
                else card.classList.add('is-dimmed');
            } else if (activeGraph12Filter === 'good') {
                if (status !== 'VG' && status !== 'G') card.classList.add('is-dimmed');
            } else if (activeGraph12Filter === 'bad') {
                if (status !== 'VB' && status !== 'B') card.classList.add('is-dimmed');
            }
        });

        updateGraph12Controls();
    }

    function setGraph12Day(day) {
        if (!GRAPH12_RELATION_GROUPS[day]) return;
        activeGraph12Day = day;
        activeGraph12Group = null;
        activeGraph12Filter = 'reset';
        applyGraph12Display();
    }

    function handleGraph12CardClick(position) {
        const groups = GRAPH12_RELATION_GROUPS[activeGraph12Day] || [];
        const targetGroup = groups.find(group => group.includes(position));
        if (!targetGroup) return;
        activeGraph12Group = targetGroup;
        activeGraph12Filter = 'reset';
        applyGraph12Display();
    }

    function filterGraph12Cards(type) {
        if (!['good', 'bad', 'reset'].includes(type)) return;
        activeGraph12Filter = type;
        activeGraph12Group = null;
        applyGraph12Display();
    }

    function openGraph12View() {
        if (mainViewMode === 'seven') return;
        if (!currentBoardData || !Array.isArray(currentBoardData.GRAPH_BASE) || currentBoardData.GRAPH_BASE.length !== 12) {
            alert('กรุณาประมวลผลและสร้างกระดานก่อนเปิดฐานกราฟ12ใบ');
            return;
        }

        graph12BirthDay = GRAPH12_DAY_BY_CODE[String(currentBoardData.DAY[0])] || 'Sun';
        activeGraph12Day = graph12BirthDay;
        activeGraph12Group = null;
        activeGraph12Filter = 'reset';
        renderGraph12Cards();
        renderGraph12AgeControls();
        applyGraph12Display();
        applyGraph12AgeOverlay();

        document.getElementById('main-app-view').hidden = true;
        document.getElementById('graph12-view').hidden = false;
        document.getElementById('skip-to-content').href = '#graph12-title';
        refreshAccessibility();
        document.getElementById('graph12-title').focus({ preventScroll: true });
        showAppMessage('เปิดฐานกราฟ 12 ใบ');
        scheduleLayoutScaleRefresh();
        window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
    }

    function closeGraph12View() {
        document.getElementById('graph12-view').hidden = true;
        document.getElementById('main-app-view').hidden = false;
        document.getElementById('skip-to-content').href = '#main-view-title';
        document.querySelector('.btn-graph12').focus({ preventScroll: true });
        showAppMessage('กลับกระดานหลัก');
        scheduleLayoutScaleRefresh();
        document.getElementById('main-wrapper').scrollIntoView({ behavior: preferredScrollBehavior() });
    }

