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
            assert.deepEqual([...new Set(shapes.map(s => s.inversion))].sort(), [0, 1, 2]);
            for (const shape of shapes) {
                assert.equal(new Set(shape.positions.map(p => p.noteIndex)).size, 3);
                assert(shape.high - shape.low <= 4);
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
