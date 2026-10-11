import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as Theory from '../static/js/core/music-theory.js';
import { getTriadShapes } from '../static/js/core/triads.js';

test('major, minor and diminished triads contain each chord tone once, with correct bass inversions', () => {
    for (const root of Theory.CHROMATIC_NOTES) for (const type of ['maj', 'min', 'dim']) {
        const chord = Theory.buildChord(root, type);
        for (const [tuning, bases] of [[Theory.STANDARD_TUNING, undefined], [Theory.BASS_TUNING, Theory.BASS_STRING_MIDI_BASES]]) {
            const shapes = getTriadShapes(chord, tuning, bases);
            assert(shapes.length > 0, `${root} ${type}`);
            assert(shapes.every(s => [0, 1, 2].includes(s.inversion))); // Some inversions require the excluded wider stretch.
            for (const shape of shapes) {
                assert.equal(new Set(shape.positions.map(p => p.noteIndex)).size, 3);
                assert(shape.high - shape.low <= 3);
                for (const p of shape.positions) {
                    assert(p.fret >= 0 && p.fret <= 15);
                    assert.equal(Theory.getNoteAt(tuning.length - p.string, p.fret, tuning), p.noteIndex);
                    assert.equal(p.midi % 12, p.noteIndex);
                    assert.equal(chord.noteToInterval[p.noteIndex], p.label);
                }
                const bass = [...shape.positions].sort((a, b) => a.midi - b.midi)[0];
                assert.equal(shape.inversion, chord.intervals.indexOf(bass.label));
            }
        }
    }
});

test('known C major voicings classify by sounding bass, including the B-string tuning offset', () => {
    const shapes = getTriadShapes(Theory.buildChord('C', 'maj'));
    const known = [
        { strings: '5-4-3', frets: '3-2-0', inversion: 0 },
        { strings: '3-2-1', frets: '0-1-0', inversion: 2 },
        { strings: '3-2-1', frets: '9-8-8', inversion: 1 }
    ];
    for (const entry of known) {
        const found = shapes.find(s => s.strings === entry.strings && s.positions.map(p => p.fret).join('-') === entry.frets);
        assert(found, JSON.stringify(entry));
        assert.equal(found.inversion, entry.inversion);
    }
});

test('seventh chords are not silently reduced to triads', () => {
    assert.deepEqual(getTriadShapes(Theory.buildChord('C', 'maj7')), []);
});

test('two-string patterns contain all three tones, cover both distributions, and classify by lowest pitch', () => {
    for (const tuning of [Theory.STANDARD_TUNING, Theory.BASS_TUNING]) {
        const bases = tuning === Theory.BASS_TUNING ? Theory.BASS_STRING_MIDI_BASES : undefined;
        for (const root of Theory.CHROMATIC_NOTES) for (const type of ['maj','min','dim']) {
            const chord = Theory.buildChord(root,type);
            const shapes = getTriadShapes(chord,tuning,bases,15,2);
            assert.ok(shapes.length);
            const signatures = new Set();
            for (const shape of shapes) {
                assert.equal(shape.positions.length,3);
                assert.equal(new Set(shape.positions.map(p=>p.noteIndex)).size,3);
                const strings=[...new Set(shape.positions.map(p=>p.string))];
                assert.equal(strings.length,2);assert.equal(Math.abs(strings[0]-strings[1]),1);
                assert.ok(shape.high-shape.low<=3);
                const lowest=shape.positions.reduce((a,b)=>a.midi<b.midi?a:b);
                assert.equal(shape.inversion,chord.intervals.indexOf(lowest.label));
                for(const p of shape.positions) assert.equal(chord.noteToInterval[p.noteIndex],p.label);
                const key=shape.positions.map(p=>`${p.string}:${p.fret}`).sort().join(',');
                assert.ok(!signatures.has(key));signatures.add(key);
            }
            assert.ok(shapes.some(s=>s.positions.filter(p=>p.string===s.positions[0].string).length===2));
            assert.ok(shapes.some(s=>s.positions.filter(p=>p.string===s.positions[0].string).length===1));
        }
    }
    const c = getTriadShapes(Theory.buildChord('C','maj'),undefined,undefined,15,2);
    assert.ok(c.some(s=>s.inversion===0 && ['2:1','1:0','1:3'].every(key=>s.positions.some(p=>`${p.string}:${p.fret}`===key))));
});


test('combined triads include both complete sets in fret order', () => {
    const chord = Theory.buildChord('C','maj');
    const two = getTriadShapes(chord,undefined,undefined,15,2);
    const three = getTriadShapes(chord);
    const both = getTriadShapes(chord,undefined,undefined,15,'both');
    assert.equal(both.length,two.length+three.length);
    const key=s=>s.positions.map(p=>`${p.string}:${p.fret}`).sort().join(',');
    assert.deepEqual(new Set(both.map(key)),new Set([...two,...three].map(key)));
    for(let i=1;i<both.length;i++) assert.ok(both[i].low>=both[i-1].low);
});
