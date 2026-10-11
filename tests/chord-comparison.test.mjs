import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Theory from '../static/js/core/music-theory.js';
import { getChordScaleContext, drawChordScaleBackground } from '../static/js/app/chord-scale-context.js';
import { getTriadShapes } from '../static/js/core/triads.js';

for (const enabled of [false, true]) test(`comparison follows triad checkbox: ${enabled}`, () => {
    class Element {
        constructor() { this.children = []; this.scrollTop = 0; this.clientWidth = 800; this.clientHeight = 150; }
        appendChild(node) { this.children.push(node); }
        replaceChildren() { this.children = []; }
        querySelector() { return { setAttribute() {} }; }
    }
    const container = new Element();
    const boards = [];
    const gestures = [];
    const context = vm.createContext({
        getChordScaleContext, drawChordScaleBackground, bindFretboardGestures: (_, __, advance) => gestures.push(advance), applyCurrentRotation() {}, Theory, getTriadShapes, state: { showNoteNames: false },
        guide: JSON.parse(readFileSync(new URL('../static/data/harmony-guide.json', import.meta.url))),
        getInstrumentTuning: () => Theory.STANDARD_TUNING,
        getInstrumentMidiBases: () => undefined,
        window: { matchMedia: () => ({ matches: false }) },
        document: { getElementById: () => container, createElement: () => new Element() },
        createFretboard: () => {
            const positions = []; boards.push(positions);
            return { clearMarkers: () => { positions.length = 0; }, setMarker: (string, fret) => positions.push([string, fret]) };
        }
    });
    const source = readFileSync(new URL('../static/js/app/triad-comparison.js', import.meta.url), 'utf8')
        .replace(/^import .*;\n/gm, '').replaceAll('export function', 'function');
    vm.runInContext(source, context);
    vm.runInContext(`entries = [{root:'C',type:'maj'}, {root:'A',type:'min'}, {root:'G',type:'maj7'}];
        preferences = {enabled:${enabled},stringSet:'3-2-1',inversion:'1',index:0}; renderBoards();`, context);
    assert.equal(boards.length, 3);
    for (const [index, [root, type]] of [['C', 'maj'], ['A', 'min'], ['G', 'maj7']].entries()) {
        const chord = Theory.buildChord(root, type);
        const expected = enabled && type !== 'maj7'
            ? getTriadShapes(chord).filter(shape => shape.strings === '3-2-1' && shape.inversion === 1)[0].positions
            : Theory.getNotesOnFretboard(chord.noteToInterval, 15, root);
        assert.deepEqual(boards[index], expected.map(p => [p.string, p.fret]));
    }
    if (enabled) {
        vm.runInContext("preferences.inversion = 'all'; renderBoards();", context);
        const first = boards.at(-3), second = boards.at(-2);
        const originalFirst = JSON.stringify(first), originalSecond = JSON.stringify(second);
        gestures.at(-2)(1);
        assert.notEqual(JSON.stringify(first), originalFirst);
        assert.equal(JSON.stringify(second), originalSecond, 'other chord must not change');
        assert.equal(vm.runInContext('preferences.index', context), 0, 'shared settings stay intact');
        const changedFirst = JSON.stringify(first);
        context.renderBoards();
        assert.equal(JSON.stringify(boards.at(-3)), changedFirst, 'selection survives orientation rerender');
    }

    vm.runInContext(`entries = [
        {root:'C',type:'maj',progressionDegree:'I'},
        {root:'F',type:'maj',progressionDegree:'IV'},
        {root:'G',type:'maj',progressionDegree:'V'},
        {root:'C',type:'maj',progressionDegree:'I'},
        {root:'A',type:'min'},
        {root:'B',type:'dim',progressionDegree:'vii°'}
    ]; preferences.enabled = false; renderBoards();`, context);
    assert.deepEqual(container.children.map(card => card.children[0].textContent),
        ['I · C', 'IV · F', 'V · G', 'I · C', '5. Am', 'vii° · Bdim']);

});
