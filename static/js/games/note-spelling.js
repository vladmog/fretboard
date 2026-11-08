import * as Theory from '../core/music-theory.js';

// Only reject spelling when the pitch itself is the expected answer.
export function needsSpellingRetry(state, pitch, spelling) {
    if (!spelling) return false;
    let expected;
    if (state.activeMode === 'chord-builder') {
        expected = Theory.buildChord(state.currentRoot, state.currentChordType).notes[state.currentDegreeIndex];
    } else if (state.activeMode === 'scale-builder') {
        expected = Theory.buildScale(state.currentRoot, state.currentScaleType).notes[state.currentDegreeIndex];
    }
    return !!expected && Theory.getNoteIndex(expected) === pitch && spelling !== expected;
}
