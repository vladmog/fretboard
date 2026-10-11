import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSoundProfiles, saveSoundProfiles, exportSoundProfiles, SOUND_DEFAULTS } from '../static/js/core/sound-profiles.js';
test('instrument profiles persist independently and export both profiles', () => {
 let stored = null;
 const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
 const profiles = loadSoundProfiles(storage);
 profiles.guitar.strumDelay = 0.025; profiles.guitar.oscillatorType = 'triangle';
 profiles.bass.strumDelay = 0.2; profiles.bass.filterFrequency = 850;
 assert.equal(saveSoundProfiles(storage, profiles), true);
 const restored = loadSoundProfiles(storage);
 assert.deepEqual(restored, profiles);
 assert.deepEqual(JSON.parse(exportSoundProfiles(restored)), {version:1,...profiles});
 assert.equal(SOUND_DEFAULTS.guitar.strumDelay, 0.08);
});
test('malformed or unavailable storage falls back safely and bounds persisted values', () => {
 assert.deepEqual(loadSoundProfiles(undefined), SOUND_DEFAULTS);
 assert.equal(saveSoundProfiles(undefined, {}), false);
 assert.deepEqual(loadSoundProfiles({getItem:()=>'{bad'}), SOUND_DEFAULTS);
 const profiles = loadSoundProfiles({getItem:()=>JSON.stringify({bass:{volume:999,strumDelay:-1,oscillatorType:'invalid'},guitar:{decay:'bad'}})});
 assert.equal(profiles.bass.volume,-6);assert.equal(profiles.bass.strumDelay,0);
 assert.equal(profiles.bass.oscillatorType,'sawtooth');
 assert.equal(profiles.guitar.decay,SOUND_DEFAULTS.guitar.decay);
});
test('playback applies timbre and schedules notes at the selected strum spacing',async()=>{
 const calls=[];const updates=[];
 class Node { constructor(){this.volume={value:0};this.frequency={value:0};this.wet={value:0};} connect(){return this;} toDestination(){return this;} set(v){updates.push(v);} triggerAttackRelease(...v){calls.push(v);} }
 globalThis.Tone={start:async()=>{},now:()=>10,Filter:Node,Reverb:Node,Limiter:Node,PolySynth:Node,Synth:Node};
 try {
  const sound=await import('../static/js/core/sound.js');
  await sound.playChord(['C2','E2']);
  sound.setParam('oscillatorType','triangle');sound.setParam('strumDelay',0.2);
  calls.length=0;await sound.playChord(['C2','E2','G2']);
  assert.deepEqual(calls.map(c=>c[2]),[10,10.2,10.4]);
  assert.deepEqual(updates.at(-1),{oscillator:{type:'triangle'}});
  sound.setParam('strumDelay',0);calls.length=0;await sound.playChord(['C3','E3']);
  assert.deepEqual(calls.map(c=>c[2]),[10,10]);
 } finally {delete globalThis.Tone;}
});
