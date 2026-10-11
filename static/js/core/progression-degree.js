/** Preserve progression spelling while matching numeral case to chord quality. */
import * as Theory from './music-theory.js';
export function formatProgressionDegree(numeral, type) {
    if (!numeral) return null;
    const minor = Theory.CHORD_TYPES[type]?.intervals.includes('b3');
    return numeral.replace(/^([♭♯b#]?)([ivIV]+)/, (_, accidental, degree) =>
        accidental + (minor ? degree.toLowerCase() : degree.toUpperCase()));
}
