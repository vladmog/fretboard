/** Preserve progression spelling while matching numeral case to chord quality. */
import * as Theory from './music-theory.js';
export function formatProgressionDegree(numeral, type) {
    if (!numeral) return null;
    const minor = Theory.CHORD_TYPES[type]?.intervals.includes('b3');
    return numeral.replace(/^([♭♯b#]?)([ivIV]+)/, (_, accidental, degree) =>
        accidental + (minor ? degree.toLowerCase() : degree.toUpperCase()));
}

export function degreeForChord(root, type, key, scaleType) {
    if (!key || !Theory.SCALES[scaleType]) return null;
    const scale = Theory.buildScale(key, scaleType);
    const note = Theory.getNoteIndex(root);
    const label = scale.noteToDegree[note];
    const romans = ['I','II','III','IV','V','VI','VII'];
    const match = label?.match(/^([b#]*)([1-7])$/);
    const chromatic = ['I','bII','II','bIII','III','IV','bV','V','bVI','VI','bVII','VII'];
    const base = match ? match[1] + romans[Number(match[2])-1] : chromatic[(note-Theory.getNoteIndex(key)+12)%12];
    const quality = Theory.CHORD_TYPES[type];
    const suffix = ({maj:'',min:'',dim:'°',dim7:'°7',m7b5:'ø7',aug:'+'})[type] ?? quality.symbol.replace(/^m(?!aj)/,'');
    return formatProgressionDegree(base,type) + suffix;
}
