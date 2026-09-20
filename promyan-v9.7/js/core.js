// Existing nine-base calculations, card classification and 84-year timeline.
    function generateSequence(startId, length, minId, maxId) {
        let seq = []; let curr = startId;
        for (let i = 0; i < length; i++) { seq.push(curr); curr++; if (curr > maxId) curr = minId; }
        return seq;
    }

    function reduceTo1To7(value) {
        return ((Number(value) - 1) % 7 + 7) % 7 + 1;
    }

    function sequence1To7(start) {
        return Array.from({ length: 7 }, (_, offset) => reduceTo1To7(Number(start) + offset));
    }

    function walkDaytimeYam(start) {
        const startIndex = DAYTIME_YAM_SEQUENCE.indexOf(Number(start));
        if (startIndex < 0) throw new Error(`เลขเริ่มต้นยามกลางวันไม่ถูกต้อง: ${start}`);
        return Array.from({ length: 7 }, (_, offset) => DAYTIME_YAM_SEQUENCE[(startIndex + offset) % 7]);
    }

    function calculateNineBaseCore(dayCode, monthCode, zodiacCode) {
        const daySeed = CARD_GROUPS[String(dayCode)];
        const monthSeed = CARD_GROUPS[String(monthCode)];
        const zodiacSeed = CARD_GROUPS[String(zodiacCode)];
        if (![daySeed, monthSeed, zodiacSeed].every(seed => Number.isInteger(seed) && seed >= 1 && seed <= 7)) {
            throw new Error('ไม่สามารถหาเลขตั้งต้นวัน เดือน หรือปีนักษัตรได้');
        }

        const base1 = sequence1To7(daySeed);
        const base2 = sequence1To7(monthSeed);
        const base3 = sequence1To7(zodiacSeed);
        const base4 = base1.map((value, index) => value + base2[index] + base3[index]);
        const base5 = base4.map(reduceTo1To7);
        const base6 = base5.map(value => reduceTo1To7(value * 2));
        const base7 = base6.map(value => reduceTo1To7(value * 2));
        const base8 = walkDaytimeYam(base5[0]);
        const start9 = reduceTo1To7(base5[6] + base8[6]);
        const base9 = walkDaytimeYam(start9).reverse();

        return {
            seeds: { daySeed, monthSeed, zodiacSeed },
            base1, base2, base3, base4, base5, base6, base7, base8, base9
        };
    }

    function verifyNineBaseGoldenTest() {
        const result = calculateNineBaseCore(107, 205, 301);
        const expectedBase8 = [6, 4, 2, 7, 5, 3, 1];
        const expectedBase9 = [6, 1, 3, 5, 7, 2, 4];
        const passed = JSON.stringify(result.base8) === JSON.stringify(expectedBase8)
            && JSON.stringify(result.base9) === JSON.stringify(expectedBase9);
        if (!passed) console.error('Nine-base golden test 7-5-1 failed', result);
        return passed;
    }



    function calculateDynamicPositions(arrayData, targetCode) {
        let splitIndex = arrayData.indexOf(targetCode);
        if(splitIndex === -1) splitIndex = 0; 
        let positions = [];
        if (splitIndex === 0 || splitIndex >= 7) { for(let i=0; i<7; i++) positions.push(i); } 
        else {
            for(let i=0; i<splitIndex; i++) positions.push(i);
            let remaining = 7 - splitIndex; let startRight = 12 - remaining;
            for(let i=0; i<remaining; i++) positions.push(startRight + i);
        }
        return positions;
    }

    function getCardStyleClass(code, title) {
        if (WEALTH_POSITIONS.includes(title) && WEALTH_CARDS.includes(code)) return "card-gold-zone";
        if (title === "ศัตรู" || title === "โรคภัย") {
            if (VERY_GOOD.includes(code) || GOOD.includes(code)) return "card-dark-gray";
            if (NEUTRAL.includes(code)) return "card-black";
            if (BAD.includes(code) || VERY_BAD.includes(code)) return "card-red";
        }
        if (VERY_GOOD.includes(code)) return "card-very-good";
        if (GOOD.includes(code)) return "card-good";
        if (NEUTRAL.includes(code)) return "card-neutral-status";
        if (BAD.includes(code)) return "card-bad";
        if (VERY_BAD.includes(code)) return "card-very-bad";
        return "card-neutral-status";
    }

    function getCardBaseStatus(code) {
        if (VERY_GOOD.includes(code)) return "VG";
        if (GOOD.includes(code)) return "G";
        if (NEUTRAL.includes(code)) return "N";
        if (BAD.includes(code)) return "B";
        if (VERY_BAD.includes(code)) return "VB";
        return "N"; 
    }

    function getAgeMatrixStyles(graphStatus, sevenStatus) {
        const C_WHITE = "#FFFFFF"; const C_BLACK = "#000000"; const C_RED_TEXT = "#d32f2f"; const C_RED_BG = "#e74c3c";
        const C_GOLD_BG = "linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)";
        const C_LIGHT_BLUE_TEXT = "#3498db"; const C_LIGHT_BLUE_BG = "#bbdefb"; const C_DARK_BLUE_TEXT = "#0047AB"; 
        
        const B_NONE = "none"; 
        const B_BLUE = "8px solid #3498db"; 
        const B_BLACK = "8px solid #17202a"; 
        const B_RED = "8px solid #e74c3c"; 

        let border = B_NONE;
        if (sevenStatus === "VG" || sevenStatus === "G") border = B_BLUE;
        else if (sevenStatus === "B") border = B_BLACK;
        else if (sevenStatus === "VB") border = B_RED;

        let bg = C_WHITE; let text = C_BLACK;
        if (graphStatus === "VG") { if (sevenStatus === "VG") { bg = C_GOLD_BG; text = C_WHITE; } else { text = C_LIGHT_BLUE_TEXT; } }
        else if (graphStatus === "G") { if (sevenStatus === "VG") { bg = C_LIGHT_BLUE_BG; text = C_DARK_BLUE_TEXT; } else { text = C_LIGHT_BLUE_TEXT; } }
        else if (graphStatus === "B") { text = C_RED_TEXT; }
        else if (graphStatus === "VB") { bg = C_RED_BG; text = C_WHITE; }

        return { bg, text, border };
    }

    function scan84YearsTimeline(data) {
        let alerts = [];
        const badTitles = ["ความเสื่อม", "ศัตรู", "สูญเสีย", "โรคภัย"];
        const hasRahuCard = data.SEVEN_BASE.some(code => code === "408" || code === "412");
        let path9 = [1, 5, 2, 3, 4, 7, 5, 8, 6]; 
        let path8 = [1, 2, 3, 4, 7, 5, 8, 6];
        let startDayNum = parseInt(data.DAY[0]) % 100;
        
        // 🛠️ แก้ไข: วันพฤหัสบดี (5) ให้เริ่มที่ตำแหน่ง 5 ตัวที่ 2 (index 6)
        let startIndex9 = (startDayNum === 5) ? path9.lastIndexOf(5) : path9.indexOf(startDayNum);

        const get21HousePoint = (age) => {
            let targetIdx21 = (age - 1) % 21;
            if (targetIdx21 < 7) {
                return { title: ROW_2_TITLES[targetIdx21], code: data.DAY[targetIdx21] };
            }
            if (targetIdx21 < 14) {
                let posIdx = targetIdx21 - 7;
                return { title: ROW_4_TITLES[posIdx], code: data.MONTH[data.posMonth[posIdx]] };
            }
            let posIdx = targetIdx21 - 14;
            return { title: ROW_6_TITLES[posIdx], code: data.YEAR[data.posYear[posIdx]] };
        };

        // กลุ่มดาวที่วางอยู่ใน 4 ตำแหน่งเสียของระบบ 21 ภพ
        const bad21HouseGroups = new Set();
        ROW_2_TITLES.forEach((title, index) => {
            if (badTitles.includes(title)) bad21HouseGroups.add(CARD_GROUPS[data.DAY[index]]);
        });
        ROW_4_TITLES.forEach((title, index) => {
            if (badTitles.includes(title)) bad21HouseGroups.add(CARD_GROUPS[data.MONTH[data.posMonth[index]]]);
        });
        ROW_6_TITLES.forEach((title, index) => {
            if (badTitles.includes(title)) bad21HouseGroups.add(CARD_GROUPS[data.YEAR[data.posYear[index]]]);
        });
        bad21HouseGroups.delete(undefined);

        // กลุ่มดาวที่วางอยู่ในตำแหน่งวาสนาและตัวเราของระบบ 21 ภพ
        const core21HouseGroups = new Set();
        ROW_2_TITLES.forEach((title, index) => {
            if (title === "วาสนา" || title === "ตัวเรา") core21HouseGroups.add(CARD_GROUPS[data.DAY[index]]);
        });
        ROW_4_TITLES.forEach((title, index) => {
            if (title === "วาสนา" || title === "ตัวเรา") core21HouseGroups.add(CARD_GROUPS[data.MONTH[data.posMonth[index]]]);
        });
        ROW_6_TITLES.forEach((title, index) => {
            if (title === "วาสนา" || title === "ตัวเรา") core21HouseGroups.add(CARD_GROUPS[data.YEAR[data.posYear[index]]]);
        });
        core21HouseGroups.delete(undefined);

        for(let age = 1; age <= 84; age++) {
            let graphIdx = (age - 1) % 12;
            let graphStatus = getCardBaseStatus(data.GRAPH_BASE[graphIdx]);
            let graphIsBad = (graphStatus === "B" || graphStatus === "VB");
            let graphTitle = ROW_8_TITLES[graphIdx];
            let graphAtDangerPosition = (graphTitle === "ศัตรู" || graphTitle === "โรคภัย");
            let graphMeetsLevel1 = graphIsBad || graphAtDangerPosition;

            let sevenIdx = (age - 1) % 7;
            let sevenStatus = getCardBaseStatus(data.SEVEN_BASE[sevenIdx]);
            let sevenIsBad = (sevenStatus === "B" || sevenStatus === "VB");

            // ระดับ 1: R5 เป็นไพ่ร้าย/ร้ายมากหรือตกศัตรู/โรคภัย และ R7 เป็นไพ่ร้าย/ร้ายมาก
            if (!graphMeetsLevel1 || !sevenIsBad) continue;

            let point21 = get21HousePoint(age);
            let ageAtBad21HousePosition = badTitles.includes(point21.title);
            let age21Group = CARD_GROUPS[point21.code];

            let boriwanNum = path9[(startIndex9 + age - 1) % 9];
            let startIndex8 = path8.indexOf(boriwanNum);
            let kaleeNum = path8[(startIndex8 + 7) % 8];

            let kaleeAtBad21HousePosition = bad21HouseGroups.has(kaleeNum);
            let kaleeAt21HouseAge = age21Group === kaleeNum;
            let kaleeAtRahuCard = kaleeNum === 8 && hasRahuCard;
            let hasLevel2KaleeCondition = kaleeAtBad21HousePosition || kaleeAt21HouseAge || kaleeAtRahuCard;
            let kaleeAtCore21HousePosition = core21HouseGroups.has(kaleeNum);

            // ระดับ 2: ผ่านระดับ 1 + (อายุตกตำแหน่งเสียใน 21 ภพ หรือกาลีเข้าอย่างน้อย 1 เงื่อนไข)
            let meetsLevel2 = ageAtBad21HousePosition || hasLevel2KaleeCondition;
            let level = 1;
            // ระดับ 3: ผ่านระดับ 2 และกาลีตรงตำแหน่งวาสนาหรือตัวเราในระบบ 21 ภพ
            if (meetsLevel2) level = kaleeAtCore21HousePosition ? 3 : 2;
            alerts.push({ age: age, level: level });
        }
        return alerts;
    }

