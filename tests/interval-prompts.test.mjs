import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntervalPrompts } from '../static/js/games/interval-prompts.js';

test('spoken interval order follows the live preference and defaults to interval first', () => {
    const state = { activeMode:'root-to-interval', currentRoot:'F#', currentSemitone:2 };
    const names = {2:'Major 2nd',3:'Minor 3rd'};
    let rootFirst=false;
    const {questionSpeech}=createIntervalPrompts(state,names,3,()=>3,()=>rootFirst);
    assert.equal(questionSpeech(),'major second from F sharp');
    rootFirst=true;
    assert.equal(questionSpeech(),'F sharp. major second');
    state.currentRoot='D';state.currentSemitone=3;
    assert.equal(questionSpeech(),'D. minor third');
    rootFirst=false;
    assert.equal(questionSpeech(),'minor third from D');
    assert.equal(createIntervalPrompts(state,names,3,()=>3).questionSpeech(),'minor third from D');
});
