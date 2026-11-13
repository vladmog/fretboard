import test from 'node:test';
import assert from 'node:assert/strict';
import {drillChord,chordQualityOptions,optionIntervals} from '../static/js/core/scale-chord-drills.js';
import {TRIAD_SCALES} from '../static/js/core/scale-chord-questions.js';
import {buildScale} from '../static/js/core/music-theory.js';
test('every supported degree and chord size has an obtainable answer, in every key',()=>{
 for(let size=3;size<=7;size++){
  const options=chordQualityOptions(size);
  assert.equal(new Set(options.map(o=>o.label)).size,options.length);
  for(const o of options)assert.equal(o.quality.split(',').length,size);
  for(const root of ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'])for(const scale of TRIAD_SCALES)for(let d=1;d<=7;d++){
   const q=drillChord(root,scale,d,size);
   assert.deepEqual(q.notes,Array.from({length:size},(_,i)=>buildScale(root,scale).notes[(d-1+2*i)%7]));
   assert.ok(options.some(o=>o.quality===q.quality));
  }
 }
});
test('quality and formulas distinguish chord-relative from scale-relative intervals',()=>{
 const q=drillChord('C','major',2,3);
 assert.equal(q.label,'Minor');
 assert.deepEqual(optionIntervals(q,q),{thirds:[3,4],chord:['1','♭3','5'],scale:['2','4','6']});
 const major=chordQualityOptions(3).find(o=>o.label==='Major');
 assert.deepEqual(optionIntervals(major,q).scale,['2','♯4','6']);
 assert.equal(drillChord('C','major',5,4).label,'Dominant 7th');
 assert.equal(drillChord('C','harmonic_minor',7,4).label,'Diminished 7th');
 assert.equal(drillChord('C','major',1,5).label,'Major 9th');
 assert.deepEqual(optionIntervals(drillChord('C','major',2,7),drillChord('C','major',2,7)).chord,['1','♭3','5','♭7','9','11','13']);
 assert.throws(()=>drillChord('C','major',0,3));
});

test('third separators use adjacent pitches including wrapped extensions',()=>{
 const q=drillChord('C','major',1,7);
 assert.deepEqual(optionIntervals(q,q).thirds,[4,3,4,3,3,4]);
});
