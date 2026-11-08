import * as Theory from './music-theory.js';
import { exerciseChord } from './voice-leading.js';
// Native module loading works in Flask, GitHub Pages, and Node tests.
const url = new URL('../../data/generated-harmony.json', import.meta.url);
const config = url.protocol === 'file:'
    ? JSON.parse(await (await import('node:fs/promises')).readFile(url, 'utf8'))
    : await (await fetch(url)).json();
export const DEFAULT_GENERATED_TYPES = config.defaultTypes;
const pc = chord => Theory.getNoteIndex(chord.root);
const tones = chord => Theory.CHORD_TYPES[chord.type].intervals;
const minor = chord => tones(chord).includes('b3');
const dominant = chord => tones(chord).includes('3') && tones(chord).includes('b7');
const diminished = chord => tones(chord).includes('b5');

/** Musical preferences, not a fixed loop: ii–V motion, dominant resolution,
 * diminished approaches, relative minors, and common-tone connections. */
export function transitionWeight(from, to, history = []) {
    if (from.root === to.root && from.type === to.type) return 0;
    const w = config.weights, movement = (pc(to) - pc(from) + 12) % 12;
    let weight = w.base;
    if (movement === 5) weight += w.fifth;
    if (minor(from) && dominant(to) && movement === 5) weight += w.iiV;
    if (dominant(from) && movement === 5 && !dominant(to)) weight += w.dominantResolve;
    if (dominant(from) && movement === 11 && !dominant(to)) weight += w.tritoneResolve;
    if (diminished(from) && movement === 1) weight += w.diminishedResolve;
    if (!minor(from) && !dominant(from) && minor(to) && movement === 2) weight += w.tonicToII;
    if (!minor(from) && minor(to) && movement === 9) weight += w.relativeMinor;
    const a = Theory.buildChord(from.root, from.type).noteToInterval;
    const b = Theory.buildChord(to.root, to.type).noteToInterval;
    weight += Object.keys(a).filter(note => note in b).length * w.commonTone;
    if (history.includes(`${to.root}:${to.type}`)) weight *= w.recentPenalty;
    return weight;
}

/** Precompute playable candidates once. Keep only a bounded recent history. */
export function createHarmonyGenerator({key='C',types=DEFAULT_GENERATED_TYPES,instrument='guitar',shell=false,random=Math.random}={}) {
    const allowed = [...new Set(types)].filter(type => Theory.CHORD_TYPES[type]);
    if (!allowed.length) throw new Error('Choose at least one chord type.');
    const tonic = Theory.getNoteIndex(key);
    const candidates=[];
    for (let rootIndex=0; rootIndex<12; rootIndex++) for (const type of allowed) {
        const root=Theory.getNoteName(rootIndex, true), definition=Theory.CHORD_TYPES[type];
        let numeral=config.degrees[(rootIndex-tonic+12)%12];
        if (definition.intervals.includes('b3')) numeral=numeral.toLowerCase();
        const chord=exerciseChord({root,type,symbol:root+definition.symbol,numeral},instrument,shell);
        if(chord.shapes.length)candidates.push(chord);
    }
    if(candidates.length<2) throw new Error('These chord types need more playable shapes. Choose another type.');
    const recent=[];
    function remember(chord){recent.push(`${chord.root}:${chord.type}`);if(recent.length>4)recent.shift();return chord;}
    return {
        start(){return remember(candidates.find(c=>pc(c)===tonic)||candidates[0]);},
        next(from){
            const weighted=candidates.map(chord=>({chord,weight:transitionWeight(from,chord,recent)}));
            let pick=random()*weighted.reduce((sum,c)=>sum+c.weight,0);
            for(const candidate of weighted){pick-=candidate.weight;if(pick<0)return remember(candidate.chord);}
            return remember(weighted.find(c=>c.weight>0).chord);
        }
    };
}
