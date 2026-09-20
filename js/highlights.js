// Main-board highlights, labels and diagonal guide drawing.
    function clearSevenHighlight() {
        const board = document.getElementById('main-board');
        activeSevenCols = [];
        board.classList.remove('has-seven-highlight');
        document.querySelectorAll('.dim-target-seven').forEach(el => {
            el.classList.remove('highlighted');
            if (el.matches('[data-nine-number]')) {
                el.querySelectorAll('.nine-base-cell').forEach(button => button.setAttribute('aria-pressed', 'false'));
            }
        });
        document.querySelectorAll('.seven-source-selected').forEach(card => {
            card.classList.remove('seven-source-selected');
            delete card.dataset.sevenSourceCol;
        });
        applySevenStrengthVisuals();
    }

    function clearGraphHighlight() {
        const board = document.getElementById('main-board');
        activeGraphHighlightCols = [];
        board.classList.remove('has-graph-highlight');
        document.querySelectorAll('.dim-target-graph').forEach(el => el.classList.remove('highlighted'));
        removeGraphDiagonalGuides();
    }

    function applyGraphModeControls() {
        document.querySelectorAll('.graph-mode-button').forEach(button => {
            const isActive = button.dataset.graphMode === graphHighlightMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function applySevenLabelVisibility() {
        const board = document.getElementById('main-board');
        if (!board) return;
        board.classList.toggle('hide-seven-labels', !sevenLabelsVisible);
        const button = board.querySelector('.seven-label-toggle');
        if (button) {
            button.classList.toggle('is-active', sevenLabelsVisible);
            button.setAttribute('aria-pressed', String(sevenLabelsVisible));
            button.textContent = '7';
            button.title = sevenLabelsVisible ? 'ปิดชื่อตำแหน่งเลข 7 ตัว' : 'เปิดชื่อตำแหน่งเลข 7 ตัว';
        }
    }

    function toggleSevenLabels() {
        sevenLabelsVisible = !sevenLabelsVisible;
        applySevenLabelVisibility();
    }

    function createGraphGuideSvgElement(tagName, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
        return element;
    }

    function removeGraphDiagonalGuides() {
        document.querySelector('#main-board .graph-diagonal-overlay')?.remove();
    }

    function getGraphGuideBaseColor(col) {
        const sourceCard = document.querySelector(`#main-board .card-item[data-row="5"][data-col="${col}"]`);
        if (!sourceCard) return '#3498db';
        for (const [className, color] of Object.entries(GRAPH_GUIDE_CARD_COLORS)) {
            if (sourceCard.classList.contains(className)) return color;
        }
        return '#3498db';
    }

    function graphGuideHexToRgb(hex) {
        const normalized = hex.replace('#', '');
        return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16)
        };
    }

    function graphGuideRgbToHex({ r, g, b }) {
        const toHex = value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function adjustGraphGuideColor(hex, amount) {
        const rgb = graphGuideHexToRgb(hex);
        const target = amount >= 0 ? 255 : 0;
        const factor = Math.abs(amount);
        return graphGuideRgbToHex({
            r: rgb.r + (target - rgb.r) * factor,
            g: rgb.g + (target - rgb.g) * factor,
            b: rgb.b + (target - rgb.b) * factor
        });
    }

    function isGraphGuideLightColor(hex) {
        const { r, g, b } = graphGuideHexToRgb(hex);
        return ((r * 299 + g * 587 + b * 114) / 255000) > 0.68;
    }

    function getGraphGuidePoint(boardRect, coordinate) {
        const [row, col] = coordinate.split(':');
        const card = document.querySelector(`#main-board .card-item[data-row="${row}"][data-col="${col}"]`);
        if (!card) return null;
        const rect = card.getBoundingClientRect();
        return {
            x: rect.left - boardRect.left + rect.width / 2,
            y: rect.top - boardRect.top + rect.height / 2
        };
    }

    function offsetGraphGuidePoints(points, offset) {
        if (!offset) return points.map(point => ({ ...point }));
        return points.map((point, index) => {
            const previous = points[Math.max(0, index - 1)];
            const next = points[Math.min(points.length - 1, index + 1)];
            const dx = next.x - previous.x;
            const dy = next.y - previous.y;
            const length = Math.hypot(dx, dy) || 1;
            return {
                x: point.x + (-dy / length) * offset,
                y: point.y + (dx / length) * offset
            };
        });
    }

    function appendGraphGuidePolyline(svg, points, color) {
        const pointText = points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
        const common = {
            points: pointText, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            'vector-effect': 'non-scaling-stroke'
        };
        svg.appendChild(createGraphGuideSvgElement('polyline', {
            ...common, stroke: '#ffffff', 'stroke-width': 9, 'stroke-opacity': 0.58
        }));
        svg.appendChild(createGraphGuideSvgElement('polyline', {
            ...common, stroke: isGraphGuideLightColor(color) ? '#2c3e50' : '#ffffff',
            'stroke-width': 6, 'stroke-opacity': isGraphGuideLightColor(color) ? 0.82 : 0.5
        }));
        svg.appendChild(createGraphGuideSvgElement('polyline', {
            ...common, stroke: color, 'stroke-width': 3.8, 'stroke-opacity': 0.98
        }));
    }

    function appendGraphGuideNode(svg, point, colors) {
        const distinctColors = [...new Set(colors)];
        const radius = 6;
        svg.appendChild(createGraphGuideSvgElement('circle', {
            cx: point.x, cy: point.y, r: 9, fill: '#ffffff', 'fill-opacity': 0.78
        }));

        if (distinctColors.length === 1) {
            const color = distinctColors[0];
            svg.appendChild(createGraphGuideSvgElement('circle', {
                cx: point.x, cy: point.y, r: radius, fill: color,
                stroke: isGraphGuideLightColor(color) ? '#2c3e50' : '#ffffff', 'stroke-width': 2,
                'vector-effect': 'non-scaling-stroke'
            }));
            return;
        }

        const [firstColor, secondColor] = distinctColors;
        svg.appendChild(createGraphGuideSvgElement('circle', {
            cx: point.x, cy: point.y, r: radius, fill: firstColor
        }));
        const rightHalf = `M ${point.x} ${point.y - radius} A ${radius} ${radius} 0 0 1 ${point.x} ${point.y + radius} L ${point.x} ${point.y} Z`;
        svg.appendChild(createGraphGuideSvgElement('path', { d: rightHalf, fill: secondColor }));
        svg.appendChild(createGraphGuideSvgElement('circle', {
            cx: point.x, cy: point.y, r: radius, fill: 'none', stroke: '#2c3e50',
            'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke'
        }));
    }

    function appendGraphGuideSourceRings(svg, point, color) {
        const ringRadii = [16, 21];
        ringRadii.forEach((radius, index) => {
            const common = {
                cx: point.x, cy: point.y, r: radius, fill: 'none',
                'vector-effect': 'non-scaling-stroke'
            };
            svg.appendChild(createGraphGuideSvgElement('circle', {
                ...common, stroke: '#ffffff', 'stroke-width': 7, 'stroke-opacity': 0.62
            }));
            if (isGraphGuideLightColor(color)) {
                svg.appendChild(createGraphGuideSvgElement('circle', {
                    ...common, stroke: '#2c3e50', 'stroke-width': 5, 'stroke-opacity': 0.82
                }));
            }
            svg.appendChild(createGraphGuideSvgElement('circle', {
                ...common, stroke: color, 'stroke-width': 3,
                'stroke-opacity': index === 0 ? 1 : 0.86
            }));
        });
    }

    function renderGraphDiagonalGuides() {
        graphGuideRenderFrame = null;
        removeGraphDiagonalGuides();
        if (graphHighlightMode !== 'diagonal' || activeGraphHighlightCols.length === 0) return;

        const board = document.getElementById('main-board');
        const boardRect = board.getBoundingClientRect();
        if (!boardRect.width || !boardRect.height) return;

        const pathData = activeGraphHighlightCols.slice(-2).map(col => {
            const coordinates = GRAPH_DIAGONAL_PATHS[col] || [];
            const points = coordinates.map(coordinate => getGraphGuidePoint(boardRect, coordinate));
            if (points.some(point => !point)) return null;
            return { col, coordinates, points, color: getGraphGuideBaseColor(col) };
        }).filter(Boolean);
        if (pathData.length === 0) return;

        if (pathData.length === 2 && pathData[0].color.toLowerCase() === pathData[1].color.toLowerCase()) {
            pathData[1].color = adjustGraphGuideColor(
                pathData[1].color,
                isGraphGuideLightColor(pathData[1].color) ? -0.28 : 0.28
            );
        }

        const svg = createGraphGuideSvgElement('svg', {
            class: 'graph-diagonal-overlay', viewBox: `0 0 ${boardRect.width} ${boardRect.height}`,
            width: boardRect.width, height: boardRect.height, 'aria-hidden': 'true', preserveAspectRatio: 'none'
        });

        pathData.forEach((path, index) => {
            const offset = pathData.length === 2 ? (index === 0 ? -3.2 : 3.2) : 0;
            appendGraphGuidePolyline(svg, offsetGraphGuidePoints(path.points, offset), path.color);
        });

        const nodeMap = new Map();
        pathData.forEach((path, pathIndex) => {
            path.coordinates.forEach((coordinate, pointIndex) => {
                if (!nodeMap.has(coordinate)) {
                    nodeMap.set(coordinate, { point: path.points[pointIndex], pathIndexes: new Set() });
                }
                nodeMap.get(coordinate).pathIndexes.add(pathIndex);
            });
        });
        nodeMap.forEach(node => {
            const colors = [...node.pathIndexes].map(index => pathData[index].color);
            appendGraphGuideNode(svg, node.point, colors);
        });

        pathData.forEach(path => {
            const sourceCoordinate = `5:${path.col}`;
            const sourceIndex = path.coordinates.indexOf(sourceCoordinate);
            if (sourceIndex >= 0) appendGraphGuideSourceRings(svg, path.points[sourceIndex], path.color);
        });

        board.appendChild(svg);
    }

    function scheduleGraphDiagonalGuides() {
        if (graphGuideRenderFrame !== null) cancelAnimationFrame(graphGuideRenderFrame);
        graphGuideRenderFrame = requestAnimationFrame(renderGraphDiagonalGuides);
    }




    function applyGraphHighlights() {
        const board = document.getElementById('main-board');
        const targets = document.querySelectorAll('.dim-target-graph');
        if (activeGraphHighlightCols.length === 0) {
            board.classList.remove('has-graph-highlight');
            targets.forEach(el => el.classList.remove('highlighted'));
            removeGraphDiagonalGuides();
            return;
        }

        board.classList.add('has-graph-highlight');
        const diagonalCoordinates = new Set();
        if (graphHighlightMode === 'diagonal') {
            activeGraphHighlightCols.forEach(col => {
                (GRAPH_DIAGONAL_PATHS[col] || []).forEach(coordinate => diagonalCoordinates.add(coordinate));
            });
        }

        targets.forEach(el => {
            const row = parseInt(el.dataset.row, 10);
            const coordinate = `${row}:${el.dataset.col}`;
            const isHighlighted = graphHighlightMode === 'diagonal'
                ? diagonalCoordinates.has(coordinate)
                : activeGraphHighlightCols.includes(el.dataset.col) && row !== 7;
            el.classList.toggle('highlighted', isHighlighted);
        });
        renderGraphDiagonalGuides();
    }

    function setGraphHighlightMode(mode) {
        if (mainViewMode === 'seven') return;
        if (mode !== 'vertical' && mode !== 'diagonal') return;
        graphHighlightMode = mode;
        if (graphHighlightMode === 'diagonal' && activeGraphHighlightCols.length > 2) {
            activeGraphHighlightCols = activeGraphHighlightCols.slice(-2);
        }
        applyGraphModeControls();
        applyGraphHighlights();
    }

    function toggleGraphHighlight(col) {
        if (mainViewMode === 'seven') return;
        clearSevenHighlight();
        const colStr = String(col);
        const maxGraphPositions = graphHighlightMode === 'vertical' ? 3 : 2;
        updatePositionSelection(activeGraphHighlightCols, colStr, maxGraphPositions);
        sevenLabelsVisible = false;
        applySevenLabelVisibility();
        applyGraphHighlights();
    }

    function toggleSevenHighlight(col, sourceCard = null) {
        const board = document.getElementById('main-board');
        clearGraphHighlight();
        sevenLabelsVisible = true;
        applySevenLabelVisibility();

        const colStr = String(col);
        const previousCols = [...activeSevenCols];
        const wasSelected = previousCols.includes(colStr);
        updatePositionSelection(activeSevenCols, colStr, 2);

        const activeColSet = new Set(activeSevenCols);
        document.querySelectorAll('.seven-source-selected').forEach(card => {
            const markerCol = String(card.dataset.sevenSourceCol || '');
            if (!activeColSet.has(markerCol) || markerCol === colStr) {
                card.classList.remove('seven-source-selected');
                delete card.dataset.sevenSourceCol;
            }
        });
        if (sourceCard && !wasSelected && activeColSet.has(colStr)) {
            sourceCard.classList.add('seven-source-selected');
            sourceCard.dataset.sevenSourceCol = colStr;
        }

        if (activeSevenCols.length === 0) {
            board.classList.remove('has-seven-highlight');
            document.querySelectorAll('.dim-target-seven').forEach(el => {
                el.classList.remove('highlighted');
                if (el.matches('[data-nine-number]')) {
                    el.querySelectorAll('.nine-base-cell').forEach(button => button.setAttribute('aria-pressed', 'false'));
                }
            });
            applySevenStrengthVisuals();
            return;
        }

        board.classList.add('has-seven-highlight');
        const activeGroups = [];

        activeSevenCols.forEach(c => {
            const leader = document.querySelector(`.dim-target-seven[data-row="4"][data-col="${c}"]`);
            const group = leader ? CARD_GROUPS[leader.dataset.code] : null;
            if (group && !activeGroups.includes(group)) activeGroups.push(group);
        });

        document.querySelectorAll('.dim-target-seven').forEach(el => {
            const row = parseInt(el.dataset.row, 10);
            let isHigh = false;
            if (el.matches('[data-nine-number]')) {
                isHigh = activeGroups.includes(Number(el.dataset.nineNumber));
                el.querySelectorAll('.nine-base-cell').forEach(button => button.setAttribute('aria-pressed', String(isHigh)));
            } else if ([4, 7, 9].includes(row) && activeSevenCols.includes(String(el.dataset.col))) isHigh = true;
            else if ([2, 3].includes(row) && activeGroups.includes(CARD_GROUPS[el.dataset.code]) && el.dataset.hasTitle === "true") isHigh = true;
            el.classList.toggle('highlighted', isHigh);
        });
        applySevenStrengthVisuals();
    }

    function toggleSevenGroupFromCard(card) {
        if (mainViewMode !== 'seven' || !card) return;
        const targetNumber = CARD_GROUPS[String(card.dataset.code)];
        if (!Number.isInteger(targetNumber)) return;
        const leaders = Array.from(document.querySelectorAll('.dim-target-seven[data-row="4"][data-has-title="true"]'));
        const leader = leaders.find(item => CARD_GROUPS[item.dataset.code] === targetNumber);
        if (!leader) return;
        toggleSevenHighlight(Number(leader.dataset.col), card);
    }

    function toggleNineBaseNumber(number) {
        if (mainViewMode !== 'seven') return;
        const targetNumber = Number(number);
        const leaders = Array.from(document.querySelectorAll('.dim-target-seven[data-row="4"][data-has-title="true"]'));
        const leader = leaders.find(card => CARD_GROUPS[card.dataset.code] === targetNumber);
        if (!leader) return;
        toggleSevenHighlight(Number(leader.dataset.col));
    }

