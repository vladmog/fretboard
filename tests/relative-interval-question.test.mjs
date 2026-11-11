import test from 'node:test';
import assert from 'node:assert/strict';
import { relativeIntervalQuestion } from '../static/js/core/relative-interval-question.js';
const roots = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
test('previous answer becomes the given pitch in every single-note mode', () => {
    for (let previous = 0; previous < 12; previous++) {
        for (let interval = 0; interval <= 24; interval++) {
            for (const mode of ['root-to-interval','interval-to-root','interval-to-interval']) {
                const original = { root:'C', semitone:interval, givenSemitone:interval, targetSemitone:7 };
                const result = relativeIntervalQuestion(original, mode, previous, roots);
                const offset = mode === 'root-to-interval' ? 0 : interval;
                assert.equal((roots.indexOf(result.root) + offset) % 12, previous);
                assert.equal(result.semitone, interval);
                assert.equal(result.targetSemitone, 7);
                assert.equal(original.root, 'C');
            }
        }
    }
});
test('first question, disabled chaining and builders retain the sampled question', () => {
    const q = { root:'Eb', semitone:3 };
    assert.equal(relativeIntervalQuestion(q, 'root-to-interval', null, roots), q);
    for (const mode of ['scale-builder','chord-builder']) {
        assert.equal(relativeIntervalQuestion(q, mode, 7, roots), q);
    }
});
