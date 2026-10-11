import * as MusicTheory from '../core/music-theory.js';
import * as RotationToggle from './rotation-toggle.js';
import { state, getInstrumentTuning } from './state.js';
import { renderTriadControls } from './triad-shapes.js';
import { guide } from './harmony-guide.js';

export function renderChordFretboard(chord, refresh) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    const triad = renderTriadControls(chord, refresh);
    const positions = triad ? triad.positions : MusicTheory.getNotesOnFretboard(
        chord.noteToInterval,
        15,
        chord.root, getInstrumentTuning()
    );

    for (const pos of positions) {
        const colors = MusicTheory.getIntervalColor(pos.label);
        const isRoot = pos.label === '1';
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: triad ? guide.triadColors[chord.intervals.indexOf(pos.label)] : (isRoot ? '#000' : colors.fill),
            borderColor: triad ? '#222' : colors.border,
            text: state.showNoteNames ? chord.noteSpelling[pos.noteIndex] || MusicTheory.getNoteName(pos.noteIndex, false) : pos.label,
            textColor: triad ? '#000' : (isRoot ? '#fff' : colors.text)
        });
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    return {
        title: triad?.bass ? `${chord.symbol} · ${guide.inversions[triad.inversion]}` : chord.symbol,
        notes: chord.notes,
        intervals: chord.intervals,
        noteToInterval: chord.noteToInterval
    };
}
