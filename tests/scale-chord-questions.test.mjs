import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIAD_SCALES,scaleChordQuestions,scaleChordDegree} from '../static/js/core/scale-chord-questions.js';
import {buildScale,buildChord} from '../static/js/core/music-theory.js';
test('all seven degrees in every supported scale and mode have correctly spelled triads',()=>{
 const roots=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
 const questions=scaleChordQuestions(roots,TRIAD_SCALES);
 assert.equal(questions.length,roots.length*TRIAD_SCALES.length*7);
 for(const q of questions){
  const scale=buildScale(q.scaleRoot,q.scaleType);
  assert.deepEqual(q.notes,[0,2,4].map(n=>scale.notes[(q.degree-1+n)%7]));
  assert.deepEqual(buildChord(q.root,q.chordType).notes,q.notes);
 }
 assert.deepEqual(scaleChordQuestions(['C'],['major'])[1].notes,['D','F','A']);
 assert.deepEqual(scaleChordQuestions(['C'],['dorian'])[3].notes,['F','A','C']);
 assert.deepEqual(scaleChordQuestions(['C'],['pentatonic_major']),[]);
});
test('numbers hide quality and Roman numerals show major minor diminished augmented',()=>{
 for(const [chordType,expected] of [['maj','III'],['min','iii'],['dim','iii°'],['aug','III+']]){
  assert.equal(scaleChordDegree({degree:3,chordType},false),'3');
  assert.equal(scaleChordDegree({degree:3,chordType},true),expected);
 }
});
