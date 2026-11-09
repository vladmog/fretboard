import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drillCandidates,sanitizeDrillDistance} from '../static/js/core/fretboard-drill-distance.js';
import {notePositions} from '../static/js/core/nearest-note.js';
test('distance limits both axes, includes diagonals, excludes repeats, and works at boundaries',()=>{
 for(const instrument of ['guitar','bass'])for(const previous of notePositions(instrument))for(const distance of [1,2,15]){
  const actual=drillCandidates(instrument,previous,true,distance);
  const expected=notePositions(instrument).filter(p=>Math.max(Math.abs(p.string-previous.string),Math.abs(p.fret-previous.fret))<=distance&&(p.string!==previous.string||p.fret!==previous.fret));
  assert.deepEqual(actual,expected);assert.ok(actual.length);
 }
 assert.equal(drillCandidates('guitar',null,true,1).length,96);
 assert.equal(drillCandidates('bass',{string:1,fret:0},false,1).length,63);
 assert.equal(sanitizeDrillDistance(''),1);assert.equal(sanitizeDrillDistance('bad'),1);assert.equal(sanitizeDrillDistance(100),15);
});

test('A B A cannot continue to B, without relaxing the distance bound',()=>{
 const a={string:1,fret:0},b={string:2,fret:1};
 const options=drillCandidates('bass',a,true,1,[a,b,a]);
 assert.ok(options.length);assert.ok(!options.some(p=>p.string===b.string&&p.fret===b.fret));
 assert.ok(options.every(p=>Math.abs(p.string-a.string)<=1&&Math.abs(p.fret-a.fret)<=1));
});
