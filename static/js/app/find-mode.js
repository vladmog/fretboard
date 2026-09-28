/**
 * Find Mode (f.chord / f.scale)
 * Tap-the-fretboard note entry and matching chord/scale results.
 */

import * as MusicTheory from '../core/music-theory.js';
import * as Sound from '../core/sound.js';
import * as RotationToggle from './rotation-toggle.js';
import { getInstrumentMidiBases, getInstrumentTuning, state } from './state.js';
import { displayChord, displayScale, updateDisplay, updateInfoPanel, updateRelToggleVisibility } from './display.js';
import { addChordToList, renderChordList } from './chord-list.js';
import { relocateAddButton } from './controls.js';

/**
 * Register click handler for Find mode fretboard interaction
 */
export function registerFindClickHandler() {
    if (!state.fretboard) return;
    state.fretboard.onFretClick((string, fret) => {
        // If a result chord is selected, deselect it first
        if (state.findSelectedIndex >= 0) {
            state.findSelectedIndex = -1;
        }

        const key = string + '-' + fret;

        if (state.findMarkers[key]) {
            // Same position — toggle off
            delete state.findMarkers[key];
        } else {
            // In f.chord mode, remove any existing marker on this string first
            if (state.mode === 'f.chord') {
                for (const k of Object.keys(state.findMarkers)) {
                    if (state.findMarkers[k].string === string) {
                        delete state.findMarkers[k];
                    }
                }
            }

            const tuning = getInstrumentTuning();
            const stringIndex = tuning.length - string;
            const noteIndex = MusicTheory.getNoteAt(stringIndex, fret, tuning);
            state.findMarkers[key] = { string, fret, noteIndex };

            if (state.soundEnabled) {
                const noteName = MusicTheory.getNoteName(noteIndex, false);
                const octave = MusicTheory.getOctaveAt(stringIndex, fret, getInstrumentMidiBases());
                Sound.playNote(noteName, octave);
            }
        }

        updateFindResults();
        displayFindMarkers();
    });
}
/**
 * Update find results based on current markers
 */
function updateFindResults() {
    const noteSet = new Set();
    for (const marker of Object.values(state.findMarkers)) {
        noteSet.add(marker.noteIndex);
    }
    state.findResults = state.mode === 'f.chord'
        ? MusicTheory.findChords(noteSet)
        : MusicTheory.findScales(noteSet);
    state.findSelectedIndex = -1;
    state.activeScaleChord = null;
    renderFindResults();
    if (state.mode === 'f.scale') {
        renderFindScaleChords();
    }
}
/**
 * Display user-placed find markers on the fretboard
 */
