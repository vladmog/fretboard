import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import * as Theory from '../static/js/core/music-theory.js';
import { getTriadShapes } from '../static/js/core/triads.js';

// Small DOM adapter exercises the real controls and their change/click handlers.
class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.listeners = {}; }
    setAttribute(key, value) { this[key] = value; }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.append(node); }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener(event, handler) { (this.listeners[event] ??= []).push(handler); }
    fire(event) { for (const handler of this.listeners[event] ?? []) handler(); }
    querySelectorAll(tag) {
        return this.children.flatMap(node => [ ...(node.tag === tag ? [node] : []), ...node.querySelectorAll(tag) ]);
    }
}

for (const instrument of ['guitar', 'bass']) test(`${instrument}: triad toggle retains filters and selected voicing`, () => {
    const panel = new Element('div');
    const state = { mode: 'chord', instrument, root: 'E', chordType: 'min', showNoteNames: false };
    const tuning = instrument === 'bass' ? Theory.BASS_TUNING : Theory.STANDARD_TUNING;
    const bases = instrument === 'bass' ? Theory.BASS_STRING_MIDI_BASES : undefined;
    const context = vm.createContext({
        state, getTriadShapes,
        getInstrumentTuning: () => tuning, getInstrumentMidiBases: () => bases,
        guide: JSON.parse(readFileSync(new URL('../static/data/harmony-guide.json', import.meta.url))),
        window: { matchMedia: () => ({ matches: false }) },
        document: {
            getElementById: () => panel,
            createElement: tag => new Element(tag),
            createElementNS: (_, tag) => new Element(tag),
            createTextNode: text => Object.assign(new Element('#text'), { textContent: text })
        }
    });
    const source = readFileSync(new URL('../static/js/app/triad-shapes.js', import.meta.url), 'utf8')
        .replace(/^import .*;\n/gm, '').replace('export function', 'function');
    vm.runInContext(source, context);
    let shape;
    const refresh = () => { shape = context.renderTriadControls(Theory.buildChord(state.root, state.chordType), refresh); };
    const toggle = checked => { const checkbox = panel.querySelectorAll('input')[0]; checkbox.checked = checked; checkbox.fire('change'); };
    const select = (label, value) => {
        const control = panel.querySelectorAll('select').find(node => node['aria-label'] === label);
        control.value = value; control.fire('change');
    };
    refresh();
    toggle(true);
    // Change the chord and filters after opening the explorer.
    state.root = 'C'; state.chordType = 'maj'; refresh();
    select('Three-string group', '3-2-1');
    const inversion = instrument === 'guitar' ? '2' : '0';
    select('Inversion', inversion);
    panel.querySelectorAll('button').find(node => node.textContent === 'Next').fire('click');
    const selected = JSON.stringify(shape);
    const caption = panel.querySelectorAll('p')[0].textContent;
    assert(caption.startsWith('2 /'), 'test must select a noninitial shape');
    for (let repeat = 0; repeat < 3; repeat++) {
        toggle(false);
        assert.equal(shape, null, 'off restores the ordinary full-fretboard chord display');
        toggle(true);
        assert.equal(JSON.stringify(shape), selected);
        assert.equal(panel.querySelectorAll('p')[0].textContent, caption);
        assert.deepEqual(panel.querySelectorAll('select').map(node => node.value), ['3-2-1', inversion]);
        assert.equal(state.root, 'C');
        assert.equal(state.chordType, 'maj');
    }
});
