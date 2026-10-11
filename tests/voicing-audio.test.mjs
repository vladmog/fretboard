import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voicingNotes } from '../static/js/core/voicing-audio.js';
test('guitar inversion sounds exact frets low to high rather than root first',()=>{
 assert.deepEqual(voicingNotes({positions:[{string:2,fret:1},{string:3,fret:0},{string:4,fret:2}]}),['E3','G3','C4']);
});
test('bass has its own tuning and register, including two notes on a string',()=>{
 const positions=[{string:3,fret:3},{string:4,fret:3},{string:3,fret:7}];
 assert.deepEqual(voicingNotes({positions},'bass'),['G1','C2','E2']);
 assert.deepEqual(voicingNotes({positions},'guitar'),['F3','A#3','D4']);
 assert.deepEqual(voicingNotes({positions:positions.map(p=>({...p,fret:p.fret+12}))},'bass'),['G2','C3','E3']);
});
test('audio engine schedules exact inversion pitches in low-to-high order',async()=>{
 const calls=[];
 class Node { constructor(){this.volume={value:0};} connect(){return this;} toDestination(){return this;} triggerAttackRelease(...args){calls.push(args);} }
 globalThis.Tone={start:async()=>{},now:()=>10,Filter:Node,Reverb:Node,Limiter:Node,PolySynth:Node,Synth:Node};
 try {
  const {playChord}=await import('../static/js/core/sound.js');
  await playChord(voicingNotes({positions:[{string:2,fret:1},{string:3,fret:0},{string:4,fret:2}]}));
  assert.deepEqual(calls.map(c=>c[0]),['E3','G3','C4']);
  assert.ok(calls[0][2]<calls[1][2]&&calls[1][2]<calls[2][2]);
 } finally {delete globalThis.Tone;}
});
