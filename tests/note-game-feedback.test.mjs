import {makeBoxQuestion,boxQuestionText,sanitizeBoxMode,BOX_INTERVALS} from '../static/js/core/note-box-question.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as notes from '../static/js/core/nearest-note.js';
import {instrumentConfig} from '../static/js/core/voice-leading.js';
import {CHROMATIC_NOTES,getNoteName} from '../static/js/core/music-theory.js';
import {voicingNotes} from '../static/js/core/voicing-audio.js';
import {showAnswerFeedback,clearAnswerFeedback} from '../static/js/games/answer-feedback.js';
for(const config of [{kind:'nearest'},{kind:'box'},{kind:'string'},{kind:'box',min:0,max:0},{kind:'box',min:7,max:8},{kind:'box',min:12,max:15},{kind:'box',min:2,max:2,random:0.25,expected:'Gb'},{kind:'box',min:2,max:2,random:0.75,expected:'F#'}])test(`${config.kind} checks taps and voice with bounds ${config.min ?? 'off'}–${config.max ?? 'off'}`,()=>{
 const {kind}=config;
 let awaiting=false;
 let tap,markers=[],announcements=[],voiceEnabled=true,cancellations=0;
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.clientWidth=390;this.classList={add(){}};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  addEventListener(_,fn){this.click=fn;}
  setAttribute(){}
 }
 const root=new Element('div');
 const context=vm.createContext({makeBoxQuestion,boxQuestionText,sanitizeBoxMode,BOX_INTERVALS,renderBoxModeSettings(){},beginPositionTiming:()=>({complete(){},reveal(){}}),renderPositionHeatmap:()=>()=>{},beginPracticeQuestion:()=>()=>{},...notes,instrumentConfig,CHROMATIC_NOTES,getNoteName,voicingNotes,Math:config.random===undefined?Math:Object.assign(Object.create(Math),{random:()=>config.random}),showAnswerFeedback,clearAnswerFeedback,
  Voice:{speak(text){if(voiceEnabled)announcements.push(text);},spokenNote:n=>n.replace('#',' sharp').replace('b',' flat'),cancel(){cancellations++;},isEnabled:()=>voiceEnabled},
  markReady(){awaiting=true;},isAwaitingAdvance:()=>awaiting,setAwaitingAdvance(value){awaiting=value;},
  createSettingsStore:(_key,defaults)=>({settings:{...defaults,...(config.min===undefined?{}:{limitFrets:true,minFret:config.min,maxFret:config.max,guitar:[1]})},load(){},save(){}}),
  attachRegionLayout:(_root,_host,draw)=>{draw(true);return ()=>{};},
  document:{getElementById:()=>root,createElement:tag=>new Element(tag)},gameState:{soundEnabled:false},Sound:{},matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}disconnect(){}},
  createFretboard:()=>({clearMarkers(){markers=[];},setMarker(string,fret,options){markers.push({string,fret,...options});},highlightString(){},highlightFretRange(){},onFretClick(fn){tap=fn;}})
 });
 const file=kind==='nearest'?'nearest-note':'note-region';
 let source=readFileSync(new URL(`../static/js/games/${file}.js`,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default','globalThis.game =').replace('export function','function');
 if(kind!=='nearest')source+=`\nglobalThis.game=createRegionGame('${kind}');`;
 vm.runInContext(source,context);context.game.renderTitlePage();
 const all=()=>{const out=[];const walk=e=>{out.push(e);e.children.forEach(walk);};walk(root);return out;};
 all().find(e=>e.textContent==='Start practice').click();
 if(kind!=='nearest'){
  const target=all().find(e=>e.className==='note-region-target').textContent;
  assert.deepEqual(announcements,[target.replace('#',' sharp').replace('b',' flat').toLowerCase()]);
  if(config.expected)assert.equal(target,config.expected);
  context.game.repeatQuestion();assert.equal(announcements.length,2);
 }
 assert.equal(all().some(e=>e.textContent==='Check'),false);
 const status=all().find(e=>e.className==='voice-leading-feedback');
 const next=all().find(e=>e.textContent==='Next note →');
 assert.equal(next.disabled,true);
 all().find(e=>e.textContent===(kind==='nearest'?'Show nearest':kind==='box'?'Show answer':'Show answers')).click();
 if(config.min!==undefined){assert.ok(markers.length);assert.ok(markers.every(p=>p.fret>=config.min&&p.fret<=config.max));}
 const counter=kind==='box'?all().find(e=>e.className==='game-round-counter note-box-counter'):null;
 if(counter)assert.equal(counter.textContent,'0 answered');
 const correct=markers.at(-1);
 tap(correct.string,correct.fret);
 if(kind==='box'){assert.equal(markers.at(-1).color,'#32CD32');assert.equal(status.textContent,'Correct');assert.equal(status.dataset.result,undefined);assert.equal(all().some(e=>e.textContent==='Hear answer'),false);}else{assert.equal(status.dataset.result,'correct');assert.match(status.textContent,/✓ Correct/);}assert.equal(next.disabled,false);
 if(kind!=='nearest')assert.equal(awaiting,true,'correct answer arms the next tap synchronously');
 if(counter)assert.equal(counter.textContent,'1 answered');
 awaiting=false; // Also exercise an incorrect answer before advancing.
 tap(correct.string,correct.fret===15?14:correct.fret+1);
 if(kind==='box'){assert.equal(markers.at(-1).color,'#ed5353');assert.match(status.textContent,/^(Try again|Tap inside the box)$/);assert.equal(status.dataset.result,undefined);}else{assert.equal(status.dataset.result,'incorrect');assert.match(status.textContent,/✕ Not quite/);}assert.equal(next.disabled,true);
 if(counter)assert.equal(counter.textContent,'1 answered');
 next.disabled=false;
 if(kind==='nearest')next.click();
 else {awaiting=true;tap(correct.string,correct.fret);assert.equal(awaiting,false);assert.equal(markers.length,0,'advance tap must not answer the new question');}
 assert.equal(all().find(e=>e.className==='voice-leading-feedback').dataset.result,undefined);
 if(kind!=='nearest'){
  assert.equal(announcements.length,3,'Next announces exactly once');
  voiceEnabled=false;const before=announcements.length;
  next.click();assert.equal(announcements.length,before,'Voice off remains silent');
  const cancelled=cancellations;context.game.cleanup();assert.ok(cancellations>cancelled);
 }else context.game.cleanup();
});
