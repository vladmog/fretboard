import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveFindSession, restoreFindSession } from '../static/js/core/find-session.js';
test('Find chord restores input and selected result after other modes and Find scale',()=>{
 const state={mode:'f.chord',instrument:'guitar',findMarkers:{'1-3':{string:1,fret:3,noteIndex:7}},findResults:[{symbol:'G'}],findSelectedIndex:0};
 saveFindSession(state);state.mode='f.scale';restoreFindSession(state);
 assert.deepEqual(state.findMarkers,{});assert.equal(state.findSelectedIndex,-1);
 state.findMarkers={'2-1':{string:2,fret:1,noteIndex:0}};saveFindSession(state);
 state.mode='f.chord';restoreFindSession(state);
 assert.equal(state.findMarkers['1-3'].fret,3);assert.equal(state.findResults[0].symbol,'G');assert.equal(state.findSelectedIndex,0);
 state.instrument='bass';restoreFindSession(state);assert.deepEqual(state.findMarkers,{});
 state.instrument='guitar';restoreFindSession(state);assert.equal(state.findSelectedIndex,0);
 state.findMarkers={};state.findResults=[];state.findSelectedIndex=-1;saveFindSession(state);restoreFindSession(state);
 assert.deepEqual(state.findResults,[]);assert.equal(state.findSelectedIndex,-1);
});
