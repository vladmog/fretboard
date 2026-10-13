import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notePositions,boxNotes,checkBoxNote} from '../static/js/core/nearest-note.js';
test('every box covers exactly four frets across all strings on guitar and bass',()=>{
 for(const instrument of ['guitar','bass'])for(let first=1;first<=12;first++){
  const notes=boxNotes(instrument,first);
  assert.equal(notes.length,instrument==='bass'?16:24);
  assert.deepEqual([...new Set(notes.map(p=>p.fret))],[first,first+1,first+2,first+3]);
  for(const target of new Set(notes.map(p=>p.midi%12))){
   assert.ok(boxNotes(instrument,first,target).length);
   for(const p of notePositions(instrument))assert.equal(checkBoxNote(p,target,instrument,first).correct,p.fret>=first&&p.fret<=first+3&&p.midi%12===target);
  }
 }
});
test('same note outside the box is rejected; other octaves inside are accepted',()=>{
 const answers=boxNotes('guitar',5,9);
 assert.ok(answers.length>1);
 for(const p of answers)assert.equal(checkBoxNote(p,9,'guitar',5).correct,true);
 assert.deepEqual(checkBoxNote({string:5,fret:0},9,'guitar',5),{inside:false,matches:true,correct:false});
});

test('string questions accept only the target pitch on the requested string', async()=>{
 const {stringNotes,checkStringNote}=await import('../static/js/core/nearest-note.js');
 for(const instrument of ['guitar','bass'])for(let string=1;string<=(instrument==='bass'?4:6);string++)for(let target=0;target<12;target++){
  assert.ok(stringNotes(instrument,string,target).length);
  for(const p of notePositions(instrument))assert.equal(checkStringNote(p,target,instrument,string).correct,p.string===string&&p.midi%12===target);
 }
});
