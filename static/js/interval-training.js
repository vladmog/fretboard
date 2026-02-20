/**
 * Interval Training Game
 * Chromatic circle quiz for identifying intervals from root notes
 * Loaded before games.js so it can register itself
 */

(function() {
    'use strict';

    const STORAGE_KEY_SETTINGS = 'fretboard-interval-training-settings';
    const STORAGE_KEY_STATS = 'fretboard-games-stats';

    // Interval labels for semitones 0-24
    const SIMPLE_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
    const COMPOUND_LABELS = ['8ve', 'b9', '9', 'b10', '10', '11', '#11', '12', 'b13', '13', 'b14', '14', '15'];

    const LONG_NAMES = [
        'Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd',
        'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th',
        'Minor 7th', 'Major 7th', 'Octave', 'Minor 9th', 'Major 9th',
        'Minor 10th', 'Major 10th', 'Perfect 11th', 'Augmented 11th',
        'Perfect 12th', 'Minor 13th', 'Major 13th', 'Minor 14th', 'Major 14th',
        'Double Octave'
    ];

    const SYMBOL_NAMES = [
        'P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7',
        'P8', 'm9', 'M9', 'm10', 'M10', 'P11', 'A11', 'P12', 'm13', 'M13', 'm14', 'M14', 'P15'
    ];

    const ALL_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

    const GAME_OCTAVE = 4;

    function getNoteOctave(noteIndex, rootIndex) {
        return (noteIndex < rootIndex) ? GAME_OCTAVE + 1 : GAME_OCTAVE;
    }

    const VALID_GAME_MODES = ['root-to-interval', 'interval-to-root', 'interval-to-interval', 'scale-builder', 'chord-builder'];

    const ALL_SCALE_TYPES = Object.keys(MusicTheory.SCALES);
    const ALL_CHORD_TYPES = Object.keys(MusicTheory.CHORD_TYPES);

    // Game settings (persisted)
    let settings = {
        gameMode: 'root-to-interval',
        roundCount: 10,
        enabledIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        enabledRoots: [...ALL_ROOTS],
        notationStyle: 'short',
        showColors: true,
        showLabels: true,
        enabledScales: [...ALL_SCALE_TYPES],
        enabledChords: [...ALL_CHORD_TYPES]
    };

    // Game runtime state
    let gameState = {
        activeMode: 'root-to-interval',
        currentRound: 0,
        totalRounds: 0,
        currentRoot: null,
        currentRootIndex: 0,
        currentSemitone: 0,
        correctCount: 0,
        answered: false,
        circleApi: null,
        givenNoteIndex: 0,
        givenSemitone: 0,
        targetSemitone: 0,
        currentScaleType: null,
        scaleNotes: [],
        scaleDegrees: [],
        currentChordType: null,
        chordNotes: [],
        chordIntervals: [],
        currentDegreeIndex: 0,
        hadMistake: false
    };

    // Stats
    let stats = {};

    // ---- Settings persistence ----

    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                settings = { ...settings, ...parsed };
                // Snap roundCount to nearest valid option
                const roundOptions = [5, 10, 20, 50, 100];
                if (!roundOptions.includes(settings.roundCount)) {
                    settings.roundCount = roundOptions.reduce((prev, curr) =>
                        Math.abs(curr - settings.roundCount) < Math.abs(prev - settings.roundCount) ? curr : prev
                    );
                }
                if (!VALID_GAME_MODES.includes(settings.gameMode)) {
                    settings.gameMode = 'root-to-interval';
                }
            }
        } catch (e) {
            console.error('Failed to load interval training settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save interval training settings:', e);
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

    function getStatsKey() {
        if (gameState.activeMode === 'root-to-interval') return 'interval-training';
        if (gameState.activeMode === 'scale-builder') return 'scale-builder';
        if (gameState.activeMode === 'chord-builder') return 'chord-builder';
        return gameState.activeMode;
    }

    function recordStat(root, semitone, isCorrect) {
        const key = getStatsKey();
        if (!stats[key]) {
            stats[key] = {};
        }
        if (!stats[key][root]) {
            stats[key][root] = {};
        }
        if (!stats[key][root][semitone]) {
            stats[key][root][semitone] = { tested: 0, correct: 0 };
        }
        stats[key][root][semitone].tested++;
        if (isCorrect) {
            stats[key][root][semitone].correct++;
        }
        saveStats();
    }

    function recordScaleStat(root, scaleType, isCorrect) {
        const key = 'scale-builder';
        if (!stats[key]) {
            stats[key] = {};
        }
        if (!stats[key][root]) {
            stats[key][root] = {};
        }
        if (!stats[key][root][scaleType]) {
            stats[key][root][scaleType] = { tested: 0, correct: 0 };
        }
        stats[key][root][scaleType].tested++;
        if (isCorrect) {
            stats[key][root][scaleType].correct++;
        }
        saveStats();
    }

    function recordChordStat(root, chordType, isCorrect) {
        const key = 'chord-builder';
        if (!stats[key]) {
            stats[key] = {};
        }
        if (!stats[key][root]) {
            stats[key][root] = {};
        }
        if (!stats[key][root][chordType]) {
            stats[key][root][chordType] = { tested: 0, correct: 0 };
        }
        stats[key][root][chordType].tested++;
        if (isCorrect) {
            stats[key][root][chordType].correct++;
        }
        saveStats();
    }

    // ---- Interval name formatting ----

    function formatIntervalName(semitone, style) {
        if (style === 'long') return LONG_NAMES[semitone] || '';
        if (style === 'symbol') return SYMBOL_NAMES[semitone] || '';
        // short
        if (semitone < 12) return SIMPLE_LABELS[semitone];
        return COMPOUND_LABELS[semitone - 12] || '';
    }

    function getIntervalLabel(semitone) {
        if (semitone < 12) return SIMPLE_LABELS[semitone];
        return COMPOUND_LABELS[semitone - 12] || '';
    }

    // ---- Helper functions ----

    function getDisplayNoteName(noteIndex) {
        if (MusicTheory.isAccidentalNote(noteIndex)) {
            const sharp = MusicTheory.CHROMATIC_NOTES[noteIndex];
            const flat = MusicTheory.FLAT_NOTES[noteIndex];
            return sharp + '/' + flat;
        }
        return MusicTheory.CHROMATIC_NOTES[noteIndex];
    }

    function updateQuestionText() {
        const api = gameState.circleApi;
        if (!api) return;

        const intervalText = api.questionGroup.querySelector('.question-interval');
        const rootText = api.questionGroup.querySelector('.question-root');
        if (!intervalText || !rootText) return;

        const mode = gameState.activeMode;
        if (mode === 'root-to-interval') {
            intervalText.textContent = formatIntervalName(gameState.currentSemitone, settings.notationStyle);
            rootText.textContent = 'from ' + gameState.currentRoot;
        } else if (mode === 'interval-to-root') {
            intervalText.textContent = getDisplayNoteName(gameState.givenNoteIndex);
            rootText.textContent = 'is the ' + formatIntervalName(gameState.givenSemitone, settings.notationStyle);
        } else if (mode === 'interval-to-interval') {
            intervalText.textContent = getDisplayNoteName(gameState.givenNoteIndex) + ' is the ' + formatIntervalName(gameState.givenSemitone, settings.notationStyle);
            rootText.textContent = 'find the ' + formatIntervalName(gameState.targetSemitone, settings.notationStyle);
        } else if (mode === 'scale-builder') {
            const scaleName = MusicTheory.SCALES[gameState.currentScaleType].name;
            intervalText.textContent = scaleName;
            rootText.textContent = 'from ' + gameState.currentRoot;
        } else if (mode === 'chord-builder') {
            const chordName = MusicTheory.CHORD_TYPES[gameState.currentChordType].name;
            intervalText.textContent = chordName;
            rootText.textContent = 'from ' + gameState.currentRoot;
        }
    }

    function getRecordSemitone() {
        if (gameState.activeMode === 'interval-to-root') return gameState.givenSemitone;
        if (gameState.activeMode === 'interval-to-interval') return gameState.targetSemitone;
        return gameState.currentSemitone;
    }

    // ---- Apply settings to current round without re-render ----

    function applySettingsToCurrentRound() {
        const api = gameState.circleApi;
        if (!api) return;

        const mode = gameState.activeMode;

        if (mode === 'scale-builder' || mode === 'chord-builder') {
            const activeNotes = mode === 'scale-builder' ? gameState.scaleNotes : gameState.chordNotes;
            api.noteGroups.forEach(g => {
                const noteIndex = parseInt(g.getAttribute('data-note-index'));
                if (!gameState.answered) {
                    // Preserve already-highlighted correct notes
                    const isHighlighted = noteIndex < activeNotes.length &&
                        gameState.currentDegreeIndex > 0 &&
                        activeNotes.slice(0, gameState.currentDegreeIndex).includes(noteIndex);
                    if (!isHighlighted) {
                        const fill = noteIndex % 2 === 0 ? '#000' : '#777';
                        const circle = g.querySelector('circle');
                        const text = g.querySelector('text');
                        circle.setAttribute('fill', fill);
                        circle.setAttribute('stroke', fill);
                        text.setAttribute('fill', '#fff');
                        text.setAttribute('visibility', settings.showLabels ? 'visible' : 'hidden');
                    }
                }
            });
            updateQuestionText();
            return;
        }

        const useNeutralColors = mode !== 'root-to-interval' && !settings.showColors;

        // Update circle colors
        api.noteGroups.forEach(g => {
            const noteIndex = parseInt(g.getAttribute('data-note-index'));
            const semitone = parseInt(g.getAttribute('data-semitone'));
            if (!gameState.answered) {
                let colors;
                if (useNeutralColors || !settings.showColors) {
                    const fill = noteIndex % 2 === 0 ? '#000' : '#777';
                    colors = { fill, border: fill, text: '#fff' };
                } else {
                    const intervalLabel = SIMPLE_LABELS[semitone];
                    colors = MusicTheory.getIntervalColor(intervalLabel);
                }
                const circle = g.querySelector('circle');
                const text = g.querySelector('text');
                circle.setAttribute('fill', colors.fill);
                circle.setAttribute('stroke', colors.border);
                text.setAttribute('fill', colors.text);
            }
            const showLabel = settings.showLabels;
            const text = g.querySelector('text');
            text.setAttribute('visibility', showLabel ? 'visible' : 'hidden');
        });

        // Update question text
        updateQuestionText();
    }

    // ---- Marker note text helper ----

    function setMarkerNoteText(textEl, noteIndex, x, y, markerRadius) {
        textEl.textContent = '';
        if (MusicTheory.isAccidentalNote(noteIndex)) {
            const svgNS = 'http://www.w3.org/2000/svg';
            const sharp = MusicTheory.CHROMATIC_NOTES[noteIndex];
            const flat = MusicTheory.FLAT_NOTES[noteIndex];
            const fontSize = markerRadius * 0.65;
            textEl.setAttribute('font-size', fontSize);
            const lineHeight = fontSize * 1.15;
            const t1 = document.createElementNS(svgNS, 'tspan');
            t1.setAttribute('x', x);
            t1.setAttribute('y', y - lineHeight / 2);
            t1.setAttribute('dominant-baseline', 'central');
            t1.textContent = sharp;
            const t2 = document.createElementNS(svgNS, 'tspan');
            t2.setAttribute('x', x);
            t2.setAttribute('y', y + lineHeight / 2);
            t2.setAttribute('dominant-baseline', 'central');
            t2.textContent = flat;
            textEl.appendChild(t1);
            textEl.appendChild(t2);
        } else {
            textEl.setAttribute('font-size', markerRadius * 0.9);
            textEl.textContent = MusicTheory.CHROMATIC_NOTES[noteIndex];
        }
    }

    // ---- Chromatic circle renderer ----

    function renderChromaticCircle(container, root, onNoteClick, options) {
        options = options || {};
        const rootIndex = MusicTheory.getNoteIndex(root);
        const useFlats = MusicTheory.shouldUseFlats(root);

        // Size: fit viewport minus space for controls
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const maxSize = Math.min(vw, vh - 200) * 0.85;
        const size = Math.max(maxSize, 250);

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '100%';
        svg.style.display = 'block';
        svg.style.margin = '0 auto';

        const center = size / 2;
        const radius = size * 0.38;
        const markerRadius = size * 0.06;
        const noteGroups = [];

        // 12 notes arranged clockwise, C at 12 o'clock
        for (let i = 0; i < 12; i++) {
            // Angle: 0 degrees = top (12 o'clock), clockwise
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);

            // Semitone distance from root
            const semitone = ((i - rootIndex) + 12) % 12;
            const intervalLabel = SIMPLE_LABELS[semitone];

            // Get colors from music theory
            let colors;
            if (options.neutralColors || !settings.showColors) {
                const fill = i % 2 === 0 ? '#000' : '#777';
                colors = { fill, border: fill, text: '#fff' };
            } else {
                colors = MusicTheory.getIntervalColor(intervalLabel);
            }

            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('data-note-index', i);
            g.setAttribute('data-semitone', semitone);
            g.style.cursor = 'pointer';
            g.style.transition = 'opacity 0.5s ease-out';

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', markerRadius);
            circle.setAttribute('fill', colors.fill);
            circle.setAttribute('stroke', colors.border);
            let strokeWidth = 2;
            if (options.highlightNoteIndex !== undefined && i === options.highlightNoteIndex) {
                strokeWidth = 4;
            } else if (!options.neutralColors && semitone === 0) {
                strokeWidth = 3;
            }
            circle.setAttribute('stroke-width', strokeWidth);

            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', colors.text);
            text.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
            text.setAttribute('font-weight', '700');
            setMarkerNoteText(text, i, x, y, markerRadius);
            const forceShow = options.forceShowLabelIndex !== undefined && i === options.forceShowLabelIndex;
            if (!settings.showLabels && !forceShow) text.setAttribute('visibility', 'hidden');

            g.appendChild(circle);
            g.appendChild(text);

            g.addEventListener('click', () => {
                onNoteClick(i, semitone);
            });

            svg.appendChild(g);
            noteGroups.push(g);
        }

        // Center question text group
        const questionGroup = document.createElementNS(svgNS, 'g');

        const questionLine1 = document.createElementNS(svgNS, 'text');
        questionLine1.setAttribute('x', center);
        questionLine1.setAttribute('y', center - size * 0.04);
        questionLine1.setAttribute('text-anchor', 'middle');
        questionLine1.setAttribute('dominant-baseline', 'central');
        questionLine1.setAttribute('font-size', size * 0.06);
        questionLine1.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
        questionLine1.setAttribute('font-weight', '700');
        questionLine1.setAttribute('fill', '#000');
        questionLine1.setAttribute('class', 'question-interval');

        const questionLine2 = document.createElementNS(svgNS, 'text');
        questionLine2.setAttribute('x', center);
        questionLine2.setAttribute('y', center + size * 0.04);
        questionLine2.setAttribute('text-anchor', 'middle');
        questionLine2.setAttribute('dominant-baseline', 'central');
        questionLine2.setAttribute('font-size', size * 0.035);
        questionLine2.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
        questionLine2.setAttribute('font-weight', '400');
        questionLine2.setAttribute('fill', '#666');
        questionLine2.setAttribute('class', 'question-root');

        questionGroup.appendChild(questionLine1);
        questionGroup.appendChild(questionLine2);
        svg.appendChild(questionGroup);

        container.appendChild(svg);

        return { noteGroups, questionGroup, svg, center, size };
    }

    // ---- Title Page ----

    function renderTitlePage() {
        loadStats();
        const content = document.getElementById('game-content');
        if (!content) return;

        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-title-page';

        const title = document.createElement('h1');
        title.className = 'game-title';
        title.textContent = 'Interval Training';
        wrapper.appendChild(title);

        const explanation = document.createElement('p');
        explanation.className = 'game-explanation';
        const modeDescriptions = {
            'root-to-interval': 'You\'ll be given a root note and an interval \u2014 click the correct note on the circle.',
            'interval-to-root': 'You\'ll be given a note and its interval from an unknown root \u2014 click the root note on the circle.',
            'interval-to-interval': 'You\'ll be given a note with its interval and a target interval \u2014 find the note that matches the target interval.',
            'scale-builder': 'You\'ll be given a scale \u2014 click the notes on the chromatic circle in order, from root to the last degree.',
            'chord-builder': 'You\'ll be given a chord \u2014 click the notes on the chromatic circle in order, from root through each chord tone.'
        };
        explanation.textContent = 'Train your ear and theory knowledge by identifying intervals on the chromatic circle. ' + modeDescriptions[settings.gameMode];
        wrapper.appendChild(explanation);

        const statsContainer = document.createElement('div');
        statsContainer.id = 'game-stats-container';
        renderStats(statsContainer);
        wrapper.appendChild(statsContainer);

        const startBtn = document.createElement('button');
        startBtn.className = 'game-start-btn';
        startBtn.textContent = 'Start';
        startBtn.addEventListener('click', () => {
            if (validateSettings()) {
                startGame();
            }
        });
        wrapper.appendChild(startBtn);

        content.appendChild(wrapper);
    }

    function validateSettings() {
        if (settings.gameMode === 'scale-builder') {
            if (settings.enabledScales.length === 0) {
                alert('Please enable at least one scale type in settings.');
                return false;
            }
            if (settings.enabledRoots.length === 0) {
                alert('Please enable at least one root note in settings.');
                return false;
            }
            return true;
        }
        if (settings.gameMode === 'chord-builder') {
            if (settings.enabledChords.length === 0) {
                alert('Please enable at least one chord type in settings.');
                return false;
            }
            if (settings.enabledRoots.length === 0) {
                alert('Please enable at least one root note in settings.');
                return false;
            }
            return true;
        }
        if (settings.enabledIntervals.length === 0) {
            alert('Please enable at least one interval in settings.');
            return false;
        }
        if (settings.enabledRoots.length === 0) {
            alert('Please enable at least one root note in settings.');
            return false;
        }
        if (settings.gameMode === 'interval-to-interval') {
            const distinctPositions = new Set(settings.enabledIntervals.map(i => i % 12));
            if (distinctPositions.size < 2) {
                alert('Interval \u2192 Interval mode requires at least 2 intervals that land on different circle positions.');
                return false;
            }
        }
        return true;
    }

    // ---- Settings Modal ----

    function renderSettings(modalBody) {
        modalBody.innerHTML = '';

        // Game Mode
        const modeGroup = document.createElement('div');
        modeGroup.className = 'game-setting-group';
        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'Game Mode';
        modeLabel.className = 'game-setting-label';
        const modeSelect = document.createElement('select');
        modeSelect.className = 'game-setting-select';
        [
            { value: 'root-to-interval', text: 'Root \u2192 Interval' },
            { value: 'interval-to-root', text: 'Interval \u2192 Root' },
            { value: 'interval-to-interval', text: 'Interval \u2192 Interval' },
            { value: 'scale-builder', text: 'Scale Builder' },
            { value: 'chord-builder', text: 'Chord Builder' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.value === settings.gameMode) option.selected = true;
            modeSelect.appendChild(option);
        });
        modeSelect.addEventListener('change', () => {
            settings.gameMode = modeSelect.value;
            saveSettings();
            renderSettings(modalBody);
        });
        modeGroup.appendChild(modeLabel);
        modeGroup.appendChild(modeSelect);
        modalBody.appendChild(modeGroup);

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

        // Notation style (hidden in scale-builder mode)
        if (settings.gameMode !== 'scale-builder' && settings.gameMode !== 'chord-builder') {
            const notationGroup = document.createElement('div');
            notationGroup.className = 'game-setting-group';
            const notationLabel = document.createElement('label');
            notationLabel.textContent = 'Notation';
            notationLabel.className = 'game-setting-label';
            const notationSelect = document.createElement('select');
            notationSelect.className = 'game-setting-select';
            [
                { value: 'short', text: 'Short (b3)' },
                { value: 'long', text: 'Long (Minor 3rd)' },
                { value: 'symbol', text: 'Symbol (m3)' }
            ].forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                if (opt.value === settings.notationStyle) option.selected = true;
                notationSelect.appendChild(option);
            });
            notationSelect.addEventListener('change', () => {
                settings.notationStyle = notationSelect.value;
                saveSettings();
                applySettingsToCurrentRound();
            });
            notationGroup.appendChild(notationLabel);
            notationGroup.appendChild(notationSelect);
            modalBody.appendChild(notationGroup);
        }

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
            applySettingsToCurrentRound();
        });
        colorsGroup.appendChild(colorsLabel);
        colorsGroup.appendChild(colorsSelect);
        modalBody.appendChild(colorsGroup);

        // Labels toggle
        const labelsGroup = document.createElement('div');
        labelsGroup.className = 'game-setting-group';
        const labelsLabel = document.createElement('label');
        labelsLabel.textContent = 'Labels';
        labelsLabel.className = 'game-setting-label';
        const labelsSelect = document.createElement('select');
        labelsSelect.className = 'game-setting-select';
        [
            { value: 'on', text: 'On' },
            { value: 'off', text: 'Off' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if ((opt.value === 'on') === settings.showLabels) option.selected = true;
            labelsSelect.appendChild(option);
        });
        labelsSelect.addEventListener('change', () => {
            settings.showLabels = labelsSelect.value === 'on';
            saveSettings();
            applySettingsToCurrentRound();
        });
        labelsGroup.appendChild(labelsLabel);
        labelsGroup.appendChild(labelsSelect);
        modalBody.appendChild(labelsGroup);

        if (settings.gameMode === 'chord-builder') {
            // Chord type checkboxes
            const chordGroup = document.createElement('div');
            chordGroup.className = 'game-setting-group';
            const chordHeader = document.createElement('div');
            chordHeader.className = 'game-setting-header';
            const chordLabel = document.createElement('label');
            chordLabel.textContent = 'Chord Types';
            chordLabel.className = 'game-setting-label';
            chordHeader.appendChild(chordLabel);

            const chordBtns = document.createElement('div');
            chordBtns.className = 'game-setting-btns';
            const selectAllChords = document.createElement('button');
            selectAllChords.textContent = 'All';
            selectAllChords.className = 'game-setting-btn';
            const deselectAllChords = document.createElement('button');
            deselectAllChords.textContent = 'None';
            deselectAllChords.className = 'game-setting-btn';
            chordBtns.appendChild(selectAllChords);
            chordBtns.appendChild(deselectAllChords);
            chordHeader.appendChild(chordBtns);
            chordGroup.appendChild(chordHeader);

            const chordChecks = document.createElement('div');
            chordChecks.className = 'game-setting-checks';

            const chordCheckboxes = [];
            ALL_CHORD_TYPES.forEach(key => {
                const label = document.createElement('label');
                label.className = 'game-setting-check-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = settings.enabledChords.includes(key);
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        if (!settings.enabledChords.includes(key)) {
                            settings.enabledChords.push(key);
                        }
                    } else {
                        settings.enabledChords = settings.enabledChords.filter(v => v !== key);
                    }
                    saveSettings();
                });
                chordCheckboxes.push(cb);
                const span = document.createElement('span');
                span.textContent = MusicTheory.CHORD_TYPES[key].name;
                label.appendChild(cb);
                label.appendChild(span);
                chordChecks.appendChild(label);
            });

            selectAllChords.addEventListener('click', () => {
                settings.enabledChords = [...ALL_CHORD_TYPES];
                chordCheckboxes.forEach(cb => cb.checked = true);
                saveSettings();
            });
            deselectAllChords.addEventListener('click', () => {
                settings.enabledChords = [];
                chordCheckboxes.forEach(cb => cb.checked = false);
                saveSettings();
            });

            chordGroup.appendChild(chordChecks);
            modalBody.appendChild(chordGroup);
        } else if (settings.gameMode === 'scale-builder') {
            // Scale type checkboxes
            const scaleGroup = document.createElement('div');
            scaleGroup.className = 'game-setting-group';
            const scaleHeader = document.createElement('div');
            scaleHeader.className = 'game-setting-header';
            const scaleLabel = document.createElement('label');
            scaleLabel.textContent = 'Scale Types';
            scaleLabel.className = 'game-setting-label';
            scaleHeader.appendChild(scaleLabel);

            const scaleBtns = document.createElement('div');
            scaleBtns.className = 'game-setting-btns';
            const selectAllScales = document.createElement('button');
            selectAllScales.textContent = 'All';
            selectAllScales.className = 'game-setting-btn';
            const deselectAllScales = document.createElement('button');
            deselectAllScales.textContent = 'None';
            deselectAllScales.className = 'game-setting-btn';
            scaleBtns.appendChild(selectAllScales);
            scaleBtns.appendChild(deselectAllScales);
            scaleHeader.appendChild(scaleBtns);
            scaleGroup.appendChild(scaleHeader);

            const scaleChecks = document.createElement('div');
            scaleChecks.className = 'game-setting-checks';

            const scaleCheckboxes = [];
            ALL_SCALE_TYPES.forEach(key => {
                const label = document.createElement('label');
                label.className = 'game-setting-check-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = settings.enabledScales.includes(key);
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        if (!settings.enabledScales.includes(key)) {
                            settings.enabledScales.push(key);
                        }
                    } else {
                        settings.enabledScales = settings.enabledScales.filter(v => v !== key);
                    }
                    saveSettings();
                });
                scaleCheckboxes.push(cb);
                const span = document.createElement('span');
                span.textContent = MusicTheory.SCALES[key].name;
                label.appendChild(cb);
                label.appendChild(span);
                scaleChecks.appendChild(label);
            });

            selectAllScales.addEventListener('click', () => {
                settings.enabledScales = [...ALL_SCALE_TYPES];
                scaleCheckboxes.forEach(cb => cb.checked = true);
                saveSettings();
            });
            deselectAllScales.addEventListener('click', () => {
                settings.enabledScales = [];
                scaleCheckboxes.forEach(cb => cb.checked = false);
                saveSettings();
            });

            scaleGroup.appendChild(scaleChecks);
            modalBody.appendChild(scaleGroup);
        } else {
            // Interval checkboxes
            const intervalGroup = document.createElement('div');
            intervalGroup.className = 'game-setting-group';
            const intervalHeader = document.createElement('div');
            intervalHeader.className = 'game-setting-header';
            const intervalLabel = document.createElement('label');
            intervalLabel.textContent = 'Intervals';
            intervalLabel.className = 'game-setting-label';
            intervalHeader.appendChild(intervalLabel);

            const intervalBtns = document.createElement('div');
            intervalBtns.className = 'game-setting-btns';
            const selectAllInt = document.createElement('button');
            selectAllInt.textContent = 'All';
            selectAllInt.className = 'game-setting-btn';
            const deselectAllInt = document.createElement('button');
            deselectAllInt.textContent = 'None';
            deselectAllInt.className = 'game-setting-btn';
            intervalBtns.appendChild(selectAllInt);
            intervalBtns.appendChild(deselectAllInt);
            intervalHeader.appendChild(intervalBtns);
            intervalGroup.appendChild(intervalHeader);

            const intervalChecks = document.createElement('div');
            intervalChecks.className = 'game-setting-checks';

            const intervalCheckboxes = [];
            for (let s = 0; s <= 24; s++) {
                const label = document.createElement('label');
                label.className = 'game-setting-check-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = settings.enabledIntervals.includes(s);
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        if (!settings.enabledIntervals.includes(s)) {
                            settings.enabledIntervals.push(s);
                        }
                    } else {
                        settings.enabledIntervals = settings.enabledIntervals.filter(v => v !== s);
                    }
                    saveSettings();
                });
                intervalCheckboxes.push(cb);
                const span = document.createElement('span');
                span.textContent = getIntervalLabel(s);
                label.appendChild(cb);
                label.appendChild(span);
                intervalChecks.appendChild(label);
            }

            selectAllInt.addEventListener('click', () => {
                settings.enabledIntervals = Array.from({ length: 25 }, (_, i) => i);
                intervalCheckboxes.forEach(cb => cb.checked = true);
                saveSettings();
            });
            deselectAllInt.addEventListener('click', () => {
                settings.enabledIntervals = [];
                intervalCheckboxes.forEach(cb => cb.checked = false);
                saveSettings();
            });

            intervalGroup.appendChild(intervalChecks);
            modalBody.appendChild(intervalGroup);
        }

        // Root note checkboxes
        const rootGroup = document.createElement('div');
        rootGroup.className = 'game-setting-group';
        const rootHeader = document.createElement('div');
        rootHeader.className = 'game-setting-header';
        const rootLabel = document.createElement('label');
        rootLabel.textContent = 'Root Notes';
        rootLabel.className = 'game-setting-label';
        rootHeader.appendChild(rootLabel);

        const rootBtns = document.createElement('div');
        rootBtns.className = 'game-setting-btns';
        const selectAllRoot = document.createElement('button');
        selectAllRoot.textContent = 'All';
        selectAllRoot.className = 'game-setting-btn';
        const deselectAllRoot = document.createElement('button');
        deselectAllRoot.textContent = 'None';
        deselectAllRoot.className = 'game-setting-btn';
        rootBtns.appendChild(selectAllRoot);
        rootBtns.appendChild(deselectAllRoot);
        rootHeader.appendChild(rootBtns);
        rootGroup.appendChild(rootHeader);

        const rootChecks = document.createElement('div');
        rootChecks.className = 'game-setting-checks';

        const rootCheckboxes = [];
        ALL_ROOTS.forEach(note => {
            const label = document.createElement('label');
            label.className = 'game-setting-check-label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = settings.enabledRoots.includes(note);
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    if (!settings.enabledRoots.includes(note)) {
                        settings.enabledRoots.push(note);
                    }
                } else {
                    settings.enabledRoots = settings.enabledRoots.filter(v => v !== note);
                }
                saveSettings();
            });
            rootCheckboxes.push(cb);
            const span = document.createElement('span');
            span.textContent = note;
            label.appendChild(cb);
            label.appendChild(span);
            rootChecks.appendChild(label);
        });

        selectAllRoot.addEventListener('click', () => {
            settings.enabledRoots = [...ALL_ROOTS];
            rootCheckboxes.forEach(cb => cb.checked = true);
            saveSettings();
        });
        deselectAllRoot.addEventListener('click', () => {
            settings.enabledRoots = [];
            rootCheckboxes.forEach(cb => cb.checked = false);
            saveSettings();
        });

        rootGroup.appendChild(rootChecks);
        modalBody.appendChild(rootGroup);

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
            const key = getStatsKey();
            const modeNames = {
                'interval-training': 'Root \u2192 Interval',
                'interval-to-root': 'Interval \u2192 Root',
                'interval-to-interval': 'Interval \u2192 Interval',
                'scale-builder': 'Scale Builder',
                'chord-builder': 'Chord Builder'
            };
            if (confirm('Clear stats for ' + modeNames[key] + ' mode?')) {
                delete stats[key];
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
        nextQuestion();
    }

    function nextQuestion() {
        gameState.currentRound++;
        gameState.answered = false;
        gameState.activeMode = settings.gameMode;

        if (gameState.currentRound > gameState.totalRounds) {
            showResults();
            return;
        }

        // Pick random root
        const rootIdx = Math.floor(Math.random() * settings.enabledRoots.length);
        gameState.currentRoot = settings.enabledRoots[rootIdx];
        gameState.currentRootIndex = MusicTheory.getNoteIndex(gameState.currentRoot);

        const mode = gameState.activeMode;

        if (mode === 'scale-builder') {
            const scaleIdx = Math.floor(Math.random() * settings.enabledScales.length);
            gameState.currentScaleType = settings.enabledScales[scaleIdx];
            const scale = MusicTheory.buildScale(gameState.currentRoot, gameState.currentScaleType);
            const scaleFormula = MusicTheory.SCALES[gameState.currentScaleType];
            gameState.scaleNotes = scaleFormula.intervals.map(interval =>
                (gameState.currentRootIndex + MusicTheory.INTERVALS[interval]) % 12
            );
            gameState.scaleDegrees = scale.degrees;
            gameState.currentDegreeIndex = 0;
            gameState.hadMistake = false;
        } else if (mode === 'chord-builder') {
            const chordIdx = Math.floor(Math.random() * settings.enabledChords.length);
            gameState.currentChordType = settings.enabledChords[chordIdx];
            const chordFormula = MusicTheory.CHORD_TYPES[gameState.currentChordType];
            gameState.chordNotes = chordFormula.intervals.map(interval =>
                (gameState.currentRootIndex + MusicTheory.INTERVALS[interval]) % 12
            );
            gameState.chordIntervals = chordFormula.intervals;
            gameState.currentDegreeIndex = 0;
            gameState.hadMistake = false;
        } else {
            const intIdx = Math.floor(Math.random() * settings.enabledIntervals.length);
            gameState.currentSemitone = settings.enabledIntervals[intIdx];

            if (mode === 'interval-to-root') {
                gameState.givenSemitone = gameState.currentSemitone;
                gameState.givenNoteIndex = (gameState.currentRootIndex + gameState.givenSemitone) % 12;
            } else if (mode === 'interval-to-interval') {
                gameState.givenSemitone = gameState.currentSemitone;
                gameState.givenNoteIndex = (gameState.currentRootIndex + gameState.givenSemitone) % 12;
                // Pick a second interval that lands on a different circle position
                const givenPos = gameState.givenSemitone % 12;
                const candidates = settings.enabledIntervals.filter(i => i % 12 !== givenPos);
                gameState.targetSemitone = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        renderGameView();
    }

    function renderGameView() {
        const content = document.getElementById('game-content');
        if (!content) return;

        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-play-area';

        // Round counter
        const counter = document.createElement('div');
        counter.className = 'game-round-counter';
        counter.textContent = `${gameState.currentRound} / ${gameState.totalRounds}`;
        wrapper.appendChild(counter);

        // Circle container
        const circleContainer = document.createElement('div');
        circleContainer.className = 'game-circle-container';

        const mode = gameState.activeMode;
        const circleOptions = {};
        if (mode === 'scale-builder' || mode === 'chord-builder') {
            circleOptions.neutralColors = true;
        } else if (mode !== 'root-to-interval') {
            circleOptions.neutralColors = !settings.showColors;
            circleOptions.highlightNoteIndex = gameState.givenNoteIndex;
            if (settings.showLabels) {
                circleOptions.forceShowLabelIndex = gameState.givenNoteIndex;
            }
        }

        gameState.circleApi = renderChromaticCircle(
            circleContainer,
            gameState.currentRoot,
            handleNoteClick,
            circleOptions
        );

        // Set question text
        updateQuestionText();

        wrapper.appendChild(circleContainer);

        // Next button (hidden initially)
        const nextBtn = document.createElement('button');
        nextBtn.className = 'game-next-btn';
        nextBtn.id = 'game-next-btn';
        nextBtn.textContent = 'Next';
        nextBtn.style.display = 'none';
        nextBtn.addEventListener('click', nextQuestion);
        wrapper.appendChild(nextBtn);

        content.appendChild(wrapper);

        // Auto-play: root note for root-to-interval and scale-builder, given note for other modes
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            if (mode === 'root-to-interval' || mode === 'scale-builder' || mode === 'chord-builder') {
                Sound.playNote(gameState.currentRoot, GAME_OCTAVE);
            } else {
                const givenNoteName = MusicTheory.getNoteName(gameState.givenNoteIndex, false);
                Sound.playNote(givenNoteName, getNoteOctave(gameState.givenNoteIndex, gameState.currentRootIndex));
            }
        }
    }

    function handleNoteClick(noteIndex, semitone) {
        if (gameState.answered) return;

        const mode = gameState.activeMode;

        if (mode === 'scale-builder') {
            const expectedIndex = gameState.scaleNotes[gameState.currentDegreeIndex];
            if (noteIndex === expectedIndex) {
                handleScaleCorrectStep(noteIndex);
            } else {
                handleScaleWrongStep(noteIndex);
            }
            return;
        }

        if (mode === 'chord-builder') {
            const expectedIndex = gameState.chordNotes[gameState.currentDegreeIndex];
            if (noteIndex === expectedIndex) {
                handleChordCorrectStep(noteIndex);
            } else {
                handleChordWrongStep(noteIndex);
            }
            return;
        }

        let correctNoteIndex;
        if (mode === 'interval-to-root') {
            correctNoteIndex = gameState.currentRootIndex;
        } else if (mode === 'interval-to-interval') {
            correctNoteIndex = (gameState.currentRootIndex + gameState.targetSemitone) % 12;
        } else {
            correctNoteIndex = (gameState.currentRootIndex + gameState.currentSemitone) % 12;
        }

        if (noteIndex === correctNoteIndex) {
            handleCorrectAnswer(noteIndex);
        } else {
            handleWrongAnswer(noteIndex, semitone);
        }
    }

    function handleWrongAnswer(clickedNoteIndex, clickedSemitone) {
        // Play clicked note sound
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            const noteName = MusicTheory.getNoteName(clickedNoteIndex, false);
            Sound.playNote(noteName, getNoteOctave(clickedNoteIndex, gameState.currentRootIndex));
        }

        // Record stat
        recordStat(gameState.currentRoot, getRecordSemitone(), false);

        // Flash red
        const api = gameState.circleApi;
        if (api) {
            const group = api.noteGroups.find(g =>
                parseInt(g.getAttribute('data-note-index')) === clickedNoteIndex
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
    }

    function handleCorrectAnswer(noteIndex) {
        gameState.answered = true;
        gameState.correctCount++;

        // Record stat
        recordStat(gameState.currentRoot, getRecordSemitone(), true);

        const api = gameState.circleApi;
        if (api) {
            const mode = gameState.activeMode;
            const rootIndex = gameState.currentRootIndex;

            // Determine which note indices to keep visible
            const keepVisible = new Set();
            if (mode === 'root-to-interval') {
                const correctNoteIndex = (rootIndex + gameState.currentSemitone) % 12;
                keepVisible.add(rootIndex);
                keepVisible.add(correctNoteIndex);
            } else if (mode === 'interval-to-root') {
                keepVisible.add(rootIndex);
                keepVisible.add(gameState.givenNoteIndex);
            } else if (mode === 'interval-to-interval') {
                const answerIndex = (rootIndex + gameState.targetSemitone) % 12;
                keepVisible.add(rootIndex);
                keepVisible.add(gameState.givenNoteIndex);
                keepVisible.add(answerIndex);
            }

            // Fade out non-kept notes
            api.noteGroups.forEach(g => {
                const idx = parseInt(g.getAttribute('data-note-index'));
                if (!keepVisible.has(idx)) {
                    g.style.opacity = '0.1';
                }
            });

            // Reveal labels and optionally apply interval colors on kept notes
            api.noteGroups.forEach(g => {
                const idx = parseInt(g.getAttribute('data-note-index'));
                if (keepVisible.has(idx)) {
                    const text = g.querySelector('text');
                    if (text) text.setAttribute('visibility', 'visible');
                    // Always show interval colors on correct answer, regardless of toggle
                    const sem = ((idx - rootIndex) + 12) % 12;
                    const intervalLabel = SIMPLE_LABELS[sem];
                    const colors = MusicTheory.getIntervalColor(intervalLabel);
                    const circle = g.querySelector('circle');
                    circle.setAttribute('fill', colors.fill);
                    circle.setAttribute('stroke', colors.border);
                    text.setAttribute('fill', colors.text);
                }
            });

            // Update center text based on mode
            const intervalText = api.questionGroup.querySelector('.question-interval');
            const rootText = api.questionGroup.querySelector('.question-root');

            if (mode === 'root-to-interval') {
                const targetIndex = (rootIndex + gameState.currentSemitone) % 12;
                const targetDisplay = getDisplayNoteName(targetIndex);
                if (rootText) {
                    rootText.textContent = 'from ' + gameState.currentRoot + ' is ' + targetDisplay;
                }
            } else if (mode === 'interval-to-root') {
                if (rootText) {
                    rootText.textContent = 'root is ' + gameState.currentRoot;
                }
            } else if (mode === 'interval-to-interval') {
                const answerIndex = (rootIndex + gameState.targetSemitone) % 12;
                const answerDisplay = getDisplayNoteName(answerIndex);
                if (intervalText) {
                    intervalText.textContent = formatIntervalName(gameState.targetSemitone, settings.notationStyle) + ' is ' + answerDisplay;
                }
                if (rootText) {
                    rootText.textContent = 'root is ' + gameState.currentRoot;
                }
            }

            // Sound
            const gamesState2 = window.Games ? window.Games.getState() : null;
            if (gamesState2 && gamesState2.soundEnabled) {
                if (mode === 'root-to-interval') {
                    const targetIndex = (rootIndex + gameState.currentSemitone) % 12;
                    const targetNote = MusicTheory.getNoteName(targetIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
                    Sound.playNote(targetNote, getNoteOctave(targetIndex, gameState.currentRootIndex));
                    setTimeout(() => {
                        Sound.playInterval(gameState.currentRoot, targetNote, gameState.currentSemitone, GAME_OCTAVE);
                    }, 250);
                } else if (mode === 'interval-to-root') {
                    Sound.playNote(gameState.currentRoot, GAME_OCTAVE);
                    const givenNoteName = MusicTheory.getNoteName(gameState.givenNoteIndex, false);
                    setTimeout(() => {
                        Sound.playInterval(gameState.currentRoot, givenNoteName, gameState.givenSemitone, GAME_OCTAVE);
                    }, 250);
                } else if (mode === 'interval-to-interval') {
                    const answerIndex = (rootIndex + gameState.targetSemitone) % 12;
                    const answerNote = MusicTheory.getNoteName(answerIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
                    Sound.playNote(answerNote, getNoteOctave(answerIndex, gameState.currentRootIndex));
                    setTimeout(() => {
                        Sound.playInterval(gameState.currentRoot, answerNote, gameState.targetSemitone, GAME_OCTAVE);
                    }, 250);
                }
            }

            // Show next button at 500ms
            setTimeout(() => {
                const nextBtn = document.getElementById('game-next-btn');
                if (nextBtn) {
                    nextBtn.style.display = 'block';
                }
            }, 500);
        }
    }

    function handleScaleCorrectStep(noteIndex) {
        const api = gameState.circleApi;
        if (!api) return;

        // Play clicked note sound
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            const noteName = MusicTheory.getNoteName(noteIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
            Sound.playNote(noteName, getNoteOctave(noteIndex, gameState.currentRootIndex));
        }

        // Flash green
        const group = api.noteGroups.find(g =>
            parseInt(g.getAttribute('data-note-index')) === noteIndex
        );
        if (group) {
            const circle = group.querySelector('circle');
            const text = group.querySelector('text');
            circle.setAttribute('fill', '#00CC00');
            circle.setAttribute('stroke', '#009900');

            const degreeLabel = gameState.scaleDegrees[gameState.currentDegreeIndex];

            setTimeout(() => {
                // Apply interval color
                if (settings.showColors) {
                    const colors = MusicTheory.getIntervalColor(degreeLabel);
                    circle.setAttribute('fill', colors.fill);
                    circle.setAttribute('stroke', colors.border);
                    text.setAttribute('fill', colors.text);
                } else {
                    const fill = noteIndex % 2 === 0 ? '#000' : '#777';
                    circle.setAttribute('fill', fill);
                    circle.setAttribute('stroke', fill);
                    text.setAttribute('fill', '#fff');
                }
                // Force-show label
                if (settings.showLabels) {
                    text.setAttribute('visibility', 'visible');
                }
            }, 300);
        }

        gameState.currentDegreeIndex++;

        // Update progress text
        const rootText = api.questionGroup.querySelector('.question-root');
        if (rootText) {
            rootText.textContent = 'from ' + gameState.currentRoot + ' (' + gameState.currentDegreeIndex + '/' + gameState.scaleNotes.length + ')';
        }

        if (gameState.currentDegreeIndex === gameState.scaleNotes.length) {
            handleScaleComplete();
        }
    }

    function handleScaleWrongStep(noteIndex) {
        const api = gameState.circleApi;
        if (!api) return;

        // Play clicked note sound
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            const noteName = MusicTheory.getNoteName(noteIndex, false);
            Sound.playNote(noteName, getNoteOctave(noteIndex, gameState.currentRootIndex));
        }

        gameState.hadMistake = true;

        // Flash ALL 12 markers red
        const origColors = [];
        api.noteGroups.forEach(g => {
            const circle = g.querySelector('circle');
            origColors.push({
                fill: circle.getAttribute('fill'),
                stroke: circle.getAttribute('stroke')
            });
            circle.setAttribute('fill', '#FF0000');
            circle.setAttribute('stroke', '#CC0000');
        });

        setTimeout(() => {
            // Restore all markers to neutral colors
            api.noteGroups.forEach((g, i) => {
                const idx = parseInt(g.getAttribute('data-note-index'));
                const circle = g.querySelector('circle');
                const text = g.querySelector('text');
                const fill = idx % 2 === 0 ? '#000' : '#777';
                circle.setAttribute('fill', fill);
                circle.setAttribute('stroke', fill);
                text.setAttribute('fill', '#fff');
            });

            // Reset sequence
            gameState.currentDegreeIndex = 0;

            // Reset progress text
            const rootText = api.questionGroup.querySelector('.question-root');
            if (rootText) {
                rootText.textContent = 'from ' + gameState.currentRoot;
            }
        }, 400);
    }

    function handleScaleComplete() {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        // Record stat
        recordScaleStat(gameState.currentRoot, gameState.currentScaleType, !gameState.hadMistake);

        const api = gameState.circleApi;
        if (!api) return;

        const rootIndex = gameState.currentRootIndex;
        const scaleNoteSet = new Set(gameState.scaleNotes);

        // Fade out non-scale notes
        api.noteGroups.forEach(g => {
            const idx = parseInt(g.getAttribute('data-note-index'));
            if (!scaleNoteSet.has(idx)) {
                g.style.opacity = '0.1';
            }
        });

        // Ensure all scale notes show interval colors and visible labels
        api.noteGroups.forEach(g => {
            const idx = parseInt(g.getAttribute('data-note-index'));
            if (scaleNoteSet.has(idx)) {
                const text = g.querySelector('text');
                const circle = g.querySelector('circle');
                if (text) text.setAttribute('visibility', 'visible');
                const sem = ((idx - rootIndex) + 12) % 12;
                const intervalLabel = SIMPLE_LABELS[sem];
                const colors = MusicTheory.getIntervalColor(intervalLabel);
                circle.setAttribute('fill', colors.fill);
                circle.setAttribute('stroke', colors.border);
                text.setAttribute('fill', colors.text);
            }
        });

        // Update center text
        const intervalText = api.questionGroup.querySelector('.question-interval');
        const rootText = api.questionGroup.querySelector('.question-root');
        if (intervalText) {
            intervalText.textContent = gameState.currentRoot + ' ' + MusicTheory.SCALES[gameState.currentScaleType].name;
        }
        if (rootText) {
            rootText.textContent = '';
        }

        // Arpeggiated playthrough
        const gamesState = window.Games ? window.Games.getState() : null;
        const noteCount = gameState.scaleNotes.length;
        if (gamesState && gamesState.soundEnabled) {
            gameState.scaleNotes.forEach((noteIdx, i) => {
                setTimeout(() => {
                    const noteName = MusicTheory.getNoteName(noteIdx, MusicTheory.shouldUseFlats(gameState.currentRoot));
                    Sound.playNote(noteName, getNoteOctave(noteIdx, gameState.currentRootIndex), 0.4);
                }, i * 200);
            });
        }

        // Show Next button after arpeggio finishes
        const delay = 500 + (noteCount * 200);
        setTimeout(() => {
            const nextBtn = document.getElementById('game-next-btn');
            if (nextBtn) {
                nextBtn.style.display = 'block';
            }
        }, delay);
    }

    function handleChordCorrectStep(noteIndex) {
        const api = gameState.circleApi;
        if (!api) return;

        const isLastStep = gameState.currentDegreeIndex === gameState.chordNotes.length - 1;

        // Play clicked note sound (skip on last step — chord plays on complete)
        if (!isLastStep) {
            const gamesState = window.Games ? window.Games.getState() : null;
            if (gamesState && gamesState.soundEnabled) {
                const noteName = MusicTheory.getNoteName(noteIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
                Sound.playNote(noteName, getNoteOctave(noteIndex, gameState.currentRootIndex));
            }
        }

        // Flash green
        const group = api.noteGroups.find(g =>
            parseInt(g.getAttribute('data-note-index')) === noteIndex
        );
        if (group) {
            const circle = group.querySelector('circle');
            const text = group.querySelector('text');
            circle.setAttribute('fill', '#00CC00');
            circle.setAttribute('stroke', '#009900');

            const degreeLabel = gameState.chordIntervals[gameState.currentDegreeIndex];

            setTimeout(() => {
                // Apply interval color
                if (settings.showColors) {
                    const colors = MusicTheory.getIntervalColor(degreeLabel);
                    circle.setAttribute('fill', colors.fill);
                    circle.setAttribute('stroke', colors.border);
                    text.setAttribute('fill', colors.text);
                } else {
                    const fill = noteIndex % 2 === 0 ? '#000' : '#777';
                    circle.setAttribute('fill', fill);
                    circle.setAttribute('stroke', fill);
                    text.setAttribute('fill', '#fff');
                }
                // Force-show label
                if (settings.showLabels) {
                    text.setAttribute('visibility', 'visible');
                }
            }, 300);
        }

        gameState.currentDegreeIndex++;

        // Update progress text
        const rootText = api.questionGroup.querySelector('.question-root');
        if (rootText) {
            rootText.textContent = 'from ' + gameState.currentRoot + ' (' + gameState.currentDegreeIndex + '/' + gameState.chordNotes.length + ')';
        }

        if (gameState.currentDegreeIndex === gameState.chordNotes.length) {
            handleChordComplete();
        }
    }

    function handleChordWrongStep(noteIndex) {
        const api = gameState.circleApi;
        if (!api) return;

        // Play clicked note sound
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            const noteName = MusicTheory.getNoteName(noteIndex, false);
            Sound.playNote(noteName, getNoteOctave(noteIndex, gameState.currentRootIndex));
        }

        gameState.hadMistake = true;

        // Flash ALL 12 markers red
        api.noteGroups.forEach(g => {
            const circle = g.querySelector('circle');
            circle.setAttribute('fill', '#FF0000');
            circle.setAttribute('stroke', '#CC0000');
        });

        setTimeout(() => {
            // Restore all markers to neutral colors
            api.noteGroups.forEach(g => {
                const idx = parseInt(g.getAttribute('data-note-index'));
                const circle = g.querySelector('circle');
                const text = g.querySelector('text');
                const fill = idx % 2 === 0 ? '#000' : '#777';
                circle.setAttribute('fill', fill);
                circle.setAttribute('stroke', fill);
                text.setAttribute('fill', '#fff');
            });

            // Reset sequence
            gameState.currentDegreeIndex = 0;

            // Reset progress text
            const rootText = api.questionGroup.querySelector('.question-root');
            if (rootText) {
                rootText.textContent = 'from ' + gameState.currentRoot;
            }
        }, 400);
    }

    function handleChordComplete() {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        // Record stat
        recordChordStat(gameState.currentRoot, gameState.currentChordType, !gameState.hadMistake);

        const api = gameState.circleApi;
        if (!api) return;

        const rootIndex = gameState.currentRootIndex;
        const chordNoteSet = new Set(gameState.chordNotes);

        // Fade out non-chord notes
        api.noteGroups.forEach(g => {
            const idx = parseInt(g.getAttribute('data-note-index'));
            if (!chordNoteSet.has(idx)) {
                g.style.opacity = '0.1';
            }
        });

        // Ensure all chord notes show interval colors and visible labels
        api.noteGroups.forEach(g => {
            const idx = parseInt(g.getAttribute('data-note-index'));
            if (chordNoteSet.has(idx)) {
                const text = g.querySelector('text');
                const circle = g.querySelector('circle');
                if (text) text.setAttribute('visibility', 'visible');
                const sem = ((idx - rootIndex) + 12) % 12;
                const intervalLabel = SIMPLE_LABELS[sem];
                const colors = MusicTheory.getIntervalColor(intervalLabel);
                circle.setAttribute('fill', colors.fill);
                circle.setAttribute('stroke', colors.border);
                text.setAttribute('fill', colors.text);
            }
        });

        // Update center text
        const intervalText = api.questionGroup.querySelector('.question-interval');
        const rootText = api.questionGroup.querySelector('.question-root');
        if (intervalText) {
            intervalText.textContent = gameState.currentRoot + ' ' + MusicTheory.CHORD_TYPES[gameState.currentChordType].name;
        }
        if (rootText) {
            rootText.textContent = '';
        }

        // Play chord
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            const useFlats = MusicTheory.shouldUseFlats(gameState.currentRoot);
            const chordNoteNames = gameState.chordNotes.map(noteIdx => {
                const name = MusicTheory.getNoteName(noteIdx, useFlats);
                return name + getNoteOctave(noteIdx, gameState.currentRootIndex);
            });
            Sound.playChord(chordNoteNames);
        }

        // Show Next button
        setTimeout(() => {
            const nextBtn = document.getElementById('game-next-btn');
            if (nextBtn) {
                nextBtn.style.display = 'block';
            }
        }, 500);
    }

    function showResults() {
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

        // Stats
        const statsContainer = document.createElement('div');
        statsContainer.id = 'game-stats-container';
        loadStats();
        renderStats(statsContainer);
        wrapper.appendChild(statsContainer);

        const btnRow = document.createElement('div');
        btnRow.className = 'game-btn-row';

        const playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'game-start-btn';
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.addEventListener('click', () => {
            if (validateSettings()) startGame();
        });
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
        // 0% = red #FF4444, 50% = yellow #FFD700, 100% = green #32CD32
        let r, g, b;
        if (ratio <= 0.5) {
            const t = ratio / 0.5;
            r = Math.round(255 + (255 - 255) * t);
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

    function renderStats(container) {
        container.innerHTML = '';

        const statsKey = getStatsKey();
        const gameStats = stats[statsKey];
        if (!gameStats || Object.keys(gameStats).length === 0) {
            const msg = document.createElement('p');
            msg.className = 'game-explanation';
            msg.textContent = 'No stats yet. Play a round to see your accuracy!';
            container.appendChild(msg);
            return;
        }

        if (statsKey === 'chord-builder') {
            // Chord builder stats: columns = chord types
            const testedChords = new Set();
            const testedRoots = [];

            ALL_ROOTS.forEach(root => {
                if (gameStats[root]) {
                    testedRoots.push(root);
                    Object.keys(gameStats[root]).forEach(c => testedChords.add(c));
                }
            });

            // Sort chord types in the same order as ALL_CHORD_TYPES
            const sortedChords = ALL_CHORD_TYPES.filter(c => testedChords.has(c));
            if (sortedChords.length === 0) return;

            const table = document.createElement('div');
            table.className = 'stats-table';

            // Header row
            const headerRow = document.createElement('div');
            headerRow.className = 'stats-row';
            const emptyCell = document.createElement('div');
            emptyCell.className = 'stats-root-label';
            headerRow.appendChild(emptyCell);

            sortedChords.forEach(c => {
                const cell = document.createElement('div');
                cell.className = 'stats-cell stats-cell-header';
                cell.textContent = MusicTheory.CHORD_TYPES[c].name;
                headerRow.appendChild(cell);
            });
            table.appendChild(headerRow);

            // Data rows
            testedRoots.forEach(root => {
                const row = document.createElement('div');
                row.className = 'stats-row';

                const rootCell = document.createElement('div');
                rootCell.className = 'stats-root-label';
                rootCell.textContent = root;
                row.appendChild(rootCell);

                sortedChords.forEach(c => {
                    const cell = document.createElement('div');
                    cell.className = 'stats-cell';

                    const data = gameStats[root][c];
                    if (data && data.tested > 0) {
                        const ratio = data.correct / data.tested;
                        const pct = Math.round(ratio * 100);
                        cell.style.backgroundColor = accuracyToColor(ratio);
                        cell.textContent = `${pct}%`;
                        cell.title = `${MusicTheory.CHORD_TYPES[c].name} from ${root}: ${data.correct}/${data.tested} (${pct}%)`;
                        cell.style.color = ratio > 0.3 && ratio < 0.7 ? '#000' : ratio >= 0.7 ? '#000' : '#fff';
                    } else {
                        cell.style.backgroundColor = '#f0f0f0';
                    }
                    row.appendChild(cell);
                });
                table.appendChild(row);
            });

            container.appendChild(table);
            return;
        }

        if (statsKey === 'scale-builder') {
            // Scale builder stats: columns = scale types
            const testedScales = new Set();
            const testedRoots = [];

            ALL_ROOTS.forEach(root => {
                if (gameStats[root]) {
                    testedRoots.push(root);
                    Object.keys(gameStats[root]).forEach(s => testedScales.add(s));
                }
            });

            // Sort scale types in the same order as ALL_SCALE_TYPES
            const sortedScales = ALL_SCALE_TYPES.filter(s => testedScales.has(s));
            if (sortedScales.length === 0) return;

            const table = document.createElement('div');
            table.className = 'stats-table';

            // Header row
            const headerRow = document.createElement('div');
            headerRow.className = 'stats-row';
            const emptyCell = document.createElement('div');
            emptyCell.className = 'stats-root-label';
            headerRow.appendChild(emptyCell);

            sortedScales.forEach(s => {
                const cell = document.createElement('div');
                cell.className = 'stats-cell stats-cell-header';
                cell.textContent = MusicTheory.SCALES[s].name;
                headerRow.appendChild(cell);
            });
            table.appendChild(headerRow);

            // Data rows
            testedRoots.forEach(root => {
                const row = document.createElement('div');
                row.className = 'stats-row';

                const rootCell = document.createElement('div');
                rootCell.className = 'stats-root-label';
                rootCell.textContent = root;
                row.appendChild(rootCell);

                sortedScales.forEach(s => {
                    const cell = document.createElement('div');
                    cell.className = 'stats-cell';

                    const data = gameStats[root][s];
                    if (data && data.tested > 0) {
                        const ratio = data.correct / data.tested;
                        const pct = Math.round(ratio * 100);
                        cell.style.backgroundColor = accuracyToColor(ratio);
                        cell.textContent = `${pct}%`;
                        cell.title = `${MusicTheory.SCALES[s].name} from ${root}: ${data.correct}/${data.tested} (${pct}%)`;
                        cell.style.color = ratio > 0.3 && ratio < 0.7 ? '#000' : ratio >= 0.7 ? '#000' : '#fff';
                    } else {
                        cell.style.backgroundColor = '#f0f0f0';
                    }
                    row.appendChild(cell);
                });
                table.appendChild(row);
            });

            container.appendChild(table);
            return;
        }

        // Interval-based stats (existing modes)
        const testedIntervals = new Set();
        const testedRoots = [];

        // Sort roots chromatically
        ALL_ROOTS.forEach(root => {
            if (gameStats[root]) {
                testedRoots.push(root);
                Object.keys(gameStats[root]).forEach(s => testedIntervals.add(parseInt(s)));
            }
        });

        const sortedIntervals = Array.from(testedIntervals).sort((a, b) => a - b);
        if (sortedIntervals.length === 0) return;

        const table = document.createElement('div');
        table.className = 'stats-table';

        // Header row
        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        const emptyCell = document.createElement('div');
        emptyCell.className = 'stats-root-label';
        headerRow.appendChild(emptyCell);

        sortedIntervals.forEach(s => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = getIntervalLabel(s);
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        // Data rows
        testedRoots.forEach(root => {
            const row = document.createElement('div');
            row.className = 'stats-row';

            const rootCell = document.createElement('div');
            rootCell.className = 'stats-root-label';
            rootCell.textContent = root;
            row.appendChild(rootCell);

            sortedIntervals.forEach(s => {
                const cell = document.createElement('div');
                cell.className = 'stats-cell';

                const data = gameStats[root][s];
                if (data && data.tested > 0) {
                    const ratio = data.correct / data.tested;
                    const pct = Math.round(ratio * 100);
                    cell.style.backgroundColor = accuracyToColor(ratio);
                    cell.textContent = `${pct}%`;
                    cell.title = `${getIntervalLabel(s)} from ${root}: ${data.correct}/${data.tested} (${pct}%)`;
                    // Dark text on light backgrounds, light on dark
                    cell.style.color = ratio > 0.3 && ratio < 0.7 ? '#000' : ratio >= 0.7 ? '#000' : '#fff';
                } else {
                    cell.style.backgroundColor = '#f0f0f0';
                }
                row.appendChild(cell);
            });
            table.appendChild(row);
        });

        container.appendChild(table);
    }

    // ---- Cleanup ----

    function cleanup() {
        gameState.circleApi = null;
    }

    // ---- Init ----

    loadSettings();
    loadStats();

    window.IntervalTraining = {
        renderTitlePage,
        renderSettings,
        cleanup
    };
})();
