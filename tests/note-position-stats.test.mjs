import {test} from 'node:test';
import assert from 'node:assert/strict';
import {beginPositionTiming,positionTimings} from '../static/js/games/note-position-stats.js';
test('position timing stores averages per instrument and position, excluding revealed answers and duplicate completion',()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 try{
  let time=100;const now=()=>time,pos={string:2,fret:5};
  const first=beginPositionTiming('bass',now);time=3100;first.complete(pos);time=5100;first.complete(pos);
  const second=beginPositionTiming('bass',now);time=10100;second.complete(pos);
  assert.deepEqual(positionTimings('bass')['2:5'],{mean:4000,count:2});
  const shown=beginPositionTiming('bass',now);shown.reveal();time=15100;shown.complete(pos);
  assert.equal(positionTimings('bass')['2:5'].count,2);
  const guitar=beginPositionTiming('guitar',now);time=16100;guitar.complete(pos);
  assert.deepEqual(positionTimings('guitar')['2:5'],{mean:1000,count:1});
  assert.equal(positionTimings('bass')['1:5'],undefined);
 }finally{delete globalThis.localStorage;}
});
