// Chromatic-circle movement is measured in semitones: 30 degrees per step.
export const NATURAL_PITCHES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function angularDelta(from,to){return ((to-from+540)%360)-180;}
export function dragAccidental(degrees){return Math.max(-2,Math.min(2,Math.round(degrees/30)));}
export function spelledNatural(letter,accidental){return letter+(accidental<0?'b'.repeat(-accidental):'#'.repeat(accidental));}
export function sameSpelling(a,b){return a.replaceAll('♯','#').replaceAll('♭','b')===b.replaceAll('♯','#').replaceAll('♭','b');}