export function displayFindMarkers() {
    if (!state.fretboard) return;
    state.fretboard.clearMarkers();

    const notes = [];
    const noteIndices = new Set();
    for (const marker of Object.values(state.findMarkers)) {
        const noteName = MusicTheory.getNoteName(marker.noteIndex, false);
        notes.push(noteName);
        noteIndices.add(marker.noteIndex);
        state.fretboard.setMarker(marker.string, marker.fret, {
            color: '#555',
            borderColor: '#000',
            text: noteName,
            textColor: '#fff'
        });
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    const modeLabel = state.mode === 'f.scale' ? 'f.scale' : 'f.chord';
    updateInfoPanel({
        title: notes.length > 0 ? modeLabel + ': ' + notes.join(' ') : modeLabel,
        notes: notes.length > 0 ? notes : ['Tap fretboard to place notes'],
        intervals: [],
        plainMarkerNotes: noteIndices
    });
}
/**
 * Render find results list UI
 */
export function renderFindResults() {
    const listEl = document.getElementById('find-results-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    const addBtn = document.getElementById('find-add-btn');

    const isScaleMode = state.mode === 'f.scale';
    const thingName = isScaleMode ? 'scales' : 'chords';

    if (Object.keys(state.findMarkers).length < 2) {
        const li = document.createElement('li');
        li.className = 'find-result-placeholder';
        li.textContent = 'Place 2+ notes to find ' + thingName;
        listEl.appendChild(li);
        if (addBtn) addBtn.disabled = true;
        return;
    }

    if (state.findResults.length === 0) {
        const li = document.createElement('li');
        li.className = 'find-result-placeholder';
        li.textContent = 'No matching ' + thingName;
        listEl.appendChild(li);
        if (addBtn) addBtn.disabled = true;
        return;
    }

    state.findResults.forEach((result, index) => {
        const li = document.createElement('li');
        li.className = 'find-result-item';
        if (index === state.findSelectedIndex) {
            li.classList.add('selected');
        }

        const symbolSpan = document.createElement('span');
        symbolSpan.className = 'find-result-symbol';
        symbolSpan.textContent = isScaleMode
            ? result.root + ' ' + result.name
            : result.symbol;

        const notesSpan = document.createElement('span');
        notesSpan.className = 'find-result-notes';
        notesSpan.textContent = result.notes.join(' ');

        li.appendChild(symbolSpan);
        li.appendChild(notesSpan);
        li.addEventListener('click', () => selectFindResult(index));
        listEl.appendChild(li);
    });

    if (addBtn) addBtn.disabled = state.findSelectedIndex < 0;
}
/**
 * Select or deselect a find result chord
 * @param {number} index - Index in findResults
 */
function selectFindResult(index) {
    state.activeScaleChord = null;
    if (state.findSelectedIndex === index) {
        // Deselect — show user markers
        state.findSelectedIndex = -1;
        displayFindMarkers();
    } else {
        state.findSelectedIndex = index;
        const result = state.findResults[index];
        if (state.mode === 'f.scale') {
            displayScale(result);
            if (state.soundEnabled) {
                Sound.playArpeggio(result.notes);
            }
        } else {
            displayChord(result);
            if (state.soundEnabled) {
                Sound.playChord(result.notes);
            }
        }
    }
    renderFindResults();
    if (state.mode === 'f.scale') {
        renderFindScaleChords();
        updateRelToggleVisibility();
    }
}
/**
 * Add selected find result to chord list
 */
export function addFindResultToChordList() {
    if (state.findSelectedIndex < 0 || state.findSelectedIndex >= state.findResults.length) return;
    const chord = state.findResults[state.findSelectedIndex];
    addChordToList(chord.root, chord.type);
}
/**
 * Clear all find markers and results
 */
export function clearFindMarkers() {
    state.findMarkers = {};
    state.findResults = [];
    state.findSelectedIndex = -1;
    state.activeScaleChord = null;
    renderFindResults();
    if (state.mode === 'f.scale') {
        renderFindScaleChords();
        updateRelToggleVisibility();
    }
    displayFindMarkers();
}
/**
 * Render scale chord builder for f.scale mode
 * Uses the selected find result scale to populate diatonic chords
 */
export function renderFindScaleChords() {
    const builderSection = document.getElementById('scale-chord-builder');
    const container = document.getElementById('scale-chords');
    if (!builderSection || !container) return;

    if (state.findSelectedIndex < 0 || state.findSelectedIndex >= state.findResults.length) {
        builderSection.classList.add('disabled');
        container.innerHTML = '<p class="scale-chords-note">Select a scale to see chords</p>';
        relocateAddButton(state.mode);
        return;
    }

    builderSection.classList.remove('disabled');
    const selectedScale = state.findResults[state.findSelectedIndex];

    let chordRoot = selectedScale.root;
    let chordScaleType = selectedScale.type;
    if (state.showRelative) {
        const relativeInfo = MusicTheory.getRelativeScale(selectedScale.root, selectedScale.type);
        if (relativeInfo) {
            chordRoot = relativeInfo.root;
            chordScaleType = relativeInfo.scaleType;
        }
    }
    const chords = MusicTheory.buildScaleChords(chordRoot, chordScaleType, state.showSevenths);

    if (chords.length === 0) {
        container.innerHTML = '<p class="scale-chords-note">Scale chords not available for this scale type</p>';
        relocateAddButton(state.mode);
        return;
    }

    container.innerHTML = '';
    const chordsRow = document.createElement('div');
    chordsRow.className = 'scale-chords-list';

    chords.forEach((chord) => {
        const btn = document.createElement('button');
        btn.className = 'scale-chord-item';
        if (state.activeScaleChord && state.activeScaleChord.root === chord.root && state.activeScaleChord.type === chord.type) {
            btn.classList.add('selected');
        }
        btn.innerHTML = `<span class="numeral">${chord.numeral}</span><span class="chord-name">${chord.symbol}</span>`;
        btn.addEventListener('click', () => {
            if (state.activeScaleChord && state.activeScaleChord.root === chord.root && state.activeScaleChord.type === chord.type) {
                state.activeScaleChord = null;
            } else {
                state.activeScaleChord = { root: chord.root, type: chord.type, symbol: chord.symbol };
                if (state.soundEnabled) {
                    const builtChord = MusicTheory.buildChord(chord.root, chord.type);
                    Sound.playChord(builtChord.notes);
                }
            }
            state.selectedChordIndex = -1;
            renderFindScaleChords();
            renderChordList();
            updateDisplay();
        });
        chordsRow.appendChild(btn);
    });

    container.appendChild(chordsRow);
    relocateAddButton(state.mode);
}
