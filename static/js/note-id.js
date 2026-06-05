/**
 * Note ID — Matrix Drills
 * An all-fourths semitone matrix is drawn with one note revealed in the
 * center. One other cell is highlighted; the player identifies that cell's
 * note by clicking the chromatic circle.
 *
 * Matrix convention (matches github.com/vladmog/music-theory):
 *   moving right one column = +1 semitone
 *   moving up one row       = +5 semitones (a perfect 4th)
 *
 * Notes are colored by their interval relative to the center note (reusing the
 * interval color scheme). Loaded before games.js so it can register itself.
 */

(function() {
    'use strict';

    const STORAGE_KEY_SETTINGS = 'fretboard-note-id-settings';
    const STORAGE_KEY_STATS = 'fretboard-games-stats';
    const STATS_KEY = 'note-id';

    // Interval labels indexed by semitone (0-11) — used only for color lookup
    const SIMPLE_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

    // Note names indexed by semitone (0-11)
    const SHARP_NOTES = MusicTheory.CHROMATIC_NOTES;
    const FLAT_NOTES = MusicTheory.FLAT_NOTES;

    const MATRIX_SIZES = [3, 5, 7];
    const HORIZONTAL_STEP = 1;   // semitones per column moving right
    const VERTICAL_STEP = 5;     // semitones per row moving up (perfect 4th)

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Semitone (0-11) of a cell given the center cell's semitone
    function cellSemitone(row, col, center, centerSemitone) {
        const fromCols = (col - center) * HORIZONTAL_STEP;
        const fromRows = (center - row) * VERTICAL_STEP; // up = positive
        return ((centerSemitone + fromCols + fromRows) % 12 + 144) % 12;
    }

    // Display labels for the current accidental setting
    function noteLabels() {
        return settings.accidental === 'flats' ? FLAT_NOTES : SHARP_NOTES;
    }

    // Color a note by its interval relative to the center note
    function colorForSemitone(semitone, centerSemitone) {
        if (!settings.showColors) {
            return { fill: '#000', border: '#000', text: '#fff' };
        }
        const interval = ((semitone - centerSemitone) % 12 + 12) % 12;
        return MusicTheory.getIntervalColor(SIMPLE_LABELS[interval]);
    }

    // Game settings (persisted)
    let settings = {
        matrixSize: 3,
        roundCount: 10,
        showColors: true,
        accidental: 'sharps'
    };

    // Game runtime state
    let gameState = {
        currentRound: 0,
        totalRounds: 0,
        centerSemitone: 0,
        targetSemitone: 0,
        targetRow: 0,
        targetCol: 0,
        correctCount: 0,
        answered: false,
        hadMistake: false,
        matrixApi: null,
        circleApi: null,
        questionStartTime: 0,
        questionTimes: [],
        lastCenter: null,
        lastTargetRow: null,
        lastTargetCol: null
    };

    let stats = {};

    // ---- Settings persistence ----

    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                settings = { ...settings, ...parsed };
                if (!MATRIX_SIZES.includes(settings.matrixSize)) settings.matrixSize = 3;
                const roundOptions = [5, 10, 20, 50, 100];
                if (!roundOptions.includes(settings.roundCount)) {
                    settings.roundCount = roundOptions.reduce((prev, curr) =>
                        Math.abs(curr - settings.roundCount) < Math.abs(prev - settings.roundCount) ? curr : prev
                    );
                }
                if (settings.accidental !== 'sharps' && settings.accidental !== 'flats') {
                    settings.accidental = 'sharps';
                }
            }
        } catch (e) {
            console.error('Failed to load note-id settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save note-id settings:', e);
        }
    }

    // ---- Stats persistence ----

    function loadStats() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_STATS);
            if (saved) {
                stats = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load game stats:', e);
            stats = {};
        }
    }

    function saveStats() {
        try {
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save game stats:', e);
        }
    }

    function commitSessionStats() {
        loadStats();
        if (!stats[STATS_KEY]) stats[STATS_KEY] = {};
        gameState.questionTimes.forEach(q => {
            if (!stats[STATS_KEY][q.label]) {
                stats[STATS_KEY][q.label] = { tested: 0, correct: 0, totalTimeMs: 0, timedCount: 0 };
            }
            const entry = stats[STATS_KEY][q.label];
            entry.tested++;
            if (q.correct) entry.correct++;
            entry.totalTimeMs = (entry.totalTimeMs || 0) + q.timeMs;
            entry.timedCount = (entry.timedCount || 0) + 1;
        });
        saveStats();
    }

    // ---- Matrix renderer ----

    function renderMatrix(container, N, centerSemitone, targetRow, targetCol) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const cell = 100;
        const gap = 8;
        const total = N * cell + (N - 1) * gap;

        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
        svg.style.maxWidth = '75%';
        svg.style.maxHeight = '75%';
        svg.style.display = 'block';

        const center = (N - 1) / 2;
        const labels = noteLabels();
        let targetCellEl = null;
        let targetTextEl = null;

        for (let row = 0; row < N; row++) {
            for (let col = 0; col < N; col++) {
                const x = col * (cell + gap);
                const y = row * (cell + gap);
                const isCenter = (row === center && col === center);
                const isTarget = (row === targetRow && col === targetCol);

                const rect = document.createElementNS(svgNS, 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', cell);
                rect.setAttribute('height', cell);
                rect.setAttribute('rx', 6);

                const text = document.createElementNS(svgNS, 'text');
                text.setAttribute('x', x + cell / 2);
                text.setAttribute('y', y + cell / 2);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'central');
                text.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
                text.setAttribute('font-weight', '700');
                text.setAttribute('font-size', cell * 0.4);

                if (isCenter) {
                    const colors = colorForSemitone(centerSemitone, centerSemitone);
                    rect.setAttribute('fill', colors.fill);
                    rect.setAttribute('stroke', colors.border);
                    rect.setAttribute('stroke-width', 4);
                    text.setAttribute('fill', colors.text);
                    text.textContent = labels[centerSemitone];
                } else if (isTarget) {
                    rect.setAttribute('fill', '#fff');
                    rect.setAttribute('stroke', '#000');
                    rect.setAttribute('stroke-width', 6);
                    rect.setAttribute('class', 'note-id-target');
                    text.setAttribute('fill', '#000');
                    text.textContent = '?';
                    text.setAttribute('fill', '#bbb');
                    targetCellEl = rect;
                    targetTextEl = text;
                } else {
                    rect.setAttribute('fill', '#fafafa');
                    rect.setAttribute('stroke', '#ddd');
                    rect.setAttribute('stroke-width', 2);
                    text.textContent = '';
                }

                svg.appendChild(rect);
                svg.appendChild(text);
            }
        }

        container.appendChild(svg);
        return { svg, targetCellEl, targetTextEl };
    }

    // ---- Chromatic circle note picker ----

    function renderChromaticCircle(container, centerSemitone, onPick) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const size = 400;
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.style.maxWidth = '75%';
        svg.style.maxHeight = '75%';
        svg.style.display = 'block';
        svg.style.margin = '0 auto';

        const center = size / 2;
        const radius = size * 0.38;
        const markerRadius = size * 0.08;
        const labels = noteLabels();
        const nodeGroups = [];

        for (let i = 0; i < 12; i++) {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);

            const colors = settings.showColors
                ? colorForSemitone(i, centerSemitone)
                : { fill: i % 2 === 0 ? '#000' : '#777', border: i % 2 === 0 ? '#000' : '#777', text: '#fff' };

            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('data-semitone', i);
            g.style.cursor = 'pointer';
            g.style.transition = 'opacity 0.4s ease-out';

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', markerRadius);
            circle.setAttribute('fill', colors.fill);
            circle.setAttribute('stroke', colors.border);
            circle.setAttribute('stroke-width', 2);

            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', colors.text);
            text.setAttribute('font-size', markerRadius * 0.7);
            text.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
            text.setAttribute('font-weight', '700');
            text.textContent = labels[i];

            g.appendChild(circle);
            g.appendChild(text);
            g.addEventListener('click', () => onPick(i));

            svg.appendChild(g);
            nodeGroups.push(g);
        }

        container.appendChild(svg);
        return { svg, nodeGroups };
    }

    // ---- Title Page ----

    function renderTitlePage() {
        loadStats();
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove('note-id-active');

        const content = document.getElementById('game-content');
        if (!content) return;
        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-title-page';

        const title = document.createElement('h1');
        title.className = 'game-title';
        title.textContent = 'Note ID';
        wrapper.appendChild(title);

        const explanation = document.createElement('p');
        explanation.className = 'game-explanation';
        explanation.textContent = 'A matrix shows one note in the center. Moving right adds a semitone; moving up a row adds a perfect 4th. Work out the highlighted cell’s note and click it on the chromatic circle.';
        wrapper.appendChild(explanation);

        const statsContainer = document.createElement('div');
        statsContainer.id = 'game-stats-container';
        renderStats(statsContainer);
        wrapper.appendChild(statsContainer);

        const startBtn = document.createElement('button');
        startBtn.className = 'game-start-btn';
        startBtn.textContent = 'Start';
        startBtn.addEventListener('click', startGame);
        wrapper.appendChild(startBtn);

        content.appendChild(wrapper);
    }

    // ---- Settings Modal ----

    function renderSettings(modalBody) {
        modalBody.innerHTML = '';

        // Matrix size
        const sizeGroup = document.createElement('div');
        sizeGroup.className = 'game-setting-group';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Matrix Size';
        sizeLabel.className = 'game-setting-label';
        const sizeSelect = document.createElement('select');
        sizeSelect.className = 'game-setting-select';
        MATRIX_SIZES.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n;
            opt.textContent = `${n}x${n}`;
            if (n === settings.matrixSize) opt.selected = true;
            sizeSelect.appendChild(opt);
        });
        sizeSelect.addEventListener('change', () => {
            settings.matrixSize = parseInt(sizeSelect.value);
            saveSettings();
        });
        sizeGroup.appendChild(sizeLabel);
        sizeGroup.appendChild(sizeSelect);
        modalBody.appendChild(sizeGroup);

        // Round count
        const roundGroup = document.createElement('div');
        roundGroup.className = 'game-setting-group';
        const roundLabel = document.createElement('label');
        roundLabel.textContent = 'Rounds';
        roundLabel.className = 'game-setting-label';
        const roundInput = document.createElement('select');
        roundInput.className = 'game-setting-select';
        [5, 10, 20, 50, 100].forEach(n => {
            const opt = document.createElement('option');
            opt.value = n;
            opt.textContent = n;
            if (n === settings.roundCount) opt.selected = true;
            roundInput.appendChild(opt);
        });
        roundInput.addEventListener('change', () => {
            settings.roundCount = parseInt(roundInput.value);
            saveSettings();
        });
        roundGroup.appendChild(roundLabel);
        roundGroup.appendChild(roundInput);
        modalBody.appendChild(roundGroup);

        // Accidentals toggle
        const accGroup = document.createElement('div');
        accGroup.className = 'game-setting-group';
        const accLabel = document.createElement('label');
        accLabel.textContent = 'Accidentals';
        accLabel.className = 'game-setting-label';
        const accSelect = document.createElement('select');
        accSelect.className = 'game-setting-select';
        [
            { value: 'sharps', text: 'Sharps' },
            { value: 'flats', text: 'Flats' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.value === settings.accidental) option.selected = true;
            accSelect.appendChild(option);
        });
        accSelect.addEventListener('change', () => {
            settings.accidental = accSelect.value;
            saveSettings();
        });
        accGroup.appendChild(accLabel);
        accGroup.appendChild(accSelect);
        modalBody.appendChild(accGroup);

        // Colors toggle
        const colorsGroup = document.createElement('div');
        colorsGroup.className = 'game-setting-group';
        const colorsLabel = document.createElement('label');
        colorsLabel.textContent = 'Colors';
        colorsLabel.className = 'game-setting-label';
        const colorsSelect = document.createElement('select');
        colorsSelect.className = 'game-setting-select';
        [
            { value: 'on', text: 'On' },
            { value: 'off', text: 'Off' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if ((opt.value === 'on') === settings.showColors) option.selected = true;
            colorsSelect.appendChild(option);
        });
        colorsSelect.addEventListener('change', () => {
            settings.showColors = colorsSelect.value === 'on';
            saveSettings();
        });
        colorsGroup.appendChild(colorsLabel);
        colorsGroup.appendChild(colorsSelect);
        modalBody.appendChild(colorsGroup);

        // Clear stats button
        const clearGroup = document.createElement('div');
        clearGroup.className = 'game-setting-group';
        const clearBtn = document.createElement('button');
        clearBtn.className = 'game-start-btn';
        clearBtn.style.fontSize = '0.625rem';
        clearBtn.style.padding = '0.5rem 1rem';
        clearBtn.style.background = '#fff';
        clearBtn.style.color = '#000';
        clearBtn.textContent = 'Clear Stats';
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear all Note ID stats?')) {
                loadStats();
                delete stats[STATS_KEY];
                saveStats();
            }
        });
        clearGroup.appendChild(clearBtn);
        modalBody.appendChild(clearGroup);
    }

    // ---- Game Logic ----

    function startGame() {
        gameState.currentRound = 0;
        gameState.totalRounds = settings.roundCount;
        gameState.correctCount = 0;
        gameState.questionTimes = [];
        gameState.lastCenter = null;
        gameState.lastTargetRow = null;
        gameState.lastTargetCol = null;
        nextQuestion();
    }

    function nextQuestion() {
        gameState.currentRound++;
        gameState.answered = false;
        gameState.hadMistake = false;

        if (gameState.currentRound > gameState.totalRounds) {
            showResults();
            return;
        }

        const N = settings.matrixSize;
        const center = (N - 1) / 2;

        // Random center note, avoid repeating the previous round's center
        let centerSemitone = Math.floor(Math.random() * 12);
        if (gameState.lastCenter !== null && centerSemitone === gameState.lastCenter) {
            centerSemitone = (centerSemitone + 1 + Math.floor(Math.random() * 11)) % 12;
        }
        gameState.lastCenter = centerSemitone;
        gameState.centerSemitone = centerSemitone;

        // Random non-center cell as target, avoid repeating the previous round's cell
        let row, col;
        do {
            row = Math.floor(Math.random() * N);
            col = Math.floor(Math.random() * N);
        } while (
            (row === center && col === center) ||
            (row === gameState.lastTargetRow && col === gameState.lastTargetCol)
        );
        gameState.lastTargetRow = row;
        gameState.lastTargetCol = col;
        gameState.targetRow = row;
        gameState.targetCol = col;
        gameState.targetSemitone = cellSemitone(row, col, center, centerSemitone);

        renderGameView();
    }

    function renderGameView() {
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.add('note-id-active');

        const content = document.getElementById('game-content');
        if (!content) return;
        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-play-area game-split-layout';

        // Matrix half (left / top)
        const matrixPanel = document.createElement('div');
        matrixPanel.className = 'game-split-matrix';

        const counter = document.createElement('div');
        counter.className = 'game-round-counter note-id-counter';
        counter.textContent = `${gameState.currentRound} / ${gameState.totalRounds}`;
        matrixPanel.appendChild(counter);

        const matrixContainer = document.createElement('div');
        matrixContainer.className = 'note-id-matrix-container';
        gameState.matrixApi = renderMatrix(
            matrixContainer,
            settings.matrixSize,
            gameState.centerSemitone,
            gameState.targetRow,
            gameState.targetCol
        );
        matrixPanel.appendChild(matrixContainer);

        // Circle half (right / bottom)
        const circlePanel = document.createElement('div');
        circlePanel.className = 'game-split-circle';

        const circleContainer = document.createElement('div');
        circleContainer.className = 'note-id-circle-container';
        gameState.circleApi = renderChromaticCircle(circleContainer, gameState.centerSemitone, handlePick);
        circlePanel.appendChild(circleContainer);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'game-next-btn';
        nextBtn.id = 'game-next-btn';
        nextBtn.textContent = 'Next';
        nextBtn.style.display = 'none';
        nextBtn.style.marginTop = '1rem';
        nextBtn.addEventListener('click', nextQuestion);
        circlePanel.appendChild(nextBtn);

        wrapper.appendChild(matrixPanel);
        wrapper.appendChild(circlePanel);
        content.appendChild(wrapper);

        gameState.questionStartTime = performance.now();
    }

    function handlePick(semitone) {
        if (gameState.answered) return;
        if (semitone === gameState.targetSemitone) {
            handleCorrectAnswer();
        } else {
            handleWrongAnswer(semitone);
        }
    }

    function handleWrongAnswer(semitone) {
        gameState.hadMistake = true;
        const api = gameState.circleApi;
        if (!api) return;
        const group = api.nodeGroups.find(g =>
            parseInt(g.getAttribute('data-semitone')) === semitone
        );
        if (group) {
            const circle = group.querySelector('circle');
            const origFill = circle.getAttribute('fill');
            const origStroke = circle.getAttribute('stroke');
            circle.setAttribute('fill', '#FF0000');
            circle.setAttribute('stroke', '#CC0000');
            setTimeout(() => {
                circle.setAttribute('fill', origFill);
                circle.setAttribute('stroke', origStroke);
            }, 400);
        }
    }

    function handleCorrectAnswer() {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        const elapsed = performance.now() - gameState.questionStartTime;
        gameState.questionTimes.push({
            label: SHARP_NOTES[gameState.targetSemitone],
            timeMs: Math.round(elapsed),
            correct: !gameState.hadMistake
        });

        // Reveal target cell's note in the matrix
        const m = gameState.matrixApi;
        if (m && m.targetCellEl && m.targetTextEl) {
            const colors = colorForSemitone(gameState.targetSemitone, gameState.centerSemitone);
            m.targetCellEl.setAttribute('fill', colors.fill);
            m.targetCellEl.setAttribute('stroke', colors.border);
            m.targetTextEl.setAttribute('fill', colors.text);
            m.targetTextEl.textContent = noteLabels()[gameState.targetSemitone];
        }

        // Fade non-answer circle nodes, keep the correct one
        const api = gameState.circleApi;
        if (api) {
            api.nodeGroups.forEach(g => {
                const idx = parseInt(g.getAttribute('data-semitone'));
                if (idx !== gameState.targetSemitone) g.style.opacity = '0.15';
            });
        }

        setTimeout(() => {
            const nextBtn = document.getElementById('game-next-btn');
            if (nextBtn) nextBtn.style.display = 'block';
        }, 400);
    }

    function showResults() {
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove('note-id-active');

        const content = document.getElementById('game-content');
        if (!content) return;
        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-title-page';

        const title = document.createElement('h1');
        title.className = 'game-title';
        title.textContent = 'Results';
        wrapper.appendChild(title);

        const score = document.createElement('div');
        score.className = 'game-score';
        score.textContent = `${gameState.correctCount} / ${gameState.totalRounds}`;
        wrapper.appendChild(score);

        const pct = document.createElement('div');
        pct.className = 'game-score-pct';
        const percent = Math.round((gameState.correctCount / gameState.totalRounds) * 100);
        pct.textContent = `${percent}%`;
        wrapper.appendChild(pct);

        const rtContainer = document.createElement('div');
        rtContainer.className = 'rt-chart-container';
        const timesByLabel = {};
        gameState.questionTimes.forEach(q => {
            if (!timesByLabel[q.label]) timesByLabel[q.label] = { total: 0, count: 0 };
            timesByLabel[q.label].total += q.timeMs;
            timesByLabel[q.label].count++;
        });
        const rtItems = SHARP_NOTES
            .filter(l => timesByLabel[l])
            .map(l => ({ label: l, timeMs: Math.round(timesByLabel[l].total / timesByLabel[l].count) }));
        renderReactionTimeChart(rtContainer, rtItems, 'Reaction Times');
        wrapper.appendChild(rtContainer);

        const btnRow = document.createElement('div');
        btnRow.className = 'game-btn-row';

        const logBtn = document.createElement('button');
        logBtn.className = 'game-start-btn';
        logBtn.textContent = 'Log & Play Again';
        logBtn.addEventListener('click', () => {
            commitSessionStats();
            startGame();
        });
        btnRow.appendChild(logBtn);

        const logMenuBtn = document.createElement('button');
        logMenuBtn.className = 'game-start-btn game-btn-secondary';
        logMenuBtn.textContent = 'Log & Menu';
        logMenuBtn.addEventListener('click', () => {
            commitSessionStats();
            renderTitlePage();
        });
        btnRow.appendChild(logMenuBtn);

        const playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'game-start-btn game-btn-secondary';
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.addEventListener('click', startGame);
        btnRow.appendChild(playAgainBtn);

        const menuBtn = document.createElement('button');
        menuBtn.className = 'game-start-btn game-btn-secondary';
        menuBtn.textContent = 'Menu';
        menuBtn.addEventListener('click', renderTitlePage);
        btnRow.appendChild(menuBtn);

        wrapper.appendChild(btnRow);
        content.appendChild(wrapper);
    }

    // ---- Stats Visualization ----

    function accuracyToColor(ratio) {
        let r, g, b;
        if (ratio <= 0.5) {
            const t = ratio / 0.5;
            r = 255;
            g = Math.round(68 + (215 - 68) * t);
            b = Math.round(68 + (0 - 68) * t);
        } else {
            const t = (ratio - 0.5) / 0.5;
            r = Math.round(255 + (50 - 255) * t);
            g = Math.round(215 + (205 - 215) * t);
            b = Math.round(0 + (50 - 0) * t);
        }
        return `rgb(${r},${g},${b})`;
    }

    function reactionTimeToColor(timeMs, minTime, maxTime) {
        if (maxTime === minTime) return '#32CD32';
        const ratio = (timeMs - minTime) / (maxTime - minTime);
        let r, g, b;
        if (ratio <= 0.5) {
            const t = ratio / 0.5;
            r = Math.round(50 + (255 - 50) * t);
            g = Math.round(205 + (215 - 205) * t);
            b = Math.round(50 - 50 * t);
        } else {
            const t = (ratio - 0.5) / 0.5;
            r = 255;
            g = Math.round(215 * (1 - t));
            b = 0;
        }
        return `rgb(${r},${g},${b})`;
    }

    function formatTime(ms) {
        if (ms < 1000) return ms + 'ms';
        return (ms / 1000).toFixed(1) + 's';
    }

    function renderReactionTimeChart(container, items, heading) {
        if (items.length === 0) return;

        const h = document.createElement('div');
        h.className = 'rt-chart-heading';
        h.textContent = heading;
        container.appendChild(h);

        const labels = noteLabels();
        const timeMap = {};
        items.forEach(q => { timeMap[q.label] = q.timeMs; });

        const maxTime = Math.max(...items.map(q => q.timeMs));
        const minTime = Math.min(...items.map(q => q.timeMs));

        const table = document.createElement('div');
        table.className = 'stats-table';

        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        SHARP_NOTES.forEach((key, i) => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = labels[i];
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        const dataRow = document.createElement('div');
        dataRow.className = 'stats-row';
        SHARP_NOTES.forEach((key, i) => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell';
            if (timeMap[key] !== undefined) {
                const t = timeMap[key];
                const bg = reactionTimeToColor(t, minTime, maxTime);
                cell.style.backgroundColor = bg;
                cell.textContent = formatTime(t);
                cell.title = `${labels[i]}: ${formatTime(t)}`;
                const rgb = bg.match(/\d+/g).map(Number);
                const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                cell.style.color = brightness > 140 ? '#000' : '#fff';
            } else {
                cell.style.backgroundColor = '#f0f0f0';
            }
            dataRow.appendChild(cell);
        });
        table.appendChild(dataRow);

        container.appendChild(table);
    }

    function renderStats(container) {
        container.innerHTML = '';

        const gameStats = stats[STATS_KEY];
        if (!gameStats || Object.keys(gameStats).length === 0) {
            const msg = document.createElement('p');
            msg.className = 'game-explanation';
            msg.textContent = 'No stats yet. Play a round to see your accuracy!';
            container.appendChild(msg);
            return;
        }

        const labels = noteLabels();

        const table = document.createElement('div');
        table.className = 'stats-table';

        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        SHARP_NOTES.forEach((key, i) => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = labels[i];
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        const dataRow = document.createElement('div');
        dataRow.className = 'stats-row';
        SHARP_NOTES.forEach((key, i) => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell';
            const data = gameStats[key];
            if (data && data.tested > 0) {
                const ratio = data.correct / data.tested;
                const pctVal = Math.round(ratio * 100);
                cell.style.backgroundColor = accuracyToColor(ratio);
                cell.textContent = `${pctVal}%`;
                cell.title = `${labels[i]}: ${data.correct}/${data.tested} (${pctVal}%)`;
                cell.style.color = '#000';
            } else {
                cell.style.backgroundColor = '#f0f0f0';
            }
            dataRow.appendChild(cell);
        });
        table.appendChild(dataRow);

        const accHeading = document.createElement('div');
        accHeading.className = 'rt-chart-heading';
        accHeading.textContent = 'Accuracy';
        const accContainer = document.createElement('div');
        accContainer.className = 'rt-chart-container';
        accContainer.appendChild(accHeading);
        accContainer.appendChild(table);
        container.appendChild(accContainer);

        const labelAvgs = [];
        SHARP_NOTES.forEach((key) => {
            const data = gameStats[key];
            if (data && (data.timedCount || 0) > 0) {
                labelAvgs.push({
                    label: key,
                    timeMs: Math.round((data.totalTimeMs || 0) / data.timedCount)
                });
            }
        });
        if (labelAvgs.length > 0) {
            const rtContainer = document.createElement('div');
            rtContainer.className = 'rt-chart-container';
            renderReactionTimeChart(rtContainer, labelAvgs, 'Avg Reaction Time');
            container.appendChild(rtContainer);
        }
    }

    // ---- Cleanup ----

    function cleanup() {
        gameState.matrixApi = null;
        gameState.circleApi = null;
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove('note-id-active');
    }

    // ---- Init ----

    loadSettings();
    loadStats();

    window.NoteId = {
        renderTitlePage,
        renderSettings,
        cleanup
    };
})();
