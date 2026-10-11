/** Full chord grips and shell grips, sharing the established triad patterns. */
import * as Theory from './music-theory.js';
import { getTriadShapes, getThreeNotePatterns } from './triads.js';
import { getShellIntervals } from './shell-voicings.js';

export function inversionName(chord, inversion) {
    if (inversion === 0) return 'Root position';
    const ordinal = ['Root', 'First', 'Second', 'Third', 'Fourth', 'Fifth'][inversion];
    return `${ordinal} inversion`;
}
export function getVoicingIntervals(chord, voicing = 'full') {
    return voicing === 'shell' ? getShellIntervals(chord.type) : chord.intervals;
}
export function getChordVoicings(chord, tuning = Theory.STANDARD_TUNING, midiBases, preferences = {}) {
    const { voicing = 'full', stringCount = 3 } = preferences;
    if (voicing === 'full' && ['maj','min','dim'].includes(chord.type)) {
        return getTriadShapes(chord, tuning, midiBases, 15, stringCount);
    }
    const intervals = getVoicingIntervals(chord, voicing);
    if (!intervals.length || intervals.length > tuning.length) return [];
    let twoStringShapes = [];
    if (voicing === 'shell' && (stringCount === 2 || stringCount === 'both')) {
        const shell = { ...chord, noteToInterval: Object.fromEntries(Object.entries(chord.noteToInterval).filter(([,label]) => intervals.includes(label))) };
        twoStringShapes = getThreeNotePatterns(shell, tuning, midiBases, 15, 2, false);
        if (stringCount === 2) return twoStringShapes;
    }
    const choices = tuning.map((_, index) => {
        const positions = [];
        for (let fret = 0; fret <= 15; fret++) {
            const noteIndex = Theory.getNoteAt(index, fret, tuning);
            const label = chord.noteToInterval[noteIndex];
            if (intervals.includes(label)) positions.push({ string: tuning.length-index, fret, noteIndex, label, midi: (Theory.getOctaveAt(index, fret, midiBases)+1)*12+noteIndex });
        }
        return positions;
    });
    const shapes = [...twoStringShapes];
    function visit(start, positions, used, low, high) {
        if (positions.length === intervals.length) {
            const bass=positions.reduce((p,q)=>p.midi<=q.midi?p:q);
            shapes.push({positions,low,high,bass,inversion:chord.intervals.indexOf(bass.label),strings:positions.map(p=>p.string).join('-')});
            return;
        }
        for(let string=start;string<=tuning.length-(intervals.length-positions.length);string++) {
            for(const p of choices[string]) {
                if(used.has(p.label)) continue;
                const nextLow=Math.min(low,p.fret), nextHigh=Math.max(high,p.fret);
                if(nextHigh-nextLow>3) continue;
                visit(string+1,[...positions,p],new Set([...used,p.label]),nextLow,nextHigh);
            }
        }
    }
    visit(0,[],new Set(),Infinity,-Infinity);
    return shapes.sort((a,b)=>a.low-b.low || a.high-b.high || b.positions[0].string-a.positions[0].string);
}

/** Mixed lists retain valid requested filters and explain per-chord fallbacks. */
export function getComparisonVoicings(chord, tuning, midiBases, preferences) {
    const notices=[];
    let voicing=preferences.voicing ?? 'full';
    if(voicing==='shell' && !getShellIntervals(chord.type).length) {
        voicing='full'; notices.push('No shell for this chord; full chord shown');
    }
    const all=getChordVoicings(chord,tuning,midiBases,{...preferences,voicing});
    let inversion=preferences.inversion;
    const tones=getVoicingIntervals(chord,voicing);
    if(inversion!=='all' && !tones.includes(chord.intervals[Number(inversion)])) {
        inversion='all'; notices.push('Requested inversion unavailable; all inversions shown');
    }
    let stringSet=preferences.stringSet;
    if(stringSet!=='all' && !all.some(s=>s.strings===stringSet)) {
        stringSet='all'; notices.push('Requested string group unavailable; all groups shown');
    }
    return {shapes:all.filter(s=>(stringSet==='all'||s.strings===stringSet)&&(inversion==='all'||s.inversion===Number(inversion))),notice:notices.join(' · ')};
}
