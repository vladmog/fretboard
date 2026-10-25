import { instrumentConfig, pitches } from './voice-leading.js';
export function notePositions(instrument, frets = 15) {
    const {bases} = instrumentConfig(instrument);
    return bases.flatMap((base, i) => Array.from({length: frets + 1}, (_, fret) => ({string: bases.length - i, fret, midi: base + fret})));
}
export function boxNotes(instrument, firstFret, targetPitch, strings, lastFret = firstFret + 3) {
    return notePositions(instrument).filter(p => (!strings || strings.includes(p.string)) && p.fret >= firstFret && p.fret <= lastFret && (targetPitch === undefined || p.midi % 12 === targetPitch));
}
export function checkBoxNote(answer, targetPitch, instrument, firstFret, strings, lastFret = firstFret + 3) {
    const pitch = pitches([answer], instrument)[0];
    const inside = (!strings || strings.includes(answer.string)) && answer.fret >= firstFret && answer.fret <= lastFret;
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

/** Questions with exactly one occurrence of the target on the selected strings. */
export function uniqueBoxQuestions(instrument, strings, minFret=0, maxFret=15) {
    const span=Math.min(3,maxFret-minFret), questions=[];
    for(let first=minFret;first+span<=maxFret;first++){
        const last=first+span;
        const positions=boxNotes(instrument,first,undefined,strings,last);
        const counts=new Map();
        for(const p of positions)counts.set(p.midi%12,(counts.get(p.midi%12)||0)+1);
        for(const [target,count] of counts)if(count===1)questions.push({first,last,target});
    }
    return questions;
}
