import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as MusicTheory from '../static/js/core/music-theory.js';

for (const file of ['interval-training.js']) {
    const source = readFileSync(new URL(`../static/js/games/${file}`, import.meta.url), 'utf8');
    const helper = source.slice(source.indexOf('    function getBuilderNoteName('), source.indexOf('\n    function ', source.indexOf('    function getBuilderNoteName(') + 10));
    test(`${file}: chord labels follow chord degrees, not generic accidentals`, () => {
        for (const [root, type, expected] of [
            ['C', 'min', ['C', 'Eb', 'G']],
            ['C#', 'min', ['C#', 'E', 'G#']],
            ['F#', 'maj', ['F#', 'A#', 'C#']],
            ['Gb', 'maj', ['Gb', 'Bb', 'Db']],
            ['C#', 'maj', ['C#', 'E#', 'G#']],
        ]) {
            const state = { activeMode: 'chord-builder', currentRoot: root, currentChordType: type };
            const name = new Function('MusicTheory', 'gameState', `${helper}; return getBuilderNoteName;`)(MusicTheory, state);
            assert.deepEqual(expected.map(n => name(MusicTheory.getNoteIndex(n))), expected);
        }
    });
}
