/** Three-note patterns on two or three adjacent strings, derived from chord tones. */
import * as MusicTheory from './music-theory.js';

export function getTriadShapes(chord, tuning = MusicTheory.STANDARD_TUNING, midiBases, maxFret = 15, stringCount = 3) {
    if (!['maj', 'min', 'dim'].includes(chord.type)) return [];
    return getThreeNotePatterns(chord, tuning, midiBases, maxFret, stringCount);
}

export function getThreeNotePatterns(chord, tuning = MusicTheory.STANDARD_TUNING, midiBases, maxFret = 15, stringCount = 3, adjacentOnly = true) {
    if (stringCount === 'both') {
        return [...getThreeNotePatterns(chord, tuning, midiBases, maxFret, 2, adjacentOnly),
            ...getThreeNotePatterns(chord, tuning, midiBases, maxFret, 3, adjacentOnly)].sort(compareShapes);
    }
    if (new Set(Object.values(chord.noteToInterval)).size !== 3 || ![2, 3].includes(stringCount)) return [];
    const shapes = [];
    const add = positions => {
        if (new Set(positions.map(p => p.noteIndex)).size !== 3) return;
        const low = Math.min(...positions.map(p => p.fret));
        const high = Math.max(...positions.map(p => p.fret));
        if (high - low > 3) return;
        const bass = positions.reduce((x, y) => x.midi < y.midi ? x : y);
        shapes.push({
            positions, low, high,
            strings: [...new Set(positions.map(p => p.string))].sort((a,b) => b-a).join('-'),
            inversion: chord.intervals.indexOf(bass.label), bass
        });
    };
    const groups = [];
    for (let first = 0; first <= tuning.length - stringCount; first++) {
        if (stringCount === 2 && !adjacentOnly) {
            for (let second = first + 1; second < tuning.length; second++) groups.push([first, second]);
        } else {
            groups.push(Array.from({length: stringCount}, (_, offset) => first + offset));
        }
    }
    for (const group of groups) {
        const choices = group.map(index => {
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
        if (stringCount === 3) {
            for (const a of choices[0]) for (const b of choices[1]) for (const c of choices[2]) add([a,b,c]);
        } else {
            // Either string may carry the two notes. Ordered pairs prevent duplicates.
            for (const double of [0, 1]) {
                const notes = choices[double];
                for (let a = 0; a < notes.length; a++) for (let b = a + 1; b < notes.length; b++) {
                    for (const single of choices[1 - double]) {
                        add([notes[a], notes[b], single].sort((x,y) => y.string-x.string || x.fret-y.fret));
                    }
                }
            }
        }
    }
    return shapes.sort(compareShapes);
}

function compareShapes(a, b) {
    return a.low - b.low || a.high - b.high || b.positions[0].string - a.positions[0].string;
}
