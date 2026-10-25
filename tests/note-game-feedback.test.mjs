import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as notes from '../static/js/core/nearest-note.js';
import {instrumentConfig} from '../static/js/core/voice-leading.js';
import {CHROMATIC_NOTES} from '../static/js/core/music-theory.js';
import {voicingNotes} from '../static/js/core/voicing-audio.js';
import {showAnswerFeedback,clearAnswerFeedback} from '../static/js/games/answer-feedback.js';
for(const config of [{kind:'nearest'},{kind:'box'},{kind:'string'},{kind:'box',min:0,max:0},{kind:'box',min:7,max:8},{kind:'box',min:12,max:15}])test(`${config.kind} checks taps and voice with bounds ${config.min ?? 'off'}–${config.max ?? 'off'}`,()=>{
 const {kind}=config;
 let tap,markers=[],announcements=[],voiceEnabled=true,cancellations=0;
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.clientWidth=390;this.classList={add(){}};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  addEventListener(_,fn){this.click=fn;}
  setAttribute(){}
 }
 const root=new Element('div');
 const context=vm.createContext({...notes,instrumentConfig,CHROMATIC_NOTES,voicingNotes,showAnswerFeedback,clearAnswerFeedback,
  Voice:{speak(text){if(voiceEnabled)announcements.push(text);},spokenNote:n=>n.replace('#',' sharp'),cancel(){cancellations++;},isEnabled:()=>voiceEnabled},
  createSettingsStore:(_key,defaults)=>({settings:{...defaults,...(config.min===undefined?{}:{limitFrets:true,minFret:config.min,maxFret:config.max,guitar:[1]})},load(){},save(){}}),
  attachRegionLayout:(_root,_host,draw)=>{draw(true);return ()=>{};},
  document:{getElementById:()=>root,createElement:tag=>new Element(tag)},gameState:{soundEnabled:false},Sound:{},matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}disconnect(){}},
  createFretboard:()=>({clearMarkers(){markers=[];},setMarker(string,fret){markers.push({string,fret});},highlightString(){},highlightFretRange(){},onFretClick(fn){tap=fn;}})
 });
 const file=kind==='nearest'?'nearest-note':'note-region';
 let source=readFileSync(new URL(`../static/js/games/${file}.js`,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default','globalThis.game =').replace('export function','function');
 if(kind!=='nearest')source+=`\nglobalThis.game=createRegionGame('${kind}');`;
 vm.runInContext(source,context);context.game.renderTitlePage();
 const all=()=>{const out=[];const walk=e=>{out.push(e);e.children.forEach(walk);};walk(root);return out;};
 all().find(e=>e.textContent==='Start practice').click();
 if(kind!=='nearest'){
  const target=all().find(e=>e.className==='note-region-target').textContent;
  assert.deepEqual(announcements,[target.replace('#',' sharp').toLowerCase()]);
  context.game.repeatQuestion();assert.equal(announcements.length,2);
 }
 assert.equal(all().some(e=>e.textContent==='Check'),false);
 const status=all().find(e=>e.className==='voice-leading-feedback');
 const next=all().find(e=>e.textContent==='Next note →');
 assert.equal(next.disabled,true);
 all().find(e=>e.textContent===(kind==='nearest'?'Show nearest':'Show answers')).click();
 if(config.min!==undefined){assert.ok(markers.length);assert.ok(markers.every(p=>p.fret>=config.min&&p.fret<=config.max));}
 const correct=markers.at(-1);
 tap(correct.string,correct.fret);
 assert.equal(status.dataset.result,'correct');assert.match(status.textContent,/✓ Correct/);assert.equal(next.disabled,false);
 tap(correct.string,correct.fret===15?14:correct.fret+1);
 assert.equal(status.dataset.result,'incorrect');assert.match(status.textContent,/✕ Not quite/);assert.equal(next.disabled,true);
 next.disabled=false;next.click();
 assert.equal(all().find(e=>e.className==='voice-leading-feedback').dataset.result,undefined);
 if(kind!=='nearest'){
  assert.equal(announcements.length,3,'Next announces exactly once');
  voiceEnabled=false;const before=announcements.length;
  next.click();assert.equal(announcements.length,before,'Voice off remains silent');
  const cancelled=cancellations;context.game.cleanup();assert.ok(cancellations>cancelled);
 }else context.game.cleanup();
});
