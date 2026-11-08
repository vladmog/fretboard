import {test} from 'node:test';
import assert from 'node:assert/strict';
import {snapRoundCount,totalRoundsFor,logQuestionTime} from '../static/js/games/game-utils.js';
import {beginPracticeQuestion} from '../static/js/games/practice-log.js';
test('old finite round preferences cannot end continuous practice',()=>{
 for(const saved of [undefined,0,5,10,20,50,100]){
  assert.equal(snapRoundCount(saved),0);
  assert.equal(totalRoundsFor(saved),Infinity);
 }
});
test('results save immediately without accumulating or double committing',()=>{
 const state={totalRounds:Infinity,questionTimes:[]};const saved=[];
 const commit=()=>saved.push(...state.questionTimes);
 logQuestionTime(state,{correct:false},commit);
 assert.equal(saved.length,1);assert.equal(state.questionTimes.length,0);
 logQuestionTime(state,{correct:true},commit);
 commit();assert.deepEqual(saved,[{correct:false},{correct:true}]);
});
test('practice logs survive reload and retries count only once per question',()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 try{
  const answer=beginPracticeQuestion('note-in-box',['bass','2']);answer(false);answer(true);
  beginPracticeQuestion('note-in-box',['bass','2'])(true);
  const stats=JSON.parse(data.get('fretboard-games-stats'))['note-in-box'].bass['2'];
  assert.equal(stats.tested,2);assert.equal(stats.correct,1);assert.equal(stats.timedCount,2);
 }finally{delete globalThis.localStorage;}
});
