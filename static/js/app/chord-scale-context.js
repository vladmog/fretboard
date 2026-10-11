/** Scale labels and muted context, independent of chord marker colors. */
import * as Theory from '../core/music-theory.js';

export function getChordScaleContext(chord, referenceKey, enabled, referenceScale) {
    if (!enabled || !referenceKey || !Theory.SCALES[referenceScale]) return null;
    const scale = Theory.buildScale(referenceKey, referenceScale);
    const root = Theory.getNoteIndex(referenceKey);
    const noteToDegree = {};
    for (const note of Object.keys(chord.noteToInterval)) {
        const semitones = (Number(note) - root + 12) % 12;
        noteToDegree[note] = scale.noteToDegree[note] ?? Object.keys(Theory.INTERVALS)
            .find(interval => Theory.INTERVALS[interval] === semitones);
    }
    return { scale, noteToDegree };
}

export function drawChordScaleBackground(board, context, activePositions, tuning, showNoteNames) {
    if (!context) return;
    const active = new Set(activePositions.map(p => `${p.string}:${p.fret}`));
    for (const pos of Theory.getNotesOnFretboard(context.scale.noteToDegree, 15, context.scale.root, tuning)) {
        if (active.has(`${pos.string}:${pos.fret}`)) continue;
        board.setMarker(pos.string, pos.fret, {
            color: '#fff', borderColor: '#ccc', textColor: '#bbb',
            text: showNoteNames ? context.scale.noteSpelling[pos.noteIndex] : pos.label
        });
    }
}
