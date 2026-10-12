import { createFretboard } from '../core/fretboard.js';
import { instrumentConfig } from '../core/voice-leading.js';
import { notePositions, closestNotes, checkNearest } from '../core/nearest-note.js';
import { CHROMATIC_NOTES } from '../core/music-theory.js';
import { voicingNotes } from '../core/voicing-audio.js';
import * as Sound from '../core/sound.js';
import { gameState } from './session.js';
let instrument='guitar', board, observer, start, target, answer, status, next, active=false, count=0, last='';
const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
function play(position){if(gameState.soundEnabled)Sound.playChord(voicingNotes({positions:[position]},instrument));}
function cleanup(){active=false;observer?.disconnect();observer=null;board=null;}
function paint(){
    if(!board)return;board.clearMarkers();
    board.setMarker(start.string,start.fret,{text:CHROMATIC_NOTES[start.midi%12],color:'#ddd',borderColor:'#666',textColor:'#111'});
    if(answer)board.setMarker(answer.string,answer.fret,{text:CHROMATIC_NOTES[notePositions(instrument).find(p=>p.string===answer.string&&p.fret===answer.fret).midi%12],color:'#fff',borderColor:'#111',textColor:'#111'});
}
function round(){
    cleanup();active=true;answer=null;
    const positions=notePositions(instrument);
    // Exclude the same pitch class and avoid an immediate repeated question.
    let key;
    do {start=positions[Math.floor(Math.random()*positions.length)];target=(start.midi%12+1+Math.floor(Math.random()*11))%12;key=`${start.string}:${start.fret}:${target}`;} while(key===last);
    last=key;
    const root=el('div','','voice-leading voice-leading-round');
    document.getElementById('game-content').replaceChildren(root);
    root.append(el('h2','Nearest note'),el('p',`Start: ${voicingNotes({positions:[start]},instrument)[0]} · Find ${CHROMATIC_NOTES[target]}`),el('p','Tap the target note with the smallest pitch distance, up or down. Gray marks the start.'));
    const actions=el('div','','voice-leading-actions');actions.append(button('Hear start',()=>play(start)),button('Hear answer',()=>{if(answer)play(answer);}));root.append(actions);
    const host=el('div','','voice-leading-board');host.setAttribute('aria-label','Choose the nearest target note');root.append(host);
    status=el('p',`${count} solved`,'voice-leading-feedback');status.setAttribute('role','status');root.append(status);
    const controls=el('div','','voice-leading-actions');
    controls.append(button('Check',()=>{
        if(!answer){status.textContent='Tap a fret position first.';return;}
        const r=checkNearest(start,answer,target,instrument);
        status.textContent=r.correct?`Correct — ${r.distance} semitone${r.distance===1?'':'s'} away. Every equally close position counts.`:r.matches?`Right note, but ${r.distance} semitones away. A closer octave is ${r.best} away. Try again.`:`That is not ${CHROMATIC_NOTES[target]}. Try another position.`;
        next.disabled=!r.correct;
    }));
    next=button('Next note',()=>{count++;round();});next.disabled=true;
    controls.append(next,button('Show nearest',()=>{const best=closestNotes(start,target,instrument);board.clearMarkers();board.setMarker(start.string,start.fret,{text:CHROMATIC_NOTES[start.midi%12],color:'#ddd',borderColor:'#666'});for(const p of best.positions)board.setMarker(p.string,p.fret,{text:CHROMATIC_NOTES[target],color:'#fff',borderColor:'#111'});answer=null;next.disabled=true;status.textContent=`All closest answers: ${best.distance} semitones away. Tap one to try it.`;}));root.append(controls);
    root.append(el('p','Distance is measured in semitones, not fretboard space. The same sounding pitch on different strings is equally correct.'));
    function draw(){host.replaceChildren();const mobile=matchMedia('(max-width:768px) and (orientation:portrait)').matches;board=createFretboard(host,{tuning:instrumentConfig(instrument).tuning,frets:15,vertical:host.clientWidth<600,...(mobile?{}:{fretSpacing:37,stringSpacing:40})});board.onFretClick((string,fret)=>{answer={string,fret};next.disabled=true;status.textContent='Press Check to test your answer.';paint();play(answer);});paint();}
    draw();let width=host.clientWidth;observer=new ResizeObserver(()=>{if(width!==host.clientWidth){width=host.clientWidth;draw();}});observer.observe(host);
}
function renderTitlePage(){cleanup();const root=el('div','','voice-leading');root.append(el('h2','Nearest note'),el('p','Find the closest pitch of a target note from a shown starting position. Any tied position counts. Uses your Guitar/Bass setting.'),button('Start practice',()=>{count=0;round();}));document.getElementById('game-content').replaceChildren(root);}
export default {configure(value){instrument=value.instrument||'guitar';},renderTitlePage,cleanup,renderSettings(body){body.replaceChildren(el('p','Uses the app’s Guitar/Bass setting and frets 0–15. Answers are scored by exact pitch distance.'));},advance(){if(active&&!next.disabled){count++;round();}},repeatQuestion(){if(active)play(start);}};
