/**
 * Matrix Drills Factory
 * Builds the four matrix games from a small config instead of four
 * near-identical files. An all-fourths matrix is drawn with one value
 * revealed in the center:
 *   moving right one column = +1 semitone
 *   moving up one row       = +5 semitones (a perfect 4th)
 *
 * Two axes of variation:
 *   domain: 'note'     — cells are note names; sharps/flats setting;
 *                        colors are relative to the center note
 *           'interval' — cells are interval labels; "Center Intervals"
 *                        setting; colors are absolute per interval
 *   input:  'circle'   — one cell is highlighted '?'; the player identifies
 *                        it by clicking the chromatic circle (Note/Interval ID)
 *           'matrix'   — the circle is a prompt showing a target; the player
 *                        clicks every matrix cell that matches (Locators)
 *
 * @param {Object} config
 * @param {string} config.id - game id; derives the settings key
 *   ('fretboard-<id>-settings'), the stats sub-key, and the CSS classes
 *   ('<id>-active', '<id>-counter', '<id>-matrix-container', ...)
 * @param {string} config.title
 * @param {string} config.explanation - title-page copy
 * @param {'note'|'interval'} config.domain
 * @param {'circle'|'matrix'} config.input
 */

import * as MusicTheory from '../core/music-theory.js';
import * as Sound from '../core/sound.js';
import * as GameSession from './session.js';
import { accuracyToColor, renderReactionTimeChart, snapRoundCount, ROUND_OPTIONS, roundOptionLabel, totalRoundsFor, roundCounterText, logQuestionTime } from './game-utils.js';
import { createSettingsStore, createStatsStore } from './storage.js';

// Interval labels indexed by semitone (0-11)
const SIMPLE_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

const SHARP_NOTES = MusicTheory.CHROMATIC_NOTES;
const FLAT_NOTES = MusicTheory.FLAT_NOTES;

const MATRIX_SIZES = [3, 5, 7];
const HORIZONTAL_STEP = 1;   // semitones per column moving right
const VERTICAL_STEP = 5;     // semitones per row moving up (perfect 4th)
const WRONG_FLASH_MS = 700;  // how long a wrong locator cell flashes red
const ALL_SEMITONES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function sanitizeCommon(settings) {
    if (!MATRIX_SIZES.includes(settings.matrixSize)) settings.matrixSize = 3;
    settings.roundCount = snapRoundCount(settings.roundCount);
}

