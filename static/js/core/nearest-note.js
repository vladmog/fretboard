import { instrumentConfig, pitches } from './voice-leading.js';
export function notePositions(instrument, frets = 15) {
    const {bases} = instrumentConfig(instrument);
    return bases.flatMap((base, i) => Array.from({length: frets + 1}, (_, fret) => ({string: bases.length - i, fret, midi: base + fret})));
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
