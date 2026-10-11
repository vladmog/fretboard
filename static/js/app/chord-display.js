import { getChordScaleContext, drawChordScaleBackground } from './chord-scale-context.js';
import * as MusicTheory from '../core/music-theory.js';
import * as RotationToggle from './rotation-toggle.js';
import { state, getInstrumentTuning } from './state.js';
import { renderTriadControls } from './triad-shapes.js';
import { guide } from './harmony-guide.js';
import { inversionName } from '../core/chord-voicings.js';

export function renderChordFretboard(chord, refresh) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    const triad = renderTriadControls(chord, refresh);
    const positions = triad ? triad.positions : MusicTheory.getNotesOnFretboard(
        chord.noteToInterval,
        15,
        chord.root, getInstrumentTuning()
    );

    const context = getChordScaleContext(chord, state.chordReferenceKey, state.mode === 'chord' && state.chordScaleDegrees, state.chordReferenceScale);
    drawChordScaleBackground(state.fretboard, context, positions, getInstrumentTuning(), state.showNoteNames);
    const triadColors = triad && ['maj', 'min', 'dim'].includes(chord.type);
    for (const pos of positions) {
        const colors = MusicTheory.getIntervalColor(pos.label);
        const isRoot = pos.label === '1';
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: triadColors ? guide.triadColors[chord.intervals.indexOf(pos.label)] : (isRoot ? '#000' : colors.fill),
            borderColor: triadColors ? '#222' : colors.border,
            text: state.showNoteNames ? chord.noteSpelling[pos.noteIndex] || MusicTheory.getNoteName(pos.noteIndex, false) : (context?.noteToDegree[pos.noteIndex] ?? pos.label),
            textColor: triadColors ? '#000' : (isRoot ? '#fff' : colors.text)
        });
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    return {
        title: triad?.bass ? `${chord.symbol} · ${inversionName(chord, triad.inversion)}` : chord.symbol,
        notes: chord.notes,
        intervals: context ? Object.keys(chord.noteToInterval).map(Number).sort((a,b) =>
            (a - MusicTheory.getNoteIndex(chord.root) + 12) % 12 - (b - MusicTheory.getNoteIndex(chord.root) + 12) % 12
        ).map(note => context.noteToDegree[note]) : chord.intervals,
        noteToInterval: context?.noteToDegree ?? chord.noteToInterval
    };
}
