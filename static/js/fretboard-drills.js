/**
 * Fretboard Drills Game
 * Uses the guitar fretboard as answer input instead of the chromatic circle.
 * Same 5 game modes as Interval Training but players tap fret positions.
 * Any fret producing the correct note (mod 12) counts as correct.
 */

(function() {
    'use strict';

    const STORAGE_KEY_SETTINGS = 'fretboard-drills-settings';
    const STORAGE_KEY_STATS = 'fretboard-drills-stats';
    const STATS_PREFIX = 'fb-';
    const GAME_TITLE = 'Fretboard Drills';

    const SIMPLE_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
    const LONG_NAMES = [
        'Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd',
        'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th',
        'Minor 7th', 'Major 7th'
    ];
    const SYMBOL_NAMES = [
        'P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'
    ];

    const ALL_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const ALL_SCALE_TYPES = Object.keys(MusicTheory.SCALES);
    const ALL_CHORD_TYPES = Object.keys(MusicTheory.CHORD_TYPES);
    const VALID_GAME_MODES = ['root-to-interval', 'interval-to-root', 'interval-to-interval', 'scale-builder', 'chord-builder', 'note-finding'];
    const NUM_FRETS = 15;

    // Game settings (persisted)
    let settings = {
        gameMode: 'root-to-interval',
        roundCount: 10,
        enabledIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        enabledRoots: [...ALL_ROOTS],
        notationStyle: 'short',
        showColors: true,
        enabledScales: [...ALL_SCALE_TYPES],
        enabledChords: [...ALL_CHORD_TYPES],
        enabledNotes: [...ALL_ROOTS]
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
        fretboardApi: null,
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
        hadMistake: false,
        questionStartTime: 0,
        questionTimes: [],
        questionQueue: [],
        lastDrawnItem: null,
        showHint: false,
        resizeHandler: null
    };

    let stats = {};

    // ---- Utilities ----

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function formatIntervalName(semitone, style) {
        const s = semitone % 12;
        if (style === 'long') return LONG_NAMES[s] || '';
        if (style === 'symbol') return SYMBOL_NAMES[s] || '';
        return SIMPLE_LABELS[s];
    }

    function getIntervalLabel(semitone) {
        return SIMPLE_LABELS[semitone % 12];
    }

    function getDisplayNoteName(noteIndex) {
        if (MusicTheory.isAccidentalNote(noteIndex)) {
            return MusicTheory.CHROMATIC_NOTES[noteIndex] + '/' + MusicTheory.FLAT_NOTES[noteIndex];
        }
        return MusicTheory.CHROMATIC_NOTES[noteIndex];
    }

    function findNotePositions(noteIndex) {
        const positions = [];
        for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
            for (let fret = 0; fret <= NUM_FRETS; fret++) {
                if (MusicTheory.getNoteAt(stringIndex, fret) === noteIndex) {
                    positions.push({ string: 6 - stringIndex, fret });
                }
            }
        }
        return positions;
    }

    // ---- Settings persistence ----

    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                settings = { ...settings, ...parsed };
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
            console.error('Failed to load fretboard drills settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save fretboard drills settings:', e);
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
            console.error('Failed to load fretboard drills stats:', e);
            stats = {};
        }
    }

    function saveStats() {
        try {
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save fretboard drills stats:', e);
        }
    }

    function getStatsKey() {
        if (gameState.activeMode === 'root-to-interval') return STATS_PREFIX + 'interval-training';
        if (gameState.activeMode === 'scale-builder') return STATS_PREFIX + 'scale-builder';
        if (gameState.activeMode === 'chord-builder') return STATS_PREFIX + 'chord-builder';
        if (gameState.activeMode === 'note-finding') return STATS_PREFIX + 'note-finding';
        return STATS_PREFIX + gameState.activeMode;
    }

    function commitSessionStats() {
        loadStats();
        const key = getStatsKey();
        if (!stats[key]) stats[key] = {};
        gameState.questionTimes.forEach(q => {
            const column = q.type !== undefined ? q.type : q.semitone;
            if (!stats[key][q.root]) stats[key][q.root] = {};
            if (!stats[key][q.root][column]) {
                stats[key][q.root][column] = { tested: 0, correct: 0, totalTimeMs: 0, timedCount: 0 };
            }
            const entry = stats[key][q.root][column];
            entry.tested++;
            if (q.correct) entry.correct++;
            entry.totalTimeMs = (entry.totalTimeMs || 0) + q.timeMs;
            entry.timedCount = (entry.timedCount || 0) + 1;
        });
        saveStats();
    }

    function getRecordSemitone() {
        if (gameState.activeMode === 'interval-to-root') return gameState.givenSemitone;
        if (gameState.activeMode === 'interval-to-interval') return gameState.targetSemitone;
        return gameState.currentSemitone;
    }

    // ---- Question pool & weighted selection ----

    function buildQuestionPool(mode) {
        const pool = [];
        if (mode === 'note-finding') {
            for (const note of settings.enabledNotes) {
                pool.push({ root: note });
            }
            return pool;
        }
        if (mode === 'scale-builder') {
            for (const root of settings.enabledRoots) {
                for (const scaleType of settings.enabledScales) {
                    pool.push({ root, scaleType });
                }
            }
        } else if (mode === 'chord-builder') {
            for (const root of settings.enabledRoots) {
                for (const chordType of settings.enabledChords) {
                    pool.push({ root, chordType });
                }
            }
        } else if (mode === 'interval-to-interval') {
            for (const root of settings.enabledRoots) {
                for (const givenSemitone of settings.enabledIntervals) {
                    const givenPos = givenSemitone % 12;
                    const candidates = settings.enabledIntervals.filter(i => i % 12 !== givenPos);
                    for (const targetSemitone of candidates) {
                        pool.push({ root, givenSemitone, targetSemitone });
                    }
                }
            }
        } else {
            for (const root of settings.enabledRoots) {
                for (const semitone of settings.enabledIntervals) {
                    pool.push({ root, semitone });
                }
            }
        }
        return pool;
    }

    function questionsEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function getColumnForItem(item) {
        const mode = gameState.activeMode;
        if (mode === 'note-finding') return 0;
        if (mode === 'scale-builder') return item.scaleType;
        if (mode === 'chord-builder') return item.chordType;
        if (mode === 'interval-to-interval') return item.targetSemitone;
        return item.semitone;
    }

    function fillQuestionQueue() {
        const pool = buildQuestionPool(gameState.activeMode);
        loadStats();
        const key = getStatsKey();
        const statsData = stats[key] || {};
        gameState.questionQueue = WeightedSelection.buildWeightedQueue(
            pool, statsData, getColumnForItem, gameState.lastDrawnItem, questionsEqual
        );
    }

    // ---- Highlight helpers ----

    function highlightNotePositions(noteIndex, intervalLabel, api) {
        const colors = MusicTheory.getIntervalColor(intervalLabel);
        const positions = findNotePositions(noteIndex);
        positions.forEach(pos => {
            api.setMarker(pos.string, pos.fret, {
                color: colors.fill,
                borderColor: colors.border,
                borderWidth: 2,
                text: intervalLabel,
                textColor: colors.text
            });
        });
    }

    function highlightSinglePosition(string, fret, intervalLabel) {
        const api = gameState.fretboardApi;
        if (!api) return;
        const colors = MusicTheory.getIntervalColor(intervalLabel);
        api.setMarker(string, fret, {
            color: colors.fill,
            borderColor: colors.border,
            borderWidth: 2,
            text: intervalLabel,
            textColor: colors.text
        });
    }

    function flashRedAtPosition(string, fret) {
        const api = gameState.fretboardApi;
        if (!api) return;
        api.setMarker(string, fret, {
            color: '#FF0000',
            borderColor: '#CC0000',
            borderWidth: 2,
            text: '',
            textColor: '#fff'
        });
        setTimeout(() => {
            // Re-render fretboard to remove the red marker
            if (gameState.fretboardApi && !gameState.answered) {
                rebuildFretboard();
            }
        }, 400);
    }

    function rebuildFretboard() {
        const container = document.getElementById('fb-drills-fretboard');
        if (!container) return;
        container.innerHTML = '';
        const api = createFretboard(container);
        gameState.fretboardApi = api;
        api.onFretClick(handleFretClick);

        // Re-highlight already-found builder steps
        const mode = gameState.activeMode;
        if ((mode === 'scale-builder' || mode === 'chord-builder') && gameState.currentDegreeIndex > 0) {
            const notes = mode === 'scale-builder' ? gameState.scaleNotes : gameState.chordNotes;
            const intervals = mode === 'scale-builder' ? gameState.scaleDegrees : gameState.chordIntervals;
            for (let i = 0; i < gameState.currentDegreeIndex; i++) {
                const stepPositions = gameState.builderStepPositions;
                if (stepPositions && stepPositions[i]) {
                    highlightSinglePosition(stepPositions[i].string, stepPositions[i].fret, intervals[i]);
                }
            }
        }
    }

    // ---- Sound helpers ----

    function isSoundEnabled() {
        const gamesState = window.Games ? window.Games.getState() : null;
        return gamesState && gamesState.soundEnabled;
    }

    function playNoteAtPosition(stringIndex, fret) {
        if (!isSoundEnabled()) return;
        const noteIndex = MusicTheory.getNoteAt(stringIndex, fret);
        const octave = MusicTheory.getOctaveAt(stringIndex, fret);
        const noteName = MusicTheory.getNoteName(noteIndex, false);
        Sound.playNote(noteName, octave);
    }

    // ---- Game flow ----

    function startGame() {
        gameState.currentRound = 0;
        gameState.totalRounds = settings.roundCount;
        gameState.correctCount = 0;
        gameState.questionTimes = [];
        gameState.activeMode = settings.gameMode;
        gameState.questionQueue = [];
        gameState.lastDrawnItem = null;
        gameState.showHint = false;
        fillQuestionQueue();
        nextQuestion();
    }

    function nextQuestion() {
        gameState.currentRound++;
        gameState.answered = false;

        if (gameState.currentRound > gameState.totalRounds) {
            showResults();
            return;
        }

        if (gameState.questionQueue.length === 0) {
            fillQuestionQueue();
        }
        const q = gameState.questionQueue.shift();
        gameState.lastDrawnItem = q;

        gameState.currentRoot = q.root;
        gameState.currentRootIndex = MusicTheory.getNoteIndex(q.root);

        const mode = gameState.activeMode;

        if (mode === 'note-finding') {
            gameState.hadMistake = false;
        } else if (mode === 'scale-builder') {
            gameState.currentScaleType = q.scaleType;
            const scaleFormula = MusicTheory.SCALES[q.scaleType];
            gameState.scaleNotes = scaleFormula.intervals.map(interval =>
                (gameState.currentRootIndex + MusicTheory.INTERVALS[interval]) % 12
            );
            gameState.scaleDegrees = MusicTheory.buildScale(q.root, q.scaleType).degrees;
            gameState.currentDegreeIndex = 0;
            gameState.hadMistake = false;
            gameState.builderStepPositions = [];
        } else if (mode === 'chord-builder') {
            gameState.currentChordType = q.chordType;
            const chordFormula = MusicTheory.CHORD_TYPES[q.chordType];
            gameState.chordNotes = chordFormula.intervals.map(interval =>
                (gameState.currentRootIndex + MusicTheory.INTERVALS[interval]) % 12
            );
            gameState.chordIntervals = chordFormula.intervals;
            gameState.currentDegreeIndex = 0;
            gameState.hadMistake = false;
            gameState.builderStepPositions = [];
        } else if (mode === 'interval-to-interval') {
            gameState.hadMistake = false;
            gameState.givenSemitone = q.givenSemitone;
            gameState.givenNoteIndex = (gameState.currentRootIndex + q.givenSemitone) % 12;
            gameState.targetSemitone = q.targetSemitone;
            gameState.currentSemitone = q.givenSemitone;
        } else {
            gameState.hadMistake = false;
            gameState.currentSemitone = q.semitone;
            if (mode === 'interval-to-root') {
                gameState.givenSemitone = q.semitone;
                gameState.givenNoteIndex = (gameState.currentRootIndex + q.semitone) % 12;
            }
        }

        renderGameView();
    }

    // ---- Game view rendering ----

    function getQuestionText() {
        const mode = gameState.activeMode;
        if (mode === 'note-finding') {
            return 'Find: ' + getDisplayNoteName(gameState.currentRootIndex);
        }
        if (mode === 'root-to-interval') {
            return 'Find the ' + formatIntervalName(gameState.currentSemitone, settings.notationStyle) + ' from ' + gameState.currentRoot;
        } else if (mode === 'interval-to-root') {
            return getDisplayNoteName(gameState.givenNoteIndex) + ' is the ' + formatIntervalName(gameState.givenSemitone, settings.notationStyle) + ' — find the root';
        } else if (mode === 'interval-to-interval') {
            return getDisplayNoteName(gameState.givenNoteIndex) + ' is the ' + formatIntervalName(gameState.givenSemitone, settings.notationStyle) + ' — find the ' + formatIntervalName(gameState.targetSemitone, settings.notationStyle);
        } else if (mode === 'scale-builder') {
            const scaleName = MusicTheory.SCALES[gameState.currentScaleType].name;
            return 'Build: ' + gameState.currentRoot + ' ' + scaleName;
        } else if (mode === 'chord-builder') {
            const chordName = MusicTheory.CHORD_TYPES[gameState.currentChordType].name;
            return 'Build: ' + gameState.currentRoot + ' ' + chordName;
        }
        return '';
    }

    function getBuilderHintText() {
        const mode = gameState.activeMode;
        if (mode !== 'scale-builder' && mode !== 'chord-builder') return '';
        const allIntervals = mode === 'scale-builder' ? gameState.scaleDegrees : gameState.chordIntervals;
        const allNoteIndices = mode === 'scale-builder' ? gameState.scaleNotes : gameState.chordNotes;
        const useFlats = MusicTheory.shouldUseFlats(gameState.currentRoot);
        const idx = gameState.currentDegreeIndex;

        if (gameState.showHint) {
            const parts = allIntervals.map((interval, i) => {
                if (i < idx) {
                    return interval + '=' + MusicTheory.getNoteName(allNoteIndices[i], useFlats);
                }
                return interval + '=?';
            });
            return parts.join('  ');
        } else if (idx > 0) {
            const parts = [];
            for (let i = 0; i < idx; i++) {
                parts.push(allIntervals[i] + '=' + MusicTheory.getNoteName(allNoteIndices[i], useFlats));
            }
            return parts.join('  ');
        }
        return '';
    }

    function renderGameView() {
        const content = document.getElementById('game-content');
        if (!content) return;

        // Remove old resize handler
        if (gameState.resizeHandler) {
            window.removeEventListener('resize', gameState.resizeHandler);
            gameState.resizeHandler = null;
        }

        content.innerHTML = '';

        // Add split-layout scope class to games panel
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.add('fretboard-drills-active');

        const wrapper = document.createElement('div');
        wrapper.className = 'game-play-area game-split-layout';

        const mode = gameState.activeMode;
        const isBuilder = mode === 'scale-builder' || mode === 'chord-builder';

        // Left half: fretboard
        const fretboardPanel = document.createElement('div');
        fretboardPanel.className = 'game-split-fretboard';

        const fbContainer = document.createElement('div');
        fbContainer.className = 'game-fretboard-container';
        fbContainer.id = 'fb-drills-fretboard';
        fretboardPanel.appendChild(fbContainer);

        // Right half: controls
        const controlsPanel = document.createElement('div');
        controlsPanel.className = 'game-split-controls';

        // Top row
        const topRow = document.createElement('div');
        topRow.className = 'game-top-row';

        if (isBuilder) {
            const hintToggle = document.createElement('label');
            hintToggle.className = 'toggle-label game-hint-toggle';
            if (gameState.showHint) hintToggle.classList.add('checked');
            const hintInput = document.createElement('input');
            hintInput.type = 'checkbox';
            hintInput.checked = gameState.showHint;
            hintInput.addEventListener('change', function() {
                gameState.showHint = hintInput.checked;
                hintToggle.classList.toggle('checked', gameState.showHint);
                updateHintDisplay();
            });
            const hintText = document.createElement('span');
            hintText.className = 'toggle-text';
            hintText.textContent = 'hint';
            hintToggle.appendChild(hintInput);
            hintToggle.appendChild(hintText);
            topRow.appendChild(hintToggle);
        } else {
            const spacerLeft = document.createElement('div');
            spacerLeft.className = 'game-hint-spacer';
            topRow.appendChild(spacerLeft);
        }

        const counter = document.createElement('div');
        counter.className = 'game-round-counter';
        counter.textContent = gameState.currentRound + ' / ' + gameState.totalRounds;
        topRow.appendChild(counter);

        const spacerRight = document.createElement('div');
        spacerRight.className = 'game-hint-spacer';
        topRow.appendChild(spacerRight);

        controlsPanel.appendChild(topRow);

        // Question prompt
        const questionDiv = document.createElement('div');
        questionDiv.className = 'game-fretboard-question';
        questionDiv.id = 'fb-drills-question';
        questionDiv.textContent = getQuestionText();
        controlsPanel.appendChild(questionDiv);

        // Builder hint line
        if (isBuilder) {
            const hintDiv = document.createElement('div');
            hintDiv.className = 'game-fretboard-hint';
            hintDiv.id = 'fb-drills-hint';
            hintDiv.textContent = getBuilderHintText();
            controlsPanel.appendChild(hintDiv);
        }

        // Next button (hidden initially)
        const nextBtn = document.createElement('button');
        nextBtn.className = 'game-next-btn';
        nextBtn.id = 'game-next-btn';
        nextBtn.textContent = 'Next';
        nextBtn.style.display = 'none';
        nextBtn.addEventListener('click', nextQuestion);
        controlsPanel.appendChild(nextBtn);

        wrapper.appendChild(fretboardPanel);
        wrapper.appendChild(controlsPanel);
        content.appendChild(wrapper);

        // Create fretboard
        const api = createFretboard(fbContainer);
        gameState.fretboardApi = api;
        api.onFretClick(handleFretClick);

        gameState.questionStartTime = performance.now();

        // Auto-play sounds on round start
        if (isSoundEnabled()) {
            const rootIndex = gameState.currentRootIndex;
            if (mode === 'root-to-interval') {
                const targetIndex = (rootIndex + gameState.currentSemitone) % 12;
                const targetNote = MusicTheory.getNoteName(targetIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
                Sound.playNote(gameState.currentRoot, 4);
                setTimeout(() => {
                    const tOctave = targetIndex < rootIndex ? 5 : 4;
                    Sound.playNote(targetNote, tOctave);
                }, 400);
            } else if (mode === 'interval-to-root') {
                const givenNote = MusicTheory.getNoteName(gameState.givenNoteIndex, false);
                const gOctave = gameState.givenNoteIndex < rootIndex ? 5 : 4;
                Sound.playNote(givenNote, gOctave);
                setTimeout(() => {
                    Sound.playNote(gameState.currentRoot, 4);
                }, 400);
            } else if (isBuilder) {
                Sound.playNote(gameState.currentRoot, 4);
            } else if (mode === 'interval-to-interval') {
                const givenNote = MusicTheory.getNoteName(gameState.givenNoteIndex, false);
                const targetIndex = (rootIndex + gameState.targetSemitone) % 12;
                const targetNote = MusicTheory.getNoteName(targetIndex, false);
                const gOctave = gameState.givenNoteIndex < rootIndex ? 5 : 4;
                Sound.playNote(givenNote, gOctave);
                setTimeout(() => {
                    const tOctave = targetIndex < rootIndex ? 5 : 4;
                    Sound.playNote(targetNote, tOctave);
                }, 400);
            } else if (mode === 'note-finding') {
                Sound.playNote(gameState.currentRoot, 4);
            }
        }

        // Resize handler
        let lastVertical = window.innerWidth <= 768;
        gameState.resizeHandler = function() {
            const nowVertical = window.innerWidth <= 768;
            if (nowVertical !== lastVertical) {
                lastVertical = nowVertical;
                rebuildFretboard();
            }
        };
        window.addEventListener('resize', gameState.resizeHandler);
    }

    function updateHintDisplay() {
        const hintDiv = document.getElementById('fb-drills-hint');
        if (hintDiv) {
            hintDiv.textContent = getBuilderHintText();
        }
    }

    // ---- Click handling ----

    function handleFretClick(string, fret) {
        if (gameState.answered) return;

        // string is 1-6 (1=high E), convert to stringIndex 0-5 (0=low E)
        const stringIndex = 6 - string;
        const clickedNoteIndex = MusicTheory.getNoteAt(stringIndex, fret);
        const mode = gameState.activeMode;

        if (mode === 'note-finding') {
            if (clickedNoteIndex === gameState.currentRootIndex) {
                handleNoteCorrectAnswer(string, fret, stringIndex);
            } else {
                handleWrongAnswer(string, fret, stringIndex);
            }
            return;
        }

        if (mode === 'scale-builder') {
            const expectedIndex = gameState.scaleNotes[gameState.currentDegreeIndex];
            if (clickedNoteIndex === expectedIndex) {
                handleScaleCorrectStep(string, fret, stringIndex);
            } else {
                handleScaleWrongStep(string, fret, stringIndex);
            }
            return;
        }

        if (mode === 'chord-builder') {
            const expectedIndex = gameState.chordNotes[gameState.currentDegreeIndex];
            if (clickedNoteIndex === expectedIndex) {
                handleChordCorrectStep(string, fret, stringIndex);
            } else {
                handleChordWrongStep(string, fret, stringIndex);
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

        if (clickedNoteIndex === correctNoteIndex) {
            handleCorrectAnswer(string, fret, stringIndex);
        } else {
            handleWrongAnswer(string, fret, stringIndex);
        }
    }

    // ---- Interval mode handlers ----

    function handleWrongAnswer(string, fret, stringIndex) {
        gameState.hadMistake = true;
        playNoteAtPosition(stringIndex, fret);
        flashRedAtPosition(string, fret);
    }

    function handleNoteCorrectAnswer(string, fret, stringIndex) {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        const elapsed = performance.now() - gameState.questionStartTime;
        gameState.questionTimes.push({
            root: gameState.currentRoot,
            semitone: 0,
            timeMs: Math.round(elapsed),
            correct: !gameState.hadMistake
        });

        playNoteAtPosition(stringIndex, fret);

        const api = gameState.fretboardApi;
        if (!api) return;

        api.clearMarkers();
        highlightNotePositions(gameState.currentRootIndex, '1', api);

        const questionDiv = document.getElementById('fb-drills-question');
        if (questionDiv) {
            questionDiv.textContent = getDisplayNoteName(gameState.currentRootIndex);
        }

        setTimeout(() => {
            const nextBtn = document.getElementById('game-next-btn');
            if (nextBtn) nextBtn.style.display = 'block';
        }, 500);
    }

    function handleCorrectAnswer(string, fret, stringIndex) {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        const elapsed = performance.now() - gameState.questionStartTime;
        gameState.questionTimes.push({
            root: gameState.currentRoot,
            semitone: getRecordSemitone(),
            timeMs: Math.round(elapsed),
            correct: !gameState.hadMistake
        });

        playNoteAtPosition(stringIndex, fret);

        const api = gameState.fretboardApi;
        if (!api) return;

        api.clearMarkers();

        const mode = gameState.activeMode;
        const rootIndex = gameState.currentRootIndex;

        // Highlight root positions
        highlightNotePositions(rootIndex, '1', api);

        // Highlight answer positions
        if (mode === 'root-to-interval') {
            const correctIndex = (rootIndex + gameState.currentSemitone) % 12;
            const intervalLabel = SIMPLE_LABELS[gameState.currentSemitone % 12];
            highlightNotePositions(correctIndex, intervalLabel, api);
            updateQuestionAfterCorrect();
        } else if (mode === 'interval-to-root') {
            const givenLabel = SIMPLE_LABELS[gameState.givenSemitone % 12];
            highlightNotePositions(gameState.givenNoteIndex, givenLabel, api);
            updateQuestionAfterCorrect();
        } else if (mode === 'interval-to-interval') {
            const givenLabel = SIMPLE_LABELS[gameState.givenSemitone % 12];
            highlightNotePositions(gameState.givenNoteIndex, givenLabel, api);
            const answerIndex = (rootIndex + gameState.targetSemitone) % 12;
            const answerLabel = SIMPLE_LABELS[gameState.targetSemitone % 12];
            highlightNotePositions(answerIndex, answerLabel, api);
            updateQuestionAfterCorrect();
        }

        // Sound on correct
        if (isSoundEnabled()) {
            if (mode === 'root-to-interval') {
                const targetIndex = (rootIndex + gameState.currentSemitone) % 12;
                const targetNote = MusicTheory.getNoteName(targetIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
                setTimeout(() => {
                    Sound.playInterval(gameState.currentRoot, targetNote, gameState.currentSemitone, 4);
                }, 250);
            } else if (mode === 'interval-to-root') {
                const givenNote = MusicTheory.getNoteName(gameState.givenNoteIndex, false);
                setTimeout(() => {
                    Sound.playInterval(gameState.currentRoot, givenNote, gameState.givenSemitone, 4);
                }, 250);
            } else if (mode === 'interval-to-interval') {
                const answerIndex = (rootIndex + gameState.targetSemitone) % 12;
                const answerNote = MusicTheory.getNoteName(answerIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
                setTimeout(() => {
                    Sound.playInterval(gameState.currentRoot, answerNote, gameState.targetSemitone, 4);
                }, 250);
            }
        }

        setTimeout(() => {
            const nextBtn = document.getElementById('game-next-btn');
            if (nextBtn) nextBtn.style.display = 'block';
        }, 500);
    }

    function updateQuestionAfterCorrect() {
        const questionDiv = document.getElementById('fb-drills-question');
        if (!questionDiv) return;
        const mode = gameState.activeMode;
        const rootIndex = gameState.currentRootIndex;

        if (mode === 'root-to-interval') {
            const targetIndex = (rootIndex + gameState.currentSemitone) % 12;
            questionDiv.textContent = formatIntervalName(gameState.currentSemitone, settings.notationStyle) + ' from ' + gameState.currentRoot + ' = ' + getDisplayNoteName(targetIndex);
        } else if (mode === 'interval-to-root') {
            questionDiv.textContent = getDisplayNoteName(gameState.givenNoteIndex) + ' is the ' + formatIntervalName(gameState.givenSemitone, settings.notationStyle) + ' — root is ' + gameState.currentRoot;
        } else if (mode === 'interval-to-interval') {
            const answerIndex = (rootIndex + gameState.targetSemitone) % 12;
            questionDiv.textContent = formatIntervalName(gameState.targetSemitone, settings.notationStyle) + ' = ' + getDisplayNoteName(answerIndex) + ' (root: ' + gameState.currentRoot + ')';
        }
    }

    // ---- Scale builder handlers ----

    function handleScaleCorrectStep(string, fret, stringIndex) {
        playNoteAtPosition(stringIndex, fret);

        const degreeLabel = gameState.scaleDegrees[gameState.currentDegreeIndex];
        highlightSinglePosition(string, fret, degreeLabel);
        gameState.builderStepPositions.push({ string, fret });

        gameState.currentDegreeIndex++;
        updateHintDisplay();

        if (gameState.currentDegreeIndex === gameState.scaleNotes.length) {
            handleScaleComplete();
        }
    }

    function handleScaleWrongStep(string, fret, stringIndex) {
        playNoteAtPosition(stringIndex, fret);
        gameState.hadMistake = true;

        // Flash the whole fretboard red briefly by showing a red marker
        const api = gameState.fretboardApi;
        if (!api) return;
        api.setMarker(string, fret, {
            color: '#FF0000',
            borderColor: '#CC0000',
            borderWidth: 2,
            text: '',
            textColor: '#fff'
        });

        setTimeout(() => {
            // Reset: clear and rebuild, reset sequence
            gameState.currentDegreeIndex = 0;
            gameState.builderStepPositions = [];
            rebuildFretboard();
            updateHintDisplay();
        }, 400);
    }

    function handleScaleComplete() {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        const elapsed = performance.now() - gameState.questionStartTime;
        gameState.questionTimes.push({
            root: gameState.currentRoot,
            type: gameState.currentScaleType,
            timeMs: Math.round(elapsed),
            correct: !gameState.hadMistake
        });

        const api = gameState.fretboardApi;
        if (!api) return;

        // Clear and show full scale across entire fretboard
        api.clearMarkers();
        const rootIndex = gameState.currentRootIndex;
        gameState.scaleNotes.forEach((noteIndex, i) => {
            const label = gameState.scaleDegrees[i];
            highlightNotePositions(noteIndex, label, api);
        });

        // Update question text
        const questionDiv = document.getElementById('fb-drills-question');
        if (questionDiv) {
            const scaleName = MusicTheory.SCALES[gameState.currentScaleType].name;
            const useFlats = MusicTheory.shouldUseFlats(gameState.currentRoot);
            const noteNames = gameState.scaleNotes.map(idx => MusicTheory.getNoteName(idx, useFlats));
            questionDiv.textContent = gameState.currentRoot + ' ' + scaleName + ': ' + noteNames.join(' ');
        }
        const hintDiv = document.getElementById('fb-drills-hint');
        if (hintDiv) hintDiv.textContent = '';

        // Arpeggiated playthrough
        const noteCount = gameState.scaleNotes.length;
        if (isSoundEnabled()) {
            gameState.scaleNotes.forEach((noteIdx, i) => {
                setTimeout(() => {
                    const noteName = MusicTheory.getNoteName(noteIdx, MusicTheory.shouldUseFlats(gameState.currentRoot));
                    const octave = noteIdx < rootIndex ? 5 : 4;
                    Sound.playNote(noteName, octave, 0.4);
                }, i * 200);
            });
        }

        const delay = 500 + (noteCount * 200);
        setTimeout(() => {
            const nextBtn = document.getElementById('game-next-btn');
            if (nextBtn) nextBtn.style.display = 'block';
        }, delay);
    }

    // ---- Chord builder handlers ----

    function handleChordCorrectStep(string, fret, stringIndex) {
        const isLastStep = gameState.currentDegreeIndex === gameState.chordNotes.length - 1;
        if (!isLastStep) {
            playNoteAtPosition(stringIndex, fret);
        }

        const degreeLabel = gameState.chordIntervals[gameState.currentDegreeIndex];
        highlightSinglePosition(string, fret, degreeLabel);
        gameState.builderStepPositions.push({ string, fret });

        gameState.currentDegreeIndex++;
        updateHintDisplay();

        if (gameState.currentDegreeIndex === gameState.chordNotes.length) {
            handleChordComplete();
        }
    }

    function handleChordWrongStep(string, fret, stringIndex) {
        playNoteAtPosition(stringIndex, fret);
        gameState.hadMistake = true;

        const api = gameState.fretboardApi;
        if (!api) return;
        api.setMarker(string, fret, {
            color: '#FF0000',
            borderColor: '#CC0000',
            borderWidth: 2,
            text: '',
            textColor: '#fff'
        });

        setTimeout(() => {
            gameState.currentDegreeIndex = 0;
            gameState.builderStepPositions = [];
            rebuildFretboard();
            updateHintDisplay();
        }, 400);
    }

    function handleChordComplete() {
        gameState.answered = true;
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        const elapsed = performance.now() - gameState.questionStartTime;
        gameState.questionTimes.push({
            root: gameState.currentRoot,
            type: gameState.currentChordType,
            timeMs: Math.round(elapsed),
            correct: !gameState.hadMistake
        });

        const api = gameState.fretboardApi;
        if (!api) return;

        // Clear and show full chord across entire fretboard
        api.clearMarkers();
        gameState.chordNotes.forEach((noteIndex, i) => {
            const label = gameState.chordIntervals[i];
            highlightNotePositions(noteIndex, label, api);
        });

        // Update question text
        const questionDiv = document.getElementById('fb-drills-question');
        if (questionDiv) {
            const chordName = MusicTheory.CHORD_TYPES[gameState.currentChordType].name;
            const useFlats = MusicTheory.shouldUseFlats(gameState.currentRoot);
            const noteNames = gameState.chordNotes.map(idx => MusicTheory.getNoteName(idx, useFlats));
            questionDiv.textContent = gameState.currentRoot + ' ' + chordName + ': ' + noteNames.join(' ');
        }
        const hintDiv = document.getElementById('fb-drills-hint');
        if (hintDiv) hintDiv.textContent = '';

        // Play chord
        if (isSoundEnabled()) {
            const useFlats = MusicTheory.shouldUseFlats(gameState.currentRoot);
            const rootIndex = gameState.currentRootIndex;
            const chordNoteNames = gameState.chordNotes.map(noteIdx => {
                const name = MusicTheory.getNoteName(noteIdx, useFlats);
                const octave = noteIdx < rootIndex ? 5 : 4;
                return name + octave;
            });
            Sound.playChord(chordNoteNames);
        }

        setTimeout(() => {
            const nextBtn = document.getElementById('game-next-btn');
            if (nextBtn) nextBtn.style.display = 'block';
        }, 500);
    }

    // ---- Results ----

    function showResults() {
        const content = document.getElementById('game-content');
        if (!content) return;

        // Remove split-layout scope class
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove('fretboard-drills-active');

        // Clean up resize handler
        if (gameState.resizeHandler) {
            window.removeEventListener('resize', gameState.resizeHandler);
            gameState.resizeHandler = null;
        }

        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-title-page';

        const title = document.createElement('h1');
        title.className = 'game-title';
        title.textContent = 'Results';
        wrapper.appendChild(title);

        const score = document.createElement('div');
        score.className = 'game-score';
        score.textContent = gameState.correctCount + ' / ' + gameState.totalRounds;
        wrapper.appendChild(score);

        const pct = document.createElement('div');
        pct.className = 'game-score-pct';
        const percent = Math.round((gameState.correctCount / gameState.totalRounds) * 100);
        pct.textContent = percent + '%';
        wrapper.appendChild(pct);

        // Session reaction time matrix
        const rtContainer = document.createElement('div');
        rtContainer.className = 'rt-chart-container';
        const timesByRootColumn = {};
        gameState.questionTimes.forEach(q => {
            const column = q.type !== undefined ? q.type : q.semitone;
            if (!timesByRootColumn[q.root]) timesByRootColumn[q.root] = {};
            if (!timesByRootColumn[q.root][column]) timesByRootColumn[q.root][column] = { total: 0, count: 0 };
            timesByRootColumn[q.root][column].total += q.timeMs;
            timesByRootColumn[q.root][column].count++;
        });
        const timeData = {};
        Object.keys(timesByRootColumn).forEach(root => {
            timeData[root] = {};
            Object.keys(timesByRootColumn[root]).forEach(col => {
                const entry = timesByRootColumn[root][col];
                timeData[root][col] = Math.round(entry.total / entry.count);
            });
        });
        const isBuilder = gameState.activeMode === 'scale-builder' || gameState.activeMode === 'chord-builder';
        if (gameState.activeMode === 'note-finding') {
            renderNoteReactionTimeChart(rtContainer, timeData, 'Reaction Times');
        } else if (isBuilder) {
            const allTypes = gameState.activeMode === 'chord-builder' ? ALL_CHORD_TYPES : ALL_SCALE_TYPES;
            const typeNameFn = gameState.activeMode === 'chord-builder'
                ? c => MusicTheory.CHORD_TYPES[c].name
                : s => MusicTheory.SCALES[s].name;
            renderBuilderReactionTimeMatrix(rtContainer, timeData, 'Reaction Times', allTypes, typeNameFn);
        } else {
            renderReactionTimeMatrix(rtContainer, timeData, 'Reaction Times');
        }
        wrapper.appendChild(rtContainer);

        // Buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'game-btn-row';

        const logBtn = document.createElement('button');
        logBtn.className = 'game-start-btn';
        logBtn.textContent = 'Log & Play Again';
        logBtn.addEventListener('click', () => {
            commitSessionStats();
            if (validateSettings()) startGame();
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

    // ---- Stats visualization ----

    function accuracyToColor(ratio) {
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
        return 'rgb(' + r + ',' + g + ',' + b + ')';
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
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function formatTime(ms) {
        if (ms < 1000) return ms + 'ms';
        return (ms / 1000).toFixed(1) + 's';
    }

    function renderReactionTimeMatrix(container, timeData, heading) {
        const testedRoots = [];
        const testedIntervals = new Set();

        ALL_ROOTS.forEach(root => {
            if (timeData[root]) {
                testedRoots.push(root);
                Object.keys(timeData[root]).forEach(s => testedIntervals.add(parseInt(s)));
            }
        });

        const sortedIntervals = Array.from(testedIntervals).sort((a, b) => a - b);
        if (sortedIntervals.length === 0) return;

        const h = document.createElement('div');
        h.className = 'rt-chart-heading';
        h.textContent = heading;
        container.appendChild(h);

        let minTime = Infinity, maxTime = -Infinity;
        testedRoots.forEach(root => {
            sortedIntervals.forEach(s => {
                const t = timeData[root][s];
                if (t !== undefined) {
                    if (t < minTime) minTime = t;
                    if (t > maxTime) maxTime = t;
                }
            });
        });

        const table = document.createElement('div');
        table.className = 'stats-table';

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
                const t = timeData[root][s];
                if (t !== undefined) {
                    cell.style.backgroundColor = reactionTimeToColor(t, minTime, maxTime);
                    cell.textContent = formatTime(t);
                    cell.title = getIntervalLabel(s) + ' from ' + root + ': ' + formatTime(t);
                    const ratio = maxTime === minTime ? 0 : (t - minTime) / (maxTime - minTime);
                    cell.style.color = ratio > 0.7 ? '#fff' : '#000';
                } else {
                    cell.style.backgroundColor = '#f0f0f0';
                }
                row.appendChild(cell);
            });
            table.appendChild(row);
        });

        container.appendChild(table);
    }

    function renderBuilderReactionTimeMatrix(container, timeData, heading, allTypes, typeNameFn) {
        const testedRoots = [];
        const testedTypes = new Set();

        ALL_ROOTS.forEach(root => {
            if (timeData[root]) {
                testedRoots.push(root);
                Object.keys(timeData[root]).forEach(t => testedTypes.add(t));
            }
        });

        const sortedTypes = allTypes.filter(t => testedTypes.has(t));
        if (sortedTypes.length === 0) return;

        const h = document.createElement('div');
        h.className = 'rt-chart-heading';
        h.textContent = heading;
        container.appendChild(h);

        let minTime = Infinity, maxTime = -Infinity;
        testedRoots.forEach(root => {
            sortedTypes.forEach(t => {
                const v = timeData[root][t];
                if (v !== undefined) {
                    if (v < minTime) minTime = v;
                    if (v > maxTime) maxTime = v;
                }
            });
        });

        const table = document.createElement('div');
        table.className = 'stats-table';

        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        const emptyCell = document.createElement('div');
        emptyCell.className = 'stats-root-label';
        headerRow.appendChild(emptyCell);

        sortedTypes.forEach(t => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = typeNameFn(t);
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        testedRoots.forEach(root => {
            const row = document.createElement('div');
            row.className = 'stats-row';
            const rootCell = document.createElement('div');
            rootCell.className = 'stats-root-label';
            rootCell.textContent = root;
            row.appendChild(rootCell);

            sortedTypes.forEach(t => {
                const cell = document.createElement('div');
                cell.className = 'stats-cell';
                const v = timeData[root][t];
                if (v !== undefined) {
                    cell.style.backgroundColor = reactionTimeToColor(v, minTime, maxTime);
                    cell.textContent = formatTime(v);
                    cell.title = typeNameFn(t) + ' from ' + root + ': ' + formatTime(v);
                    const ratio = maxTime === minTime ? 0 : (v - minTime) / (maxTime - minTime);
                    cell.style.color = ratio > 0.7 ? '#fff' : '#000';
                } else {
                    cell.style.backgroundColor = '#f0f0f0';
                }
                row.appendChild(cell);
            });
            table.appendChild(row);
        });

        container.appendChild(table);
    }

    function renderNoteReactionTimeChart(container, timeData, heading) {
        const testedNotes = [];
        ALL_ROOTS.forEach(note => {
            if (timeData[note] && timeData[note][0] !== undefined) {
                testedNotes.push(note);
            }
        });
        if (testedNotes.length === 0) return;

        const h = document.createElement('div');
        h.className = 'rt-chart-heading';
        h.textContent = heading;
        container.appendChild(h);

        let minTime = Infinity, maxTime = -Infinity;
        testedNotes.forEach(note => {
            const t = timeData[note][0];
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
        });

        const table = document.createElement('div');
        table.className = 'stats-table';

        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        ALL_ROOTS.forEach(note => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = note;
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        const row = document.createElement('div');
        row.className = 'stats-row';
        ALL_ROOTS.forEach(note => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell';
            const t = timeData[note] && timeData[note][0];
            if (t !== undefined) {
                cell.style.backgroundColor = reactionTimeToColor(t, minTime, maxTime);
                cell.textContent = formatTime(t);
                cell.title = note + ': ' + formatTime(t);
                const ratio = maxTime === minTime ? 0 : (t - minTime) / (maxTime - minTime);
                cell.style.color = ratio > 0.7 ? '#fff' : '#000';
            } else {
                cell.style.backgroundColor = '#f0f0f0';
            }
            row.appendChild(cell);
        });
        table.appendChild(row);

        container.appendChild(table);
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

        if (statsKey === STATS_PREFIX + 'note-finding') {
            renderNoteStats(container, gameStats);
            return;
        }

        if (statsKey === STATS_PREFIX + 'chord-builder') {
            renderBuilderStats(container, gameStats, ALL_CHORD_TYPES, c => MusicTheory.CHORD_TYPES[c].name);
            return;
        }

        if (statsKey === STATS_PREFIX + 'scale-builder') {
            renderBuilderStats(container, gameStats, ALL_SCALE_TYPES, s => MusicTheory.SCALES[s].name);
            return;
        }

        // Interval-based stats
        const testedIntervals = new Set();
        const testedRoots = [];

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
                    const pctVal = Math.round(ratio * 100);
                    cell.style.backgroundColor = accuracyToColor(ratio);
                    cell.textContent = pctVal + '%';
                    cell.title = getIntervalLabel(s) + ' from ' + root + ': ' + data.correct + '/' + data.tested + ' (' + pctVal + '%)';
                    cell.style.color = ratio > 0.3 && ratio < 0.7 ? '#000' : ratio >= 0.7 ? '#000' : '#fff';
                } else {
                    cell.style.backgroundColor = '#f0f0f0';
                }
                row.appendChild(cell);
            });
            table.appendChild(row);
        });

        container.appendChild(table);

        // Avg reaction time matrix
        const rtTimeData = {};
        let hasTimeData = false;
        testedRoots.forEach(root => {
            sortedIntervals.forEach(s => {
                const data = gameStats[root][s];
                if (data && (data.timedCount || 0) > 0) {
                    if (!rtTimeData[root]) rtTimeData[root] = {};
                    rtTimeData[root][s] = Math.round((data.totalTimeMs || 0) / data.timedCount);
                    hasTimeData = true;
                }
            });
        });
        if (hasTimeData) {
            const rtContainer = document.createElement('div');
            rtContainer.className = 'rt-chart-container';
            renderReactionTimeMatrix(rtContainer, rtTimeData, 'Avg Reaction Time');
            container.appendChild(rtContainer);
        }
    }

    function renderNoteStats(container, gameStats) {
        // Single-row accuracy display
        const table = document.createElement('div');
        table.className = 'stats-table';

        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        ALL_ROOTS.forEach(note => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = note;
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        const row = document.createElement('div');
        row.className = 'stats-row';
        ALL_ROOTS.forEach(note => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell';
            const data = gameStats[note] && gameStats[note][0];
            if (data && data.tested > 0) {
                const ratio = data.correct / data.tested;
                const pctVal = Math.round(ratio * 100);
                cell.style.backgroundColor = accuracyToColor(ratio);
                cell.textContent = pctVal + '%';
                cell.title = note + ': ' + data.correct + '/' + data.tested + ' (' + pctVal + '%)';
                cell.style.color = ratio > 0.3 && ratio < 0.7 ? '#000' : ratio >= 0.7 ? '#000' : '#fff';
            } else {
                cell.style.backgroundColor = '#f0f0f0';
            }
            row.appendChild(cell);
        });
        table.appendChild(row);
        container.appendChild(table);

        // Single-row reaction time display
        const rtTimeData = {};
        let hasTimeData = false;
        ALL_ROOTS.forEach(note => {
            const data = gameStats[note] && gameStats[note][0];
            if (data && (data.timedCount || 0) > 0) {
                if (!rtTimeData[note]) rtTimeData[note] = {};
                rtTimeData[note][0] = Math.round((data.totalTimeMs || 0) / data.timedCount);
                hasTimeData = true;
            }
        });
        if (hasTimeData) {
            const rtContainer = document.createElement('div');
            rtContainer.className = 'rt-chart-container';
            renderNoteReactionTimeChart(rtContainer, rtTimeData, 'Avg Reaction Time');
            container.appendChild(rtContainer);
        }
    }

    function renderBuilderStats(container, gameStats, allTypes, typeNameFn) {
        const testedTypes = new Set();
        const testedRoots = [];

        ALL_ROOTS.forEach(root => {
            if (gameStats[root]) {
                testedRoots.push(root);
                Object.keys(gameStats[root]).forEach(t => testedTypes.add(t));
            }
        });

        const sortedTypes = allTypes.filter(t => testedTypes.has(t));
        if (sortedTypes.length === 0) return;

        const table = document.createElement('div');
        table.className = 'stats-table';

        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        const emptyCell = document.createElement('div');
        emptyCell.className = 'stats-root-label';
        headerRow.appendChild(emptyCell);

        sortedTypes.forEach(t => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = typeNameFn(t);
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        testedRoots.forEach(root => {
            const row = document.createElement('div');
            row.className = 'stats-row';
            const rootCell = document.createElement('div');
            rootCell.className = 'stats-root-label';
            rootCell.textContent = root;
            row.appendChild(rootCell);

            sortedTypes.forEach(t => {
                const cell = document.createElement('div');
                cell.className = 'stats-cell';
                const data = gameStats[root][t];
                if (data && data.tested > 0) {
                    const ratio = data.correct / data.tested;
                    const pctVal = Math.round(ratio * 100);
                    cell.style.backgroundColor = accuracyToColor(ratio);
                    cell.textContent = pctVal + '%';
                    cell.title = typeNameFn(t) + ' from ' + root + ': ' + data.correct + '/' + data.tested + ' (' + pctVal + '%)';
                    cell.style.color = ratio > 0.3 && ratio < 0.7 ? '#000' : ratio >= 0.7 ? '#000' : '#fff';
                } else {
                    cell.style.backgroundColor = '#f0f0f0';
                }
                row.appendChild(cell);
            });
            table.appendChild(row);
        });

        container.appendChild(table);

        // Avg reaction time
        const timeData = {};
        let hasTimeData = false;
        testedRoots.forEach(root => {
            sortedTypes.forEach(t => {
                const data = gameStats[root][t];
                if (data && (data.timedCount || 0) > 0) {
                    if (!timeData[root]) timeData[root] = {};
                    timeData[root][t] = Math.round((data.totalTimeMs || 0) / data.timedCount);
                    hasTimeData = true;
                }
            });
        });
        if (hasTimeData) {
            const rtContainer = document.createElement('div');
            rtContainer.className = 'rt-chart-container';
            renderBuilderReactionTimeMatrix(rtContainer, timeData, 'Avg Reaction Time', allTypes, typeNameFn);
            container.appendChild(rtContainer);
        }
    }

    // ---- Title Page ----

    function renderTitlePage() {
        loadStats();
        const content = document.getElementById('game-content');
        if (!content) return;

        // Remove split-layout scope class
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove('fretboard-drills-active');

        // Clean up resize handler
        if (gameState.resizeHandler) {
            window.removeEventListener('resize', gameState.resizeHandler);
            gameState.resizeHandler = null;
        }

        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-title-page';

        const title = document.createElement('h1');
        title.className = 'game-title';
        title.textContent = GAME_TITLE;
        wrapper.appendChild(title);

        const explanation = document.createElement('p');
        explanation.className = 'game-explanation';
        const modeDescriptions = {
            'root-to-interval': 'You\'ll be given a root note and an interval \u2014 tap the correct fret position on the fretboard.',
            'interval-to-root': 'You\'ll be given a note and its interval from an unknown root \u2014 tap the root note on the fretboard.',
            'interval-to-interval': 'You\'ll be given a note with its interval and a target interval \u2014 find the note that matches the target interval.',
            'scale-builder': 'You\'ll be given a scale \u2014 tap the notes on the fretboard in order, from root to the last degree.',
            'chord-builder': 'You\'ll be given a chord \u2014 tap the notes on the fretboard in order, from root through each chord tone.',
            'note-finding': 'You\'ll be given a note name \u2014 tap any fret position on the fretboard that produces that note.'
        };
        explanation.textContent = 'Test your fretboard knowledge by finding notes, intervals, scales, and chords directly on the guitar neck. ' + modeDescriptions[settings.gameMode];
        wrapper.appendChild(explanation);

        gameState.activeMode = settings.gameMode;

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
        if (settings.gameMode === 'note-finding') {
            if (settings.enabledNotes.length === 0) {
                alert('Please enable at least one note in settings.');
                return false;
            }
            return true;
        }
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
                alert('Interval \u2192 Interval mode requires at least 2 intervals that land on different positions.');
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
            { value: 'chord-builder', text: 'Chord Builder' },
            { value: 'note-finding', text: 'Note Finding' }
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
            renderTitlePage();
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

        // Notation style (hidden in builder modes and note-finding)
        if (settings.gameMode !== 'scale-builder' && settings.gameMode !== 'chord-builder' && settings.gameMode !== 'note-finding') {
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
        });
        colorsGroup.appendChild(colorsLabel);
        colorsGroup.appendChild(colorsSelect);
        modalBody.appendChild(colorsGroup);

        // Type-specific checkboxes
        if (settings.gameMode === 'note-finding') {
            // Note checkboxes
            const noteGroup = document.createElement('div');
            noteGroup.className = 'game-setting-group';
            const noteHeader = document.createElement('div');
            noteHeader.className = 'game-setting-header';
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes';
            noteLabel.className = 'game-setting-label';
            noteHeader.appendChild(noteLabel);

            const noteBtns = document.createElement('div');
            noteBtns.className = 'game-setting-btns';
            const selectAllNote = document.createElement('button');
            selectAllNote.textContent = 'All';
            selectAllNote.className = 'game-setting-btn';
            const deselectAllNote = document.createElement('button');
            deselectAllNote.textContent = 'None';
            deselectAllNote.className = 'game-setting-btn';
            noteBtns.appendChild(selectAllNote);
            noteBtns.appendChild(deselectAllNote);
            noteHeader.appendChild(noteBtns);
            noteGroup.appendChild(noteHeader);

            const noteChecks = document.createElement('div');
            noteChecks.className = 'game-setting-checks';

            const noteCheckboxes = [];
            ALL_ROOTS.forEach(note => {
                const label = document.createElement('label');
                label.className = 'game-setting-check-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = settings.enabledNotes.includes(note);
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        if (!settings.enabledNotes.includes(note)) settings.enabledNotes.push(note);
                    } else {
                        settings.enabledNotes = settings.enabledNotes.filter(v => v !== note);
                    }
                    saveSettings();
                });
                noteCheckboxes.push(cb);
                const span = document.createElement('span');
                span.textContent = note;
                label.appendChild(cb);
                label.appendChild(span);
                noteChecks.appendChild(label);
            });

            selectAllNote.addEventListener('click', () => {
                settings.enabledNotes = [...ALL_ROOTS];
                noteCheckboxes.forEach(cb => cb.checked = true);
                saveSettings();
            });
            deselectAllNote.addEventListener('click', () => {
                settings.enabledNotes = [];
                noteCheckboxes.forEach(cb => cb.checked = false);
                saveSettings();
            });

            noteGroup.appendChild(noteChecks);
            modalBody.appendChild(noteGroup);
        } else if (settings.gameMode === 'chord-builder') {
            renderTypeCheckboxes(modalBody, 'Chord Types', ALL_CHORD_TYPES,
                key => MusicTheory.CHORD_TYPES[key].name,
                settings.enabledChords,
                arr => { settings.enabledChords = arr; saveSettings(); });
        } else if (settings.gameMode === 'scale-builder') {
            renderTypeCheckboxes(modalBody, 'Scale Types', ALL_SCALE_TYPES,
                key => MusicTheory.SCALES[key].name,
                settings.enabledScales,
                arr => { settings.enabledScales = arr; saveSettings(); });
        } else {
            // Interval checkboxes (0-11 only for fretboard — no compound intervals)
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
            for (let s = 1; s <= 11; s++) {
                const label = document.createElement('label');
                label.className = 'game-setting-check-label';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = settings.enabledIntervals.includes(s);
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        if (!settings.enabledIntervals.includes(s)) settings.enabledIntervals.push(s);
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
                settings.enabledIntervals = Array.from({ length: 11 }, (_, i) => i + 1);
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

        // Root note checkboxes (hidden for note-finding)
        if (settings.gameMode === 'note-finding') {
            // Skip root note section — note-finding uses enabledNotes instead
        } else {

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
                    if (!settings.enabledRoots.includes(note)) settings.enabledRoots.push(note);
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

        } // end root note checkboxes

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
                'fb-interval-training': 'Root \u2192 Interval',
                'fb-interval-to-root': 'Interval \u2192 Root',
                'fb-interval-to-interval': 'Interval \u2192 Interval',
                'fb-scale-builder': 'Scale Builder',
                'fb-chord-builder': 'Chord Builder',
                'fb-note-finding': 'Note Finding'
            };
            if (confirm('Clear stats for ' + (modeNames[key] || key) + ' mode?')) {
                delete stats[key];
                saveStats();
                renderTitlePage();
            }
        });
        clearGroup.appendChild(clearBtn);
        modalBody.appendChild(clearGroup);
    }

    function renderTypeCheckboxes(modalBody, heading, allTypes, nameFn, enabledArr, setFn) {
        const group = document.createElement('div');
        group.className = 'game-setting-group';
        const header = document.createElement('div');
        header.className = 'game-setting-header';
        const label = document.createElement('label');
        label.textContent = heading;
        label.className = 'game-setting-label';
        header.appendChild(label);

        const btns = document.createElement('div');
        btns.className = 'game-setting-btns';
        const selectAll = document.createElement('button');
        selectAll.textContent = 'All';
        selectAll.className = 'game-setting-btn';
        const deselectAll = document.createElement('button');
        deselectAll.textContent = 'None';
        deselectAll.className = 'game-setting-btn';
        btns.appendChild(selectAll);
        btns.appendChild(deselectAll);
        header.appendChild(btns);
        group.appendChild(header);

        const checks = document.createElement('div');
        checks.className = 'game-setting-checks';

        const checkboxes = [];
        allTypes.forEach(key => {
            const lbl = document.createElement('label');
            lbl.className = 'game-setting-check-label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = enabledArr.includes(key);
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    if (!enabledArr.includes(key)) enabledArr.push(key);
                } else {
                    const idx = enabledArr.indexOf(key);
                    if (idx !== -1) enabledArr.splice(idx, 1);
                }
                setFn(enabledArr);
            });
            checkboxes.push(cb);
            const span = document.createElement('span');
            span.textContent = nameFn(key);
            lbl.appendChild(cb);
            lbl.appendChild(span);
            checks.appendChild(lbl);
        });

        selectAll.addEventListener('click', () => {
            enabledArr.length = 0;
            allTypes.forEach(t => enabledArr.push(t));
            checkboxes.forEach(cb => cb.checked = true);
            setFn(enabledArr);
        });
        deselectAll.addEventListener('click', () => {
            enabledArr.length = 0;
            checkboxes.forEach(cb => cb.checked = false);
            setFn(enabledArr);
        });

        group.appendChild(checks);
        modalBody.appendChild(group);
    }

    // ---- Cleanup ----

    function cleanup() {
        // Remove split-layout scope class
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) gamesPanel.classList.remove('fretboard-drills-active');

        if (gameState.resizeHandler) {
            window.removeEventListener('resize', gameState.resizeHandler);
            gameState.resizeHandler = null;
        }
        // Null out the click callback via the fretboard API before discarding
        if (gameState.fretboardApi) {
            gameState.fretboardApi.onFretClick(null);
        }
        gameState.fretboardApi = null;
    }

    // ---- Init ----

    loadSettings();
    loadStats();

    window.FretboardDrills = {
        renderTitlePage,
        renderSettings,
        cleanup
    };
})();
