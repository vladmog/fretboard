import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHarmonyGenerator,transitionWeight} from '../static/js/core/generated-harmony.js';
import {CHORD_TYPES} from '../static/js/core/music-theory.js';
function rng(){let n=42;return ()=>((n=(1664525*n+1013904223)>>>0)/4294967296);}
test('endless harmony stays playable, varied and within selected chord types on both instruments',()=>{
 for(const instrument of ['guitar','bass'])for(const types of [['maj7','min7','7'],['min'],['dim7']]){
  const generator=createHarmonyGenerator({instrument,types,random:rng()});let previous=generator.start();const roots=new Set();
  for(let i=0;i<200;i++){
   const next=generator.next(previous);assert.ok(types.includes(next.type));assert.ok(next.shapes.length);
   assert.notEqual(next.symbol,previous.symbol);roots.add(next.root);previous=next;
  }
  assert.ok(roots.size>=8);
 }
});
test('every selectable type can generate a playable sequence alone',()=>{
 for(const instrument of ['guitar','bass'])for(const type of Object.keys(CHORD_TYPES)){
  const generator=createHarmonyGenerator({instrument,types:[type],random:rng()});const first=generator.start(),next=generator.next(first);
  assert.equal(next.type,type);assert.ok(next.shapes.length);assert.notEqual(first.root,next.root);
 }
});
test('harmonic weighting favors ii-V and V-I over unrelated movement',()=>{
 assert.ok(transitionWeight({root:'D',type:'min7'},{root:'G',type:'7'})>transitionWeight({root:'D',type:'min7'},{root:'Ab',type:'7'}));
 assert.ok(transitionWeight({root:'G',type:'7'},{root:'C',type:'maj7'})>transitionWeight({root:'G',type:'7'},{root:'F#',type:'maj7'}));
 assert.throws(()=>createHarmonyGenerator({types:[]}),/Choose at least one/);
});
