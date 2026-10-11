import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { preserveScrollPosition } from '../static/js/app/scroll-position.js';

test('restores nested vertical and horizontal scroll after a rebuild, including errors', () => {
    const parent = { scrollTop: 240, scrollLeft: 0, parentElement: null };
    const child = { scrollTop: 30, scrollLeft: 60, parentElement: parent };
    assert.throws(() => preserveScrollPosition(child, () => {
        parent.scrollTop = child.scrollTop = child.scrollLeft = 0;
        throw new Error('render failed');
    }), /render failed/);
    assert.equal(parent.scrollTop, 240);
    assert.equal(child.scrollTop, 30);
    assert.equal(child.scrollLeft, 60);
    assert.equal(preserveScrollPosition(null, () => 42), 42);
});

test('progression selection and deselection keep a scrolled control panel in place', () => {
    const panel = { scrollTop: 180, scrollLeft: 12, parentElement: null };
    class Element {
        constructor() {
            this.children = []; this.listeners = {}; this.scrollTop = 0; this.scrollLeft = 0;
            this.classList = { add() {} };
        }
        // Model scroll clamping when a render temporarily removes its content.
        set innerHTML(value) { this.children = []; if (this === container) panel.scrollTop = panel.scrollLeft = 0; }
        appendChild(node) { node.parentElement = this; this.children.push(node); }
        addEventListener(name, handler) { this.listeners[name] = handler; }
    }
    const container = new Element(); container.parentElement = panel;
    const chords = [
        { root: 'C', type: 'maj', symbol: 'C', numeral: 'I' },
        { root: 'G', type: 'maj', symbol: 'G', numeral: 'V' }
    ];
    const state = { mode: 'prog', root: 'C', progressionIndex: 0, activeScaleChord: null, soundEnabled: false };
    let updates = 0;
    const context = vm.createContext({
        preserveScrollPosition, state,
        document: { getElementById: id => id === 'scale-chords' ? container : null, createElement: () => new Element() },
        MusicTheory: { getNoteIndex: () => 0 },
        ChordProgressions: {
            flatIndexToCategory: () => ({ categoryIndex: 0, progressionIndex: 0 }),
            buildProgressionChords: () => chords,
            PROGRESSION_CATEGORIES: [{ name: 'Test', progressions: [{ description: '' }] }]
        },
        relocateAddButton() {}, renderChordList() {}, updateInfoPanel() {},
        updateDisplay() { updates++; }
    });
    const source = readFileSync(new URL('../static/js/app/progressions-ui.js', import.meta.url), 'utf8')
        .replace(/^import .*;\n/gm, '').replaceAll('export function', 'function');
    vm.runInContext(source, context);
    context.renderProgressionChords();
    for (const index of [0, 1, 1, 0]) {
        container.children[0].children[index].listeners.click();
        assert.equal(panel.scrollTop, 180);
        assert.equal(panel.scrollLeft, 12);
    }
    assert.equal(updates, 4);
    assert.equal(state.activeScaleChord.root, 'C');
});
