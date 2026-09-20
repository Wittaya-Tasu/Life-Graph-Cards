// Input handling, main board, base 8/9, pair links and age selection.
    function generateAndRender() {
        const valDate = parseInt(document.getElementById('sel-date').value);
        const valDay = parseInt(document.getElementById('sel-day').value);
        const valMonth = document.getElementById('sel-month').value;
        const valYear = parseInt(document.getElementById('sel-year').value);
        const birthYear = parseInt(document.getElementById('birth-be-year').value);
        
        const ageMode = parseInt(document.getElementById('sel-age-mode').value);
        const zodiacMode = parseInt(document.getElementById('sel-zodiac-row').value);
        const taksaMode = parseInt(document.getElementById('sel-taksa').value);
        const timelineMode = parseInt(document.getElementById('sel-timeline').value);

        const requiredFields = ['sel-date', 'sel-day', 'sel-month', 'sel-year'].map(id => document.getElementById(id));
        requiredFields.forEach(field => field.setAttribute('aria-invalid', String(!field.value)));
        const missing = requiredFields.find(field => !field.value);
        const birthYearField = document.getElementById('birth-be-year');
        birthYearField.removeAttribute('aria-invalid');
        if (missing) {
            showAppMessage('กรุณาเลือกวันที่ วัน เดือน และปีนักษัตรให้ครบ', true);
            missing.focus();
            return;
        }
        if (birthYearField.value && !birthYearField.checkValidity()) {
            birthYearField.setAttribute('aria-invalid', 'true');
            showAppMessage('ปี พ.ศ. เกิดต้องอยู่ระหว่าง 2400–2600', true);
            birthYearField.focus();
            return;
        }
        showAppMessage('กำลังประมวลผลแผนผัง');

        let age = 0;
        if (birthYear > 2400) {
            const birthDayNum = valDate - 400; 
            const birthMonthNum = MONTH_CALENDAR_MAP[valMonth]; 
            const today = new Date();
            const currentYearBE = today.getFullYear() + 543;
            const currentMonthNum = today.getMonth() + 1; 
            const currentDayNum = today.getDate();
            age = currentYearBE - birthYear; 
            if (currentMonthNum < birthMonthNum || (currentMonthNum === birthMonthNum && currentDayNum < birthDayNum)) { age--; }
        }

        const daySeq = generateSequence(valDay, 7, 101, 107);
        const monthSeq = generateSequence(parseInt(valMonth), 12, 201, 212);
        const yearSeq = generateSequence(valYear, 12, 301, 312);
        const nineBases = calculateNineBaseCore(valDay, parseInt(valMonth), valYear);

        let graphBase = []; let usedGraphCards = new Set();
        for (let i = 0; i < 12; i++) {
            let dVal = (i < 7) ? (daySeq[i] % 100) : 0; 
            let mVal = monthSeq[i] % 100; let yVal = yearSeq[i] % 100;
            let sum = dVal + mVal + yVal; let targetCard = 400 + sum;
            if (usedGraphCards.has(targetCard)) {
                let groupId = sum % 12 || 12; let groupCards = GRAPH_GROUPS[groupId];
                let availableCards = groupCards.filter(c => !usedGraphCards.has(c));
                if (availableCards.length > 0) targetCard = availableCards[0];
            }
            usedGraphCards.add(targetCard); graphBase.push(targetCard);
        }

        let sevenBase = [];
        let posMonth = calculateDynamicPositions(monthSeq, 201);
        let posYear = calculateDynamicPositions(yearSeq, 301);
        for (let i = 0; i < 7; i++) {
            let dVal = daySeq[i] % 100; 
            let mIdx = posMonth[i]; let mVal = ((monthSeq[mIdx] - 201) % 7) + 1; 
            let yIdx = posYear[i]; let yVal = ((yearSeq[yIdx] - 301) % 7) + 1;
            sevenBase.push(400 + (dVal + mVal + yVal));
        }

        activeR5Filter = null;
        graphHighlightMode = "vertical";
        sevenLabelsVisible = true;
        buildBoardUI({
            DATE: [valDate.toString()], DAY: daySeq.map(String), MONTH: monthSeq.map(String), posMonth: posMonth,
            YEAR: yearSeq.map(String), posYear: posYear, GRAPH_BASE: graphBase.map(String), SEVEN_BASE: sevenBase.map(String),
            NINE_BASES: nineBases,
            AGE: age, BASE_AGE: age, SELECTED_AGE: age,
            AGE_MODE: ageMode, ZODIAC_MODE: zodiacMode, TAKSA_MODE: taksaMode, TIMELINE_MODE: timelineMode
        });
    }

    function renderNineBaseRows(board, data) {
        const nineBases = data.NINE_BASES;
        if (!nineBases || !Array.isArray(nineBases.base8) || !Array.isArray(nineBases.base9)) return;

        const renderBase = (baseNumber, houses, values, boardRow) => {
            let cellsHtml = '';
            houses.forEach((house, index) => {
                const number = Number(values[index]);
                const col = index + 1;
                const dangerClass = house === 'โจร' || house === 'อุบาทว์' ? ' is-danger' : '';
                const label = `ฐาน ${baseNumber} ภพ${house} เลข ${number}`;
                cellsHtml += `<div class="nine-base-position dim-target-seven" data-nine-base="${baseNumber}" data-nine-number="${number}" data-nine-position="${index + 1}" style="grid-area:1 / ${col};">`;
                cellsHtml += `<button type="button" class="nine-base-cell nine-base-name${dangerClass}" aria-label="${label}" aria-pressed="false" onclick="toggleNineBaseNumber(${number})">${house}</button>`;
                cellsHtml += `<button type="button" class="nine-base-cell nine-base-number" aria-label="${label}" aria-pressed="false" onclick="toggleNineBaseNumber(${number})">${number}</button>`;
                cellsHtml += `</div>`;
            });
            board.innerHTML += `<div class="nine-base-block" data-nine-base-block="${baseNumber}" style="grid-area:${boardRow} / 2 / span 1 / span 7;">${cellsHtml}</div>`;
        };

        renderBase(8, BASE_8_HOUSES, nineBases.base8, 6);
        renderBase(9, BASE_9_HOUSES, nineBases.base9, 7);
    }

    function createSevenPairSymbolHtml(relationType) {
        const relation = SEVEN_PAIR_META[relationType];
        if (!relation) return '';
        const symbolHtml = relationType === 'self'
            ? `<svg class="seven-pair-chevron-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 17 L16 6 L27 17"></path><path d="M5 27 L16 16 L27 27"></path></svg>`
            : `<span class="seven-pair-icon ${relation.iconClass}"></span>`;
        return `<span class="seven-pair-symbol">${symbolHtml}</span>`;
    }

    function removeSevenPairOverlay() {
        document.querySelector('#main-board .seven-pair-overlay')?.remove();
    }

    function renderSevenPairRelationships() {
        sevenPairRenderFrame = null;
        const board = document.getElementById('main-board');
        removeSevenPairOverlay();
        if (!board || mainViewMode !== 'seven' || !currentBoardData) return;

        const boardRect = board.getBoundingClientRect();
        const scaleX = board.offsetWidth > 0 ? boardRect.width / board.offsetWidth : 1;
        const scaleY = board.offsetHeight > 0 ? boardRect.height / board.offsetHeight : scaleX;
        if (!boardRect.width || !boardRect.height || !scaleX || !scaleY) return;

        const overlay = document.createElement('div');
        overlay.className = 'seven-pair-overlay';
        overlay.setAttribute('aria-hidden', 'true');

        for (let slotIndex = 0; slotIndex < 7; slotIndex++) {
            const yearCard = board.querySelector(`.card-item[data-row="4"][data-seven-slot="${slotIndex}"]`);
            const baseCard = board.querySelector(`.card-item[data-row="7"][data-seven-slot="${slotIndex}"]`);
            if (!yearCard || !baseCard) continue;

            const yearNumber = Number(CARD_GROUPS[String(yearCard.dataset.code)]);
            const baseNumber = Number(baseCard.dataset.code) - 400;
            const relationType = SEVEN_PAIR_RELATIONS[`${yearNumber}-${baseNumber}`];
            const relation = SEVEN_PAIR_META[relationType];
            if (!relation) continue;

            const yearRect = yearCard.getBoundingClientRect();
            const baseRect = baseCard.getBoundingClientRect();
            const centerX = (((yearRect.left + yearRect.right + baseRect.left + baseRect.right) / 4) - boardRect.left) / scaleX;
            const centerY = (((yearRect.bottom + baseRect.top) / 2) - boardRect.top) / scaleY;
            const sourceCol = String(yearCard.dataset.col || baseCard.dataset.col || '');
            const description = `เลขปีนักษัตร ${yearNumber} กับเลขไพ่ฐาน ${baseNumber}: ${relation.name} — ${relation.effect}`;

            const marker = document.createElement('div');
            marker.className = 'seven-pair-marker';
            marker.style.left = `${centerX}px`;
            marker.style.top = `${centerY}px`;
            marker.innerHTML = `<div class="seven-pair-relationship dim-target-seven ${relation.className}" data-seven-relation="${relationType}" data-row="4" data-col="${sourceCol}" title="${description}">${createSevenPairSymbolHtml(relationType)}</div>`;
            overlay.appendChild(marker);
        }

        board.appendChild(overlay);
        if (board.classList.contains('has-seven-highlight')) {
            overlay.querySelectorAll('.seven-pair-relationship').forEach(marker => {
                marker.classList.toggle('highlighted', activeSevenCols.includes(String(marker.dataset.col)));
            });
        }
    }

    function scheduleSevenPairRelationships() {
        if (sevenPairRenderFrame !== null) cancelAnimationFrame(sevenPairRenderFrame);
        sevenPairRenderFrame = requestAnimationFrame(() => {
            sevenPairRenderFrame = requestAnimationFrame(renderSevenPairRelationships);
        });
    }

    function buildBoardUI(data, shouldScroll = true) {
        const board = document.getElementById('main-board');
        currentBoardData = data;
        const baseAge = data.BASE_AGE ?? data.AGE;
        const selectedAge = data.SELECTED_AGE ?? baseAge;
        board.innerHTML = '';
        board.classList.remove('has-graph-highlight', 'has-seven-highlight');
        activeGraphHighlightCols = []; activeSevenCols = []; 

        const posRow10 = calculateDynamicPositions(data.YEAR, "301");
        const badTitles = ["ความเสื่อม", "ศัตรู", "สูญเสีย", "โรคภัย"];

        let sriNum = 0; let kaleeNum = 0;
        if (selectedAge > 0 && data.TAKSA_MODE === 1) {
            const path9 = [1, 5, 2, 3, 4, 7, 5, 8, 6]; const path8 = [1, 2, 3, 4, 7, 5, 8, 6];    
            let startDayNum = parseInt(data.DAY[0]) % 100; 
            
            // 🛠️ แก้ไข: วันพฤหัสบดี (5) ให้เริ่มที่ตำแหน่ง 5 ตัวที่ 2 (index 6)
            let startIndex9 = (startDayNum === 5) ? path9.lastIndexOf(5) : path9.indexOf(startDayNum);
            
            let boriwanNum = path9[(startIndex9 + selectedAge - 1) % 9];
            
            let startIndex8 = path8.indexOf(boriwanNum);
            sriNum = path8[(startIndex8 + 3) % 8]; // ศรี = ตำแหน่งที่ 4 (+3 จากบริวาร)
            kaleeNum = path8[(startIndex8 + 7) % 8]; // กาลี = ตำแหน่งที่ 8 (+7 จากบริวาร)
        }

        let target21Title = ""; 
        let targetBGridCol_Sys1 = -1; // คอลัมน์แถว 7 จากระบบ 21 ภพ
        let targetBGridCol_Sys2 = -1; // คอลัมน์แถว 7 จากระบบ 7 ฐาน

        if (selectedAge > 0 && data.AGE_MODE > 0) {
            
            // ระบบที่ 1: นับอายุแบบ 21 ภพ (สำหรับแถว 2, 3, 4)
            let targetIdx21 = (selectedAge - 1) % 21; let targetACode = "";
            if (targetIdx21 < 7) { target21Title = ROW_2_TITLES[targetIdx21]; targetACode = data.DAY[targetIdx21]; } 
            else if (targetIdx21 < 14) { let posIdx = targetIdx21 - 7; target21Title = ROW_4_TITLES[posIdx]; targetACode = data.MONTH[data.posMonth[posIdx]]; } 
            else { let posIdx = targetIdx21 - 14; target21Title = ROW_6_TITLES[posIdx]; targetACode = data.YEAR[data.posYear[posIdx]]; }

            // หา column สำหรับแถว 7 จากกลุ่มไพ่ของระบบ 21 ภพ
            let targetAGroup = CARD_GROUPS[targetACode];
            for (let i = 0; i < 7; i++) {
                let yearIdx = data.posYear[i];
                if (CARD_GROUPS[data.YEAR[yearIdx]] === targetAGroup) { targetBGridCol_Sys1 = yearIdx + 2; break; }
            }

            // ระบบที่ 2: นับอายุแบบ 7 ฐาน (วนลูป 7 ปี เฉพาะแถวฐาน)
            let targetIdx7 = (selectedAge - 1) % 7;
            targetBGridCol_Sys2 = posRow10[targetIdx7] + 2; 
        }

        const addCard = (code, gridRow, gridCol, title, sevenSlot = null) => {
            if (!code) return;
            // V2: ใช้สีสถานะกับไพ่ทุกแถว ไม่จำกัดเฉพาะแถวฐานกราฟชีวิต
            let styleClass = getCardStyleClass(code, title);
            let dimClasses = gridRow >= 2 ? "dim-target-graph dim-target-seven" : "";
            let clickClass = ""; let extraAttr = "";

            if (gridRow === 5) { clickClass = "click-to-highlight-graph"; extraAttr = `onclick="toggleGraphHighlight(${gridCol})" title="คลิกเพื่อเน้นไพ่กราฟชีวิต"`; } 
            else if (gridRow === 7) { clickClass = "click-to-highlight-seven"; extraAttr = `onclick="toggleSevenHighlight(${gridCol})" title="คลิกเพื่อดูความสัมพันธ์กลุ่มไพ่เลข 7 ตัว"`; }
            else if (gridRow >= 2 && gridRow <= 4 && title) { clickClass = "click-to-highlight-seven-group"; extraAttr = `onclick="toggleSevenGroupFromCard(this)" title="คลิกเพื่อดูไพ่และตำแหน่งเลข 7 ตัวที่สัมพันธ์กัน"`; }

            let titleHtml = "";
            if (title) {
                let dangerClass = badTitles.includes(title) ? " label-danger" : "";
                let systemClass = gridRow >= 2 && gridRow <= 4 ? " seven-position-label" : "";
                titleHtml = `<span class="pos-label${dangerClass}${systemClass}">${title}</span>`;
            }

            let overlayHtml = ""; let isKalee = false;
            if (selectedAge > 0 && data.TAKSA_MODE === 1) {
                let isSevenSystem = (gridRow >= 2 && gridRow <= 4 && title != null); let isSri = false;
                if (sriNum >= 1 && sriNum <= 7) { isSri = isSevenSystem && (CARD_GROUPS[code] === sriNum); } else if (sriNum === 8) { isSri = (gridRow === 7 && code === "412"); }
                if (kaleeNum >= 1 && kaleeNum <= 7) { isKalee = isSevenSystem && (CARD_GROUPS[code] === kaleeNum); } else if (kaleeNum === 8) { isKalee = (gridRow === 7 && code === "412"); }
                
                if (isSri) { overlayHtml += `<div class="sri-overlay"></div>`; }
                
                if (isKalee) {
                    if (badTitles.includes(title) || (code === "412" && gridRow === 7)) {
                        overlayHtml += `<div class="kalee-danger-circle"><div class="kalee-wrapper"></div></div>`;
                    } else { 
                        overlayHtml += `<div class="kalee-wrapper"></div>`; 
                    }
                }
            }

            if (selectedAge > 0 && data.AGE_MODE > 0) {
                let isTargetA = ((gridRow === 2 || gridRow === 3 || gridRow === 4) && title === target21Title);
                let isTargetB_Sys1 = (gridRow === 7 && gridCol === targetBGridCol_Sys1);
                let isTargetB_Sys2 = (gridRow === 7 && gridCol === targetBGridCol_Sys2);

                // ถ้าเป็นจุดตกอายุของระบบใดระบบหนึ่ง หรือทั้งคู่
                if (isTargetA || isTargetB_Sys1 || isTargetB_Sys2) {
                    
                    // เช็คว่าจุดตกอายุนั้นเป็นตำแหน่งอันตรายไหม (อ้างอิงจากตำแหน่ง 21 ภพ)
                    let isDangerAge = false;
                    if ((isTargetA || isTargetB_Sys1) && badTitles.includes(target21Title)) {
                        isDangerAge = true;
                    }

                    let ageClass = "default";
                    if (isDangerAge) { 
                        if (isKalee) ageClass = "kalee-overlap"; else ageClass = "danger danger-circle"; 
                    } else {
                        // ถ้าตกกาลีแต่ไม่ได้ตกภพเสีย ให้ตัวหนังสือเป็นสีขาวจะได้อ่านชัดๆ บนวงกลมแดง
                        if (isKalee) ageClass = "kalee-overlap"; 
                    }
                    overlayHtml += `<div class="age-text-overlay ${ageClass}">${selectedAge}</div>`;
                }
            }

            const sevenSlotAttr = Number.isInteger(sevenSlot) ? ` data-seven-slot="${sevenSlot}"` : "";
            board.innerHTML += `<div class="card-item ${styleClass} ${dimClasses} ${clickClass}" data-col="${gridCol}" data-row="${gridRow}" data-code="${code}" data-has-title="${title ? 'true' : 'false'}"${sevenSlotAttr} style="grid-area: ${gridRow} / ${gridCol}; position:relative;" ${extraAttr}>
                    ${titleHtml}<img src="images/${code}.jpg" alt="ไพ่ ${code}" onerror="this.onerror=null;this.src='images/back.jpg';">${overlayHtml}</div>`;
        }

        addCard(data.DATE[0], 1, 2, null);
        board.innerHTML += `<div class="client-info-container" style="grid-area: 1 / 3 / span 1 / span 6;">
            <div style="display:flex; flex-direction:column; width:100%; text-align:left;">
                <input type="text" id="db-name" aria-label="ชื่อเจ้าชะตา" class="client-info-box" placeholder="เจ้าชะตา :" style="height:100%;">
                <input type="text" id="db-dob" aria-label="วันเดือนปีเกิดเจ้าชะตา" class="client-info-box" placeholder="วันเดือนปีเกิด :" style="height:100%;">
                <input type="text" id="db-note" aria-label="ข้อมูลประกอบ" class="client-info-box" placeholder="ข้อมูลประกอบ :" style="height:100%;">
            </div></div>`;
        let tHtml = `<div style="grid-area: 1/9/1/15; display:flex; gap:10px; position:relative;">`;
        TEACHER_CARDS.forEach(c => tHtml += `<div class="card-item card-default" style="flex:1;"><img src="images/${c}.jpg" alt="ไพ่ครู ${c}"></div>`);
        tHtml += `<div class="teacher-overlay-text">ลิขสิทธิ์ พรหมญาณพยากรณ์ : หมอวิทยา ธรรมนาย</div></div>`;
        board.innerHTML += tHtml;
        board.innerHTML += `<div class="teacher-watermark" style="grid-area: 2/9/2/15;">พรหมญาณพยากรณ์ โดย หมอวิทยา ธรรมนาย</div>`;

        let sevenAgePanelHtml = `<div class="seven-only-age-panel" aria-label="เลือกอายุสำหรับระบบเลข 7 ตัว">`;
        if (Number.isInteger(baseAge) && baseAge > 0) {
            for (let offset = 0; offset < 12; offset++) {
                const ageValue = baseAge + offset;
                const currentClass = ageValue === baseAge ? " is-current" : "";
                const selectedClass = ageValue === selectedAge ? " is-selected" : "";
                sevenAgePanelHtml += `<button type="button" class="seven-only-age-button${currentClass}${selectedClass}" data-seven-age="${ageValue}" aria-pressed="${ageValue === selectedAge}" title="ดูทักษาและตำแหน่งอายุ ${ageValue} ปี" onclick="selectPredictionAge(${ageValue})">${ageValue}</button>`;
            }
        } else {
            sevenAgePanelHtml += `<div class="seven-only-age-message">ระบุปี พ.ศ. เกิด<br>เพื่อแสดงปุ่มอายุ</div>`;
        }
        sevenAgePanelHtml += `</div>`;
        board.innerHTML += sevenAgePanelHtml;

        board.innerHTML += `<div class="seven-strength-summary-panel" aria-live="polite" aria-label="สรุปคะแนนความแข็งแรงของชุดเลข 1 ถึง 7"></div>`;

        data.DAY.forEach((c, i) => addCard(c, 2, i + 2, ROW_2_TITLES[i], i));
        data.MONTH.forEach((c, i) => {
            let idx = calculateDynamicPositions(data.MONTH, "201").indexOf(i);
            addCard(c, 3, i + 2, idx !== -1 ? ROW_4_TITLES[idx] : null, idx !== -1 ? idx : null);
        });
        data.YEAR.forEach((c, i) => {
            let idx = calculateDynamicPositions(data.YEAR, "301").indexOf(i);
            addCard(c, 4, i + 2, idx !== -1 ? ROW_6_TITLES[idx] : null, idx !== -1 ? idx : null);
        });
        board.innerHTML += `<div class="board-mode-controls" style="grid-area: 4/14;" aria-label="รูปแบบการเน้นไพ่กราฟชีวิต">
            <button type="button" class="board-control-button graph-mode-button vertical" data-graph-mode="vertical" aria-label="แสดงไพ่กราฟชีวิตแบบแนวดิ่ง" aria-pressed="true" title="แนวดิ่ง" onclick="setGraphHighlightMode('vertical')"></button>
            <button type="button" class="board-control-button graph-mode-button diagonal" data-graph-mode="diagonal" aria-label="แสดงไพ่กราฟชีวิตแบบแนวทแยง" aria-pressed="false" title="แนวทแยง" onclick="setGraphHighlightMode('diagonal')"></button>
        </div>`;
        board.innerHTML += `<div class="r5-filter-controls" style="grid-area: 5/1;" aria-label="ตัวกรองสถานะไพ่แถวกราฟชีวิต">
            <button type="button" class="r5-filter-button good" data-r5-filter="good" aria-label="แสดงไพ่ดีและดีมาก" aria-pressed="false" title="แสดงไพ่ดีและดีมาก" onclick="toggleR5Filter('good')"></button>
            <button type="button" class="r5-filter-button bad" data-r5-filter="bad" aria-label="แสดงไพ่ร้ายและร้ายมาก" aria-pressed="false" title="แสดงไพ่ร้ายและร้ายมาก" onclick="toggleR5Filter('bad')"></button>
        </div>`;
        board.innerHTML += `<div class="seven-label-controls" style="grid-area: 5/14;" aria-label="การแสดงชื่อตำแหน่งเลข 7 ตัว">
            <button type="button" class="board-control-button seven-label-toggle" aria-label="เปิดหรือปิดชื่อตำแหน่งเลข 7 ตัว" aria-pressed="true" title="เปิด/ปิด ชื่อตำแหน่งเลข 7 ตัว" onclick="toggleSevenLabels()">7</button>
        </div>`;
        data.GRAPH_BASE.forEach((c, i) => addCard(c, 5, i + 2, ROW_8_TITLES[i]));
        applyR5Filter();

        let activePosRow6 = DAY_RELATION_MAP[data.DAY[0]] || [];
        for(let col = 2; col <= 13; col++) {
            let idx = col - 2; let autoNum = ""; let bg = "#293A4B"; let color = "transparent";
            if (activePosRow6.includes(idx)) { autoNum = ((parseInt(data.GRAPH_BASE[idx]) - 401) % 12) + 1; bg = NUMBER_COLORS[autoNum].bg; color = NUMBER_COLORS[autoNum].color; }
            let opts = `<option value="" style="color:#000; font-family:'Sarabun', sans-serif;">-</option>`; 
            for(let n=1; n<=12; n++) opts += `<option value="${n}" ${n==autoNum?'selected':''} style="color:#000; font-family:'Sarabun', sans-serif;">${n}</option>`;
            board.innerHTML += `<div class="dropdown-cell dim-target-graph dim-target-seven" data-row="6" data-col="${col}" style="grid-area: 6/${col}; background-color:${bg};"><select aria-label="เลขกำกับกราฟ ตำแหน่ง ${col - 1}" class="number-dropdown" onchange="updateDropdown(this)" style="color:${color};">${opts}</select></div>`;
        }

        data.SEVEN_BASE.forEach((c, i) => addCard(c, 7, posRow10[i] + 2, null, i));
        renderNineBaseRows(board, data);

        let startAgeCol = (baseAge > 0) ? ((baseAge - 1) % 12) : -1;
        for(let col = 2; col <= 13; col++) {
            let idx = col - 2; let val = ""; let cellBg = "#293A4B"; let textColor = "transparent"; let borderStyle = "none";
            if (baseAge > 0 && data.AGE_MODE > 0) {
                let diff = idx - startAgeCol; if (diff < 0) diff += 12; 
                if (diff < data.AGE_MODE) {
                    let displayAge = baseAge + diff; val = displayAge;
                    let graphIdx = idx; let sevenIdx = (displayAge - 1) % 7; 
                    let graphCode = data.GRAPH_BASE[graphIdx]; let sevenCode = data.SEVEN_BASE[sevenIdx]; let cardTitle = ROW_8_TITLES[graphIdx];
                    let graphStatus = getCardBaseStatus(graphCode); let sevenStatus = getCardBaseStatus(sevenCode);
                    let matrixStyles = getAgeMatrixStyles(graphStatus, sevenStatus);
                    cellBg = matrixStyles.bg; textColor = matrixStyles.text; borderStyle = matrixStyles.border;
                    if (cardTitle === "ศัตรู" || cardTitle === "โรคภัย") textColor = "#000000";
                }
            }
            if (val !== "") {
                let selectedClass = val === selectedAge ? " is-selected" : "";
                let currentClass = val === baseAge ? " is-current" : "";
                board.innerHTML += `<button type="button" class="age-button dim-target-graph dim-target-seven${selectedClass}${currentClass}" data-row="8" data-col="${col}" data-age="${val}" aria-pressed="${val === selectedAge}" onclick="selectPredictionAge(${val})" title="เลือกดูคำพยากรณ์อายุ ${val} ปี" style="grid-area: 8/${col}; background:${cellBg}; color:${textColor}; border:${borderStyle};">${val}</button>`;
            } else {
                board.innerHTML += `<div class="custom-cell dim-target-graph dim-target-seven" data-row="8" data-col="${col}" style="grid-area: 8/${col}; background:#293A4B; border:none;"></div>`;
            }
        }

        for(let col = 2; col <= 13; col++) {
            let idx = col - 2; let yearCardCode = data.YEAR[idx]; let zodiacText = ZODIAC_MAP[yearCardCode] || ""; let showZodiac = false;
            if (data.ZODIAC_MODE > 0) {
                if (data.ZODIAC_MODE === 12) showZodiac = true;
                else if (baseAge > 0) {
                    let diff = idx - startAgeCol; if (diff < 0) diff += 12;
                    if (diff >= 1 && diff <= data.ZODIAC_MODE) showZodiac = true;
                }
            }
            if (showZodiac) board.innerHTML += `<div class="custom-cell dim-target-graph dim-target-seven" data-row="9" data-col="${col}" style="grid-area: 9/${col}; background:#293A4B; border:none; border-radius:8px;"><span style="color:#ffffff; font-weight:bold; font-size:1.5vw; font-family:'Sarabun', sans-serif;">${zodiacText}</span></div>`;
        }

        if (data.TIMELINE_MODE === 1) {
            let timelineAlerts = scan84YearsTimeline(data);
            let timelineNodesHtml = "";
            for (let i = 1; i <= 84; i++) {
                let alertObj = timelineAlerts.find(a => a.age === i);
                if (!alertObj) {
                    timelineNodesHtml += `<div class="timeline-node" role="img" aria-label="อายุ ${i} ปี ไม่พบเงื่อนไขเตือนตามกฎ"><div class="node-dot"></div></div>`;
                } else {
                    let ringsHtml = "";
                    if (alertObj.level >= 2) ringsHtml += `<div class="circle-1"></div>`;
                    if (alertObj.level === 3) ringsHtml += `<div class="circle-2"></div>`;
                    timelineNodesHtml += `
                        <div class="timeline-node" role="img" aria-label="อายุ ${i} ปี เงื่อนไขเตือนระดับ ${alertObj.level}">
                            <div class="node-age">${i}</div>
                            <div class="dot-alert"></div>
                            ${ringsHtml}
                        </div>`;
                }
            }
            
            let timelineHtml = `
            <div class="timeline-area-wrapper">
                <div class="timeline-container">
                    <div class="timeline-wrapper">
                        <div class="timeline-track">
                            <div class="timeline-line"></div>
                            ${timelineNodesHtml}
                        </div>
                    </div>
                </div>
            </div>`;
            
            board.innerHTML += timelineHtml;
        }

        applyGraphModeControls();
        applySevenLabelVisibility();
        applyMainViewMode();

        document.getElementById('main-wrapper').style.display = 'block';
        document.getElementById('save-area').style.display = 'grid';
        document.querySelector('.control-panel')?.classList.add('has-actions');
        refreshAccessibility();
        showAppMessage('แผนผังพร้อมใช้งาน อายุที่พิจารณา ' + (data.SELECTED_AGE || 'ไม่ได้ระบุ'));
        scheduleLayoutScaleRefresh();
        if (shouldScroll) document.getElementById('main-wrapper').scrollIntoView({ behavior: preferredScrollBehavior() });
    }

    function applyR5Filter() {
        const rowCards = document.querySelectorAll('#main-board .card-item[data-row="5"]');
        rowCards.forEach(card => {
            const status = getCardBaseStatus(card.dataset.code);
            const matchesGood = status === "VG" || status === "G";
            const matchesBad = status === "VB" || status === "B";
            const shouldDim = activeR5Filter === "good" ? !matchesGood : activeR5Filter === "bad" ? !matchesBad : false;
            card.classList.toggle('r5-filter-dimmed', shouldDim);
        });

        document.querySelectorAll('.r5-filter-button').forEach(button => {
            const isActive = button.dataset.r5Filter === activeR5Filter;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function toggleR5Filter(filter) {
        if (filter !== "good" && filter !== "bad") return;
        activeR5Filter = activeR5Filter === filter ? null : filter;
        applyR5Filter();
    }

    function captureBoardState() {
        return {
            clientValues: ['db-name', 'db-dob', 'db-note'].map(id => document.getElementById(id)?.value || ''),
            dropdownValues: Array.from(document.querySelectorAll('.number-dropdown')).map(el => el.value)
        };
    }

    function restoreBoardState(state) {
        ['db-name', 'db-dob', 'db-note'].forEach((id, index) => {
            const input = document.getElementById(id);
            if (input) input.value = state.clientValues[index] || '';
        });
        document.querySelectorAll('.number-dropdown').forEach((select, index) => {
            if (state.dropdownValues[index] !== undefined) {
                select.value = state.dropdownValues[index];
                updateDropdown(select);
            }
        });
    }

    function selectPredictionAge(age) {
        if (!currentBoardData || !Number.isInteger(age) || age <= 0) return;
        const focusKey = captureFocusKey();
        const preservedState = captureBoardState();
        currentBoardData = { ...currentBoardData, SELECTED_AGE: age };
        buildBoardUI(currentBoardData, false);
        restoreBoardState(preservedState);
        const graph12View = document.getElementById('graph12-view');
        if (graph12View && !graph12View.hidden) {
            renderGraph12AgeControls();
            applyGraph12AgeOverlay();
        }
        refreshAccessibility();
        restoreFocusKey(focusKey);
    }

    function resetSelectedAge() {
        if (!currentBoardData) return;
        const baseAge = currentBoardData.BASE_AGE ?? currentBoardData.AGE;
        selectPredictionAge(baseAge);
    }


    function updateDropdown(sel) { let val = sel.value; let p = sel.parentElement; if (val) { p.style.backgroundColor = NUMBER_COLORS[val].bg; sel.style.color = NUMBER_COLORS[val].color; } else { p.style.backgroundColor = "#293A4B"; sel.style.color = "transparent"; } }
