/** Reference key is independent of a chord's root and follows saved entries. */
import * as Theory from '../core/music-theory.js';
import { state, saveChordList } from './state.js';

export function syncChordKey() {
    const panel = document.getElementById('chord-key');
    if (panel) panel.hidden = state.mode !== 'chord';
    const select = document.getElementById('chord-reference-key');
    if (select) select.value = state.chordReferenceKey || '';
    const toggle = document.getElementById('chord-scale-degrees');
    if (toggle) {
        toggle.checked = state.chordScaleDegrees;
        toggle.disabled = !state.chordReferenceKey || !state.chordReferenceScale;
    }
    const scaleSelect = document.getElementById('chord-reference-scale');
    if (scaleSelect) scaleSelect.value = state.chordReferenceScale || '';


}

export function restoreProgressionKey(progression) {
    state.builderReferenceScale = progression?.referenceScale || null;
    const scaleSelect = document.getElementById('prog-reference-scale');
    if (scaleSelect) scaleSelect.value = state.builderReferenceScale || '';
    if (!progression?.referenceKey) return;
    state.root = progression.referenceKey;
    const root = document.getElementById('root-note');
    if (root) root.value = state.root;
}

export function initChordKey(refresh) {
    for (const [id, field] of [['chord-reference-scale', 'chordReferenceScale'], ['prog-reference-scale', 'builderReferenceScale']]) {
        const select = document.getElementById(id);
        for (const [type, scale] of Object.entries(Theory.SCALES).filter(([, scale]) => scale.intervals.length === 7)) {
            const option = document.createElement('option');
            option.value = type; option.textContent = scale.name; select.appendChild(option);
        }
        select.value = state[field] || '';
        select.addEventListener('change', () => {
            state[field] = select.value || null;
            if (field === 'chordReferenceScale') {
                const item = state.chordList[state.selectedChordIndex];
                if (item) { item.referenceScale = state[field]; item.progressionDegree = null; saveChordList(); }
            }
            refresh();
        });
    }
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
            item.progressionDegree = null;
            saveChordList();
        }
        refresh();
    });
    document.getElementById('chord-scale-degrees').addEventListener('change', event => {
        state.chordScaleDegrees = event.target.checked;
        refresh();
    });
    syncChordKey();
}