export function createMatrixGame(config) {
    const { id, title, explanation, domain, input } = config;

    const isNoteDomain = domain === 'note';
    const isCircleInput = input === 'circle';
    const panelClass = `${id}-active`;
    // Note games show note names on the circle at a slightly smaller size
    const circleFontFactor = isNoteDomain ? 0.7 : 0.8;

    const settingsStore = createSettingsStore(
        `fretboard-${id}-settings`,
        isNoteDomain
            ? { matrixSize: 3, roundCount: 10, showColors: true, accidental: 'sharps' }
            : { matrixSize: 3, roundCount: 10, showColors: true, allowedCenters: [...ALL_SEMITONES] },
        settings => {
            sanitizeCommon(settings);
            if (isNoteDomain) {
                if (settings.accidental !== 'sharps' && settings.accidental !== 'flats') {
                    settings.accidental = 'sharps';
                }
            } else {
                // Sanitize allowed center intervals: integers 0-11, de-duped, non-empty
                if (Array.isArray(settings.allowedCenters)) {
                    settings.allowedCenters = [...new Set(settings.allowedCenters)]
                        .filter(s => Number.isInteger(s) && s >= 0 && s <= 11)
                        .sort((a, b) => a - b);
                } else {
                    settings.allowedCenters = [];
                }
                if (settings.allowedCenters.length === 0) {
                    settings.allowedCenters = [...ALL_SEMITONES];
                }
            }
        }
    );
    const settings = settingsStore.settings;
    const saveSettings = settingsStore.save;

    const statsStore = createStatsStore();
    let stats = {};
    function loadStats() {
        stats = statsStore.load();
    }

    // Game runtime state
    const gameState = {
        currentRound: 0,
        totalRounds: 0,
        centerSemitone: 0,
        targetSemitone: 0,
        // circle input: the single target cell
        targetRow: 0,
        targetCol: 0,
        lastTargetRow: null,
        lastTargetCol: null,
        // matrix input: every cell matching the target
        targetCells: [],
        foundCount: 0,
        lastTarget: null,
        correctCount: 0,
        answered: false,
        hadMistake: false,
        matrixApi: null,
        circleApi: null,
        questionStartTime: 0,
        questionTimes: [],
        lastCenter: null
    };

    // ---- Domain helpers ----

    // Semitone (0-11) of a cell given the center cell's semitone
    function cellSemitone(row, col, center, centerSemitone) {
        const fromCols = (col - center) * HORIZONTAL_STEP;
        const fromRows = (center - row) * VERTICAL_STEP; // up = positive
        return ((centerSemitone + fromCols + fromRows) % 12 + 144) % 12;
    }

    // Display labels for the current domain (and accidental setting)
    function displayLabels() {
        if (!isNoteDomain) return SIMPLE_LABELS;
        return settings.accidental === 'flats' ? FLAT_NOTES : SHARP_NOTES;
    }

    // Canonical stats keys (independent of the accidental display setting)
    function statsColumns() {
        return isNoteDomain ? SHARP_NOTES : SIMPLE_LABELS;
    }

    // Note domain: color by interval relative to the center; interval domain:
    // absolute color per interval label
    function colorForSemitone(semitone, centerSemitone) {
        if (!settings.showColors) {
            return { fill: '#000', border: '#000', text: '#fff' };
        }
        const interval = isNoteDomain
            ? ((semitone - centerSemitone) % 12 + 12) % 12
            : semitone;
        return MusicTheory.getIntervalColor(SIMPLE_LABELS[interval]);
    }

    function commitSessionStats() {
        statsStore.commitSession(id, gameState.questionTimes.map(q => ({
            path: [q.label],
            timeMs: q.timeMs,
            correct: q.correct
        })));
        loadStats();
    }

    // ---- Matrix renderer ----
    // circle input: shows the '?' target cell, not clickable
    // matrix input: cells are the answer input
    function renderMatrix(container, N, centerSemitone, opts) {
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
        const labels = displayLabels();
        let targetCellEl = null;
        let targetTextEl = null;
        const cellEls = [];

        for (let row = 0; row < N; row++) {
            cellEls[row] = [];
            for (let col = 0; col < N; col++) {
                const x = col * (cell + gap);
                const y = row * (cell + gap);
                const isCenter = (row === center && col === center);
                const isTarget = isCircleInput && (row === opts.targetRow && col === opts.targetCol);

                const g = document.createElementNS(svgNS, 'g');

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
                    cellEls[row][col] = null; // center is never clickable
                } else if (isTarget) {
                    rect.setAttribute('fill', '#fff');
                    rect.setAttribute('stroke', '#000');
                    rect.setAttribute('stroke-width', 6);
                    rect.setAttribute('class', `${id}-target`);
                    text.textContent = '?';
                    text.setAttribute('fill', '#bbb');
                    targetCellEl = rect;
                    targetTextEl = text;
                } else {
                    rect.setAttribute('fill', '#fafafa');
                    rect.setAttribute('stroke', '#ddd');
                    rect.setAttribute('stroke-width', 2);
                    text.textContent = '';
                    if (!isCircleInput) {
                        g.style.cursor = 'pointer';
                        g.addEventListener('click', () => opts.onCellClick(row, col));
                        cellEls[row][col] = {
                            rect,
                            text,
                            semitone: cellSemitone(row, col, center, centerSemitone),
                            found: false
                        };
                    }
                }

                g.appendChild(rect);
                g.appendChild(text);
                svg.appendChild(g);
            }
        }

        container.appendChild(svg);
        return { svg, targetCellEl, targetTextEl, cellEls };
    }

    // ---- Chromatic circle ----
    // circle input: the answer input (click a position)
    // matrix input: a prompt highlighting the center and the target to hunt for
    function renderChromaticCircle(container, centerSemitone, opts) {
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
        const labels = displayLabels();
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

            if (isCircleInput) {
                g.style.cursor = 'pointer';
                g.style.transition = 'opacity 0.4s ease-out';
            } else {
                const isCenter = (i === centerSemitone);
                const isTarget = (i === opts.targetSemitone);
                if (!isCenter && !isTarget) g.style.opacity = '0.2';

                // Target gets a bold "find this" ring; center a subtle dashed ring.
                if (isTarget) {
                    const ring = document.createElementNS(svgNS, 'circle');
                    ring.setAttribute('cx', x);
                    ring.setAttribute('cy', y);
                    ring.setAttribute('r', markerRadius + 7);
                    ring.setAttribute('fill', 'none');
                    ring.setAttribute('stroke', '#000');
                    ring.setAttribute('stroke-width', 5);
                    g.appendChild(ring);
                } else if (isCenter) {
                    const ring = document.createElementNS(svgNS, 'circle');
                    ring.setAttribute('cx', x);
                    ring.setAttribute('cy', y);
                    ring.setAttribute('r', markerRadius + 5);
                    ring.setAttribute('fill', 'none');
                    ring.setAttribute('stroke', '#000');
                    ring.setAttribute('stroke-width', 2);
                    ring.setAttribute('stroke-dasharray', '4 3');
                    g.appendChild(ring);
                }
            }

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
            text.setAttribute('font-size', markerRadius * circleFontFactor);
            text.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
            text.setAttribute('font-weight', '700');
            text.textContent = labels[i];

            g.appendChild(circle);
            g.appendChild(text);
            if (isCircleInput) {
                g.addEventListener('click', () => opts.onPick(i));
            }

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
        if (gamesPanel) gamesPanel.classList.remove(panelClass);

        const content = document.getElementById('game-content');
        if (!content) return;
        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-title-page';

        const titleEl = document.createElement('h1');
        titleEl.className = 'game-title';
        titleEl.textContent = title;
        wrapper.appendChild(titleEl);

        const explanationEl = document.createElement('p');
        explanationEl.className = 'game-explanation';
        explanationEl.textContent = explanation;
        wrapper.appendChild(explanationEl);

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

    function addSelectSetting(modalBody, labelText, options, isSelected, onChange) {
        const group = document.createElement('div');
        group.className = 'game-setting-group';
        const label = document.createElement('label');
        label.textContent = labelText;
        label.className = 'game-setting-label';
        const select = document.createElement('select');
        select.className = 'game-setting-select';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (isSelected(opt.value)) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', () => {
            onChange(select.value);
            saveSettings();
        });
        group.appendChild(label);
        group.appendChild(select);
        modalBody.appendChild(group);
    }

    function addCenterIntervalsSetting(modalBody) {
        const centerGroup = document.createElement('div');
        centerGroup.className = 'game-setting-group';
        const centerHeader = document.createElement('div');
        centerHeader.className = 'game-setting-header';
        const centerLabel = document.createElement('label');
        centerLabel.textContent = 'Center Intervals';
        centerLabel.className = 'game-setting-label';
        centerHeader.appendChild(centerLabel);

        const centerBtns = document.createElement('div');
        centerBtns.className = 'game-setting-btns';
        const selectAllCenter = document.createElement('button');
        selectAllCenter.textContent = 'All';
        selectAllCenter.className = 'game-setting-btn';
        centerBtns.appendChild(selectAllCenter);
        centerHeader.appendChild(centerBtns);
        centerGroup.appendChild(centerHeader);

        const centerChecks = document.createElement('div');
        centerChecks.className = 'game-setting-checks';

        const centerCheckboxes = [];
        for (let s = 0; s <= 11; s++) {
            const label = document.createElement('label');
            label.className = 'game-setting-check-label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = settings.allowedCenters.includes(s);
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    if (!settings.allowedCenters.includes(s)) {
                        settings.allowedCenters.push(s);
                        settings.allowedCenters.sort((a, b) => a - b);
                    }
                } else {
                    // Never allow deselecting the last remaining interval
                    if (settings.allowedCenters.length <= 1) {
                        cb.checked = true;
                        return;
                    }
                    settings.allowedCenters = settings.allowedCenters.filter(v => v !== s);
                }
                saveSettings();
            });
            centerCheckboxes.push(cb);
            const span = document.createElement('span');
            span.textContent = SIMPLE_LABELS[s];
            label.appendChild(cb);
            label.appendChild(span);
            centerChecks.appendChild(label);
        }

        selectAllCenter.addEventListener('click', () => {
            settings.allowedCenters = [...ALL_SEMITONES];
            centerCheckboxes.forEach(cb => cb.checked = true);
            saveSettings();
        });

        centerGroup.appendChild(centerChecks);
        modalBody.appendChild(centerGroup);
    }

    function renderSettings(modalBody) {
        modalBody.innerHTML = '';

        addSelectSetting(modalBody, 'Matrix Size',
            MATRIX_SIZES.map(n => ({ value: n, text: `${n}x${n}` })),
            v => parseInt(v) === settings.matrixSize,
            v => { settings.matrixSize = parseInt(v); });

        addSelectSetting(modalBody, 'Rounds',
            ROUND_OPTIONS.map(n => ({ value: n, text: roundOptionLabel(n) })),
            v => parseInt(v) === settings.roundCount,
            v => { settings.roundCount = parseInt(v); });

        if (isNoteDomain) {
            addSelectSetting(modalBody, 'Accidentals',
                [{ value: 'sharps', text: 'Sharps' }, { value: 'flats', text: 'Flats' }],
                v => v === settings.accidental,
                v => { settings.accidental = v; });
        }

        addSelectSetting(modalBody, 'Colors',
            [{ value: 'on', text: 'On' }, { value: 'off', text: 'Off' }],
            v => (v === 'on') === settings.showColors,
            v => { settings.showColors = v === 'on'; });

        if (!isNoteDomain) {
            addCenterIntervalsSetting(modalBody);
        }

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
            if (confirm(`Clear all ${title} stats?`)) {
                stats = statsStore.clearGame(id);
            }
        });
        clearGroup.appendChild(clearBtn);
        modalBody.appendChild(clearGroup);
    }

    // ---- Game Logic ----

    function startGame() {
        gameState.currentRound = 0;
        gameState.totalRounds = totalRoundsFor(settings.roundCount);
        gameState.correctCount = 0;
        gameState.questionTimes = [];
        gameState.lastCenter = null;
        gameState.lastTargetRow = null;
        gameState.lastTargetCol = null;
        gameState.lastTarget = null;
        nextQuestion();
    }

    function pickCenterSemitone() {
        if (isNoteDomain) {
            // Random center note, avoid repeating the previous round's center
            let centerSemitone = Math.floor(Math.random() * 12);
            if (gameState.lastCenter !== null && centerSemitone === gameState.lastCenter) {
                centerSemitone = (centerSemitone + 1 + Math.floor(Math.random() * 11)) % 12;
            }
            return centerSemitone;
        }
        // Random center interval from the allowed set, avoid repeating the previous
        // round's center (only possible when more than one interval is allowed)
        const pool = settings.allowedCenters;
        let centerSemitone = pool[Math.floor(Math.random() * pool.length)];
        if (pool.length > 1 && gameState.lastCenter !== null && centerSemitone === gameState.lastCenter) {
            const others = pool.filter(v => v !== gameState.lastCenter);
            centerSemitone = others[Math.floor(Math.random() * others.length)];
        }
        return centerSemitone;
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

        const centerSemitone = pickCenterSemitone();
        gameState.lastCenter = centerSemitone;
        gameState.centerSemitone = centerSemitone;

        if (isCircleInput) {
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
        } else {
            gameState.foundCount = 0;

            // Enumerate every non-center cell and group cells by semitone
            const cellsBySemitone = {};
            for (let row = 0; row < N; row++) {
                for (let col = 0; col < N; col++) {
                    if (row === center && col === center) continue;
                    const s = cellSemitone(row, col, center, centerSemitone);
                    if (!cellsBySemitone[s]) cellsBySemitone[s] = [];
                    cellsBySemitone[s].push({ row, col });
                }
            }

            // Target = a value present in the matrix, never the center, avoiding
            // an immediate repeat of the previous target when possible.
            const candidates = Object.keys(cellsBySemitone)
                .map(Number)
                .filter(s => s !== centerSemitone);
            let targetSemitone = candidates[Math.floor(Math.random() * candidates.length)];
            if (candidates.length > 1 && gameState.lastTarget !== null && targetSemitone === gameState.lastTarget) {
                const others = candidates.filter(v => v !== gameState.lastTarget);
                targetSemitone = others[Math.floor(Math.random() * others.length)];
            }
            gameState.lastTarget = targetSemitone;
            gameState.targetSemitone = targetSemitone;
            gameState.targetCells = cellsBySemitone[targetSemitone];
        }

        renderGameView();
    }

    function renderGameView() {
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.add(panelClass);

        const content = document.getElementById('game-content');
        if (!content) return;
        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-play-area game-split-layout';

        // Matrix half (left / top)
        const matrixPanel = document.createElement('div');
        matrixPanel.className = 'game-split-matrix';

        const counter = document.createElement('div');
        counter.className = `game-round-counter ${id}-counter`;
        counter.textContent = roundCounterText(gameState.currentRound, gameState.totalRounds);
        matrixPanel.appendChild(counter);

        const matrixContainer = document.createElement('div');
        matrixContainer.className = `${id}-matrix-container`;
        gameState.matrixApi = renderMatrix(
            matrixContainer,
            settings.matrixSize,
            gameState.centerSemitone,
            isCircleInput
                ? { targetRow: gameState.targetRow, targetCol: gameState.targetCol }
                : { onCellClick: handleCellClick }
        );
        matrixPanel.appendChild(matrixContainer);

        // Circle half (right / bottom)
        const circlePanel = document.createElement('div');
        circlePanel.className = 'game-split-circle';

        const circleContainer = document.createElement('div');
        circleContainer.className = `${id}-circle-container`;
        gameState.circleApi = renderChromaticCircle(
            circleContainer,
            gameState.centerSemitone,
            isCircleInput
                ? { onPick: handlePick }
                : { targetSemitone: gameState.targetSemitone }
        );
        circlePanel.appendChild(circleContainer);

        wrapper.appendChild(matrixPanel);
        wrapper.appendChild(circlePanel);
        content.appendChild(wrapper);

        gameState.questionStartTime = performance.now();
    }

    // ---- Circle-input answer flow (Note ID / Interval ID) ----

    // Keyboard note input (games/note-keyboard.js via the framework). Only
    // meaningful for Note ID, where circle positions are pitch classes.
    function handleNoteKey(noteIndex) {
        const api = gameState.circleApi;
        if (!api || !api.svg.isConnected) return;
        handlePick(noteIndex);
    }

    function handlePick(semitone) {
        if (gameState.answered) return;
        if (semitone === gameState.targetSemitone) {
            // Note ID: let the user hear the note they found
            if (isNoteDomain && GameSession.getState().soundEnabled) {
                Sound.playNote(SHARP_NOTES[semitone]);
            }
            handleCorrectAnswer();
        } else {
            handleWrongAnswer(semitone);
        }
    }

    function handleWrongAnswer(semitone) {
        gameState.hadMistake = true;
        if (GameSession.getState().soundEnabled) Sound.playError();
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
        recordQuestionTime();

        // Reveal target cell's value in the matrix
        const m = gameState.matrixApi;
        if (m && m.targetCellEl && m.targetTextEl) {
            const colors = colorForSemitone(gameState.targetSemitone, gameState.centerSemitone);
            m.targetCellEl.setAttribute('fill', colors.fill);
            m.targetCellEl.setAttribute('stroke', colors.border);
            m.targetTextEl.setAttribute('fill', colors.text);
            m.targetTextEl.textContent = displayLabels()[gameState.targetSemitone];
        }

        // Fade non-answer circle nodes, keep the correct one
        const api = gameState.circleApi;
        if (api) {
            api.nodeGroups.forEach(g => {
                const idx = parseInt(g.getAttribute('data-semitone'));
                if (idx !== gameState.targetSemitone) g.style.opacity = '0.15';
            });
        }

        GameSession.markReady();
    }

    // ---- Matrix-input answer flow (Locators) ----

    function handleCellClick(row, col) {
        if (gameState.answered) return;
        const cellData = gameState.matrixApi && gameState.matrixApi.cellEls[row][col];
        if (!cellData || cellData.found) return;

        if (cellData.semitone === gameState.targetSemitone) {
            revealCell(cellData);
            cellData.found = true;
            gameState.foundCount++;
            if (gameState.foundCount === gameState.targetCells.length) {
                completeRound();
            }
        } else {
            gameState.hadMistake = true;
            flashCellRed(cellData);
        }
    }

    function revealCell(cellData) {
        const colors = colorForSemitone(cellData.semitone, gameState.centerSemitone);
        cellData.rect.setAttribute('fill', colors.fill);
        cellData.rect.setAttribute('stroke', colors.border);
        cellData.rect.setAttribute('stroke-width', 4);
        cellData.text.setAttribute('fill', colors.text);
        cellData.text.textContent = displayLabels()[cellData.semitone];
    }

    function flashCellRed(cellData) {
        cellData.rect.setAttribute('fill', '#FF0000');
        cellData.rect.setAttribute('stroke', '#CC0000');
        setTimeout(() => {
            // Only restore if the cell hasn't since been correctly revealed
            if (!cellData.found) {
                cellData.rect.setAttribute('fill', '#fafafa');
                cellData.rect.setAttribute('stroke', '#ddd');
                cellData.rect.setAttribute('stroke-width', 2);
            }
        }, WRONG_FLASH_MS);
    }

    function completeRound() {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }
        recordQuestionTime();

        flashCellsComplete();
        showCompleteHint();

        GameSession.markReady();
    }

    // Pulse a green ring around every found cell so the player sees the round is
    // over. Border-only so the revealed fill + label stay visible.
    function flashCellsComplete() {
        const m = gameState.matrixApi;
        if (!m) return;
        gameState.targetCells.forEach(({ row, col }) => {
            const cd = m.cellEls[row][col];
            if (!cd) return;
            const origStroke = cd.rect.getAttribute('stroke');
            const origWidth = cd.rect.getAttribute('stroke-width');
            cd.rect.setAttribute('stroke', '#28A428');
            cd.rect.setAttribute('stroke-width', 8);
            setTimeout(() => {
                cd.rect.setAttribute('stroke', origStroke);
                cd.rect.setAttribute('stroke-width', origWidth);
            }, 500);
        });
    }

    // Append a "Round complete — tap to continue" hint below the matrix. Removed
    // automatically when the next round rebuilds #game-content.
    function showCompleteHint() {
        const matrixPanel = document.querySelector('#game-content .game-split-matrix');
        if (!matrixPanel || matrixPanel.querySelector('.locator-complete-hint')) return;
        const hint = document.createElement('div');
        hint.className = 'locator-complete-hint';
        const main = document.createElement('div');
        main.className = 'locator-complete-main';
        main.textContent = 'Round Complete';
        const sub = document.createElement('div');
        sub.className = 'locator-complete-sub';
        sub.textContent = 'Tap anywhere to continue';
        hint.appendChild(main);
        hint.appendChild(sub);
        matrixPanel.appendChild(hint);
    }

    // ---- Shared round bookkeeping ----

    function recordQuestionTime() {
        const elapsed = performance.now() - gameState.questionStartTime;
        logQuestionTime(gameState, {
            label: statsColumns()[gameState.targetSemitone],
            timeMs: Math.round(elapsed),
            correct: !gameState.hadMistake
        }, commitSessionStats);
    }

    // ---- Results ----

    function showResults() {
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove(panelClass);

        const content = document.getElementById('game-content');
        if (!content) return;
        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-title-page';

        const titleEl = document.createElement('h1');
        titleEl.className = 'game-title';
        titleEl.textContent = 'Results';
        wrapper.appendChild(titleEl);

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
        const rtItems = statsColumns()
            .filter(l => timesByLabel[l])
            .map(l => ({ label: l, timeMs: Math.round(timesByLabel[l].total / timesByLabel[l].count) }));
        renderReactionTimeChart(rtContainer, rtItems, 'Reaction Times', statsColumns(), displayLabels());
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

    function renderStats(container) {
        container.innerHTML = '';

        const gameStats = stats[id];
        if (!gameStats || Object.keys(gameStats).length === 0) {
            const msg = document.createElement('p');
            msg.className = 'game-explanation';
            msg.textContent = 'No stats yet. Play a round to see your accuracy!';
            container.appendChild(msg);
            return;
        }

        const columns = statsColumns();
        const labels = displayLabels();

        const table = document.createElement('div');
        table.className = 'stats-table';

        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        columns.forEach((key, i) => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = labels[i];
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        const dataRow = document.createElement('div');
        dataRow.className = 'stats-row';
        columns.forEach((key, i) => {
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
        columns.forEach((key) => {
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
            renderReactionTimeChart(rtContainer, labelAvgs, 'Avg Reaction Time', columns, labels);
            container.appendChild(rtContainer);
        }
    }

    // ---- Cleanup ----

    function cleanup() {
        gameState.matrixApi = null;
        gameState.circleApi = null;
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove(panelClass);
    }

    // ---- Init ----

    settingsStore.load();
    loadStats();

    return {
        renderTitlePage,
        renderSettings,
        cleanup,
        advance: nextQuestion,
        handleNoteKey: (isCircleInput && isNoteDomain) ? handleNoteKey : undefined
    };
}
