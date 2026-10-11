import {test} from 'node:test';
import assert from 'node:assert/strict';
import {voiceMotion,pitches,exerciseChord,nearestShapes,checkAnswer} from '../static/js/core/voice-leading.js';
test('motion treats reordered pitches and identical pitches equally; unequal voices explicit',()=>{
 assert.equal(voiceMotion([60,64,67],[67,60,64]),0);
 assert.equal(voiceMotion([60,64,67],[60,65,69]),3);
 assert.equal(voiceMotion([60,64,67],[60,64,67,71]),12);
 assert.equal(voiceMotion([60,64,67,71],[60,64,67]),12);
 assert.equal(voiceMotion([40],[52]),12);
});
test('same sounding pitch on different strings has identical score, instrument octaves differ',()=>{
 assert.deepEqual(pitches([{string:6,fret:5}],'guitar'),pitches([{string:5,fret:0}],'guitar'));
 assert.deepEqual(pitches([{string:4,fret:0}],'bass'),[28]);
});
test('valid ties and suggestions succeed, wrong notes, omissions and stretches do not',()=>{
 for(const instrument of ['bass','guitar']){
  const source=exerciseChord({root:'C',type:'maj'},instrument);
  const target=exerciseChord({root:'F',type:'maj'},instrument);
  const current=source.shapes[0].positions;
  const ranked=nearestShapes(current,target,instrument);
  for(const candidate of ranked.filter(s=>s.cost<=ranked[0].cost+2)){
   const result=checkAnswer(current,candidate.shape.positions,target,instrument);
   assert.equal(result.valid,true);assert.equal(result.smooth,true);
  }
  assert.equal(checkAnswer(current,[],target,instrument).valid,false);
  assert.equal(checkAnswer(current,current,target,instrument).valid,false);
  assert.equal(checkAnswer(current,[{string:99,fret:0}],target,instrument).valid,false);
  const notes=ranked[0].shape.positions.map(p=>({...p}));notes[0].fret+=12;
  assert.equal(checkAnswer(current,notes,target,instrument).valid,false);
 }
});
test('extensions can use explicitly labeled shells, triads retain full chord',()=>{
 const extension=exerciseChord({root:'C',type:'13'},'bass');
 assert.equal(extension.voicing,'shell');assert.ok(extension.shapes.length);
 assert.equal(exerciseChord({root:'C',type:'maj'},'bass',true).voicing,'full');
});
test('every catalog chord is playable in every key on guitar and bass',async()=>{
 const {readFileSync}=await import('node:fs');
 const catalog=JSON.parse(readFileSync(new URL('../static/data/progressions.json',import.meta.url)));
 const oldFetch=globalThis.fetch;
 let progressions;
 try{globalThis.fetch=async()=>({ok:true,json:async()=>catalog});progressions=await import('../static/js/core/progressions.js');}finally{globalThis.fetch=oldFetch;}
 const seen=new Set();
 for(const key of ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'])for(const group of catalog)for(const entry of group.progressions){
  const chords=progressions.buildProgressionChordsFromTokens(entry.chords,key);
  assert.equal(chords.length,entry.chords.length);
  for(const chord of chords)for(const instrument of ['guitar','bass']){
   const signature=`${chord.root}:${chord.type}:${instrument}`;if(seen.has(signature))continue;seen.add(signature);
   const exercise=exerciseChord(chord,instrument);assert.ok(exercise.shapes.length,signature);
   const answer=exercise.shapes[0].positions;
   assert.equal(checkAnswer(answer,answer,exercise,instrument).valid,true,signature);
  }
 }
});
test('lap seeds exhaust distinct sounding voicings before repeating and favor new inversions',async()=>{
 const {chooseLapStart}=await import('../static/js/core/voice-leading.js');
 for(const instrument of ['guitar','bass']){
  const shapes=exerciseChord({root:'C',type:'maj'},instrument).shapes;
  const count=new Set(shapes.map(s=>pitches(s.positions,instrument).join(','))).size;
  let used=new Set(),previous=[],seen=new Set();
  for(let i=0;i<count;i++){
   const next=chooseLapStart(shapes,instrument,used,previous);
   const key=pitches(next.shape.positions,instrument).join(',');
   assert.ok(!seen.has(key));assert.equal(next.exhausted,false);
   if(i===1)assert.notEqual(pitches(previous,instrument)[0]%12,pitches(next.shape.positions,instrument)[0]%12);
   seen.add(key);used=next.used;previous=next.shape.positions;
  }
  const wrapped=chooseLapStart(shapes,instrument,used,previous);
  assert.equal(wrapped.exhausted,true);assert.equal(wrapped.changed,true);
  assert.equal(wrapped.used.size,1);
 }
});
test('single-voicing catalogs report lack of variety without failing',async()=>{
 const {chooseLapStart}=await import('../static/js/core/voice-leading.js');
 const shapes=exerciseChord({root:'C',type:'maj'},'bass').shapes.slice(0,1);
 const first=chooseLapStart(shapes,'bass');
 const next=chooseLapStart(shapes,'bass',first.used,first.shape.positions);
 assert.equal(next.changed,false);assert.equal(next.exhausted,true);
 assert.equal(chooseLapStart([],'bass'),null);
});
test('repeated chords exclude unchanged pitches from answers and the suggestion benchmark',()=>{
 for(const instrument of ['guitar','bass']){
  const target=exerciseChord({root:'C',type:'maj'},instrument);
  const current=target.shapes[0].positions,rules={requireChange:true};
  assert.equal(checkAnswer(current,current,target,instrument,rules).valid,false);
  const samePitches=target.shapes.filter(s=>pitches(s.positions,instrument).join(',')===pitches(current,instrument).join(','));
  for(const shape of samePitches)assert.equal(checkAnswer(current,shape.positions,target,instrument,rules).valid,false);
  const alternatives=nearestShapes(current,target,instrument,rules);
  assert.ok(alternatives.length);assert.ok(alternatives.every(s=>s.cost>0));
  const best=checkAnswer(current,alternatives[0].shape.positions,target,instrument,rules);
  assert.equal(best.valid,true);assert.equal(best.smooth,true);assert.equal(best.best,alternatives[0].cost);
  assert.equal(checkAnswer(current,current,target,instrument).valid,true);
 }
});
