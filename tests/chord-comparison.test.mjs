import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Theory from '../static/js/core/music-theory.js';
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
    const context = vm.createContext({
        applyCurrentRotation() {}, Theory, getTriadShapes, state: { showNoteNames: false },
        guide: JSON.parse(readFileSync(new URL('../static/data/harmony-guide.json', import.meta.url))),
        getInstrumentTuning: () => Theory.STANDARD_TUNING,
        getInstrumentMidiBases: () => undefined,
        window: { matchMedia: () => ({ matches: false }) },
        document: { getElementById: () => container, createElement: () => new Element() },
        createFretboard: () => {
            const positions = []; boards.push(positions);
            return { setMarker: (string, fret) => positions.push([string, fret]) };
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
});
