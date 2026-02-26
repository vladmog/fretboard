/**
 * Ear Training Game
 * Listen to a chord and identify the root note and chord type
 * Loaded before games.js so it can register itself
 */

function createEarTrainingGame(config) {
    'use strict';

    const STORAGE_KEY_SETTINGS = config.settingsKey;
    const STORAGE_KEY_STATS = config.statsKey;
    const STATS_PREFIX = config.statsPrefix || '';
    const GAME_TITLE = config.title || 'Ear Training';

    const ALL_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const ALL_CHORD_TYPES = Object.keys(MusicTheory.CHORD_TYPES);

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Game settings (persisted)
    let settings = {
        activeMode: 'chord',
        roundCount: 10,
        enabledRoots: [...ALL_ROOTS],
        enabledChordTypes: ['maj', 'min'],
        playStyle: 'strum'
    };

    // Game runtime state
    let gameState = {
        currentRound: 0,
        totalRounds: 0,
        currentRoot: null,
        currentChordType: null,
        selectedRoot: null,
        selectedChordType: null,
        questionStartTime: 0,
        questionTimes: [],
        hadMistake: false,
        correctCount: 0,
        answered: false,
        questionQueue: [],
        lastDrawnItem: null
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
            }
        } catch (e) {
            console.error('Failed to load ear training settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save ear training settings:', e);
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
        return STATS_PREFIX + 'ear-training-chord';
    }

    function commitSessionStats() {
        loadStats();
        const key = getStatsKey();
        if (!stats[key]) stats[key] = {};
        gameState.questionTimes.forEach(q => {
            if (!stats[key][q.root]) stats[key][q.root] = {};
            if (!stats[key][q.root][q.chordType]) {
                stats[key][q.root][q.chordType] = { tested: 0, correct: 0, totalTimeMs: 0, timedCount: 0 };
            }
            const entry = stats[key][q.root][q.chordType];
            entry.tested++;
            if (q.correct) entry.correct++;
            entry.totalTimeMs = (entry.totalTimeMs || 0) + q.timeMs;
            entry.timedCount = (entry.timedCount || 0) + 1;
        });
        saveStats();
    }

    // ---- Color helpers (same pattern as interval-training.js) ----

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
        title.textContent = GAME_TITLE;
        wrapper.appendChild(title);

        const explanation = document.createElement('p');
        explanation.className = 'game-explanation';
        explanation.textContent = 'Listen to a chord and identify both the root note and chord type. Train your ear to recognize chords by sound.';
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
        if (settings.enabledRoots.length === 0) {
            alert('Please enable at least one root note in settings.');
            return false;
        }
        if (settings.enabledChordTypes.length < 2) {
            alert('Please enable at least 2 chord types in settings to make it a guessing game.');
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
            cb.checked = settings.enabledChordTypes.includes(key);
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    if (!settings.enabledChordTypes.includes(key)) {
                        settings.enabledChordTypes.push(key);
                    }
                } else {
                    settings.enabledChordTypes = settings.enabledChordTypes.filter(v => v !== key);
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
            settings.enabledChordTypes = [...ALL_CHORD_TYPES];
            chordCheckboxes.forEach(cb => cb.checked = true);
            saveSettings();
        });
        deselectAllChords.addEventListener('click', () => {
            settings.enabledChordTypes = [];
            chordCheckboxes.forEach(cb => cb.checked = false);
            saveSettings();
        });

        chordGroup.appendChild(chordChecks);
        modalBody.appendChild(chordGroup);

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
            if (confirm('Clear stats for Ear Training (Chord) mode?')) {
                delete stats[key];
                saveStats();
            }
        });
        clearGroup.appendChild(clearBtn);
        modalBody.appendChild(clearGroup);
    }

    // ---- Game Logic ----

    function buildQuestionPool() {
        const pool = [];
        for (const root of settings.enabledRoots) {
            for (const chordType of settings.enabledChordTypes) {
                pool.push({ root, chordType });
            }
        }
        return pool;
    }

    function questionsEqual(a, b) {
        return a.root === b.root && a.chordType === b.chordType;
    }

    function fillQuestionQueue() {
        const pool = buildQuestionPool();
        loadStats();
        const key = getStatsKey();
        const statsData = stats[key] || {};
        gameState.questionQueue = WeightedSelection.buildWeightedQueue(
            pool, statsData, function(item) { return item.chordType; }, gameState.lastDrawnItem, questionsEqual
        );
    }

    function startGame() {
        gameState.currentRound = 0;
        gameState.totalRounds = settings.roundCount;
        gameState.correctCount = 0;
        gameState.questionTimes = [];
        gameState.questionQueue = [];
        gameState.lastDrawnItem = null;
        fillQuestionQueue();
        nextQuestion();
    }

    function nextQuestion() {
        gameState.currentRound++;
        gameState.answered = false;
        gameState.selectedRoot = null;
        gameState.selectedChordType = null;
        gameState.hadMistake = false;

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
        gameState.currentChordType = q.chordType;

        renderGameView();
    }

    function playCurrentChord() {
        const gamesState = window.Games ? window.Games.getState() : null;
        if (!gamesState || !gamesState.soundEnabled) return;

        const chord = MusicTheory.buildChord(gameState.currentRoot, gameState.currentChordType);
        if (chord && chord.notes) {
            Sound.playChord(chord.notes);
        }
    }

    // ---- Game View ----

    function renderGameView() {
        const content = document.getElementById('game-content');
        if (!content) return;

        content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'game-play-area';

        // Top row: spacer | round counter | spacer
        const topRow = document.createElement('div');
        topRow.className = 'game-top-row';

        const spacerLeft = document.createElement('div');
        spacerLeft.className = 'game-hint-spacer';
        topRow.appendChild(spacerLeft);

        const counter = document.createElement('div');
        counter.className = 'game-round-counter';
        counter.textContent = `${gameState.currentRound} / ${gameState.totalRounds}`;
        topRow.appendChild(counter);

        const spacerRight = document.createElement('div');
        spacerRight.className = 'game-hint-spacer';
        topRow.appendChild(spacerRight);

        wrapper.appendChild(topRow);

        // Replay button
        const replayBtn = document.createElement('button');
        replayBtn.className = 'ear-training-replay-btn';
        replayBtn.textContent = 'Replay';
        replayBtn.addEventListener('click', playCurrentChord);
        wrapper.appendChild(replayBtn);

        // Root selection
        const rootSectionLabel = document.createElement('div');
        rootSectionLabel.className = 'ear-training-section-label';
        rootSectionLabel.textContent = 'Root:';
        wrapper.appendChild(rootSectionLabel);

        const rootGrid = document.createElement('div');
        rootGrid.className = 'ear-training-grid';

        settings.enabledRoots.forEach(root => {
            const btn = document.createElement('button');
            btn.className = 'ear-training-btn';
            btn.textContent = root;
            btn.dataset.root = root;
            btn.addEventListener('click', () => {
                if (gameState.answered) return;
                // Deselect previous root
                rootGrid.querySelectorAll('.ear-training-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                gameState.selectedRoot = root;
                handleSelection();
            });
            rootGrid.appendChild(btn);
        });
        wrapper.appendChild(rootGrid);

        // Chord type selection
        const chordSectionLabel = document.createElement('div');
        chordSectionLabel.className = 'ear-training-section-label';
        chordSectionLabel.textContent = 'Chord Type:';
        wrapper.appendChild(chordSectionLabel);

        const chordGrid = document.createElement('div');
        chordGrid.className = 'ear-training-grid';

        settings.enabledChordTypes.forEach(chordType => {
            const btn = document.createElement('button');
            btn.className = 'ear-training-btn';
            btn.textContent = MusicTheory.CHORD_TYPES[chordType].name;
            btn.dataset.chordType = chordType;
            btn.addEventListener('click', () => {
                if (gameState.answered) return;
                // Deselect previous chord type
                chordGrid.querySelectorAll('.ear-training-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                gameState.selectedChordType = chordType;
                handleSelection();
            });
            chordGrid.appendChild(btn);
        });
        wrapper.appendChild(chordGrid);

        // Feedback area
        const feedback = document.createElement('div');
        feedback.className = 'ear-training-feedback';
        feedback.id = 'ear-training-feedback';
        wrapper.appendChild(feedback);

        // Next button (hidden initially)
        const nextBtn = document.createElement('button');
        nextBtn.className = 'game-next-btn';
        nextBtn.id = 'game-next-btn';
        nextBtn.textContent = 'Next';
        nextBtn.style.display = 'none';
        nextBtn.addEventListener('click', nextQuestion);
        wrapper.appendChild(nextBtn);

        content.appendChild(wrapper);

        gameState.questionStartTime = performance.now();

        // Auto-play chord on question start
        playCurrentChord();
    }

    function handleSelection() {
        if (gameState.selectedRoot === null || gameState.selectedChordType === null) return;
        if (gameState.answered) return;

        const rootCorrect = gameState.selectedRoot === gameState.currentRoot;
        const typeCorrect = gameState.selectedChordType === gameState.currentChordType;
        const bothCorrect = rootCorrect && typeCorrect;

        const content = document.getElementById('game-content');
        const grids = content ? content.querySelectorAll('.ear-training-grid') : [];
        const rootGrid = grids[0];
        const chordGrid = grids[1];
        const feedback = document.getElementById('ear-training-feedback');

        if (bothCorrect) {
            // --- Correct answer ---
            playCurrentChord();
            gameState.answered = true;
            if (!gameState.hadMistake) {
                gameState.correctCount++;
            }

            const elapsed = performance.now() - gameState.questionStartTime;
            gameState.questionTimes.push({
                root: gameState.currentRoot,
                chordType: gameState.currentChordType,
                timeMs: Math.round(elapsed),
                correct: !gameState.hadMistake
            });

            if (rootGrid) {
                rootGrid.querySelectorAll('.ear-training-btn').forEach(btn => {
                    if (btn.dataset.root === gameState.selectedRoot) {
                        btn.classList.add('correct');
                    }
                });
            }
            if (chordGrid) {
                chordGrid.querySelectorAll('.ear-training-btn').forEach(btn => {
                    if (btn.dataset.chordType === gameState.selectedChordType) {
                        btn.classList.add('correct');
                    }
                });
            }

            if (feedback) {
                feedback.textContent = 'Correct!';
                feedback.style.color = '#32CD32';
            }

            setTimeout(() => {
                const nextBtn = document.getElementById('game-next-btn');
                if (nextBtn) nextBtn.style.display = 'block';
            }, 500);
        } else {
            // --- Wrong answer: retry ---
            if (!gameState.hadMistake) {
                gameState.hadMistake = true;
            }

            // Play the wrong chord so user hears the difference
            const gs = window.Games ? window.Games.getState() : null;
            if (gs && gs.soundEnabled) {
                const wrongChord = MusicTheory.buildChord(gameState.selectedRoot, gameState.selectedChordType);
                if (wrongChord && wrongChord.notes) {
                    Sound.playChord(wrongChord.notes);
                }
            }

            // Text feedback
            const parts = [];
            if (rootCorrect) parts.push('Root: correct');
            else parts.push('Root: wrong');
            if (typeCorrect) parts.push('Type: correct');
            else parts.push('Type: wrong');
            if (feedback) {
                feedback.textContent = parts.join(', ') + ' \u2014 try again';
                feedback.style.color = '#FF4444';
            }

            // Visual feedback: green on correct, red on wrong
            if (rootGrid) {
                rootGrid.querySelectorAll('.ear-training-btn').forEach(btn => {
                    if (btn.dataset.root === gameState.selectedRoot) {
                        btn.classList.add(rootCorrect ? 'correct' : 'wrong');
                    }
                });
            }
            if (chordGrid) {
                chordGrid.querySelectorAll('.ear-training-btn').forEach(btn => {
                    if (btn.dataset.chordType === gameState.selectedChordType) {
                        btn.classList.add(typeCorrect ? 'correct' : 'wrong');
                    }
                });
            }

            // Capture wrong values before the timeout clears them
            const wrongRoot = !rootCorrect ? gameState.selectedRoot : null;
            const wrongChordType = !typeCorrect ? gameState.selectedChordType : null;

            // After flash: clear only wrong selection(s), keep correct ones
            setTimeout(() => {
                if (rootGrid && wrongRoot !== null) {
                    rootGrid.querySelectorAll('.ear-training-btn').forEach(btn => {
                        if (btn.dataset.root === wrongRoot) {
                            btn.classList.remove('wrong', 'selected');
                        }
                    });
                    if (gameState.selectedRoot === wrongRoot) {
                        gameState.selectedRoot = null;
                    }
                }
                if (chordGrid && wrongChordType !== null) {
                    chordGrid.querySelectorAll('.ear-training-btn').forEach(btn => {
                        if (btn.dataset.chordType === wrongChordType) {
                            btn.classList.remove('wrong', 'selected');
                        }
                    });
                    if (gameState.selectedChordType === wrongChordType) {
                        gameState.selectedChordType = null;
                    }
                }
            }, 400);
        }
    }

    // ---- Results ----

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

        // Session reaction time matrix
        const rtContainer = document.createElement('div');
        rtContainer.className = 'rt-chart-container';
        const timesByRootColumn = {};
        gameState.questionTimes.forEach(q => {
            if (!timesByRootColumn[q.root]) {
                timesByRootColumn[q.root] = {};
            }
            if (!timesByRootColumn[q.root][q.chordType]) {
                timesByRootColumn[q.root][q.chordType] = { total: 0, count: 0 };
            }
            timesByRootColumn[q.root][q.chordType].total += q.timeMs;
            timesByRootColumn[q.root][q.chordType].count++;
        });
        const timeData = {};
        Object.keys(timesByRootColumn).forEach(root => {
            timeData[root] = {};
            Object.keys(timesByRootColumn[root]).forEach(col => {
                const entry = timesByRootColumn[root][col];
                timeData[root][col] = Math.round(entry.total / entry.count);
            });
        });
        renderBuilderReactionTimeMatrix(rtContainer, timeData, 'Reaction Times');
        wrapper.appendChild(rtContainer);

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

    // ---- Stats Visualization ----

    function renderBuilderReactionTimeMatrix(container, timeData, heading) {
        const testedRoots = [];
        const testedTypes = new Set();

        ALL_ROOTS.forEach(root => {
            if (timeData[root]) {
                testedRoots.push(root);
                Object.keys(timeData[root]).forEach(t => testedTypes.add(t));
            }
        });

        const sortedTypes = ALL_CHORD_TYPES.filter(t => testedTypes.has(t));
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
            cell.textContent = MusicTheory.CHORD_TYPES[t].name;
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
                    cell.title = `${MusicTheory.CHORD_TYPES[t].name} from ${root}: ${formatTime(v)}`;
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

        // Accuracy grid: columns = chord types
        const testedChords = new Set();
        const testedRoots = [];

        ALL_ROOTS.forEach(root => {
            if (gameStats[root]) {
                testedRoots.push(root);
                Object.keys(gameStats[root]).forEach(c => testedChords.add(c));
            }
        });

        const sortedChords = ALL_CHORD_TYPES.filter(c => testedChords.has(c));
        if (sortedChords.length === 0) return;

        const table = document.createElement('div');
        table.className = 'stats-table';

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

        // Avg reaction time matrix
        const chordTimeData = {};
        let hasChordTimeData = false;
        testedRoots.forEach(root => {
            sortedChords.forEach(c => {
                const data = gameStats[root][c];
                if (data && (data.timedCount || 0) > 0) {
                    if (!chordTimeData[root]) chordTimeData[root] = {};
                    chordTimeData[root][c] = Math.round((data.totalTimeMs || 0) / data.timedCount);
                    hasChordTimeData = true;
                }
            });
        });
        if (hasChordTimeData) {
            const rtContainer = document.createElement('div');
            rtContainer.className = 'rt-chart-container';
            renderBuilderReactionTimeMatrix(rtContainer, chordTimeData, 'Avg Reaction Time');
            container.appendChild(rtContainer);
        }
    }

    // ---- Cleanup ----

    function cleanup() {
        // No persistent state to clean up
    }

    // ---- Init ----

    loadSettings();
    loadStats();

    return {
        renderTitlePage,
        renderSettings,
        cleanup
    };
}

window.EarTraining = createEarTrainingGame({
    settingsKey: 'fretboard-ear-training-settings',
    statsKey: 'fretboard-games-stats',
    statsPrefix: '',
    title: 'Ear Training'
});
