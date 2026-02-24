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
        'chromatic-circle-drills': window.ChromaticCircleDrills
    };

    const GAME_NAMES = {
        'interval-training': 'Interval Training',
        'blind-interval-training': 'Blind Interval Training',
        'chromatic-circle-drills': 'Chromatic Circle Drills'
    };

    // Framework state
    const gameState = {
        active: false,
        currentGame: 'interval-training',
        soundEnabled: true,
        previousMode: 'scale'
    };

    function activate() {
        gameState.active = true;
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
                const game = getCurrentGame();
                if (game && game.cleanup) game.cleanup();

                gameState.currentGame = e.target.value;

                const newGame = getCurrentGame();
                if (newGame && newGame.renderTitlePage) {
                    newGame.renderTitlePage();
                }
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
        setPreviousMode: (mode) => { gameState.previousMode = mode; }
    };
})();
