import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boxNotes,checkBoxNote} from '../static/js/core/nearest-note.js';

test('D and G practice only offers and accepts those bass strings in every box',()=>{
    for(let first=1;first<=12;first++){
        const candidates=boxNotes('bass',first,undefined,[1,2]);
        assert.equal(candidates.length,8);
        for(const p of candidates){
            assert.ok([1,2].includes(p.string));
            assert.equal(checkBoxNote(p,p.midi%12,'bass',first,[1,2]).correct,true);
        }
        for(const p of boxNotes('bass',first).filter(p=>p.string>2)){
            assert.equal(checkBoxNote(p,p.midi%12,'bass',first,[1,2]).correct,false);
        }
    }
});
test('single and nonadjacent guitar selections always supply valid targets',()=>{
    for(const strings of [[1],[6],[2,5]])for(let first=1;first<=12;first++){
        const candidates=boxNotes('guitar',first,undefined,strings);
        assert.equal(candidates.length,strings.length*4);
        for(const p of candidates)assert.ok(boxNotes('guitar',first,p.midi%12,strings).length);
        assert.equal(checkBoxNote({...candidates[0],fret:first+4},candidates[0].midi%12,'guitar',first,strings).inside,false);
    }
});
