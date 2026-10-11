import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {SOUND_DEFAULTS} from '../static/js/core/sound-profiles.js';
test('bass chord playback drops one octave while explicit inversion pitches are unchanged',()=>{
 const calls=[];const state={instrument:'guitar'};
 const code=readFileSync(new URL('../static/js/app/instrument-sound.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export \* .*;$/gm,'').replace('export function','function');
 const ctx=vm.createContext({pulsePluck(){},state,Sound:{playChord:(...args)=>calls.push(args)}});vm.runInContext(code,ctx);
 ctx.playChord(['C','E','G']);assert.equal(calls.at(-1)[1],3);
 state.instrument='bass';ctx.playChord(['C','E','G']);assert.equal(calls.at(-1)[1],2);
 ctx.playChord(['C','E','G'],4);assert.equal(calls.at(-1)[1],3);
 const pitches=['E1','G1','C2'];ctx.playChord(pitches,4);assert.deepEqual(calls.at(-1).slice(0,2),[pitches,4]);
 state.instrument='guitar';ctx.playChord(['C','E','G'],4);assert.equal(calls.at(-1)[1],4);
});
test('bass factory sound matches the supplied profile',()=>{
 assert.deepEqual(SOUND_DEFAULTS.bass,{oscillatorType:'sawtooth',attack:0.001,decay:0.84,release:0.79,filterFrequency:2700,reverbWet:0.29,volume:-12,strumDelay:0.155});
});
