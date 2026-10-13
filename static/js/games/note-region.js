import { showAnswerFeedback, clearAnswerFeedback } from './answer-feedback.js';
import { createFretboard } from '../core/fretboard.js';
import { instrumentConfig } from '../core/voice-leading.js';
import { notePositions, boxNotes, checkBoxNote, stringNotes, checkStringNote } from '../core/nearest-note.js';
import { CHROMATIC_NOTES } from '../core/music-theory.js';
import { voicingNotes } from '../core/voicing-audio.js';
import * as Sound from '../core/sound.js';
import { gameState } from './session.js';
export function createRegionGame(kind = 'box') {
const isString = kind === 'string';
const title = isString ? 'Note on a string' : 'Note in a box';
let chosenString;
let instrument='guitar', board, observer, firstFret, target, answer, status, next, active=false, count=0, last='';
const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
function play(position){if(gameState.soundEnabled)Sound.playChord(voicingNotes({positions:[position]},instrument));}
function cleanup(){active=false;observer?.disconnect();observer=null;board=null;}
function paint(){
    if(!board)return;board.clearMarkers();
    if (isString) board.highlightString(chosenString);
    else board.highlightFretRange(firstFret, firstFret + 3);
    if(answer)board.setMarker(answer.string,answer.fret,{text:CHROMATIC_NOTES[notePositions(instrument).find(p=>p.string===answer.string&&p.fret===answer.fret).midi%12],color:'#fff',borderColor:'#111',textColor:'#111'});
}
function round(){
    cleanup();active=true;answer=null;
    // Pick the target from notes actually present in the four-fret region.
    let key;
    do {
        firstFret = 1 + Math.floor(Math.random() * 12);
        chosenString = 1 + Math.floor(Math.random() * instrumentConfig(instrument).bases.length);
        const candidates = isString ? stringNotes(instrument, chosenString) : boxNotes(instrument, firstFret);
        target = candidates[Math.floor(Math.random() * candidates.length)].midi % 12;
        key = `${isString ? chosenString : firstFret}:${target}`;
    } while (key === last);
    last = key;
    const root=el('div','','voice-leading voice-leading-round');
    document.getElementById('game-content').replaceChildren(root);
    root.append(el('h2',title),el('p',`Find ${CHROMATIC_NOTES[target]} · ${isString ? `String ${chosenString} (${voicingNotes({positions:[{string:chosenString,fret:0}]},instrument)[0]})` : `Frets ${firstFret}–${firstFret+3}`}`),el('p',isString ? 'Find the target note on the highlighted string. String 1 is the highest-pitched open string.' : 'Tap any occurrence of the target note inside the shaded box.'));
    const actions=el('div','','voice-leading-actions');actions.append(button('Hear answer',()=>{if(answer)play(answer);}));root.append(actions);
    const host=el('div','','voice-leading-board');host.setAttribute('aria-label',isString ? 'Find the target note on the highlighted string' : 'Find the target note inside the four-fret box');root.append(host);
    status=el('p',`${count} solved`,'voice-leading-feedback');status.setAttribute('role','status');root.append(status);
    const controls=el('div','','voice-leading-actions');
    function checkAnswer(){
        if(!answer){status.textContent='Tap a fret position first.';return;}
        const r=isString ? checkStringNote(answer,target,instrument,chosenString) : checkBoxNote(answer,target,instrument,firstFret);
        showAnswerFeedback(status,r.correct,r.correct ? 'That note matches the highlighted area.' : !r.inside ? (isString ? `Use string ${chosenString}.` : `Stay inside frets ${firstFret}–${firstFret+3}.`) : `That is not ${CHROMATIC_NOTES[target]}. Try another position.`);
        next.disabled=!r.correct;
    }
    next=button('Next note →',()=>{count++;round();});next.classList.add('practice-next');next.disabled=true;
    controls.append(next,button('Show answers',()=>{clearAnswerFeedback(status);
        answer=null;paint();
        for(const p of (isString ? stringNotes(instrument,chosenString,target) : boxNotes(instrument,firstFret,target))) board.setMarker(p.string,p.fret,{text:CHROMATIC_NOTES[target],color:'#fff',borderColor:'#111',textColor:'#111'});
        next.disabled=true;status.textContent='These are the matching positions. Tap one to answer.';
    }));root.append(controls);
    root.append(el('p',isString ? 'Any octave on the highlighted string counts, including open strings.' : 'The box spans four frets and every string. Any matching note inside it counts, in any octave.'));
    function draw(){host.replaceChildren();const mobile=matchMedia('(max-width:768px) and (orientation:portrait)').matches;board=createFretboard(host,{tuning:instrumentConfig(instrument).tuning,frets:15,vertical:host.clientWidth<600,...(mobile?{}:{fretSpacing:37,stringSpacing:40})});board.onFretClick((string,fret)=>{answer={string,fret};checkAnswer();paint();play(answer);});paint();}
    draw();let width=host.clientWidth;observer=new ResizeObserver(()=>{if(width!==host.clientWidth){width=host.clientWidth;draw();}});observer.observe(host);
}
function renderTitlePage(){cleanup();const root=el('div','','voice-leading');root.append(el('h2',title),el('p',isString ? 'Find a named note on a highlighted string. Uses your Guitar/Bass setting.' : 'Find a named note inside a four-fret box across all strings. Uses your Guitar/Bass setting.'),button('Start practice',()=>{count=0;round();}));document.getElementById('game-content').replaceChildren(root);}
return {configure(value){instrument=value.instrument||'guitar';},renderTitlePage,cleanup,renderSettings(body){body.replaceChildren(el('p','Uses the app’s Guitar/Bass setting and frets 0–15. Find any occurrence of the target note in the highlighted area.'));},advance(){if(active&&!next.disabled){count++;round();}},repeatQuestion(){if(active&&answer)play(answer);}};

}
