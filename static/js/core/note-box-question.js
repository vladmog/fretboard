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
export function makeBoxQuestion(target,mode='note',intervals=BOX_INTERVALS.map(i=>i.semitones),random=Math.random){
    const settings={mode,intervals};sanitizeBoxMode(settings);mode=settings.mode;
    if(mode==='note')return {mode,target};
    const choose=values=>values[Math.floor(random()*values.length)];
    const interval=choose(settings.intervals);
    const root=mode==='interval-to-root'?target:(target-interval+12)%12;
    if(mode==='root-to-interval')return {mode,target,root,given:root,interval};
    const other=settings.intervals.filter(n=>n!==interval);
    // A single enabled interval still supports this mode using a different given interval.
    const givenInterval=mode==='interval-to-root'?interval:choose(other.length?other:BOX_INTERVALS.map(i=>i.semitones).filter(n=>n!==interval));
    return {mode,target,root,given:(root+givenInterval)%12,interval,givenInterval};
}
export function boxQuestionText(question,noteName){
    const name=n=>BOX_INTERVALS.find(i=>i.semitones===n).name;
    if(question.mode==='note')return {instruction:'Find',target:noteName(question.target),context:''};
    if(question.mode==='root-to-interval')return {instruction:'Find',target:name(question.interval),context:`from ${noteName(question.given)}`};
    return {instruction:'Find',target:question.mode==='interval-to-root'?'the root':name(question.interval),context:`${noteName(question.given)} is the ${name(question.givenInterval)}`};
}
