/** Reference key is independent of a chord's root and follows saved entries. */
import * as Theory from '../core/music-theory.js';
import { state, saveChordList } from './state.js';

export function syncChordKey() {
    const panel = document.getElementById('chord-key');
    if (panel) panel.hidden = state.mode !== 'chord';
    const select = document.getElementById('chord-reference-key');
    if (select) select.value = state.chordReferenceKey || '';

}

export function restoreProgressionKey(progression) {
    if (!progression?.referenceKey) return;
    state.root = progression.referenceKey;
    const root = document.getElementById('root-note');
    if (root) root.value = state.root;
}

export function initChordKey(refresh) {
    const select = document.getElementById('chord-reference-key');
    for (const name of Theory.CHROMATIC_NOTES) {
        const option = document.createElement('option');
        option.value = name; option.textContent = name;
        select.appendChild(option);
    }
    // Include the flat spellings used by progression and root selectors.
    for (const name of Theory.FLAT_NOTES.filter(name => !Theory.CHROMATIC_NOTES.includes(name))) {
        const option = document.createElement('option');
        option.value = name; option.textContent = name;
        select.appendChild(option);
    }
    select.addEventListener('change', () => {
        state.chordReferenceKey = select.value || null;
        const item = state.chordList[state.selectedChordIndex];
        if (item) {
            item.referenceKey = state.chordReferenceKey;
            saveChordList();
        }
        refresh();
    });
    syncChordKey();
}
