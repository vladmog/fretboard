import { SCALES, buildScale, getNoteIndex } from './music-theory.js';
export const TRIAD_SCALES = Object.keys(SCALES).filter(key => SCALES[key].intervals.length === 7);
export function scaleChordQuestions(roots, scales) {
    const questions = [];
    for (const scaleRoot of roots) for (const scaleType of scales) {
        if (!TRIAD_SCALES.includes(scaleType)) continue;
        const scale = buildScale(scaleRoot, scaleType);
        for (let degree = 0; degree < 7; degree++) {
            const notes = [0, 2, 4].map(offset => scale.notes[(degree + offset) % 7]);
            const pitches = notes.map(getNoteIndex);
            const steps = pitches.slice(1).map(pitch => (pitch - pitches[0] + 12) % 12).join(',');
            const chordType = { '4,7': 'maj', '3,7': 'min', '3,6': 'dim', '4,8': 'aug' }[steps];
            if (chordType) questions.push({ root: notes[0], chordType, scaleRoot, scaleType, degree: degree + 1, notes });
        }
    }
    return questions;
}

export function scaleChordDegree(question, roman = false) {
    if (!roman) return String(question.degree);
    const numeral = ['I','II','III','IV','V','VI','VII'][question.degree - 1];
    if (question.chordType === 'min') return numeral.toLowerCase();
    if (question.chordType === 'dim') return numeral.toLowerCase() + '°';
    return numeral + (question.chordType === 'aug' ? '+' : '');
}
