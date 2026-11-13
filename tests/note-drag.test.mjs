import test from 'node:test';
import assert from 'node:assert/strict';
import {angularDelta,dragAccidental,spelledNatural,sameSpelling} from '../static/js/core/note-drag.js';
test('circle dragging distinguishes direction and double accidentals across the top seam',()=>{
 assert.equal(angularDelta(179,-151),30);
 assert.equal(angularDelta(-179,151),-30);
 for(const [degrees,steps]of [[0,0],[10,0],[30,1],[-30,-1],[60,2],[-60,-2],[120,2],[-120,-2]])assert.equal(dragAccidental(degrees),steps);
 assert.equal(spelledNatural('E',-2),'Ebb');
 assert.equal(spelledNatural('D',2),'D##');
 assert.ok(sameSpelling('Ebb','E♭♭'));
 assert.ok(!sameSpelling('D#','Eb'));
 assert.ok(!sameSpelling('D','Ebb'));
});
