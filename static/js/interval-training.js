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

    // Game settings (persisted)
    let settings = {
        roundCount: 10,
        enabledIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        enabledRoots: [...ALL_ROOTS],
        notationStyle: 'short',
        showColors: true
    };

    // Game runtime state
    let gameState = {
        currentRound: 0,
        totalRounds: 0,
        currentRoot: null,
        currentRootIndex: 0,
        currentSemitone: 0,
        correctCount: 0,
        answered: false,
        circleApi: null
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

    function recordStat(root, semitone, isCorrect) {
        if (!stats['interval-training']) {
            stats['interval-training'] = {};
        }
        if (!stats['interval-training'][root]) {
            stats['interval-training'][root] = {};
        }
        if (!stats['interval-training'][root][semitone]) {
            stats['interval-training'][root][semitone] = { tested: 0, correct: 0 };
        }
        stats['interval-training'][root][semitone].tested++;
        if (isCorrect) {
            stats['interval-training'][root][semitone].correct++;
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

    // ---- Apply settings to current round without re-render ----

    function applySettingsToCurrentRound() {
        const api = gameState.circleApi;
        if (!api) return;

        // Update circle colors
        api.noteGroups.forEach(g => {
            const semitone = parseInt(g.getAttribute('data-semitone'));
            const intervalLabel = SIMPLE_LABELS[semitone];
            let colors = MusicTheory.getIntervalColor(intervalLabel);
            if (!settings.showColors) {
                const noteIndex = parseInt(g.getAttribute('data-note-index'));
                const fill = noteIndex % 2 === 0 ? '#000' : '#777';
                colors = { fill, border: fill, text: '#fff' };
            }
            const circle = g.querySelector('circle');
            const text = g.querySelector('text');
            circle.setAttribute('fill', colors.fill);
            circle.setAttribute('stroke', colors.border);
            text.setAttribute('fill', colors.text);
        });

        // Update notation text
        const intervalText = api.questionGroup.querySelector('.question-interval');
        if (intervalText) {
            intervalText.textContent = formatIntervalName(gameState.currentSemitone, settings.notationStyle);
        }
    }

    // ---- Chromatic circle renderer ----

    function renderChromaticCircle(container, root, onNoteClick) {
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
            let colors = MusicTheory.getIntervalColor(intervalLabel);
            if (!settings.showColors) {
                const fill = i % 2 === 0 ? '#000' : '#777';
                colors = { fill, border: fill, text: '#fff' };
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
            circle.setAttribute('stroke-width', semitone === 0 ? 3 : 2);

            const noteName = MusicTheory.getNoteName(i, useFlats);
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', colors.text);
            text.setAttribute('font-size', markerRadius * 0.9);
            text.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
            text.setAttribute('font-weight', '700');
            text.textContent = noteName;

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
        explanation.textContent = 'Train your ear and theory knowledge by identifying intervals on the chromatic circle. You\'ll be given a root note and an interval \u2014 click the correct note on the circle.';
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
        if (settings.enabledIntervals.length === 0) {
            alert('Please enable at least one interval in settings.');
            return false;
        }
        if (settings.enabledRoots.length === 0) {
            alert('Please enable at least one root note in settings.');
            return false;
        }
        return true;
    }

    // ---- Settings Modal ----

    function renderSettings(modalBody) {
        modalBody.innerHTML = '';

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

        // Notation style
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
            if (confirm('Clear all interval training stats?')) {
                delete stats['interval-training'];
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

        if (gameState.currentRound > gameState.totalRounds) {
            showResults();
            return;
        }

        // Pick random root and interval
        const rootIdx = Math.floor(Math.random() * settings.enabledRoots.length);
        gameState.currentRoot = settings.enabledRoots[rootIdx];
        gameState.currentRootIndex = MusicTheory.getNoteIndex(gameState.currentRoot);

        const intIdx = Math.floor(Math.random() * settings.enabledIntervals.length);
        gameState.currentSemitone = settings.enabledIntervals[intIdx];

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

        gameState.circleApi = renderChromaticCircle(
            circleContainer,
            gameState.currentRoot,
            handleNoteClick
        );

        // Set question text in the center
        const intervalText = gameState.circleApi.questionGroup.querySelector('.question-interval');
        const rootText = gameState.circleApi.questionGroup.querySelector('.question-root');
        if (intervalText) {
            intervalText.textContent = formatIntervalName(gameState.currentSemitone, settings.notationStyle);
        }
        if (rootText) {
            rootText.textContent = 'from ' + gameState.currentRoot;
        }

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

        // Auto-play root note only (don't reveal the interval)
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            Sound.playNote(gameState.currentRoot, GAME_OCTAVE);
        }
    }

    function handleNoteClick(noteIndex, semitone) {
        if (gameState.answered) return;

        const correctNoteIndex = (gameState.currentRootIndex + gameState.currentSemitone) % 12;

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
            Sound.playNote(noteName, GAME_OCTAVE);
        }

        // Record stat
        recordStat(gameState.currentRoot, gameState.currentSemitone, false);

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
        recordStat(gameState.currentRoot, gameState.currentSemitone, true);

        const api = gameState.circleApi;
        if (api) {
            // Fade out non-root, non-correct notes
            const correctNoteIndex = (gameState.currentRootIndex + gameState.currentSemitone) % 12;
            api.noteGroups.forEach(g => {
                const idx = parseInt(g.getAttribute('data-note-index'));
                const sem = parseInt(g.getAttribute('data-semitone'));
                if (idx !== correctNoteIndex && sem !== 0) {
                    g.style.opacity = '0.1';
                }
            });

            // Compute the target note name (used for label update and sound)
            const targetIndex2 = (gameState.currentRootIndex + gameState.currentSemitone) % 12;
            const targetNote2 = MusicTheory.getNoteName(targetIndex2, MusicTheory.shouldUseFlats(gameState.currentRoot));

            // Update the center label to reveal the answer
            const rootText = api.questionGroup.querySelector('.question-root');
            if (rootText) {
                rootText.textContent = 'from ' + gameState.currentRoot + ' is ' + targetNote2;
            }

            // Play the correct interval note immediately
            const gamesState2 = window.Games ? window.Games.getState() : null;
            if (gamesState2 && gamesState2.soundEnabled) {
                Sound.playNote(targetNote2, GAME_OCTAVE);

                // Play both notes together as confirmation at 250ms
                setTimeout(() => {
                    Sound.playInterval(gameState.currentRoot, targetNote2, gameState.currentSemitone, GAME_OCTAVE);
                }, 250);
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

        const gameStats = stats['interval-training'];
        if (!gameStats || Object.keys(gameStats).length === 0) {
            const msg = document.createElement('p');
            msg.className = 'game-explanation';
            msg.textContent = 'No stats yet. Play a round to see your accuracy!';
            container.appendChild(msg);
            return;
        }

        // Find all tested intervals across all roots
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
