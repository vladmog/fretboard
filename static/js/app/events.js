/**
 * Event Listeners
 * All DOM event wiring for the main app. Sits at the top of the app/
 * module graph — imported only by main.js at init time.
 */

import * as MusicTheory from '../core/music-theory.js';
import * as ChordProgressions from '../core/progressions.js';
import * as Sound from '../core/sound.js';
import { getProgressionKey, getResolvedFavorites, isFindMode, saveFavorites, state } from './state.js';
import { updateDisplay, updateRelToggleVisibility } from './display.js';
import { addChordToList, clearChordList, renderChordList, renderScaleChords } from './chord-list.js';
import { addFindResultToChordList, clearFindMarkers, renderFindScaleChords } from './find-mode.js';
import { addFromChordList, addProgressionToChordList, deleteProgression, loadProgressionIntoBuilder, renderBuilderRows, renderProgSubModeUI, renderProgressionChords, saveProgression, updateFavButton } from './progressions-ui.js';
import { setMode, updateTypeDropdown } from './controls.js';

/**
 * Initialize event listeners
 */
export function initEventListeners({ onInstrumentChange } = {}) {
    const cagedRadio = document.querySelector('input[name="mode"][value="caged"]');
    const syncCagedAvailability = () => {
        if (!cagedRadio) return;
        const disabled = state.instrument === 'bass';
        cagedRadio.disabled = disabled;
        cagedRadio.closest('.radio-label')?.classList.toggle('disabled', disabled);
    };

    document.querySelectorAll('input[name="instrument"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.instrument = e.target.value;
            if (isFindMode(state.mode)) {
                clearFindMarkers();
            } else {
                state.findMarkers = {};
                state.findResults = [];
                state.findSelectedIndex = -1;
            }
            state.activeScaleChord = null;
            syncCagedAvailability();

            if (state.instrument === 'bass' && state.mode === 'caged') {
                const scaleRadio = document.querySelector('input[name="mode"][value="scale"]');
                if (scaleRadio) {
                    scaleRadio.checked = true;
                    scaleRadio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            onInstrumentChange?.();
        });
    });
    syncCagedAvailability();

    // Mode toggle (scale/chord)
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            setMode(e.target.value);
        });
    });

    // Root note selector
    const rootSelect = document.getElementById('root-note');
    if (rootSelect) {
        rootSelect.addEventListener('change', (e) => {
            state.root = e.target.value;
            state.selectedChordIndex = -1;
            state.activeScaleChord = null;
            renderChordList();
            if (state.mode === 'scale' || state.mode === 'modes') {
                renderScaleChords();
            } else if (state.mode === 'prog') {
                if (state.progSubMode === 'play') {
                    renderProgressionChords();
                } else {
                    renderBuilderRows();
                }
            }
            updateDisplay();
            if (state.mode === 'chord' && state.soundEnabled) {
                const chord = MusicTheory.buildChord(state.root, state.chordType);
                Sound.playChord(chord.notes);
            }
        });
    }

    // Type selector (scale or chord type)
    const typeSelect = document.getElementById('type-select');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            if (state.mode === 'scale') {
                state.scaleType = e.target.value;
                state.activeScaleChord = null;
                updateRelToggleVisibility();
                renderScaleChords();
            } else if (state.mode === 'modes') {
                state.modeType = e.target.value;
                state.activeScaleChord = null;
                renderScaleChords();
            } else if (state.mode === 'prog') {
                const val = e.target.value;
                if (val.startsWith('user-')) {
                    state._selectedUserProgId = parseInt(val.slice(5));
                    state.browsingFavorites = false;
                } else if (val.startsWith('fav-')) {
                    state._selectedUserProgId = null;
                    state.progressionIndex = parseInt(val.slice(4)) || 0;
                    state.browsingFavorites = true;
                } else {
                    state._selectedUserProgId = null;
                    state.progressionIndex = parseInt(val) || 0;
                    state.browsingFavorites = false;
                }
                state.activeScaleChord = null;
                updateFavButton();
                renderProgressionChords();
            } else {
                state.chordType = e.target.value;
            }
            state.selectedChordIndex = -1;
            renderChordList();
            updateDisplay();
            if ((state.mode === 'chord' || state.mode === 'caged') && state.soundEnabled) {
                const chord = MusicTheory.buildChord(state.root, state.chordType);
                Sound.playChord(chord.notes);
            }
        });
    }

    // Triads/7ths toggle
    const seventhsToggle = document.getElementById('sevenths-toggle');
    if (seventhsToggle) {
        seventhsToggle.addEventListener('change', (e) => {
            state.showSevenths = e.target.checked;
            state.activeScaleChord = null;
            if (state.mode === 'f.scale') {
                renderFindScaleChords();
            } else {
                renderScaleChords();
            }
            updateDisplay();
        });
    }

    // Sound toggle
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            state.soundEnabled = e.target.checked;
        });
    }

    // Note names toggle
    const noteNamesToggle = document.getElementById('notenames-toggle');
    if (noteNamesToggle) {
        noteNamesToggle.addEventListener('change', (e) => {
            state.showNoteNames = e.target.checked;
            updateDisplay();
        });
    }

    // Relative scale toggle
    const relativeToggle = document.getElementById('relative-toggle');
    if (relativeToggle) {
        relativeToggle.addEventListener('change', (e) => {
            state.showRelative = e.target.checked;
            state.activeScaleChord = null;
            if (state.mode === 'f.scale') {
                renderFindScaleChords();
            } else {
                renderScaleChords();
            }
            updateDisplay();
        });
    }

    // Chord intervals toggle
    const chordIntervalsToggle = document.getElementById('chord-intervals-toggle');
    if (chordIntervalsToggle) {
        chordIntervalsToggle.addEventListener('change', (e) => {
            state.showScaleDegrees = e.target.checked;
            updateDisplay();
        });
    }

    // Handle checkbox visual state for toggle buttons
    // Replaces CSS :has() selector which has timing issues on mobile
    const checkboxToggles = document.querySelectorAll('.toggle-label input[type="checkbox"]');
    checkboxToggles.forEach(checkbox => {
        const label = checkbox.closest('.toggle-label');

        // Set initial state based on checked attribute
        if (checkbox.checked) {
            label.classList.add('checked');
        }

        // Update class on change event
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                label.classList.add('checked');
            } else {
                label.classList.remove('checked');
            }
        });
    });

    // Handle radio button visual state
    // Replaces CSS :has() selector which has timing issues on mobile
    const radioLabels = document.querySelectorAll('.radio-label');
    radioLabels.forEach(label => {
        const radio = label.querySelector('input[type="radio"]');

        if (radio) {
            // Set initial state
            if (radio.checked) {
                label.classList.add('checked');
            }

            // Update on change
            radio.addEventListener('change', function() {
                if (this.checked) {
                    // Remove checked class from all radios in same group
                    const groupName = this.name;
                    document.querySelectorAll(`input[type="radio"][name="${groupName}"]`).forEach(r => {
                        r.closest('.radio-label').classList.remove('checked');
                    });

                    // Add checked class to current label
                    label.classList.add('checked');
                }
            });
        }
    });

    // CAGED shape selector
    const cagedShapeRadios = document.querySelectorAll('input[name="caged-shape"]');
    cagedShapeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.cagedShape = e.target.value;
            updateDisplay();
        });
    });

    // Prog mode navigation buttons
    function navigateProgression(direction) {
        const favs = getResolvedFavorites();
        const total = ChordProgressions.getTotalProgressionCount();
        const userProgs = state.userProgressions;

        // Build ordered sections: [favorites] → [user progressions] → [built-in]
        // Navigation: built-in → (wrap to favs or user or built-in start)
        //             favs → user progs → built-in
        //             user progs → built-in

        if (state._selectedUserProgId) {
            // Currently on a user progression
            const userIdx = userProgs.findIndex(p => p.id === state._selectedUserProgId);
            if (direction === 'next') {
                if (userIdx >= userProgs.length - 1) {
                    // Move to first built-in
                    state._selectedUserProgId = null;
                    state.browsingFavorites = false;
                    state.progressionIndex = 0;
                } else {
                    state._selectedUserProgId = userProgs[userIdx + 1].id;
                }
            } else {
                if (userIdx <= 0) {
                    // Move to last favorite, or last built-in
                    state._selectedUserProgId = null;
                    if (favs.length > 0) {
                        state.browsingFavorites = true;
                        state.progressionIndex = favs[favs.length - 1];
                    } else {
                        state.browsingFavorites = false;
                        state.progressionIndex = total - 1;
                    }
                } else {
                    state._selectedUserProgId = userProgs[userIdx - 1].id;
                }
            }
        } else if (state.browsingFavorites && favs.length > 0) {
            const favIdx = favs.indexOf(state.progressionIndex);
            if (direction === 'next') {
                if (favIdx >= favs.length - 1) {
                    // Move to first user prog, or first built-in
                    if (userProgs.length > 0) {
                        state._selectedUserProgId = userProgs[0].id;
                        state.browsingFavorites = false;
                    } else {
                        state.browsingFavorites = false;
                        state.progressionIndex = 0;
                    }
                } else {
                    state.progressionIndex = favs[favIdx + 1];
                }
            } else {
                if (favIdx <= 0) {
                    state.browsingFavorites = false;
                    state.progressionIndex = total - 1;
                } else {
                    state.progressionIndex = favs[favIdx - 1];
                }
            }
        } else {
            // Built-in progressions
            if (direction === 'next') {
                if (state.progressionIndex >= total - 1) {
                    // Wrap: go to favs, then user, then built-in start
                    if (favs.length > 0) {
                        state.browsingFavorites = true;
                        state.progressionIndex = favs[0];
                    } else if (userProgs.length > 0) {
                        state._selectedUserProgId = userProgs[0].id;
                    } else {
                        state.progressionIndex = 0;
                    }
                } else {
                    state.progressionIndex++;
                }
            } else {
                if (state.progressionIndex <= 0) {
                    // Wrap backwards: user progs, then favs, then end of built-in
                    if (userProgs.length > 0) {
                        state._selectedUserProgId = userProgs[userProgs.length - 1].id;
                    } else if (favs.length > 0) {
                        state.browsingFavorites = true;
                        state.progressionIndex = favs[favs.length - 1];
                    } else {
                        state.progressionIndex = total - 1;
                    }
                } else {
                    state.progressionIndex--;
                }
            }
        }

        state.activeScaleChord = null;
        updateFavButton();
        updateTypeDropdown();
        renderProgressionChords();
        updateDisplay();
    }

    const progPrev = document.getElementById('prog-prev');
    const progNext = document.getElementById('prog-next');
    if (progPrev) {
        progPrev.addEventListener('click', () => navigateProgression('prev'));
    }
    if (progNext) {
        progNext.addEventListener('click', () => navigateProgression('next'));
    }

    // Prog mode favorite toggle button
    const progFav = document.getElementById('prog-fav');
    if (progFav) {
        progFav.addEventListener('click', () => {
            const key = getProgressionKey(state.progressionIndex);
            if (!key) return;
            const pos = state.favoriteProgressions.indexOf(key);
            if (pos >= 0) {
                state.favoriteProgressions.splice(pos, 1);
            } else {
                state.favoriteProgressions.push(key);
            }
            saveFavorites();
            updateFavButton();
            updateTypeDropdown();
        });
    }

    // Prog sub-mode radios
    const progSubModeRadios = document.querySelectorAll('input[name="prog-submode"]');
    progSubModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.progSubMode = e.target.value;
            state.builderRows = [];
            state.builderDescription = '';
            state.editingProgressionId = null;
            renderProgSubModeUI();
        });
    });

    // Builder: Add Row
    const addRowBtn = document.getElementById('prog-builder-add-row');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            state.builderRows.push({ numeral: 'I', quality: '' });
            renderBuilderRows();
        });
    }

    // Builder: Add from Chord List
    const fromListBtn = document.getElementById('prog-builder-from-list');
    if (fromListBtn) {
        fromListBtn.addEventListener('click', addFromChordList);
    }

    // Builder: Save
    const saveBtn = document.getElementById('prog-builder-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProgression);
    }

    // Builder: Delete
    const delBtn = document.getElementById('prog-builder-delete');
    if (delBtn) {
        delBtn.addEventListener('click', deleteProgression);
    }

    // Builder: Description input
    const descInput = document.getElementById('prog-builder-description');
    if (descInput) {
        descInput.addEventListener('input', (e) => {
            state.builderDescription = e.target.value;
        });
    }

    // Edit selector
    const editSelect = document.getElementById('prog-edit-select');
    if (editSelect) {
        editSelect.addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            if (id) loadProgressionIntoBuilder(id);
        });
    }

    // Add chord button (from dropdowns)
    const addChordBtn = document.getElementById('add-chord-btn');
    if (addChordBtn) {
        addChordBtn.addEventListener('click', () => {
            if ((state.mode === 'scale' || state.mode === 'modes' || state.mode === 'f.scale' || state.mode === 'prog') && state.activeScaleChord) {
                addChordToList(state.activeScaleChord.root, state.activeScaleChord.type);
            } else if (state.mode === 'f.scale') {
                return; // No active scale chord in f.scale — do nothing
            } else {
                addChordToList(state.root, state.chordType);
            }
        });
    }

    // Add progression button
    const addProgBtn = document.getElementById('add-prog-btn');
    if (addProgBtn) {
        addProgBtn.addEventListener('click', addProgressionToChordList);
    }

    // Clear chord list button
    const clearListBtn = document.getElementById('clear-list-btn');
    if (clearListBtn) {
        clearListBtn.addEventListener('click', clearChordList);
    }

    // Find mode buttons
    const findAddBtn = document.getElementById('find-add-btn');
    if (findAddBtn) {
        findAddBtn.addEventListener('click', addFindResultToChordList);
    }

    const findClearBtn = document.getElementById('find-clear-btn');
    if (findClearBtn) {
        findClearBtn.addEventListener('click', clearFindMarkers);
    }

    // Interval filter checkboxes
    const intervalChecks = document.querySelectorAll('.interval-check input[type="checkbox"]');
    intervalChecks.forEach(checkbox => {
        const label = checkbox.closest('.interval-check');
        const interval = label.dataset.interval;

        // Set initial checked class
        if (checkbox.checked) {
            label.classList.add('checked');
        }

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                state.intervalFilter.add(interval);
                label.classList.add('checked');
            } else {
                state.intervalFilter.delete(interval);
                label.classList.remove('checked');
            }
            updateDisplay();
        });
    });

    // Interval filter: Select All
    const intervalSelectAll = document.getElementById('interval-select-all');
    if (intervalSelectAll) {
        intervalSelectAll.addEventListener('click', () => {
            const allIntervals = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
            state.intervalFilter = new Set(allIntervals);
            document.querySelectorAll('.interval-check').forEach(label => {
                label.querySelector('input').checked = true;
                label.classList.add('checked');
            });
            updateDisplay();
        });
    }

    // Interval filter: Deselect All
    const intervalDeselectAll = document.getElementById('interval-deselect-all');
    if (intervalDeselectAll) {
        intervalDeselectAll.addEventListener('click', () => {
            state.intervalFilter.clear();
            document.querySelectorAll('.interval-check').forEach(label => {
                label.querySelector('input').checked = false;
                label.classList.remove('checked');
            });
            updateDisplay();
        });
    }

}
