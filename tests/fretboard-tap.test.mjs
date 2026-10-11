import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { voicingNotes } from '../static/js/core/voicing-audio.js';

function setup() {
    const played = [], rotations = [], scheduled = [], pulses = [], temporary = [];
    const host = {isConnected: true};
    const state = { mode: 'chords', instrument: 'guitar', soundEnabled: true, fretboardTapAction: 'rotate', fretboard: {showTapMarker: (...args) => temporary.push(args), positionAt: () => ({string: 1, fret: 0})} };
    const context = vm.createContext({state, voicingNotes, pulsePluck: (...args) => pulses.push(args), Sound: {playChord: (notes, octave, callback) => {played.push([...notes]); scheduled.push(() => callback(notes[0]));}}, bindTouchTap() {}, document: {
        getElementById: () => host, readyState: 'loading', addEventListener() {}, querySelectorAll: () => [{getAttribute: () => 0, setAttribute: (_, value) => rotations.push(value)}]
    }});
    const source = readFileSync(new URL('../static/js/app/rotation-toggle.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace('export function', 'function').replace(/^export \{.*\};/gm, '');
    vm.runInContext(source, context);
    const tap = (host = null, type = 'touchend') => context.toggleRotation({type, target: {closest: selector => selector === '.comparison-fretboard' ? host : null}, changedTouches: [{clientX: 10, clientY: 20}]});
    return {context, state, played, rotations, tap, scheduled, pulses, temporary};
}
test('default touch rotates; mouse click does nothing', () => {
    const h = setup(); h.tap(null, 'click'); assert.equal(h.rotations.length, 0);
    h.tap(); assert.equal(h.rotations.length, 1); assert.equal(h.played.length, 0);
});
test('play tap uses actual current instrument pitch and respects Sound', () => {
    const h = setup(); h.state.fretboardTapAction = 'play';
    h.tap(); assert.deepEqual(h.played, [['E4']]);
    h.state.instrument = 'bass'; h.tap(); assert.deepEqual(h.played[1], ['G2']);
    h.state.soundEnabled = false; h.tap(); assert.equal(h.played.length, 2); assert.equal(h.rotations.length, 0);
});
test('comparison tap resolves its own board; Find modes retain note entry', () => {
    const h = setup(); h.state.fretboardTapAction = 'play';
    const host = {}; h.context.registerTapBoard(host, {positionAt: () => ({string: 6, fret: 3})});
    h.tap(host); assert.deepEqual(h.played, [['G2']]);
    for (const mode of ['f.chord', 'f.scale']) {h.state.mode = mode; h.tap();}
    assert.equal(h.played.length, 1);
});

test('manual note visuals wait for audio timing and target the tapped position', () => {
    const h = setup(); h.state.fretboardTapAction = 'play'; h.tap();
    assert.equal(h.pulses.length, 0); assert.equal(h.temporary.length, 0);
    h.scheduled[0]();
    assert.deepEqual(h.temporary, [[1, 0]]);
    assert.equal(h.pulses[0][0], 'E4');
    assert.deepEqual(h.pulses[0][2], {string: 1, fret: 0});
});
