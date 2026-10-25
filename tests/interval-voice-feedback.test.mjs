import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem:()=>null };
const { createIntervalVoice } = await import('../static/js/games/interval-voice.js');
const { unlockVoiceCue, playVoiceCue } = await import('../static/js/games/voice-cue.js');

test('correct feedback advances only on completion; wrong, partial, and touch-only answers do not',async()=>{
    globalThis.window = {addEventListener(){}};
    globalThis.document = {addEventListener(){}};
    const state = {currentRoot:'C',currentRootIndex:0,currentSemitone:4,activeMode:'root-to-interval',answered:false};
    const speech=[];let next=0, errors=0, successes=0;
    const controller={enabled:true,say:(text,after,beforeSpeech)=>speech.push({text,after,beforeSpeech})};
    const game = createIntervalVoice({getState:()=>state,question:()=>'',submit(){},next:()=>next++,restart(){},roundSounds(){},inputFactory:()=>controller,errorSound:async()=>{errors++;},positiveSound:async()=>{successes++;}});
    game.answer(4,()=>{state.answered=true;});
    assert.equal(next,0);assert.equal(speech[0].text,'');assert.doesNotMatch(speech[0].text,/Say next/);
    speech[0].after();assert.equal(next,1);
    state.answered=false;game.answer(7,()=>{});assert.equal(speech[1].text,'G is wrong.');assert.equal(speech[1].after,undefined);
    await speech[0].beforeSpeech();assert.equal(successes,1);
    assert.equal(speech[1].beforeSpeech,undefined);assert.equal(errors,0);
    state.activeMode='chord-builder';state.chordNotes=[0,4,7];state.currentDegreeIndex=0;
    game.answer(0,()=>{state.currentDegreeIndex++;});assert.equal(speech[2].after,undefined);assert.equal(speech[2].text,'');
    controller.enabled=false;game.answer(4,()=>{state.answered=true;});assert.equal(speech.length,3);assert.equal(next,1);
});

test('listening chime resumes interrupted audio and never plays a late cue after cancellation',async()=>{
    let audio;
    class FakeAudio {
        constructor(){audio=this;this.state='suspended';this.currentTime=10;this.tones=[];this.resumes=0;}
        async resume(){this.resumes++;this.state='running';}
        createOscillator(){const o={frequency:{},connect(){},disconnect(){},start:t=>{o.startTime=t;},stop:t=>{o.stopTime=t;}};this.tones.push(o);return o;}
        createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
    }
    globalThis.window={AudioContext:FakeAudio};
    unlockVoiceCue();audio.state='interrupted';
    assert.equal(await playVoiceCue(),true);assert.equal(audio.resumes,2);assert.equal(audio.tones.length,2);
    assert.ok(audio.tones[1].startTime>audio.tones[0].startTime);
    audio.state='suspended';assert.equal(await playVoiceCue(()=>false),true);assert.equal(audio.tones.length,2);
    audio.state='interrupted';audio.resume=async()=>{throw new Error('unavailable');};
    assert.equal(await playVoiceCue(),false);
});
