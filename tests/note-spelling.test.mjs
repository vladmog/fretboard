import test from 'node:test';
import assert from 'node:assert/strict';
import { needsSpellingRetry } from '../static/js/games/note-spelling.js';

test('enharmonic chord answer retries only its spelling', () => {
 const state={activeMode:'chord-builder',currentRoot:'C',currentChordType:'min',currentDegreeIndex:1};
 assert.equal(needsSpellingRetry(state,3,'D#'),true);
 assert.equal(needsSpellingRetry(state,3,'Eb'),false);
 assert.equal(needsSpellingRetry(state,4,'E'),false); // normal wrong-note path
 assert.equal(needsSpellingRetry(state,3),false); // taps and voice remain pitch based
 assert.equal(state.currentDegreeIndex,1);
});
test('scale spelling follows the key, including enharmonic naturals', () => {
 const state={activeMode:'scale-builder',currentRoot:'F#',currentScaleType:'major',currentDegreeIndex:6};
 assert.equal(needsSpellingRetry(state,5,'F'),true);
 assert.equal(needsSpellingRetry(state,5,'E#'),false);
 const flat={...state,currentRoot:'F',currentDegreeIndex:3};
 assert.equal(needsSpellingRetry(flat,10,'A#'),true);
 assert.equal(needsSpellingRetry(flat,10,'Bb'),false);
});
