/**
 * Chord List
 * The persistent chord list panel and the scale-chords button strip.
 */

import * as MusicTheory from '../core/music-theory.js';
import * as Sound from '../core/sound.js';
import { saveChordList, state } from './state.js';
import { updateDisplay } from './display.js';
import { relocateAddButton } from './controls.js';

/**
 * Render the chord list UI
 */
export function renderChordList() {
    const listEl = document.getElementById('chord-list-items');
    if (!listEl) return;

    listEl.innerHTML = '';

    state.chordList.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'chord-list-item';
        if (index === state.selectedChordIndex) {
            li.classList.add('selected');
        }

        const span = document.createElement('span');
        span.textContent = item.symbol;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-chord-btn';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeChordFromList(index);
        });

        li.appendChild(span);
        li.appendChild(removeBtn);
        li.addEventListener('click', () => selectChordFromList(index));
        listEl.appendChild(li);
    });
}
/**
 * Add a chord to the list
 * @param {string} root - Chord root note
 * @param {string} type - Chord type
 */
export function addChordToList(root, type) {
    const chord = MusicTheory.buildChord(root, type);
    state.chordList.push({
        root,
        type,
        symbol: chord.symbol
    });
    saveChordList();
    renderChordList();
}
/**
 * Remove a chord from the list
 * @param {number} index - Index to remove
 */
function removeChordFromList(index) {
    state.chordList.splice(index, 1);

    // Adjust selected index if needed
    if (state.selectedChordIndex === index) {
        state.selectedChordIndex = -1;
        updateDisplay();
    } else if (state.selectedChordIndex > index) {
        state.selectedChordIndex--;
    }

    saveChordList();
    renderChordList();
}
/**
 * Select a chord from the list
 * @param {number} index - Index to select
 */
function selectChordFromList(index) {
    if (state.selectedChordIndex === index) {
        // Deselect if clicking same item
        state.selectedChordIndex = -1;
    } else {
        state.selectedChordIndex = index;
        // Play the chord sound on select (if enabled)
        if (state.soundEnabled) {
            const item = state.chordList[index];
            const chord = MusicTheory.buildChord(item.root, item.type);
            Sound.playChord(chord.notes);
        }
    }
    renderChordList();
    updateDisplay();
}
/**
 * Clear all chords from the list
 */
export function clearChordList() {
    state.chordList = [];
    state.selectedChordIndex = -1;
    saveChordList();
    renderChordList();
    updateDisplay();
}
/**
 * Render scale chord builder
 */
export function renderScaleChords() {
    const container = document.getElementById('scale-chords');
    if (!container) return;

    let chordRoot, chordScaleType;

    if (state.mode === 'modes') {
        chordRoot = MusicTheory.getModeRoot(state.root, state.modeType);
        chordScaleType = MusicTheory.MODES[state.modeType].scaleType;
    } else {
        // Use relative scale if toggle is active
        chordRoot = state.root;
        chordScaleType = state.scaleType;

        if (state.showRelative) {
            const relativeInfo = MusicTheory.getRelativeScale(state.root, state.scaleType);
            if (relativeInfo) {
                chordRoot = relativeInfo.root;
                chordScaleType = relativeInfo.scaleType;
            }
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
                // Deactivate — return to scale view
                state.activeScaleChord = null;
            } else {
                state.activeScaleChord = { root: chord.root, type: chord.type, symbol: chord.symbol };
                if (state.soundEnabled) {
                    const builtChord = MusicTheory.buildChord(chord.root, chord.type);
                    const scaleRootIndex = MusicTheory.getNoteIndex(chordRoot);
                    const chordRootIndex = MusicTheory.getNoteIndex(chord.root);
                    const startOctave = chordRootIndex < scaleRootIndex ? 4 : 3;
                    Sound.playChord(builtChord.notes, startOctave);
                }
            }
            state.selectedChordIndex = -1;
            renderScaleChords();
            renderChordList();
            updateDisplay();
        });
        chordsRow.appendChild(btn);
    });

    container.appendChild(chordsRow);
    relocateAddButton(state.mode);
}
