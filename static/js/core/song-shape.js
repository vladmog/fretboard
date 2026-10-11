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
/** Resolve saved metadata to the explorer's filters and exact shape index. */
export function shapePreferences(entry, instrument) {
    const shape = songShape(entry, instrument);
    if (!shape) return null;
    const chord = Theory.buildChord(entry.root, entry.type);
    const voicing = entry.filters?.voicing || (shape.positions.length < chord.intervals.length ? 'shell' : 'full');
    const stringCount = entry.filters?.stringCount || new Set(shape.positions.map(p=>p.string)).size;
    const all = getChordVoicings(chord, instrument === 'bass' ? Theory.BASS_TUNING : Theory.STANDARD_TUNING,
        instrument === 'bass' ? Theory.BASS_STRING_MIDI_BASES : undefined, {voicing,stringCount:stringCount==='both'?'both':Number(stringCount)});
    const filtered = all.filter(s=>s.strings===shape.strings && s.inversion===shape.inversion);
    const signature = s=>s.positions.map(p=>`${p.string}:${p.fret}`).sort().join('|');
    return {enabled:true,voicing,stringCount:stringCount==='both'?'both':Number(stringCount),stringSet:shape.strings,inversion:String(shape.inversion),index:Math.max(0,filtered.findIndex(s=>signature(s)===signature(shape)))};
}
