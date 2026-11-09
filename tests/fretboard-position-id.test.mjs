import {drillCandidates,sanitizeDrillDistance} from '../static/js/core/fretboard-drill-distance.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {notePositions} from '../static/js/core/nearest-note.js';
import {instrumentConfig} from '../static/js/core/voice-leading.js';
import {getNoteName} from '../static/js/core/music-theory.js';
for(const instrument of ['guitar','bass'])test(`position identification answers, retries and live labels on ${instrument}`,()=>{
 let marked,awaiting=false,logs=[];
 class E{constructor(){this.children=[];this.style={removeProperty(){}};this.dataset={};this.classList={contains:()=>false};this.clientWidth=500;}append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}querySelector(){return null;}setAttribute(){}addEventListener(type,fn){this[type]=fn;}}
 const root=new E();const context=vm.createContext({drillCandidates,sanitizeDrillDistance,attachCircleDrag:()=>()=>{},notePositions,instrumentConfig,getNoteName,Math,ResizeObserver:class{observe(){}disconnect(){}},document:{createElement:()=>new E(),getElementById:()=>root},createSettingsStore:(_,defaults)=>({settings:defaults,load(){},save(){}}),beginPracticeQuestion:()=>{let logged=false;return value=>{if(!logged)logs.push(value);logged=true;}},gameState:{soundEnabled:false},Sound:{},setAwaitingAdvance:v=>awaiting=v,attachRegionLayout:(_,host,draw)=>{draw(false);return ()=>{};},createFretboard:()=>({clearMarkers(){},setMarker(string,fret,style){marked={string,fret,style};}})});
 let source=readFileSync(new URL('../static/js/games/fretboard-drills.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default','globalThis.game =');vm.runInContext(source,context);
 context.game.configure({instrument});context.game.renderTitlePage();root.children[0].children.at(-1).click();
 const original={...marked};assert.equal(marked.style.text,'');
 const target=notePositions(instrument).find(p=>p.string===marked.string&&p.fret===marked.fret).midi%12;
 context.game.handleNoteKey((target+1)%12);assert.equal(awaiting,false);assert.equal(marked.style.text,'');
 context.game.handleNoteKey(target);assert.equal(awaiting,true);assert.equal(marked.style.text,getNoteName(target));assert.deepEqual(logs,[false]);
 const settings=new E();context.game.renderSettings(settings);const input=settings.children[0].children[0];input.checked=false;input.change();
 const circle=root.children[0].children[0].children[0];assert.equal(circle.children.length,12);assert.equal(circle.children.filter(b=>b.textContent!=='').length,1);assert.equal(circle.children[target].style.background,'#32CD32');
 context.game.advance();assert.ok(root.children[0].children[0].children[0].children.filter(b=>b.className==='fret-identify-note').every(b=>b.textContent===''));assert.equal(awaiting,false);assert.notEqual(`${marked.string}:${marked.fret}`,`${original.string}:${original.fret}`);
});
