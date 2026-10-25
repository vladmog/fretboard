import { showAnswerFeedback, clearAnswerFeedback } from './answer-feedback.js';
import { createFretboard } from '../core/fretboard.js';
import { instrumentConfig } from '../core/voice-leading.js';
import { notePositions, boxNotes, checkBoxNote, stringNotes, checkStringNote } from '../core/nearest-note.js';
import { CHROMATIC_NOTES } from '../core/music-theory.js';
import { voicingNotes } from '../core/voicing-audio.js';
import * as Voice from './voice.js';
import * as Sound from '../core/sound.js';
import { attachRegionLayout } from './region-layout.js';
import { createSettingsStore } from './storage.js';
import { gameState } from './session.js';
export function createRegionGame(kind = 'box') {
const isString = kind === 'string';
const title = isString ? 'Note on a string' : 'Note in a box';
const store=createSettingsStore('fretboard-note-in-box-settings',{guitar:[1,2,3,4,5,6],bass:[1,2,3,4],limitFrets:false,minFret:0,maxFret:15}, settings=>{
    settings.limitFrets=settings.limitFrets===true;
    settings.minFret=Number.isInteger(settings.minFret)?Math.max(0,Math.min(15,settings.minFret)):0;
    settings.maxFret=Number.isInteger(settings.maxFret)?Math.max(settings.minFret,Math.min(15,settings.maxFret)):15;
    for(const [key,total] of [['guitar',6],['bass',4]]) {
        const valid=Array.isArray(settings[key]) ? [...new Set(settings[key])].filter(n=>Number.isInteger(n)&&n>=1&&n<=total) : [];
        settings[key]=valid.length ? valid : Array.from({length:total},(_,i)=>i+1);
    }
});
if(!isString)store.load();
const selectedStrings=()=>store.settings[instrument];
const stringName=n=>instrumentConfig(instrument).tuning[instrumentConfig(instrument).tuning.length-n];
let chosenString, detachLayout, revealed=false;
let instrument='guitar', board, observer, firstFret, lastFret, target, answer, status, next, active=false, count=0, last='';
const el=(tag,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
function play(position){if(gameState.soundEnabled)Sound.playChord(voicingNotes({positions:[position]},instrument));}
function announceQuestion(){if(active)Voice.speak(Voice.spokenNote(CHROMATIC_NOTES[target]).toLowerCase());}
function cleanup(){Voice.cancel();active=false;detachLayout?.();detachLayout=null;observer?.disconnect();observer=null;board=null;}
function paint(){
    if(!board)return;board.clearMarkers();
    if (isString) board.highlightString(chosenString);
    else board.highlightFretRange(firstFret, lastFret, selectedStrings());
    if(revealed) for(const p of (isString ? stringNotes(instrument,chosenString,target) : boxNotes(instrument,firstFret,target,selectedStrings(),lastFret))) board.setMarker(p.string,p.fret,{text:CHROMATIC_NOTES[target],color:'#fff',borderColor:'#111',textColor:'#111'});
    if(answer)board.setMarker(answer.string,answer.fret,{text:CHROMATIC_NOTES[notePositions(instrument).find(p=>p.string===answer.string&&p.fret===answer.fret).midi%12],color:'#fff',borderColor:'#111',textColor:'#111'});
}
function round(){
    cleanup();active=true;answer=null;revealed=false;
    // Pick the target from notes actually present in the four-fret region.
    let key, attempts=0;
    const min=!isString&&store.settings.limitFrets?store.settings.minFret:0;
    const max=!isString&&store.settings.limitFrets?store.settings.maxFret:15;
    const span=Math.min(3,max-min);
    do {
        firstFret = min + Math.floor(Math.random() * (max-min-span+1));
        lastFret = firstFret + span;
        chosenString = 1 + Math.floor(Math.random() * instrumentConfig(instrument).bases.length);
        const candidates = isString ? stringNotes(instrument, chosenString) : boxNotes(instrument, firstFret, undefined, selectedStrings(),lastFret);
        target = candidates[Math.floor(Math.random() * candidates.length)].midi % 12;
        key = `${isString ? chosenString : firstFret}:${target}`;
    } while (key === last && ++attempts<32);
    last = key;
    const root=el('div','','voice-leading voice-leading-round note-region-round');
    document.getElementById('game-content').replaceChildren(root);
    root.append(el('h2',title),el('p',CHROMATIC_NOTES[target],'note-region-target'),el('p',isString ? `String ${chosenString} · ${voicingNotes({positions:[{string:chosenString,fret:0}]},instrument)[0]}` : `Frets ${firstFret}–${lastFret} · ${selectedStrings().map(stringName).join(" / ")}`, 'note-region-hint'));
    const actions=el('div','','voice-leading-actions note-region-audio');actions.append(button('Hear answer',()=>{if(answer)play(answer);}));root.append(actions);
    const host=el('div','','voice-leading-board');host.setAttribute('aria-label',isString ? 'Find the target note on the highlighted string' : 'Find the target note inside the four-fret box');root.append(host);
    status=el('p',`${count} solved`,'voice-leading-feedback');status.setAttribute('role','status');root.append(status);
    const controls=el('div','','voice-leading-actions note-region-navigation');
    function checkAnswer(){
        if(!answer){status.textContent='Tap a fret position first.';return;}
        const r=isString ? checkStringNote(answer,target,instrument,chosenString) : checkBoxNote(answer,target,instrument,firstFret,selectedStrings(),lastFret);
        showAnswerFeedback(status,r.correct,r.correct ? 'That note matches the highlighted area.' : !r.inside ? (isString ? `Use string ${chosenString}.` : `Use the selected strings inside frets ${firstFret}–${lastFret}.`) : `That is not ${CHROMATIC_NOTES[target]}. Try another position.`);
        next.disabled=!r.correct;
    }
    next=button('Next note →',()=>{count++;round();});next.classList.add('practice-next');next.disabled=true;
    controls.append(next,button('Show answers',()=>{clearAnswerFeedback(status);
        answer=null;revealed=true;paint();
        next.disabled=true;status.textContent='These are the matching positions. Tap one to answer.';
    }));root.append(controls);
    function draw(mobile=root.classList.contains('note-region-mobile')) {
        host.replaceChildren();
        board=createFretboard(host,{tuning:instrumentConfig(instrument).tuning,frets:15,vertical:mobile||host.clientWidth<600,...(mobile?{}:{fretSpacing:37,stringSpacing:40})});
        board.onFretClick((string,fret)=>{revealed=false;answer={string,fret};checkAnswer();paint();play(answer);});paint();
    }
    detachLayout=attachRegionLayout(root,host,draw);
    let width=host.clientWidth;
    observer=new ResizeObserver(()=>{if(width!==host.clientWidth){width=host.clientWidth;draw();}});observer.observe(host);
    announceQuestion();

}
function renderTitlePage(){cleanup();const root=el('div','','voice-leading');root.append(el('h2',title),el('p',isString ? 'Find a named note on a highlighted string. Uses your Guitar/Bass setting.' : 'Find a named note inside a four-fret box across all strings. Uses your Guitar/Bass setting.'),button('Start practice',()=>{count=0;round();}));document.getElementById('game-content').replaceChildren(root);}
function renderSettings(body){
    if(isString){body.replaceChildren(el('p','Uses your Guitar/Bass setting. Find the note on the highlighted string.'));return;}
    body.replaceChildren(el('h3','Strings to practice'),el('p','Choose at least one string. Only selected strings count.'));
    const fields=el('div','','note-region-string-options');
    const total=instrumentConfig(instrument).tuning.length;
    for(let n=total;n>=1;n--){
        const label=el('label');const input=el('input');input.type='checkbox';input.checked=selectedStrings().includes(n);
        input.disabled=input.checked&&selectedStrings().length===1;
        input.addEventListener('change',()=>{
            const chosen=new Set(selectedStrings());
            if(input.checked)chosen.add(n);else chosen.delete(n);
            if(!chosen.size){input.checked=true;return;}
            store.settings[instrument]=[...chosen].sort((a,b)=>a-b);store.save();
            if(active)round();
            renderSettings(body);
        });
        label.append(input,el('span',`${stringName(n)} · String ${n}`));fields.append(label);
    }
    body.append(fields);
    const limitLabel=el('label','','note-region-limit-toggle');
    const limit=el('input');limit.type='checkbox';limit.checked=store.settings.limitFrets;
    const range=el('div','','note-region-fret-range');range.hidden=!limit.checked;
    function saveRange(){store.save();if(active)round();}
    function fillRange(){
        range.replaceChildren();
        for(const [key,labelText] of [['minFret','Starting fret'],['maxFret','Ending fret']]){
            const label=el('label',labelText);const select=el('select');
            select.setAttribute('aria-label',labelText);
            for(let fret=0;fret<=15;fret++){
                const option=el('option',fret===0?'0 (open)':String(fret));option.value=String(fret);select.append(option);
            }
            select.value=String(store.settings[key]);
            select.addEventListener('change',()=>{
                store.settings[key]=Number(select.value);
                if(store.settings.minFret>store.settings.maxFret){
                    store.settings[key==='minFret'?'maxFret':'minFret']=store.settings[key];
                }
                saveRange();fillRange();
            });label.append(select);range.append(label);
        }
    }
    limit.addEventListener('change',()=>{
        store.settings.limitFrets=limit.checked;range.hidden=!limit.checked;
        saveRange();
        if(limit.checked&&!matchMedia('(prefers-reduced-motion: reduce)').matches)range.animate?.([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],{duration:180});
    });
    limitLabel.append(limit,el('span','Limit frets'));fillRange();body.append(limitLabel,range);
}
return {configure(value){instrument=value.instrument||'guitar';},renderTitlePage,cleanup,renderSettings,advance(){if(active&&!next.disabled){count++;round();}},repeatQuestion(){if(Voice.isEnabled())announceQuestion();else if(active&&answer)play(answer);}};

}
