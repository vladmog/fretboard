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

test('answer choices are limited to selected scales for every chord size',()=>{
 const scales=['major','natural_minor'];
 assert.deepEqual(chordQualityOptions(4,scales).map(o=>o.label).sort(),
  ['Dominant 7th','Half-diminished 7th','Major 7th','Minor 7th']);
 for(let size=3;size<=7;size++){
  const expected=new Set(scales.flatMap(scale=>Array.from({length:7},(_,i)=>drillChord('C',scale,i+1,size).quality)));
  assert.deepEqual(new Set(chordQualityOptions(size,scales).map(o=>o.quality)),expected);
 }
 assert.ok(chordQualityOptions(4,['harmonic_minor']).some(o=>o.label==='Minor-major 7th'));
 assert.ok(chordQualityOptions(4,['harmonic_minor']).some(o=>o.label==='Augmented major 7th'));
 assert.deepEqual(chordQualityOptions(4,[]),[]);
});

test('major and minor come first, followed by selected-scale frequency',()=>{
 assert.deepEqual(chordQualityOptions(4,['major','natural_minor']).map(o=>o.label),['Major 7th','Minor 7th','Dominant 7th','Half-diminished 7th']);
 for(let size=3;size<=7;size++){
  const options=chordQualityOptions(size,['major','natural_minor']);
  const first=options[0].quality.split(',').slice(1, size===3?3:4).join(',');
  assert.equal(first,size===3?'4,7':'4,7,11');
 }
 const options=chordQualityOptions(4,['harmonic_minor']);
 assert.ok(options.findIndex(o=>o.label==='Major 7th')<options.findIndex(o=>o.label==='Minor 7th'));
});
