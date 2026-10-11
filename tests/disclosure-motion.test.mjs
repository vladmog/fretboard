import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../static/js/app/disclosure-motion.js',import.meta.url),'utf8').replace('export function','function');
function setup(reduce=false) {
    const handlers={}, frames=[], animations=[];
    const panel={isConnected:true,height:30,controls:1,querySelectorAll(){return Array(this.controls)},getBoundingClientRect(){return {height:this.height}},animate(keys){let finish;const finished=new Promise(r=>finish=r);const a={keys,finished,finish,cancel(){}};animations.push(a);return a;}};
    const summary={setAttribute(){}};
    const details={...panel,tagName:'DETAILS',open:false,getBoundingClientRect(){return {height:this.open?200:25}}};summary.parentElement=details;
    const context=vm.createContext({WeakMap,matchMedia:()=>({matches:reduce}),requestAnimationFrame:fn=>frames.push(fn),document:{addEventListener:(t,fn)=>(handlers[t]??=[]).push(fn),querySelectorAll:()=>[panel]}});
    vm.runInContext(source+'\ninitDisclosureMotion();',context);
    return {panel,details,animations,fire(type,disclosure=false,navigation=false){const event={preventDefault(){},target:{closest:s=>s==='summary'?(disclosure?summary:null):s==='#mode-select, #song-select, #games-select'?(navigation?panel:null):panel}};handlers[type].forEach(fn=>fn(event));},flush(){frames.splice(0).forEach(fn=>fn());}};
}
test('rebuilt controls slide open and closed, unchanged shapes do not animate',()=>{
 const s=setup();s.fire('change');s.panel.height=220;s.panel.controls=4;s.flush();assert.equal(s.animations[0].keys[0].height,'30px');assert.equal(s.animations[0].keys[1].height,'220px');
 s.fire('change');s.panel.height=30;s.panel.controls=1;s.flush();assert.equal(s.animations[1].keys[1].height,'30px');
 s.fire('change');s.flush();assert.equal(s.animations.length,2);
});
test('disclosures retain content until closing finishes and can reverse',async()=>{
 const s=setup();s.fire('click',true);assert.equal(s.details.open,true);s.animations[0].finish();await Promise.resolve();
 s.fire('click',true);assert.equal(s.details.open,true);assert.equal(s.animations[1].keys[1].height,'25px');
 s.fire('click',true);await Promise.resolve();assert.equal(s.details.open,true);
 s.fire('click',true);s.animations[2].finish();await Promise.resolve();assert.equal(s.details.open,false);
});
test('reduced motion toggles immediately',()=>{
 const s=setup(true);s.fire('click',true);assert.equal(s.details.open,true);s.fire('click',true);assert.equal(s.details.open,false);assert.equal(s.animations.length,0);
});

test('mode navigation and ordinary content changes do not animate',()=>{
 const s=setup();s.fire('change',false,true);s.panel.height=220;s.panel.controls=4;s.flush();assert.equal(s.animations.length,0);
 s.fire('change');s.panel.height=250;s.flush();assert.equal(s.animations.length,0);
 s.fire('click');s.panel.height=300;s.panel.controls=5;s.flush();assert.equal(s.animations.length,0);
});
