/** Identify a marked fretboard position using the chromatic circle. */
import {createFretboard} from '../core/fretboard.js';
import {notePositions} from '../core/nearest-note.js';
import {instrumentConfig} from '../core/voice-leading.js';
import {getNoteName} from '../core/music-theory.js';
import {attachRegionLayout} from './region-layout.js';
import {createSettingsStore} from './storage.js';
import {beginPracticeQuestion} from './practice-log.js';
import {gameState,setAwaitingAdvance} from './session.js';
import * as Sound from '../core/sound.js';
const store=createSettingsStore('fretboard-drills-settings',{showLabels:true},s=>{s.showLabels=s.showLabels!==false;});
const el=(tag,text='',cls='')=>{const node=document.createElement(tag);node.textContent=text;node.className=cls;return node;};
const names=['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'];
let instrument='guitar',active=false,solved=false,position,lastPosition='',count=0,board,detach,observer,circle,status,counter,log;
function cleanup(){active=false;setAwaitingAdvance(false);detach?.();detach=null;observer?.disconnect();observer=null;board=null;}
function paintBoard(){board?.clearMarkers();board?.setMarker(position.string,position.fret,{text:solved?getNoteName(position.midi%12):'',color:solved?'#32CD32':'#333',borderColor:'#111',textColor:solved?'#111':'#fff'});}
function answer(pitch){
    if(!active||solved)return;
    const correct=pitch===position.midi%12;log(correct);
    status.textContent=correct?'Correct':'Try again';status.dataset.result=correct?'correct':'incorrect';
    if(correct){solved=true;count++;counter.textContent=`${count} answered`;paintBoard();setAwaitingAdvance(true);}
    if(gameState.soundEnabled){if(correct)Sound.playNote(getNoteName(pitch)+'4');else Sound.playError();}
}
function paintCircle(){
    if(!circle)return;circle.replaceChildren();
    for(let pitch=0;pitch<12;pitch++){
        const b=el('button',store.settings.showLabels?names[pitch]:'','fret-identify-note');b.type='button';
        const angle=(pitch*30-90)*Math.PI/180;
        b.style.left=`${50+39*Math.cos(angle)}%`;b.style.top=`${50+39*Math.sin(angle)}%`;
        b.style.background=pitch%2?'#777':'#000';b.setAttribute('aria-label',names[pitch]);
        b.addEventListener('click',()=>{if(solved)advance();else answer(pitch);});circle.append(b);
    }
}
function round(){
    cleanup();active=true;solved=false;
    const candidates=notePositions(instrument).filter(p=>`${p.string}:${p.fret}`!==lastPosition);
    position=candidates[Math.floor(Math.random()*candidates.length)];lastPosition=`${position.string}:${position.fret}`;
    log=beginPracticeQuestion('fretboard-position-id',[instrument,String(position.string),String(position.fret)]);
    const root=el('div','','note-region-round fret-identify-round');
    const panel=el('div','','note-region-controls');
    const prompt=el('p','What note?','fret-identify-prompt');
    circle=el('div','','fret-identify-circle');circle.setAttribute('aria-label','Choose the note on the chromatic circle');paintCircle();
    status=el('p','','fret-identify-feedback');status.setAttribute('role','status');counter=el('p',`${count} answered`,'game-round-counter');
    panel.append(prompt,circle,status,counter);
    const host=el('div','','voice-leading-board');host.setAttribute('aria-label','Identify the marked fretboard position');root.append(panel,host);
    document.getElementById('game-content').replaceChildren(root);
    function draw(mobile){host.replaceChildren();board=createFretboard(host,{tuning:instrumentConfig(instrument).tuning,frets:15,vertical:mobile,screenRotation:mobile?-(Number(root.dataset.markerTextRotation)||0):undefined,markerTextRotation:mobile?Number(root.dataset.markerTextRotation)||0:0});paintBoard();}
    detach=attachRegionLayout(root,host,draw);
    let width=host.clientWidth;observer=new ResizeObserver(()=>{if(width!==host.clientWidth){width=host.clientWidth;draw(root.classList.contains('note-region-mobile'));}});observer.observe(host);
}
function advance(){if(active&&solved)round();}
function renderTitlePage(){cleanup();store.load();const root=el('div','','voice-leading');const start=el('button','Start practice');start.addEventListener('click',()=>{count=0;round();});root.append(el('h2','Fretboard Drills'),el('p','Identify the marked note using the chromatic circle.'),start);document.getElementById('game-content').replaceChildren(root);}
function renderSettings(body){body.replaceChildren();const label=el('label','','note-region-limit-toggle'),input=el('input');input.type='checkbox';input.checked=store.settings.showLabels;label.append(input,el('span','Show circle note labels'));body.append(label);input.addEventListener('change',()=>{store.settings.showLabels=input.checked;store.save();paintCircle();});}
export default {configure(value){instrument=value.instrument||'guitar';},renderTitlePage,renderSettings,cleanup,advance,handleNoteKey:answer};
