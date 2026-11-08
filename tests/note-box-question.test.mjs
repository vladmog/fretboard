import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boxNoteName,BOX_MODES,makeBoxQuestion,boxQuestionText,sanitizeBoxMode} from '../static/js/core/note-box-question.js';
import {uniqueBoxQuestions,boxNotes} from '../static/js/core/nearest-note.js';
import {getNoteName} from '../static/js/core/music-theory.js';
test('interval question equations resolve to the selected answer across every pitch and interval',()=>{
 for(let target=0;target<12;target++)for(let interval=1;interval<12;interval++)for(const {id} of BOX_MODES){
  const q=makeBoxQuestion(target,id,[interval],()=>0);
  assert.equal(q.target,target);
  if(id==='root-to-interval')assert.equal((q.given+q.interval)%12,target);
  if(id==='interval-to-root')assert.equal((q.given-q.givenInterval+12)%12,target);
  if(id==='interval-to-interval'){
   assert.equal((q.given-q.givenInterval+q.interval+12)%12,target);
   assert.notEqual(q.givenInterval,q.interval);
  }
 }
});
test('all modes keep the unique in-box answer on selected strings and bounded frets',()=>{
 for(const instrument of ['bass','guitar'])for(const candidate of uniqueBoxQuestions(instrument,[1,2],3,8))for(const {id} of BOX_MODES){
  const q=makeBoxQuestion(candidate.target,id,[3,6],()=>0.5);
  const matches=boxNotes(instrument,candidate.first,q.target,[1,2],candidate.last);
  assert.equal(matches.length,1);assert.ok(matches[0].fret>=3&&matches[0].fret<=8);
 }
});
test('prompts state the relationship without revealing the answer; legacy settings default to note mode',()=>{
 const settings={};sanitizeBoxMode(settings);assert.equal(settings.mode,'note');assert.equal(settings.intervals.length,11);
 assert.deepEqual(boxQuestionText(makeBoxQuestion(3,'root-to-interval',[3]),getNoteName),{instruction:'Find',target:'Minor 3rd',context:'from C'});
 assert.deepEqual(boxQuestionText(makeBoxQuestion(0,'interval-to-root',[3]),n=>getNoteName(n,true)),{instruction:'Find',target:'the root',context:'Eb is the Minor 3rd'});
});

test('reference is present in the box and impossible interval filters return no question',()=>{
 for(const instrument of ['bass','guitar'])for(const candidate of uniqueBoxQuestions(instrument,[1,2],0,15))for(const {id} of BOX_MODES){
  const pitches=boxNotes(instrument,candidate.first,undefined,[1,2],candidate.last).map(p=>p.midi%12);
  const q=makeBoxQuestion(candidate.target,id,[3,6],()=>0.5,pitches);
  if(q&&id!=='note'){assert.ok(pitches.includes(q.given));assert.notEqual(q.given,q.target);}
 }
 assert.equal(makeBoxQuestion(0,'root-to-interval',[6],()=>0,[0,1,2,3]),null);
});

test('note spellings follow interval context in all question directions',()=>{
 for(const flats of [false,true]){
  const forward=makeBoxQuestion(3,'root-to-interval',[3],()=>0);
  assert.equal(boxNoteName(forward,3,flats),'Eb');
  const inverse=makeBoxQuestion(0,'interval-to-root',[3],()=>0);
  assert.equal(boxNoteName(inverse,inverse.given,flats),'Eb');
  assert.equal(boxNoteName(inverse,inverse.target,flats),'C');
 }
 const sharp=makeBoxQuestion(5,'root-to-interval',[4],()=>0);
 assert.equal(boxNoteName(sharp,sharp.target,false),'E#');
 const between=makeBoxQuestion(7,'interval-to-interval',[7,3],()=>0);
 assert.equal(boxNoteName(between,between.given,false),'Eb');
 assert.equal(boxNoteName(between,between.target,false),'G');
});
