/** Pitch-based practice scoring. Fingering never changes the motion score. */
import * as Theory from './music-theory.js';
import { getChordVoicings, getVoicingIntervals } from './chord-voicings.js';
export const SMOOTH_TOLERANCE = 2;
export function instrumentConfig(instrument) {
    return instrument === 'bass'
        ? {tuning:Theory.BASS_TUNING, bases:Theory.BASS_STRING_MIDI_BASES}
        : {tuning:Theory.STANDARD_TUNING, bases:[40,45,50,55,59,64]};
}
export function pitches(positions, instrument) {
    const {bases}=instrumentConfig(instrument);
    return positions.map(p=>bases[bases.length-p.string]+p.fret).sort((a,b)=>a-b);
}
/** Ordered minimum-cost voice matching; entering/leaving voices cost 12 each. */
export function voiceMotion(from, to) {
    const a=[...from].sort((x,y)=>x-y), b=[...to].sort((x,y)=>x-y);
    if(a.length===b.length)return a.reduce((total,n,i)=>total+Math.abs(n-b[i]),0);
    const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++)dp[i][0]=i*12;
    for(let j=0;j<=b.length;j++)dp[0][j]=j*12;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)
        dp[i][j]=Math.min(dp[i-1][j-1]+Math.abs(a[i-1]-b[j-1]),dp[i-1][j]+12,dp[i][j-1]+12);
    return dp[a.length][b.length];
}
export function exerciseChord(entry, instrument, preferShell=false) {
    const chord=Theory.buildChord(entry.root,entry.type), {tuning,bases}=instrumentConfig(instrument);
    const modes=preferShell?['shell','full']:['full','shell'];
    for(const voicing of modes){
        const shapes=getChordVoicings(chord,tuning,bases,{voicing,stringCount:'both'});
        if(shapes.length)return {...entry,chord,voicing,intervals:getVoicingIntervals(chord,voicing),shapes};
    }
    return {...entry,chord,shapes:[],intervals:[],voicing:'full'};
}
export function nearestShapes(current, exercise, instrument, {requireChange=false} = {}) {
    const from=pitches(current,instrument);
    return exercise.shapes.filter(shape=>!requireChange || pitches(shape.positions,instrument).join(',')!==from.join(','))
        .map(shape=>({shape,cost:voiceMotion(from,pitches(shape.positions,instrument))}))
        .sort((a,b)=>a.cost-b.cost || a.shape.low-b.shape.low);
}
export function checkAnswer(current, selected, exercise, instrument, options = {}) {
    const {tuning}=instrumentConfig(instrument);
    if(selected.some(p=>!Number.isInteger(p.string)||p.string<1||p.string>tuning.length||!Number.isInteger(p.fret)||p.fret<0||p.fret>15))return {valid:false,message:'Choose positions on the fretboard.'};
    const labels=selected.map(p=>exercise.chord.noteToInterval[Theory.getNoteAt(tuning.length-p.string,p.fret,tuning)]);
    if(selected.length!==exercise.intervals.length || new Set(labels).size!==exercise.intervals.length || labels.some(l=>!exercise.intervals.includes(l)))
        return {valid:false,message:`Use each required chord tone once: ${exercise.intervals.join(', ')}.`};
    const frets=selected.map(p=>p.fret);
    if(Math.max(...frets)-Math.min(...frets)>3)return {valid:false,message:'Keep the shape within four fret positions.'};
    const a=pitches(current,instrument),b=pitches(selected,instrument);
    if(options.requireChange && a.join(',')===b.join(','))return {valid:false,message:'Choose a different inversion or register for this repeated chord. The same pitches in another fingering still count as unchanged.'};
    const cost=voiceMotion(a,b),suggestions=nearestShapes(current,exercise,instrument,options);
    // A valid user voicing can improve on the generator's suggested shapes.
    const best=Math.min(cost,suggestions[0]?.cost??cost);
    const common=b.filter(n=>a.includes(n)).length;
    return {valid:true,cost,best,common,smooth:cost<=best+SMOOTH_TOLERANCE,
        message:`${cost<=best+SMOOTH_TOLERANCE?'Smooth transition!':'Correct chord—try smaller moves.'} ${a.length===b.length?`Your notes moved ${cost} semitone${cost===1?'':'s'} in total.`:`Movement score: ${cost}, including 12 points for each added or removed voice.`} ${cost<=(suggestions[0]?.cost??cost)?'You matched or improved on the smoothest suggestion.':`The smoothest suggestion ${a.length===b.length?'moves':'scores'} ${suggestions[0]?.cost??cost}${a.length===b.length?' semitones in total':' points'}.`} ${common} note${common===1?' stayed':'s stayed'} unchanged.`};
}

/** Rotate lap seeds by sounding voicing, not merely alternative fingerings. */
export function chooseLapStart(shapes, instrument, used = new Set(), previous = []) {
    if (!shapes.length) return null;
    const signature = shape => pitches(shape.positions, instrument).join(',');
    const distinct = [...new Map(shapes.map(shape => [signature(shape), shape])).values()];
    let history = new Set(used);
    let available = distinct.filter(shape => !history.has(signature(shape)));
    const exhausted = available.length === 0;
    if (exhausted) { history = new Set(); available = distinct; }
    const previousPitches = pitches(previous, instrument);
    const previousKey = previousPitches.join(',');
    // Avoid repeating the just-played first chord even at the cycle boundary.
    const different = available.filter(shape => signature(shape) !== previousKey);
    if (different.length) available = different;
    const previousBass = previousPitches[0] % 12;
    const previousLow = previous.length ? Math.min(...previous.map(p => p.fret)) : 4;
    available.sort((a,b) => {
        const sameBassA = pitches(a.positions,instrument)[0] % 12 === previousBass;
        const sameBassB = pitches(b.positions,instrument)[0] % 12 === previousBass;
        return Number(sameBassA)-Number(sameBassB) || Math.abs(a.low-previousLow)-Math.abs(b.low-previousLow) || a.low-b.low;
    });
    const shape=available[0];history.add(signature(shape));
    return {shape,used:history,exhausted,changed:signature(shape)!==previousKey,uniqueCount:distinct.length};
}
