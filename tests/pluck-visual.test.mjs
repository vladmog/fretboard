import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pulsePluck} from '../static/js/app/pluck-visual.js';
test('pluck visuals are scheduled at the actual audio strum times',async()=>{
 const audio=[],visual=[],heard=[];
 class Node {constructor(){this.volume={value:0};}connect(){return this;}toDestination(){return this;}triggerAttackRelease(...args){audio.push(args);}}
 globalThis.Tone={start:async()=>{},now:()=>20,Filter:Node,Reverb:Node,Limiter:Node,PolySynth:Node,Synth:Node,Draw:{schedule:(fn,time)=>visual.push({fn,time})}};
 try {
  const sound=await import('../static/js/core/sound.js?pluck-test');
  sound.setParam('strumDelay',.155);
  await sound.playChord(['E2','G2','C3'],undefined,note=>heard.push(note));
  assert.deepEqual(visual.map(v=>v.time),audio.map(a=>a[2]));
  assert.deepEqual(heard,[]);
  visual.forEach(v=>v.fn());
  assert.deepEqual(heard,['E2','G2','C3']);
 }finally{delete globalThis.Tone;}
});
test('pulse targets all matching pitch markers on only the requested board',()=>{
 const calls=[];
 const target={isConnected:true,getClientRects:()=>[{}],querySelectorAll:selector=>{
  assert.equal(selector,'.marker[data-pitch-class="1"] circle');
  return [1,2].map(i=>({animate:()=>{calls.push(i);return {cancel(){}};}}));
 }};
 globalThis.window={matchMedia:()=>({matches:false})};
 try{pulsePluck('Db2',target);assert.deepEqual(calls,[1,2]);}finally{delete globalThis.window;}
});
