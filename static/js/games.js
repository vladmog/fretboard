/**
 * Games Framework
 * Mode switching, controls box, modal, and game routing
 * Loaded after interval-training.js so game modules are available
 */

(function() {
    'use strict';

    // Game registry - maps game IDs to game modules
    const GAMES = {
        'interval-training': window.IntervalTraining,
        'blind-interval-training': window.BlindIntervalTraining,
        'ear-training': window.EarTraining,
        'chromatic-circle-drills': window.ChromaticCircleDrills,
        'fretboard-drills': window.FretboardDrills,
        'interval-id': window.IntervalId,
        'note-id': window.NoteId
    };

    const GAME_NAMES = {
        'interval-training': 'Interval Training',
        'blind-interval-training': 'Blind Interval Training',
        'ear-training': 'Ear Training',
        'chromatic-circle-drills': 'Chromatic Circle Drills',
        'fretboard-drills': 'Fretboard Drills',
        'interval-id': 'Interval ID',
        'note-id': 'Note ID'
    };

    // Framework state
    const gameState = {
        active: false,
        currentGame: 'interval-training',
        soundEnabled: true,
        previousMode: 'scale'
    };

    // When true, a tap anywhere in the game content (outside designated controls)
    // advances to the next round. Set by the active game via markReady() once a
    // question has been answered; cleared on advance and on state transitions.
    let awaitingAdvance = false;

    function activate() {
        gameState.active = true;
        awaitingAdvance = false;
        const panel = document.getElementById('games-panel');
        if (panel) panel.style.display = 'block';

        const game = getCurrentGame();
        if (game && game.renderTitlePage) {
            game.renderTitlePage();
        }

        updateSoundButton();
    }

    function deactivate() {
        gameState.active = false;
        awaitingAdvance = false;
        const panel = document.getElementById('games-panel');
        if (panel) panel.style.display = 'none';

        const game = getCurrentGame();
        if (game && game.cleanup) {
            game.cleanup();
        }

        closeModal();
    }

    function getCurrentGame() {
        return GAMES[gameState.currentGame] || null;
    }

    // Called by the active game once a question has been answered. Defers arming
    // the flag to the next macrotask so that the click which produced the answer
    // finishes bubbling without immediately advancing — the NEXT tap advances.
    // The identity guard prevents a deferred arm from leaking into a different
    // game if the user switches games during the reveal.
    function markReady() {
        const g = gameState.currentGame;
        setTimeout(() => {
            if (gameState.currentGame === g) awaitingAdvance = true;
        }, 0);
    }

    function updateSoundButton() {
        const btn = document.getElementById('games-sound-btn');
        if (btn) {
            if (gameState.soundEnabled) {
                btn.classList.add('games-sound-on');
                btn.textContent = 'Sound';
            } else {
                btn.classList.remove('games-sound-on');
                btn.textContent = 'Sound';
            }
        }
    }

    function openModal() {
        const modal = document.getElementById('game-settings-modal');
        if (!modal) return;

        const body = document.getElementById('game-settings-body');
        const title = document.getElementById('game-settings-title');
        if (title) {
            title.textContent = GAME_NAMES[gameState.currentGame] || 'Settings';
        }

        const game = getCurrentGame();
        if (game && game.renderSettings && body) {
            game.renderSettings(body);
        }

        modal.style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('game-settings-modal');
        if (modal) modal.style.display = 'none';
    }

    function initEventListeners() {
        // Back button
        const backBtn = document.getElementById('games-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                awaitingAdvance = false;
                const modeRadio = document.querySelector(
                    `input[name="mode"][value="${gameState.previousMode}"]`
                );
                if (modeRadio) {
                    modeRadio.checked = true;
                    modeRadio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

        // Sound toggle
        const soundBtn = document.getElementById('games-sound-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                gameState.soundEnabled = !gameState.soundEnabled;
                updateSoundButton();
            });
        }

        // Menu button
        const menuBtn = document.getElementById('games-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', openModal);
        }

        // Modal close button
        const closeBtn = document.getElementById('game-settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // Modal backdrop click
        const modal = document.getElementById('game-settings-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // Game select dropdown
        const gameSelect = document.getElementById('games-select');
        if (gameSelect) {
            gameSelect.addEventListener('change', (e) => {
                awaitingAdvance = false;
                const game = getCurrentGame();
                if (game && game.cleanup) game.cleanup();

                gameState.currentGame = e.target.value;

                const newGame = getCurrentGame();
                if (newGame && newGame.renderTitlePage) {
                    newGame.renderTitlePage();
                }
            });
        }

        // Tap anywhere in the game content (outside designated controls) to
        // advance once the current question has been answered. Replaces the old
        // per-game "Next" button.
        const content = document.getElementById('game-content');
        if (content) {
            content.addEventListener('click', (e) => {
                if (!awaitingAdvance) return;
                const modal = document.getElementById('game-settings-modal');
                if (modal && getComputedStyle(modal).display !== 'none') return;
                // Real interactive controls (answer buttons, toggles, links) keep
                // their own behavior; SVG answer inputs are not excluded, so a tap
                // on the circle/fretboard after answering advances.
                if (e.target.closest('button, select, input, label, a')) return;
                awaitingAdvance = false;
                const game = getCurrentGame();
                if (game && game.advance) game.advance();
            });
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', initEventListeners);

    // Export
    window.Games = {
        activate,
        deactivate,
        getState: () => ({ ...gameState }),
        setPreviousMode: (mode) => { gameState.previousMode = mode; },
        markReady
    };
})();
