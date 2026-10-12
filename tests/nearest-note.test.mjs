import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notePositions,closestNotes,checkNearest} from '../static/js/core/nearest-note.js';
test('closest pitches include all fingering and tritone ties',()=>{
 const start={string:3,fret:2}; // A3
 const best=closestNotes(start,3,'guitar');
 assert.equal(best.distance,6);
 assert.deepEqual([...new Set(best.positions.map(p=>p.midi))],[51,63]);
 for(const p of best.positions)assert.equal(checkNearest(start,p,3,'guitar').correct,true);
});
test('all questions on guitar and bass score exact pitch distance across the board',()=>{
 for(const instrument of ['guitar','bass'])for(const start of notePositions(instrument))for(let target=0;target<12;target++){
  const available=notePositions(instrument).filter(p=>p.midi%12===target);
  const minimum=Math.min(...available.map(p=>Math.abs(p.midi-start.midi)));
  const best=closestNotes(start,target,instrument);
  assert.equal(best.distance,minimum);
  for(const p of available)assert.equal(checkNearest(start,p,target,instrument).correct,Math.abs(p.midi-start.midi)===minimum);
 }
});
