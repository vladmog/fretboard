import { songShape } from '../core/song-shape.js';
import { getMarkerColor } from './marker-colors.js';
import { getChordScaleContext, drawChordScaleBackground } from './chord-scale-context.js';
import * as MusicTheory from '../core/music-theory.js';
import * as RotationToggle from './rotation-toggle.js';
import { state, getInstrumentTuning } from './state.js';
import { renderTriadControls } from './triad-shapes.js';
import { inversionName } from '../core/chord-voicings.js';

export function renderChordFretboard(chord, refresh) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    const saved = ['song', 'creator'].includes(state.mode) ? state.songPreview?.savedShape : null;
    const triad = saved ? (songShape(state.songPreview,state.instrument) || { positions: [] }) : renderTriadControls(chord, refresh);
    const positions = triad ? triad.positions : MusicTheory.getNotesOnFretboard(
        chord.noteToInterval,
        15,
        chord.root, getInstrumentTuning()
    );

    const context = getChordScaleContext(chord, state.chordReferenceKey, state.mode === 'chord' && state.chordScaleDegrees, state.chordReferenceScale);
    drawChordScaleBackground(state.fretboard, context, positions, getInstrumentTuning(), state.showNoteNames);
    for (const pos of positions) {
        const colors = getMarkerColor(pos.label);
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: colors.fill,
            borderColor: colors.border,
            text: state.showNoteNames ? chord.noteSpelling[pos.noteIndex] || MusicTheory.getNoteName(pos.noteIndex, false) : (context?.noteToDegree[pos.noteIndex] ?? pos.label),
            textColor: colors.text
        });
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    return {
        title: saved && !triad?.positions.length ? `No matching ${state.instrument} shape for this inversion` : triad?.bass ? `${chord.symbol} · ${inversionName(chord, triad.inversion)}` : chord.symbol,
        notes: chord.notes,
        intervals: context ? Object.keys(chord.noteToInterval).map(Number).sort((a,b) =>
            (a - MusicTheory.getNoteIndex(chord.root) + 12) % 12 - (b - MusicTheory.getNoteIndex(chord.root) + 12) % 12
        ).map(note => context.noteToDegree[note]) : chord.intervals,
        noteToInterval: context?.noteToDegree ?? chord.noteToInterval
    };
}
