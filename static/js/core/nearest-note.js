import { instrumentConfig, pitches } from './voice-leading.js';
export function notePositions(instrument, frets = 15) {
    const {bases} = instrumentConfig(instrument);
    return bases.flatMap((base, i) => Array.from({length: frets + 1}, (_, fret) => ({string: bases.length - i, fret, midi: base + fret})));
}
export function boxNotes(instrument, firstFret, targetPitch) {
    return notePositions(instrument).filter(p => p.fret >= firstFret && p.fret < firstFret + 4 && (targetPitch === undefined || p.midi % 12 === targetPitch));
}
export function checkBoxNote(answer, targetPitch, instrument, firstFret) {
    const pitch = pitches([answer], instrument)[0];
    const inside = answer.fret >= firstFret && answer.fret < firstFret + 4;
    const matches = pitch % 12 === targetPitch;
    return {inside, matches, correct: inside && matches};
}

export function closestNotes(start, targetPitch, instrument, frets = 15) {
    const origin = pitches([start], instrument)[0];
    const candidates = notePositions(instrument, frets).filter(p => p.midi % 12 === targetPitch);
    const distance = Math.min(...candidates.map(p => Math.abs(p.midi - origin)));
    return {distance, positions: candidates.filter(p => Math.abs(p.midi - origin) === distance)};
}
export function checkNearest(start, answer, targetPitch, instrument) {
    const origin = pitches([start], instrument)[0], pitch = pitches([answer], instrument)[0];
    const best = closestNotes(start, targetPitch, instrument).distance;
    const distance = Math.abs(pitch - origin);
    return {correct: pitch % 12 === targetPitch && distance === best, matches: pitch % 12 === targetPitch, distance, best};
}

export function stringNotes(instrument, string, targetPitch) {
    return notePositions(instrument).filter(p => p.string === string && (targetPitch === undefined || p.midi % 12 === targetPitch));
}
export function checkStringNote(answer, targetPitch, instrument, string) {
    const matches = pitches([answer], instrument)[0] % 12 === targetPitch;
    const inside = answer.string === string;
    return {inside, matches, correct: inside && matches};
}
