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

test('extended builder questions preserve stacked thirds and contextual spelling',()=>{
 for(const size of [4,5,6,7])for(const q of scaleChordQuestions(['C','C#','Eb'],TRIAD_SCALES,size)){
  assert.equal(q.notes.length,size);assert.equal(q.formula.length,size);
  const scale=buildScale(q.scaleRoot,q.scaleType);
  assert.deepEqual(q.notes,Array.from({length:size},(_,i)=>scale.notes[(q.degree-1+2*i)%7]));
 }
 const q=scaleChordQuestions(['C'],['major'],5)[1];
 assert.deepEqual(q.notes,['D','F','A','C','E']);
 assert.deepEqual(q.formula,['1','b3','5','b7','9']);
 assert.equal(q.label,'Minor 9th');
});
