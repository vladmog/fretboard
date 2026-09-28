/**
 * Application entry point — the only script tag in the HTML (type="module").
 * Wires up init and pulls in the side-effect modules (games framework,
 * rotation toggle, dev panel).
 */

import * as MusicTheory from './core/music-theory.js';
import { createFretboard } from './core/fretboard.js';
import { getInstrumentTuning, isFindMode, loadChordList, loadFavorites, loadUserProgressions, state } from './app/state.js';
import { updateDisplay } from './app/display.js';
import { renderChordList, renderScaleChords } from './app/chord-list.js';
import { registerFindClickHandler } from './app/find-mode.js';
import { relocateAddButton, updateTypeDropdown } from './app/controls.js';
import { initEventListeners } from './app/events.js';
import './app/rotation-toggle.js';
import './games/framework.js';
import './dev-panel.js';

/**
 * Initialize the application
 */
function init() {
    // Load persisted data
    loadChordList();
    loadFavorites();
    loadUserProgressions();

    // Initialize fretboard
    const container = document.getElementById('fretboard-panel');
    const rebuildFretboard = () => {
        if (!container) return;
        container.innerHTML = '';
        state.fretboard = createFretboard(container, {
            tuning: getInstrumentTuning(),
            frets: 15
        });
        if (isFindMode(state.mode)) {
            registerFindClickHandler();
        }
        updateDisplay();
    };

    rebuildFretboard();

    // Initialize UI
    updateTypeDropdown();
    renderChordList();
    renderScaleChords();
    initEventListeners({ onInstrumentChange: rebuildFretboard });

    // Color-code interval filter checkboxes
    document.querySelectorAll('.interval-check').forEach(label => {
        const interval = label.dataset.interval;
        const colors = MusicTheory.getIntervalColor(interval);
        label.style.setProperty('--interval-color', colors.border);
        label.style.setProperty('--interval-fill', colors.fill);
    });

    // Set initial mode-dependent UI states
    relocateAddButton(state.mode);

    // Hide type selector in interval/find mode
    const typeGroup = document.querySelector('.control-group:has(#type-select)');
    if (typeGroup) {
        typeGroup.style.display = (state.mode === 'interval' || isFindMode(state.mode)) ? 'none' : 'block';
    }

    // Apply rainbow border on root-note select for applicable modes
    const rootSelect = document.getElementById('root-note');
    if (rootSelect) {
        const rainbowModes = ['scale', 'interval', 'modes', 'prog'];
        rootSelect.classList.toggle('rainbow-select', rainbowModes.includes(state.mode));
    }

    // Initial display
    updateDisplay();

    // Handle resize
    window.addEventListener('resize', () => {
        rebuildFretboard();
    });
}

// Initialize when DOM is ready. The readyState check matters: top-level await
// in the module graph (progressions.json fetch) can suspend module evaluation
// past DOMContentLoaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
