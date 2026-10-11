import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSongSection, validateSongs } from '../static/js/core/songs.js';
const catalog = JSON.parse(readFileSync(new URL('../static/data/songs.json', import.meta.url)));
test('song sections preserve order, repeats, degree and source context through serialization', () => {
    validateSongs(catalog);
    const song = catalog[0];
    const result = JSON.parse(JSON.stringify(buildSongSection(song, song.sections[0])));
    assert.equal(result.length, 16);
    assert.deepEqual(result.slice(0, 4).map(c => c.symbol), ['Bm','F#m7','Bm','F#m7']);
    assert.equal(result[4].progressionDegree, 'bVImaj7');
    assert.ok(result.every(c => c.referenceKey === 'B' && c.referenceScale === 'natural_minor' && c.songId === song.id));
});
test('borrowed chords, modulations and explicit unknown contexts remain intact', () => {
    const song = {id:'mixed',referenceKey:'C',referenceScale:'major'};
    const section = {name:'Bridge',referenceKey:'A',referenceScale:'natural_minor',chords:[
        {root:'E',type:'maj',degree:'V'},
        {root:'F#',type:'maj',degree:'I',referenceKey:'F#',referenceScale:'major'},
        {root:'C',type:'aug',referenceKey:null,referenceScale:null,degree:'I'}
    ]};
    const result = buildSongSection(song, section);
    assert.equal(result[0].symbol, 'E'); // G# is outside natural minor; do not coerce it.
    assert.equal(result[0].referenceKey, 'A');
    assert.equal(result[1].referenceKey, 'F#');
    assert.equal(result[2].referenceKey, null);
    assert.equal(result[2].referenceScale, null);
    assert.equal(result[2].progressionDegree, null);
});
test('catalog rejects malformed notes, chord types and duplicate IDs', () => {
    assert.throws(() => buildSongSection({}, {chords:[{root:'invalid',type:'maj'}]}));
    assert.throws(() => buildSongSection({}, {chords:[{root:'C',type:'nope'}]}));
    assert.throws(() => validateSongs([catalog[0],catalog[0]]));
});
