// Existing seven-group context collection, score calculation and score-card rendering.
    function updatePositionSelection(selection, value, maxPositions) {
        const idx = selection.indexOf(value);
        if (idx > -1) {
            selection.splice(idx, 1);
            return;
        }
        if (selection.length >= maxPositions) selection.shift();
        selection.push(value);
    }

    function sevenStrengthHexToRgba(hex, alpha) {
        const normalized = String(hex || "#757575").replace("#", "");
        const value = normalized.length === 3
            ? normalized.split("").map(char => char + char).join("")
            : normalized.padEnd(6, "0").slice(0, 6);
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function getSevenStrengthLevel(score) {
        const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
        if (safeScore === 100) return SEVEN_STRENGTH_LEVELS[0];
        return SEVEN_STRENGTH_LEVELS.slice(1).find(level => safeScore >= level.min)
            || SEVEN_STRENGTH_LEVELS[SEVEN_STRENGTH_LEVELS.length - 1];
    }

    function getSevenCardHouseName(card) {
        return card?.querySelector(".pos-label")?.textContent?.trim() || null;
    }

    function getNineBaseHouseName(position) {
        return position?.querySelector(".nine-base-name")?.textContent?.trim() || null;
    }

    function findSevenCardByGroup(row, groupNumber) {
        return Array.from(document.querySelectorAll(`#main-board .card-item[data-row="${row}"][data-has-title="true"]`))
            .find(card => CARD_GROUPS[String(card.dataset.code)] === Number(groupNumber)) || null;
    }

    function getSevenGroupByColumn(col) {
        const yearCard = document.querySelector(`#main-board .card-item[data-row="4"][data-col="${col}"][data-has-title="true"]`);
        const groupNumber = yearCard ? CARD_GROUPS[String(yearCard.dataset.code)] : null;
        return Number.isInteger(groupNumber) ? groupNumber : null;
    }

    function collectSevenGroupContext(groupNumber) {
        const group = Number(groupNumber);
        if (!Number.isInteger(group) || group < 1 || group > 7) return null;

        const dayCard = findSevenCardByGroup(2, group);
        const monthCard = findSevenCardByGroup(3, group);
        const yearCard = findSevenCardByGroup(4, group);
        if (!dayCard || !monthCard || !yearCard) return null;

        const col = String(yearCard.dataset.col || "");
        const baseCard = document.querySelector(`#main-board .card-item[data-row="7"][data-col="${col}"]`);
        const base8Position = document.querySelector(`#main-board .nine-base-position[data-nine-base="8"][data-nine-number="${group}"]`);
        const base9Position = document.querySelector(`#main-board .nine-base-position[data-nine-base="9"][data-nine-number="${group}"]`);
        if (!baseCard || !base8Position || !base9Position) return null;

        const baseCode = String(baseCard.dataset.code || "");
        const baseNumber = Number(baseCode) - 400;
        const relationKey = `${group}-${baseNumber}`;
        const relationType = SEVEN_PAIR_RELATIONS[relationKey] || "none";
        const isSpecialBase = SEVEN_SPECIAL_BASE_SCORES.has(baseCode);
        const relationName = isSpecialBase
            ? "เกณฑ์พิเศษ"
            : SEVEN_PAIR_META[relationType]?.name || "ยังไม่มีชื่อความสัมพันธ์";

        const namedPositions = [
            { source: "day", label: "วัน", element: dayCard, houseName: getSevenCardHouseName(dayCard) },
            { source: "month", label: "เดือน", element: monthCard, houseName: getSevenCardHouseName(monthCard) },
            { source: "year", label: "ปี", element: yearCard, houseName: getSevenCardHouseName(yearCard) },
            { source: "base8", label: "ฐาน 8", element: base8Position, houseName: getNineBaseHouseName(base8Position) },
            { source: "base9", label: "ฐาน 9", element: base9Position, houseName: getNineBaseHouseName(base9Position) }
        ];
        const badPositions = namedPositions.filter(position => SEVEN_BAD_HOUSES.has(position.houseName));

        return {
            groupNumber: group,
            col,
            baseCode,
            baseNumber,
            relationKey,
            relationType,
            relationName,
            isSpecialBase,
            members: { dayCard, monthCard, yearCard, baseCard, base8Position, base9Position },
            namedPositions,
            badPositions
        };
    }

    function calculateSevenGroupStrength(groupNumber) {
        const context = collectSevenGroupContext(groupNumber);
        if (!context) return null;

        const numberScore = SEVEN_GOOD_NUMBERS.has(context.groupNumber)
            ? SEVEN_NUMBER_SCORES.good
            : SEVEN_NUMBER_SCORES.bad;
        const rawRelationScore = context.isSpecialBase
            ? SEVEN_SPECIAL_BASE_SCORES.get(context.baseCode)
            : (SEVEN_RELATION_SCORES[context.relationType] ?? SEVEN_RELATION_SCORES.none);
        const countedBadPositions = context.badPositions.slice(0, 5);
        const badHousePenalty = countedBadPositions.reduce(
            (sum, position) => sum + (SEVEN_BAD_HOUSE_PENALTIES[position.houseName] || 0),
            0
        );
        const houseScore = Math.max(0, 20 - badHousePenalty);
        const relationOverflowPenalty = Math.max(0, badHousePenalty - 20);
        const relationScore = Math.max(0, rawRelationScore - relationOverflowPenalty);
        const badHouseCount = countedBadPositions.length;
        const totalScore = Math.max(0, Math.min(100, numberScore + relationScore + houseScore));
        const level = getSevenStrengthLevel(totalScore);

        return {
            ...context,
            numberScore,
            rawRelationScore,
            relationScore,
            badHouseCount,
            badHouseNames: countedBadPositions.map(position => position.houseName),
            badHousePenalty,
            houseScore,
            relationOverflowPenalty,
            totalScore,
            displayScore: Math.round(totalScore),
            level
        };
    }

    function setSevenStrengthCssVariables(element, result) {
        if (!element || !result) return;
        element.style.setProperty("--strength-color", result.level.color);
        element.style.setProperty("--strength-text", result.level.text);
        element.style.setProperty("--strength-divider", sevenStrengthHexToRgba(result.level.text, 0.32));
        element.style.setProperty("--strength-outline", sevenStrengthHexToRgba(result.level.color, 0.92));
        element.style.setProperty("--strength-glow", sevenStrengthHexToRgba(result.level.color, 0.66));
        element.style.setProperty("--strength-soft", sevenStrengthHexToRgba(result.level.color, 0.24));
    }

    function removeSevenStrengthVisuals() {
        document.querySelectorAll("#main-board .seven-strength-active").forEach(element => {
            element.classList.remove("seven-strength-active");
            ["--strength-color", "--strength-text", "--strength-divider", "--strength-outline", "--strength-glow", "--strength-soft"]
                .forEach(property => element.style.removeProperty(property));
        });
    }

    function createTenSegmentGridHtml() {
        return Array.from({ length: 10 }, () => "<span></span>").join("");
    }

    function renderSevenStrengthSummary() {
        const panel = document.querySelector("#main-board .seven-strength-summary-panel");
        if (!panel) return;

        if (mainViewMode !== "seven") {
            panel.innerHTML = "";
            return;
        }

        allSevenStrengthResults = new Map();
        for (let groupNumber = 1; groupNumber <= 7; groupNumber++) {
            const result = calculateSevenGroupStrength(groupNumber);
            if (result) allSevenStrengthResults.set(groupNumber, result);
        }

        const selectedGroups = new Set(activeSevenCols.map(getSevenGroupByColumn).filter(Number.isInteger));
        const orderedResults = Array.from({ length: 7 }, (_, index) => allSevenStrengthResults.get(index + 1)).filter(Boolean);
        if (orderedResults.length !== 7) {
            panel.innerHTML = `<div class="seven-strength-empty">ไม่สามารถคำนวณคะแนนชุดเลข 1–7 ได้ครบ</div>`;
            return;
        }

        panel.innerHTML = orderedResults.map(result => {
            const badText = result.badHouseCount > 0
                ? `ภพเสีย ${result.badHouseCount}: ${result.badHouseNames.join(", ")}`
                : "ไม่เชื่อมภพเสีย";
            const title = `${SEVEN_PLANET_LABELS[result.groupNumber]} • ${result.relationName} • ${badText}`;
            const selectedClass = selectedGroups.has(result.groupNumber) ? " is-selected" : "";
            const planetType = SEVEN_GOOD_NUMBERS.has(result.groupNumber) ? "ศุภเคราะห์" : "บาปเคราะห์";
            const relationText = result.isSpecialBase
                ? SEVEN_RELATION_SHORT_NAMES.special
                : SEVEN_RELATION_SHORT_NAMES[result.relationType] || "-";
            const badHouseNames = result.badHouseNames.map(name => SEVEN_BAD_HOUSE_SHORT_NAMES[name] || name);
            const badHouseHtml = badHouseNames.length > 0
                ? `<span class="seven-strength-bad-house-list">${badHouseNames.map(name => `<span class="seven-strength-house-chip">${name}</span>`).join("")}</span>`
                : "-";
            return `<div class="seven-strength-result${selectedClass}" data-seven-strength-group="${result.groupNumber}" title="${title}" style="--strength-color:${result.level.color};--strength-text:${result.level.text};--strength-soft:${sevenStrengthHexToRgba(result.level.color, 0.2)};--score-fill:${result.totalScore}%">
                <div class="seven-strength-result-head">
                    <span class="seven-strength-result-title">${SEVEN_PLANET_LABELS[result.groupNumber]}</span>
                    <span class="seven-strength-result-score">${result.displayScore}</span>
                </div>
                <div class="seven-strength-result-level">${result.level.label}</div>
                <div class="seven-strength-bar" role="meter" aria-label="คะแนน ${SEVEN_PLANET_LABELS[result.groupNumber]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${result.totalScore}" aria-valuetext="${result.displayScore} จาก 100 ระดับ${result.level.label}">
                    <span class="seven-strength-bar-fill"></span><span class="seven-strength-bar-grid">${createTenSegmentGridHtml()}</span>
                </div>
                <div class="seven-strength-factors">
                    <span class="seven-strength-factor planet">${planetType}</span>
                    <span class="seven-strength-factor relation">${relationText}</span>
                    <span class="seven-strength-factor houses">${badHouseHtml}</span>
                </div>
            </div>`;
        }).join("");
    }

    function applySevenStrengthVisuals() {
        removeSevenStrengthVisuals();
        activeSevenStrengthResults = new Map();

        if (mainViewMode !== "seven" || activeSevenCols.length === 0) {
            renderSevenStrengthSummary();
            return;
        }

        activeSevenCols.forEach(col => {
            const groupNumber = getSevenGroupByColumn(col);
            const result = calculateSevenGroupStrength(groupNumber);
            if (!result) return;
            activeSevenStrengthResults.set(String(col), result);

            const memberElements = [
                result.members.dayCard,
                result.members.monthCard,
                result.members.yearCard,
                result.members.baseCard,
                result.members.base8Position,
                result.members.base9Position
            ];
            memberElements.forEach(element => {
                element.classList.add("seven-strength-active");
                setSevenStrengthCssVariables(element, result);
            });
        });

        renderSevenStrengthSummary();
    }

