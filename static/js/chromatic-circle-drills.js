/**
 * Chromatic Circle Drills Game
 * Quiz for identifying note positions on the chromatic circle
 * Loaded before games.js so it can register itself
 */

(function() {
    'use strict';

    const STORAGE_KEY_SETTINGS = 'fretboard-chromatic-drills-settings';
    const STORAGE_KEY_STATS = 'fretboard-games-stats';

    const ALL_NOTES = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
    const SIMPLE_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

    const GAME_OCTAVE = 4;

    // Game settings (persisted)
    let settings = {
        roundCount: 10,
        enabledNotes: [...ALL_NOTES],
        showColors: true,
        gameMode: 'note-names'
    };

    // Game runtime state
    let gameState = {
        currentRound: 0,
        totalRounds: 0,
        currentTargetNote: null,
        currentTargetIndex: 0,
        correctCount: 0,
        answered: false,
        hadMistake: false,
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
                const roundOptions = [5, 10, 20, 50, 100];
                if (!roundOptions.includes(settings.roundCount)) {
                    settings.roundCount = roundOptions.reduce((prev, curr) =>
                        Math.abs(curr - settings.roundCount) < Math.abs(prev - settings.roundCount) ? curr : prev
                    );
                }
                if (!['note-names', 'note-sounds'].includes(settings.gameMode)) {
                    settings.gameMode = 'note-names';
                }
            }
        } catch (e) {
            console.error('Failed to load chromatic drills settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save chromatic drills settings:', e);
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
        return settings.gameMode === 'note-sounds'
            ? 'chromatic-circle-drills-sounds'
            : 'chromatic-circle-drills';
    }

    function recordStat(noteName, isCorrect) {
        const key = getStatsKey();
        if (!stats[key]) {
            stats[key] = {};
        }
        if (!stats[key][noteName]) {
            stats[key][noteName] = { tested: 0, correct: 0 };
        }
        stats[key][noteName].tested++;
        if (isCorrect) {
            stats[key][noteName].correct++;
        }
        saveStats();
    }

    // ---- Apply settings to current round ----

    function applySettingsToCurrentRound() {
        const api = gameState.circleApi;
        if (!api) return;

        api.noteGroups.forEach(g => {
            const noteIndex = parseInt(g.getAttribute('data-note-index'));
            const intervalLabel = SIMPLE_LABELS[noteIndex];
            let colors = MusicTheory.getIntervalColor(intervalLabel);
            if (!settings.showColors) {
                const fill = noteIndex % 2 === 0 ? '#000' : '#777';
                colors = { fill, border: fill, text: '#fff' };
            }
            const circle = g.querySelector('circle');
            circle.setAttribute('fill', colors.fill);
            circle.setAttribute('stroke', colors.border);
        });
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

    function renderChromaticCircle(container, onNoteClick) {
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
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);

            // Color based on interval from C (index 0)
            const intervalLabel = SIMPLE_LABELS[i];
            let colors = MusicTheory.getIntervalColor(intervalLabel);
            if (!settings.showColors) {
                const fill = i % 2 === 0 ? '#000' : '#777';
                colors = { fill, border: fill, text: '#fff' };
            }

            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('data-note-index', i);
            g.style.cursor = 'pointer';
            g.style.transition = 'opacity 0.5s ease-out';

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', markerRadius);
            circle.setAttribute('fill', colors.fill);
            circle.setAttribute('stroke', colors.border);
            circle.setAttribute('stroke-width', 2);

            // Blank label — will be revealed on correct answer
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', colors.text);
            text.setAttribute('font-size', markerRadius * 0.9);
            text.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
            text.setAttribute('font-weight', '700');
            text.textContent = '';

            g.appendChild(circle);
            g.appendChild(text);

            g.addEventListener('click', () => {
                onNoteClick(i);
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
        questionLine1.setAttribute('font-size', size * 0.08);
        questionLine1.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
        questionLine1.setAttribute('font-weight', '700');
        questionLine1.setAttribute('fill', '#000');
        questionLine1.setAttribute('class', 'question-note');

        const questionLine2 = document.createElementNS(svgNS, 'text');
        questionLine2.setAttribute('x', center);
        questionLine2.setAttribute('y', center + size * 0.04);
        questionLine2.setAttribute('text-anchor', 'middle');
        questionLine2.setAttribute('dominant-baseline', 'central');
        questionLine2.setAttribute('font-size', size * 0.035);
        questionLine2.setAttribute('font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif");
        questionLine2.setAttribute('font-weight', '400');
        questionLine2.setAttribute('fill', '#666');
        questionLine2.setAttribute('class', 'question-hint');

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
        title.textContent = 'Chromatic Circle Drills';
        wrapper.appendChild(title);

        const explanation = document.createElement('p');
        explanation.className = 'game-explanation';
        explanation.textContent = settings.gameMode === 'note-sounds'
            ? 'A note will be played \u2014 identify it by clicking the correct position on the circle.'
            : 'Test your knowledge of note positions on the chromatic circle. You\'ll be given a note name \u2014 click the correct position on the circle.';
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
        if (settings.enabledNotes.length === 0) {
            alert('Please enable at least one note in settings.');
            return false;
        }
        if (settings.gameMode === 'note-sounds') {
            const gamesState = window.Games ? window.Games.getState() : null;
            if (gamesState && !gamesState.soundEnabled) {
                const soundBtn = document.getElementById('sound-toggle');
                if (soundBtn) soundBtn.click();
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
            { value: 'note-names', text: 'Note Names' },
            { value: 'note-sounds', text: 'Note Sounds' }
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
        ALL_NOTES.forEach(note => {
            const label = document.createElement('label');
            label.className = 'game-setting-check-label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = settings.enabledNotes.includes(note);
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    if (!settings.enabledNotes.includes(note)) {
                        settings.enabledNotes.push(note);
                    }
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
            settings.enabledNotes = [...ALL_NOTES];
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
            const modeName = settings.gameMode === 'note-sounds' ? 'Note Sounds' : 'Note Names';
            if (confirm(`Clear all ${modeName} stats?`)) {
                delete stats[getStatsKey()];
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
        gameState.hadMistake = false;

        if (gameState.currentRound > gameState.totalRounds) {
            showResults();
            return;
        }

        // Pick random note from enabled notes
        const idx = Math.floor(Math.random() * settings.enabledNotes.length);
        gameState.currentTargetNote = settings.enabledNotes[idx];
        gameState.currentTargetIndex = MusicTheory.getNoteIndex(gameState.currentTargetNote);

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
            handleNoteClick
        );

        // Set question text in center
        const noteText = gameState.circleApi.questionGroup.querySelector('.question-note');
        const hintText = gameState.circleApi.questionGroup.querySelector('.question-hint');

        if (settings.gameMode === 'note-sounds') {
            // Note Sounds mode: show "?" and let user identify by ear
            if (noteText) noteText.textContent = '?';
            if (hintText) hintText.textContent = 'Tap to hear again';
            // Make center question group clickable to replay sound
            gameState.circleApi.questionGroup.style.cursor = 'pointer';
            gameState.circleApi.questionGroup.addEventListener('click', function replayHandler() {
                if (!gameState.answered) {
                    Sound.playNote(gameState.currentTargetNote, GAME_OCTAVE);
                }
            });
        } else {
            // Note Names mode: show note name
            if (noteText) noteText.textContent = gameState.currentTargetNote;
            if (hintText) hintText.textContent = 'Find this note';
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

        // Auto-play the target note sound
        if (settings.gameMode === 'note-sounds') {
            // Always play in note-sounds mode (sound IS the question)
            Sound.playNote(gameState.currentTargetNote, GAME_OCTAVE);
        } else {
            const gamesState = window.Games ? window.Games.getState() : null;
            if (gamesState && gamesState.soundEnabled) {
                Sound.playNote(gameState.currentTargetNote, GAME_OCTAVE);
            }
        }
    }

    function handleNoteClick(noteIndex) {
        if (gameState.answered) return;

        if (noteIndex === gameState.currentTargetIndex) {
            handleCorrectAnswer(noteIndex);
        } else {
            handleWrongAnswer(noteIndex);
        }
    }

    function handleWrongAnswer(clickedNoteIndex) {
        gameState.hadMistake = true;

        // Play clicked note sound
        const gamesState = window.Games ? window.Games.getState() : null;
        if (gamesState && gamesState.soundEnabled) {
            const noteName = MusicTheory.getNoteName(clickedNoteIndex, false);
            Sound.playNote(noteName, GAME_OCTAVE);
        }

        // Record stat
        recordStat(gameState.currentTargetNote, false);

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
        if (!gameState.hadMistake) {
            gameState.correctCount++;
        }

        // Record stat
        recordStat(gameState.currentTargetNote, true);

        const api = gameState.circleApi;
        if (api) {
            // Fade out all other notes
            api.noteGroups.forEach(g => {
                const idx = parseInt(g.getAttribute('data-note-index'));
                if (idx !== noteIndex) {
                    g.style.opacity = '0.1';
                }
            });

            // Reveal the note name label on the correct marker
            const correctGroup = api.noteGroups.find(g =>
                parseInt(g.getAttribute('data-note-index')) === noteIndex
            );
            if (correctGroup) {
                const text = correctGroup.querySelector('text');
                if (text) {
                    const circleEl = correctGroup.querySelector('circle');
                    const x = parseFloat(circleEl.getAttribute('cx'));
                    const y = parseFloat(circleEl.getAttribute('cy'));
                    const markerRadius = parseFloat(circleEl.getAttribute('r'));
                    setMarkerNoteText(text, noteIndex, x, y, markerRadius);
                }
            }

            // Update center text
            const centerNote = api.questionGroup.querySelector('.question-note');
            const hintText = api.questionGroup.querySelector('.question-hint');
            if (settings.gameMode === 'note-sounds') {
                // Reveal the actual note name
                if (centerNote) centerNote.textContent = gameState.currentTargetNote;
                api.questionGroup.style.cursor = 'default';
            }
            if (hintText) {
                hintText.textContent = 'Correct!';
            }

            // Play the note sound
            const gamesState = window.Games ? window.Games.getState() : null;
            if (gamesState && gamesState.soundEnabled) {
                Sound.playNote(gameState.currentTargetNote, GAME_OCTAVE);
            }

            // Show next button after 500ms
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

        const gameStats = stats[getStatsKey()];
        if (!gameStats || Object.keys(gameStats).length === 0) {
            const msg = document.createElement('p');
            msg.className = 'game-explanation';
            msg.textContent = 'No stats yet. Play a round to see your accuracy!';
            container.appendChild(msg);
            return;
        }

        // Single row of 12 cells, one per note
        const table = document.createElement('div');
        table.className = 'stats-table';

        // Header row (note names)
        const headerRow = document.createElement('div');
        headerRow.className = 'stats-row';
        ALL_NOTES.forEach(note => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell stats-cell-header';
            cell.textContent = note;
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        // Data row (accuracy)
        const dataRow = document.createElement('div');
        dataRow.className = 'stats-row';
        ALL_NOTES.forEach(note => {
            const cell = document.createElement('div');
            cell.className = 'stats-cell';

            const data = gameStats[note];
            if (data && data.tested > 0) {
                const ratio = data.correct / data.tested;
                const pctVal = Math.round(ratio * 100);
                cell.style.backgroundColor = accuracyToColor(ratio);
                cell.textContent = `${pctVal}%`;
                cell.title = `${note}: ${data.correct}/${data.tested} (${pctVal}%)`;
                cell.style.color = ratio > 0.3 && ratio < 0.7 ? '#000' : ratio >= 0.7 ? '#000' : '#fff';
            } else {
                cell.style.backgroundColor = '#f0f0f0';
            }
            dataRow.appendChild(cell);
        });
        table.appendChild(dataRow);

        container.appendChild(table);
    }

    // ---- Cleanup ----

    function cleanup() {
        gameState.circleApi = null;
    }

    // ---- Init ----

    loadSettings();
    loadStats();

    window.ChromaticCircleDrills = {
        renderTitlePage,
        renderSettings,
        cleanup
    };
})();
