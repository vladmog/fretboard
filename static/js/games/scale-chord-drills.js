import {chordRootInput} from './chord-root-input.js';
import {sameSpelling} from '../core/note-drag.js';
import {SCALES,getNoteIndex} from '../core/music-theory.js';
import {TRIAD_SCALES} from '../core/scale-chord-questions.js';
import {CHORD_SIZES,drillChord,chordQualityOptions,optionIntervals} from '../core/scale-chord-drills.js';
import {createSettingsStore} from './storage.js';
import {beginPracticeQuestion} from './practice-log.js';
import {gameState,setAwaitingAdvance} from './session.js';
import {routeNextRound} from './round-routing.js';
import * as Voice from './voice.js';
import * as Sound from '../core/sound.js';
const ROOTS=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const store=createSettingsStore('fretboard-scale-chord-drills-settings',{askRoot:false,rootInput:'circle',size:3,scales:[...TRIAD_SCALES],roots:[...ROOTS]},s=>{
 s.askRoot=s.askRoot===true;
 if(!['circle','spelling'].includes(s.rootInput))s.rootInput='circle';
 if(!CHORD_SIZES[s.size])s.size=3;
 s.scales=Array.isArray(s.scales)?s.scales.filter(x=>TRIAD_SCALES.includes(x)):[...TRIAD_SCALES];
 s.roots=Array.isArray(s.roots)?s.roots.filter(x=>ROOTS.includes(x)):[...ROOTS];
});
store.load();
let rootControl=null,rootPending=false,answersBox=null;
let active=false,solved=false,question,last='',count=0,log,feedback,counter,inputStep=0,answerNodes=new Map();
const el=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const button=(text,fn)=>{const b=el('button',text,'game-setting-btn');b.type='button';b.addEventListener('click',fn);return b;};
function cleanup(){rootControl?.destroy();rootControl=null;rootPending=false;active=false;inputStep=0;answerNodes.clear();setAwaitingAdvance(false);Voice.cancel();}
function repeatQuestion(){if(active&&!solved)Voice.speak(`${store.settings.askRoot?Voice.spokenNote(question.scaleRoot).toLowerCase()+' ':''}${question.scaleType==='natural_minor'?'Minor':SCALES[question.scaleType].name}. Degree ${question.degree}.`);}
function answer(option,node){
 if(!active||rootPending)return;if(solved){advance();return;}
 const correct=option.quality===question.quality;log(correct);
 node.dataset.result=correct?'correct':'incorrect';
 feedback.textContent=correct?`${store.settings.askRoot?question.notes.join(' · ')+' — ':''}${question.label}`:'Try again';
 if(correct){solved=true;count++;counter.textContent=`${count} answered`;setAwaitingAdvance(true);}
 if(gameState.soundEnabled){if(correct)Sound.playChord(question.notes.map(n=>n+'4'));else Sound.playError();}
}
function round(){
 if(routeNextRound())return;
 cleanup();
 const {roots,scales,size}=store.settings;
 if(!roots.length||!scales.length){renderTitlePage();return false;}
 const pool=[];for(const root of (store.settings.askRoot?roots:['C']))for(const scale of scales)for(let d=1;d<=7;d++){
  const id=[root,scale,d,size].join(':');if(id!==last)pool.push({root,scale,d,id});
 }
 const pick=pool[Math.floor(Math.random()*pool.length)];last=pick.id;question=drillChord(pick.root,pick.scale,pick.d,size);
 active=true;solved=false;log=beginPracticeQuestion('scale-chord-drills',[question.scaleRoot,question.scaleType,String(size),String(question.degree)]);
 const root=el('div','','scale-chord-drill');
 counter=el('p',`${count} answered`,'game-round-counter');
 const prompt=el('div','','scale-chord-drill-prompt');
 prompt.append(el('h2',`${store.settings.askRoot?question.scaleRoot+' ':''}${SCALES[question.scaleType].name}`),el('p',`Degree ${question.degree} · ${CHORD_SIZES[size]}`));
 prompt.addEventListener('click',()=>solved?advance():repeatQuestion());
 const answers=el('div','','scale-chord-drill-answers');answersBox=answers;
 for(const option of chordQualityOptions(size,scales)){
  const b=button('',()=>answer(option,b));answerNodes.set(option.quality,b);
  const formulas=optionIntervals(option,question);
  b.append(el('strong',option.label));
  for(const [key,title] of [['chord','Chord'],['scale','Scale']]) {
   const row=el('span',`${title}: `);
   formulas[key].forEach((interval,i)=>{
    if(i){
     const steps=formulas.thirds[i-1];
     const separator=el('span',' – ',steps===4?'scale-chord-major-third':steps===3?'scale-chord-minor-third':'');
     separator.title=steps===4?'Major third':steps===3?'Minor third':`${steps} semitones`;
     separator.setAttribute('aria-label',separator.title);
     row.append(separator);
    }
    row.append(document.createTextNode(interval));
   });
   b.append(row);
  }
  answers.append(b);
 }
 feedback=el('p','','scale-chord-drill-feedback');feedback.setAttribute('role','status');
 rootPending=store.settings.askRoot;
 answers.hidden=rootPending;
 root.append(counter,prompt);
 if(rootPending){
  rootControl=chordRootInput(store.settings.rootInput==='spelling',answerRoot);
  root.append(el('p','Chord root first','scale-chord-root-stage'),rootControl.element);
 }
 root.append(answers,feedback);document.getElementById('game-content').replaceChildren(root);repeatQuestion();return true;
}
function answerRoot(pitch,spelling){
 if(!active||!rootPending)return;
 const correct=store.settings.rootInput==='spelling'
  ?!!spelling&&sameSpelling(spelling,question.notes[0])
  :pitch===getNoteIndex(question.notes[0]);
 if(!correct){log(false);feedback.textContent='Try another chord root.';if(gameState.soundEnabled)Sound.playError();return;}
 rootPending=false;rootControl?.destroy();rootControl=null;
 document.querySelector('.scale-chord-root-stage')?.remove();
 answersBox.hidden=false;feedback.textContent=`${question.notes[0]} — now choose the chord quality.`;
 inputStep=1;
}
function advance(){if(active&&solved)round();}
function startRound(){count=0;last='';store.load();return round();}
function renderTitlePage(){
 cleanup();const root=el('div','','game-title-page');
 root.append(el('h1','Scale Chord Drills'),el('p','Identify the chord quality on the given scale degree.'),button('Start',startRound));
 if(!store.settings.roots.length||!store.settings.scales.length)root.append(el('p','Choose at least one scale and root in settings.'));
 document.getElementById('game-content').replaceChildren(root);
}
function renderSettings(body){
 body.replaceChildren();
 const label=el('label','Chord size','game-setting-label'),select=el('select','','game-setting-select');
 for(const [value,name]of Object.entries(CHORD_SIZES)){const o=el('option',name);o.value=value;select.append(o);}
 select.value=String(store.settings.size);label.append(select);body.append(label);
 const changed=()=>{store.save();if(active){setAwaitingAdvance(false);round();}else renderTitlePage();};
 select.addEventListener('change',()=>{store.settings.size=Number(select.value);changed();});
 const rootLabel=el('label','Include scale root and answer chord root first','game-setting-label'),rootToggle=el('input');rootToggle.type='checkbox';rootToggle.checked=store.settings.askRoot;rootLabel.prepend(rootToggle);body.append(rootLabel);
 rootToggle.addEventListener('change',()=>{store.settings.askRoot=rootToggle.checked;changed();renderSettings(body);});
 const inputLabel=el('label','Chord root input','game-setting-label'),inputSelect=el('select','','game-setting-select');
 for(const [value,name]of [['circle','Chromatic circle'],['spelling','Natural notes with accidental dragging']]){const option=el('option',name);option.value=value;inputSelect.append(option);}
 inputSelect.value=store.settings.rootInput;inputSelect.disabled=!store.settings.askRoot;inputLabel.append(inputSelect);body.append(inputLabel);
 inputSelect.addEventListener('change',()=>{store.settings.rootInput=inputSelect.value;changed();});
 body.append(el('p','Dragging checks exact spelling, including double accidentals. Audio cannot distinguish enharmonic spellings, so this root stage requires touch.','settings-hint'));

 body.append(el('p','Extended chords use every other scale note through the named extension. Alterations are shown explicitly.','settings-hint'));
 for(const [key,title,values]of [['scales','Scales and modes',TRIAD_SCALES],['roots','Scale roots',ROOTS]]){
  const group=el('div','','game-setting-group');group.append(el('p',title,'game-setting-label'));
  const checks=el('div','','game-setting-checks');
  for(const value of values){const l=el('label'),input=el('input');input.type='checkbox';input.checked=store.settings[key].includes(value);if(key==='roots')input.disabled=!store.settings.askRoot;
   input.addEventListener('change',()=>{store.settings[key]=input.checked?[...store.settings[key],value]:store.settings[key].filter(x=>x!==value);changed();});
   l.append(input,document.createTextNode(key==='scales'?SCALES[value].name:value));checks.append(l);
  }group.append(checks);body.append(group);
 }
}
export default {renderTitlePage,renderSettings,cleanup,startRound,continueRound:round,advance,repeatQuestion};
