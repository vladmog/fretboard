import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { voicingNotes } from '../static/js/core/voicing-audio.js';

function setup() {
    const played = [], rotations = [];
    const state = { mode: 'chords', instrument: 'guitar', soundEnabled: true, fretboardTapAction: 'rotate', fretboard: {positionAt: () => ({string: 1, fret: 0})} };
    const context = vm.createContext({state, voicingNotes, Sound: {playChord: notes => played.push([...notes])}, bindTouchTap() {}, document: {
        readyState: 'loading', addEventListener() {}, querySelectorAll: () => [{getAttribute: () => 0, setAttribute: (_, value) => rotations.push(value)}]
    }});
    const source = readFileSync(new URL('../static/js/app/rotation-toggle.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace('export function', 'function').replace(/^export \{.*\};/gm, '');
    vm.runInContext(source, context);
    const tap = (host = null, type = 'touchend') => context.toggleRotation({type, target: {closest: selector => selector === '.comparison-fretboard' ? host : null}, changedTouches: [{clientX: 10, clientY: 20}]});
    return {context, state, played, rotations, tap};
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
