import * as Theory from './music-theory.js';
import { getChordVoicings } from './chord-voicings.js';
/** Revoice on the current instrument, keeping inversion and fret region where possible. */
export function songShape(entry, instrument) {
    const saved = entry.savedShape;
    if (!saved) return null;
    if (saved.variants) return saved.variants[instrument] || null;
    if (saved.instrument === instrument) return saved;
    const chord = Theory.buildChord(entry.root, entry.type);
    const count = new Set(saved.positions.map(p => p.string)).size;
    const voicing = entry.filters?.voicing || (saved.positions.length < chord.intervals.length ? 'shell' : 'full');
    const shapes = getChordVoicings(chord, instrument === 'bass' ? Theory.BASS_TUNING : Theory.STANDARD_TUNING,
        instrument === 'bass' ? Theory.BASS_STRING_MIDI_BASES : undefined, {voicing, stringCount: count === 2 ? 2 : 3});
    const matches = shapes.filter(s => s.inversion === saved.inversion);
    matches.sort((a,b) => Math.abs(a.low-saved.low)-Math.abs(b.low-saved.low));
    return matches[0] ? {...matches[0], instrument} : null;
}
export function portableSong(song, savedWithInstrument) {
    const result = structuredClone(song);
    if (savedWithInstrument) result.savedWithInstrument = savedWithInstrument;
    for (const section of result.sections) for (const entry of section.chords) {
        if (entry.savedShape && !entry.savedShape.variants) {
            const variants = {};
            for (const instrument of ['guitar','bass']) {
                const shape = songShape(entry, instrument);
                if (shape) { const {instrument: ignored, ...positions} = shape; variants[instrument] = positions; }
            }
            entry.savedShape = {variants};
        }
        delete entry.instrument;
    }
    return result;
}
