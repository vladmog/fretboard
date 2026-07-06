/**
 * Mode & Control Wiring
 * Mode switching and the controls that depend on the current mode
 * (type dropdown contents, add-button placement).
 */

import * as MusicTheory from '../core/music-theory.js';
import * as ChordProgressions from '../core/progressions.js';
import { Games } from '../games/framework.js';
import { getResolvedFavorites, isFindMode, state } from './state.js';
import { updateDisplay, updateRelToggleVisibility } from './display.js';
import { renderChordList, renderScaleChords } from './chord-list.js';
import { displayFindMarkers, registerFindClickHandler, renderFindResults, renderFindScaleChords } from './find-mode.js';
import { renderProgSubModeUI, renderProgressionChords } from './progressions-ui.js';

/**
 * Update scale type dropdown options based on mode
 * Uses optgroups to organize options by category
 */
export function updateTypeDropdown() {
    const dropdown = document.getElementById('type-select');
    if (!dropdown) return;

    dropdown.innerHTML = '';

    if (state.mode === 'scale') {
        // Organize scales into categories
        const scaleCategories = {
            'Common': ['major', 'natural_minor', 'harmonic_minor', 'melodic_minor', 'pentatonic_major', 'pentatonic_minor', 'blues'],
            'Modes': ['dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']
        };

        for (const [category, scaleKeys] of Object.entries(scaleCategories)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;

            for (const key of scaleKeys) {
                const scale = MusicTheory.SCALES[key];
                if (scale) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = scale.name;
                    if (key === state.scaleType) {
                        option.selected = true;
                    }
                    optgroup.appendChild(option);
                }
            }

            if (optgroup.children.length > 0) {
                dropdown.appendChild(optgroup);
            }
        }

        // Add any remaining scales not in categories
        const categorizedKeys = Object.values(scaleCategories).flat();
        const remainingScales = Object.entries(MusicTheory.SCALES)
            .filter(([key]) => !categorizedKeys.includes(key));

        if (remainingScales.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = 'Other';
            for (const [key, scale] of remainingScales) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = scale.name;
                if (key === state.scaleType) {
                    option.selected = true;
                }
                otherGroup.appendChild(option);
            }
            dropdown.appendChild(otherGroup);
        }
    } else if (state.mode === 'modes') {
        for (const [key, mode] of Object.entries(MusicTheory.MODES)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = mode.name;
            if (key === state.modeType) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        }
    } else if (state.mode === 'caged') {
        // CAGED mode: triadic chord types + maj7/min7
        const cagedTypes = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'min7'];
        for (const key of cagedTypes) {
            const chord = MusicTheory.CHORD_TYPES[key];
            if (chord) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = chord.name;
                if (key === state.chordType) {
                    option.selected = true;
                }
                dropdown.appendChild(option);
            }
        }
    } else if (state.mode === 'prog') {
        // Favorites optgroup
        const resolvedFavs = getResolvedFavorites();
        if (resolvedFavs.length > 0) {
            const favGroup = document.createElement('optgroup');
            favGroup.label = '\u2665 Favorites';
            resolvedFavs.forEach(flatIdx => {
                const { categoryIndex, progressionIndex } = ChordProgressions.flatIndexToCategory(flatIdx);
                const cat = ChordProgressions.PROGRESSION_CATEGORIES[categoryIndex];
                const prog = cat.progressions[progressionIndex];
                const option = document.createElement('option');
                option.value = 'fav-' + flatIdx;
                option.textContent = prog.numerals;
                if (state.browsingFavorites && flatIdx === state.progressionIndex) {
                    option.selected = true;
                }
                favGroup.appendChild(option);
            });
            dropdown.appendChild(favGroup);
        }

        // User progressions optgroup
        if (state.userProgressions.length > 0) {
            const userGroup = document.createElement('optgroup');
            userGroup.label = 'My Progressions';
            state.userProgressions.forEach(prog => {
                const option = document.createElement('option');
                option.value = 'user-' + prog.id;
                option.textContent = prog.numerals;
                if (state._selectedUserProgId === prog.id) {
                    option.selected = true;
                }
                userGroup.appendChild(option);
            });
            dropdown.appendChild(userGroup);
        }

        // Regular progression categories as optgroups
        let flatIdx = 0;
        for (let ci = 0; ci < ChordProgressions.PROGRESSION_CATEGORIES.length; ci++) {
            const cat = ChordProgressions.PROGRESSION_CATEGORIES[ci];
            const optgroup = document.createElement('optgroup');
            optgroup.label = cat.name;

            for (let pi = 0; pi < cat.progressions.length; pi++) {
                const prog = cat.progressions[pi];
                const option = document.createElement('option');
                option.value = flatIdx;
                option.textContent = prog.numerals;
                if (!state.browsingFavorites && flatIdx === state.progressionIndex) {
                    option.selected = true;
                }
                optgroup.appendChild(option);
                flatIdx++;
            }
            dropdown.appendChild(optgroup);
        }
    } else {
        // Organize chords into categories
        const chordCategories = {
            'Triads': ['maj', 'min', 'dim', 'aug'],
            'Sevenths': ['maj7', 'min7', 'dom7', 'dim7', 'min7b5', 'minmaj7', 'augmaj7'],
            'Extended': ['maj9', 'min9', 'dom9', 'maj11', 'min11', 'dom11', 'maj13', 'min13', 'dom13'],
            'Suspended': ['sus2', 'sus4', '7sus4'],
            'Added': ['add9', 'madd9', 'add11', '6', 'min6']
        };

        for (const [category, chordKeys] of Object.entries(chordCategories)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;

            for (const key of chordKeys) {
                const chord = MusicTheory.CHORD_TYPES[key];
                if (chord) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = chord.name;
                    if (key === state.chordType) {
                        option.selected = true;
                    }
                    optgroup.appendChild(option);
                }
            }

            if (optgroup.children.length > 0) {
                dropdown.appendChild(optgroup);
            }
        }

        // Add any remaining chords not in categories
        const categorizedKeys = Object.values(chordCategories).flat();
        const remainingChords = Object.entries(MusicTheory.CHORD_TYPES)
            .filter(([key]) => !categorizedKeys.includes(key));

        if (remainingChords.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = 'Other';
            for (const [key, chord] of remainingChords) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = chord.name;
                if (key === state.chordType) {
                    option.selected = true;
                }
                otherGroup.appendChild(option);
            }
            dropdown.appendChild(otherGroup);
        }
    }
}
/**
 * Move the Add button to the appropriate container for the given mode.
 */
