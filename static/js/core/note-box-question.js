import {getNoteName,spellNoteForDegree} from './music-theory.js';
const url=new URL('../../data/note-box-modes.json',import.meta.url);
const data=url.protocol==='file:'?JSON.parse(await (await import('node:fs/promises')).readFile(url,'utf8')):await (await fetch(url)).json();
export const BOX_MODES=data.modes;
export const BOX_INTERVALS=data.intervals;
export function sanitizeBoxMode(settings){
    if(!BOX_MODES.some(m=>m.id===settings.mode))settings.mode='note';
    const valid=Array.isArray(settings.intervals)?[...new Set(settings.intervals)].filter(n=>BOX_INTERVALS.some(i=>i.semitones===n)):[];
    settings.intervals=valid.length?valid:BOX_INTERVALS.map(i=>i.semitones);
}
/** Choose the answer position first; derive a question that resolves to it.
 * Interval questions ask for pitch class, just like the chromatic-circle game. */
export function makeBoxQuestion(target,mode='note',intervals=BOX_INTERVALS.map(i=>i.semitones),random=Math.random,availablePitches=null){
    const settings={mode,intervals};sanitizeBoxMode(settings);mode=settings.mode;
    if(mode==='note')return {mode,target};
    const candidates=[];
    for(const interval of settings.intervals){
        const root=mode==='interval-to-root'?target:(target-interval+12)%12;
        if(mode==='root-to-interval')candidates.push({mode,target,root,given:root,interval});
        else {
            const other=settings.intervals.filter(n=>n!==interval);
            const givenIntervals=mode==='interval-to-root'?[interval]:other.length?other:BOX_INTERVALS.map(i=>i.semitones).filter(n=>n!==interval);
            for(const givenInterval of givenIntervals)candidates.push({mode,target,root,given:(root+givenInterval)%12,interval,givenInterval});
        }
    }
    const valid=availablePitches?candidates.filter(q=>availablePitches.includes(q.given)):candidates;
    return valid.length?valid[Math.floor(random()*valid.length)]:null;
}
export function boxQuestionText(question,noteName){
    const name=n=>BOX_INTERVALS.find(i=>i.semitones===n).name;
    if(question.mode==='note')return {instruction:'Find',target:noteName(question.target),context:''};
    if(question.mode==='root-to-interval')return {instruction:'Find',target:name(question.interval),context:`from ${noteName(question.given)}`};
    return {instruction:'Find',target:question.mode==='interval-to-root'?'the root':name(question.interval),context:`${noteName(question.given)} is the ${name(question.givenInterval)}`};
}

/** Spell each question note by its diatonic relationship to the root.
 * The generic tritone uses diminished-fifth spelling, matching the palette's b5. */
export function boxNoteName(question,pitch,useFlats=false){
    if(!question||question.mode==='note')return getNoteName(pitch,useFlats);
    const rootName=getNoteName(question.root,useFlats);
    if(pitch===question.root)return rootName;
    const interval=pitch===question.target?question.interval:pitch===question.given?question.givenInterval:undefined;
    if(interval===undefined)return getNoteName(pitch,useFlats);
    const degree=[1,2,2,3,3,4,5,5,6,6,7,7][interval];
    const letters='CDEFGAB';
    return spellNoteForDegree(pitch,letters[(letters.indexOf(rootName[0])+degree-1)%7]);
}
