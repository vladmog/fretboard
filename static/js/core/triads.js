/** Three-note voicings on adjacent strings, derived from tuning and chord tones. */
import * as MusicTheory from './music-theory.js';

export function getTriadShapes(chord, tuning = MusicTheory.STANDARD_TUNING, midiBases, maxFret = 15) {
    if (!['maj', 'min', 'dim'].includes(chord.type)) return [];
    const shapes = [];
    for (let first = 0; first <= tuning.length - 3; first++) {
        const choices = [first, first + 1, first + 2].map(index => {
            const notes = [];
            for (let fret = 0; fret <= maxFret; fret++) {
                const noteIndex = MusicTheory.getNoteAt(index, fret, tuning);
                const label = chord.noteToInterval[noteIndex];
                if (label) notes.push({
                    string: tuning.length - index, fret, noteIndex, label,
                    midi: (MusicTheory.getOctaveAt(index, fret, midiBases) + 1) * 12 + noteIndex
                });
            }
            return notes;
        });
        for (const a of choices[0]) for (const b of choices[1]) for (const c of choices[2]) {
            const positions = [a, b, c];
            if (new Set(positions.map(p => p.noteIndex)).size !== 3) continue;
            const low = Math.min(...positions.map(p => p.fret));
            const high = Math.max(...positions.map(p => p.fret));
            if (high - low > 4) continue;
            const bass = positions.reduce((x, y) => x.midi < y.midi ? x : y);
            shapes.push({
                positions, low, high,
                strings: positions.map(p => p.string).join('-'),
                inversion: chord.intervals.indexOf(bass.label), bass
            });
        }
    }
    return shapes.sort((a, b) => a.low - b.low || a.high - b.high || b.positions[0].string - a.positions[0].string);
}