export function relocateAddButton(mode) {
    const btn = document.getElementById('add-chord-btn');
    const progBtn = document.getElementById('add-prog-btn');
    if (!btn) return;

    let target = null;
    if (mode === 'scale' || mode === 'modes' || mode === 'f.scale' || mode === 'prog') {
        target = document.getElementById('scale-chord-builder');
    } else if (mode === 'chord') {
        target = document.getElementById('type-group');
    }

    // Update button text for prog mode
    btn.textContent = mode === 'prog' ? 'Add Chord to Chord List' : 'Add to Chord List';

    if (target) {
        target.appendChild(btn);
        btn.style.display = (mode === 'chord' || state.activeScaleChord) ? 'flex' : 'none';
        if (progBtn) {
            target.appendChild(progBtn);
            progBtn.style.display = mode === 'prog' ? 'flex' : 'none';
        }
    } else {
        btn.style.display = 'none';
        if (progBtn) progBtn.style.display = 'none';
    }
}
/**
 * Handle mode change (scale/chord/interval/caged toggle)
 * @param {string} mode - 'scale', 'chord', 'interval', or 'caged'
 */
export function setMode(mode) {
    // Handle games mode transition
    if (mode === 'games') {
        Games.setPreviousMode(state.mode);
        document.getElementById('controls-panel').style.display = 'none';
        document.getElementById('fretboard-panel').style.display = 'none';
        Games.activate();
        return;
    }

    // Leaving games mode — restore main UI
    if (state.mode === 'games' || document.getElementById('games-panel').style.display === 'block') {
        document.getElementById('controls-panel').style.display = '';
        document.getElementById('fretboard-panel').style.display = '';
        Games.deactivate();
    }

    // Leaving Find mode — clean up
    if (isFindMode(state.mode)) {
        if (state.fretboard) state.fretboard.onFretClick(null);
        state.findMarkers = {};
        state.findResults = [];
        state.findSelectedIndex = -1;
        document.body.classList.remove('find-mode-active');
        const builderSection = document.getElementById('scale-chord-builder');
        if (builderSection) builderSection.classList.remove('disabled');
    }

    state.mode = mode;
    state.selectedChordIndex = -1; // Deselect list item when changing mode
    state.activeScaleChord = null;
    state.browsingFavorites = false;
    updateTypeDropdown();
    renderChordList();

    // Show/hide type selector based on mode (hide for interval and find)
    const typeGroup = document.querySelector('.control-group:has(#type-select)');
    if (typeGroup) {
        typeGroup.style.display = (mode === 'interval' || isFindMode(mode)) ? 'none' : 'block';
    }

    // When entering CAGED mode, ensure chordType is a valid CAGED type
    const cagedTypes = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'min7'];
    if (mode === 'caged' && !cagedTypes.includes(state.chordType)) {
        state.chordType = 'maj';
    }

    // Update type label based on mode
    const typeLabel = document.getElementById('type-label');
    if (typeLabel) {
        if (mode === 'scale') {
            typeLabel.textContent = 'Scale Type';
        } else if (mode === 'modes') {
            typeLabel.textContent = 'Mode';
        } else if (mode === 'prog') {
            typeLabel.textContent = 'Progression';
        } else {
            typeLabel.textContent = 'Chord Type';
        }
    }

    // Update root label based on mode
    const rootLabel = document.getElementById('root-label');
    if (rootLabel) {
        rootLabel.textContent = (mode === 'modes' || mode === 'prog') ? 'Key' : 'Root Note';
    }

    // Show/hide root note selector (hide in find mode)
    const rootGroup = document.querySelector('.control-group:has(#root-note)');
    if (rootGroup) {
        rootGroup.style.display = isFindMode(mode) ? 'none' : 'block';
    }

    const rootSelect = document.getElementById('root-note');
    if (rootSelect) {
        const rainbowModes = ['scale', 'interval', 'modes', 'prog'];
        rootSelect.classList.toggle('rainbow-select', rainbowModes.includes(mode));
    }

    // Show/hide CAGED shape selector
    const cagedSelector = document.getElementById('caged-shape-selector');
    if (cagedSelector) {
        cagedSelector.style.display = mode === 'caged' ? 'block' : 'none';
    }

    // Show/hide interval filter
    const intervalFilter = document.getElementById('interval-filter');
    if (intervalFilter) {
        intervalFilter.style.display = mode === 'interval' ? 'block' : 'none';
    }

    // Show/hide scale chord builder (scale, modes, prog)
    const builderSection = document.getElementById('scale-chord-builder');
    if (builderSection) {
        builderSection.style.display = (mode === 'scale' || mode === 'modes' || mode === 'f.scale' || mode === 'prog') ? 'block' : 'none';
        const builderLabel = builderSection.querySelector('label');
        if (builderLabel) {
            builderLabel.textContent = mode === 'prog' ? 'Progression Chords' : 'Scale Chords';
        }
    }

    // Show/hide prog navigation buttons
    const progNav = document.getElementById('prog-nav');
    if (progNav) {
        progNav.style.display = mode === 'prog' ? 'flex' : 'none';
    }

    // Reset prog sub-mode when entering prog mode
    if (mode === 'prog') {
        state.progSubMode = 'play';
        state._selectedUserProgId = null;
        const submodeRadios = document.querySelectorAll('input[name="prog-submode"]');
        submodeRadios.forEach(r => {
            r.checked = r.value === 'play';
            const label = r.closest('.radio-label');
            if (label) label.classList.toggle('checked', r.checked);
        });
        renderProgSubModeUI();
    } else {
        renderProgSubModeUI();
    }

    // Show/hide toggles based on mode
    const seventhsLabel = document.getElementById('sevenths-toggle')?.closest('.toggle-label');
    const relativeLabel = document.getElementById('relative-toggle')?.closest('.toggle-label');
    const scaleLabel = document.getElementById('chord-intervals-toggle')?.closest('.toggle-label');
    const toggleRow = document.querySelector('#scale-chord-builder .toggle-row');
    if (mode === 'prog') {
        if (seventhsLabel) seventhsLabel.style.display = 'none';
        if (relativeLabel) relativeLabel.style.display = 'none';
        if (scaleLabel) scaleLabel.style.display = '';
        if (toggleRow) toggleRow.style.display = '';
    } else {
        if (seventhsLabel) seventhsLabel.style.display = '';
        // relativeLabel visibility handled by updateRelToggleVisibility()
        if (scaleLabel) scaleLabel.style.display = '';
        if (toggleRow) toggleRow.style.display = '';
    }

    // Rename scale toggle label contextually
    const scaleToggleText = scaleLabel?.querySelector('.toggle-text');
    if (scaleToggleText) {
        scaleToggleText.textContent = mode === 'prog' ? 'key' : 'scale';
    }

    // Update relative toggle visibility for current mode
    updateRelToggleVisibility();

    // Show/hide find controls
    const findControls = document.getElementById('find-controls');
    if (findControls) {
        findControls.style.display = isFindMode(mode) ? 'block' : 'none';
    }

    // Relocate Add button to the appropriate container for this mode
    relocateAddButton(mode);

    if (mode === 'scale' || mode === 'modes') {
        renderScaleChords();
    } else if (mode === 'f.scale') {
        renderFindScaleChords();
    } else if (mode === 'prog') {
        renderProgressionChords();
    }

    // Enter Find mode
    if (isFindMode(mode)) {
        document.body.classList.add('find-mode-active');
        // Set label and Add button visibility based on sub-mode
        const findLabel = document.querySelector('#find-controls > label');
        if (findLabel) {
            findLabel.textContent = mode === 'f.chord' ? 'Matching Chords' : 'Matching Scales';
        }
        const findAddBtn = document.getElementById('find-add-btn');
        if (findAddBtn) {
            findAddBtn.style.display = mode === 'f.scale' ? 'none' : '';
        }
        registerFindClickHandler();
        renderFindResults();
        displayFindMarkers();
        return;
    }

    updateDisplay();
}
