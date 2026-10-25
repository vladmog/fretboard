import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as notes from '../static/js/core/nearest-note.js';
import {instrumentConfig} from '../static/js/core/voice-leading.js';
import {CHROMATIC_NOTES} from '../static/js/core/music-theory.js';
import {voicingNotes} from '../static/js/core/voicing-audio.js';
import {showAnswerFeedback,clearAnswerFeedback} from '../static/js/games/answer-feedback.js';
for(const kind of ['nearest','box','string'])test(`${kind} checks on tap and enables Next only for a correct answer`,()=>{
 let tap,markers=[];
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.clientWidth=390;this.classList={add(){}};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  addEventListener(_,fn){this.click=fn;}
  setAttribute(){}
 }
 const root=new Element('div');
 const context=vm.createContext({...notes,instrumentConfig,CHROMATIC_NOTES,voicingNotes,showAnswerFeedback,clearAnswerFeedback,
  createSettingsStore:(_key,defaults)=>({settings:defaults,load(){},save(){}}),
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
 assert.equal(all().some(e=>e.textContent==='Check'),false);
 const status=all().find(e=>e.className==='voice-leading-feedback');
 const next=all().find(e=>e.textContent==='Next note →');
 assert.equal(next.disabled,true);
 all().find(e=>e.textContent===(kind==='nearest'?'Show nearest':'Show answers')).click();
 const correct=markers.at(-1);
 tap(correct.string,correct.fret);
 assert.equal(status.dataset.result,'correct');assert.match(status.textContent,/✓ Correct/);assert.equal(next.disabled,false);
 tap(correct.string,correct.fret===15?14:correct.fret+1);
 assert.equal(status.dataset.result,'incorrect');assert.match(status.textContent,/✕ Not quite/);assert.equal(next.disabled,true);
 next.disabled=false;next.click();
 assert.equal(all().find(e=>e.className==='voice-leading-feedback').dataset.result,undefined);
 context.game.cleanup();
});
