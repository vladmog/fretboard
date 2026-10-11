import { getMarkerColor } from '../static/js/app/marker-colors.js';
import { getChordVoicings, getVoicingIntervals, inversionName } from '../static/js/core/chord-voicings.js';
import { getShellIntervals } from '../static/js/core/shell-voicings.js';
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
    const context = vm.createContext({getMarkerColor,
        state, getTriadShapes, getChordVoicings, getVoicingIntervals, inversionName, getShellIntervals, Theory,
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
        .replace(/^import .*;\n/gm, '').replaceAll('export function', 'function');
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
        assert.deepEqual(panel.querySelectorAll('select').map(node => node.value), ['3', '3-2-1', inversion]);
        assert.equal(state.root, 'C');
        assert.equal(state.chordType, 'maj');
    }
    select('Inversion', 'all');
    panel.querySelectorAll('button').find(node => node.textContent === 'Next').fire('click');
    // Chord changes retain the ordinal selection, clamped to the new result count.
    for (const [root, type] of [['G', 'maj'], ['A', 'min'], ['B', 'dim'], ['C', 'maj']]) {
        const priorIndex = context.getTriadPreferences().index;
        state.root = root; state.chordType = type; refresh();
        const matches = getTriadShapes(Theory.buildChord(root, type), tuning, bases)
            .filter(s => s.strings === '3-2-1');
        assert.ok(matches.length);
        const expected = Math.min(priorIndex, matches.length - 1);
        assert.equal(context.getTriadPreferences().index, expected, `${root} ${type} must preserve shape index`);
        assert.equal(JSON.stringify(shape), JSON.stringify(matches[expected]));
        assert.deepEqual(panel.querySelectorAll('select').map(node => node.value), ['3', '3-2-1', 'all']);
    }
    select('Pattern strings', '2');
    select('Two-string group', '2-1');
    assert.equal(new Set(shape.positions.map(p=>p.string)).size,2);
    const diagram = panel.querySelectorAll('svg')[0];
    const circles = diagram.querySelectorAll('circle');
    assert.equal(circles.length,3);
    assert.equal(new Set(circles.map(c=>c.cy)).size,2, 'two notes share one diagram string');
    const twoStringShape = JSON.stringify(shape);
    toggle(false);toggle(true);
    assert.equal(JSON.stringify(shape),twoStringShape);
    assert.equal(context.getTriadPreferences().stringCount,2);

    select('Pattern strings', 'both');
    assert.equal(context.getTriadPreferences().stringCount,'both');
    const seen = new Set();
    const total = getTriadShapes(Theory.buildChord(state.root,state.chordType),tuning,bases,15,'both').length;
    for(let i=0;i<total;i++) {
        seen.add(new Set(shape.positions.map(p=>p.string)).size);
        panel.querySelectorAll('button').find(node=>node.textContent==='Next').fire('click');
    }
    assert.deepEqual([...seen].sort(),[2,3]);
    state.chordType='maj7';refresh();
    assert.equal(shape.positions.length,4);
    select('Inversion','3');
    assert.equal(shape.bass.label,'7');
    select('Voicing','shell');
    assert.equal(shape.positions.length,3);
    assert.deepEqual([...new Set(shape.positions.map(p=>p.label))].sort(),['1','3','7']);
    select('Inversion','3');
    assert.equal(shape.bass.label,'7');
    select('Pattern strings','2');
    select('Inversion','all');
    assert.equal(new Set(shape.positions.map(p=>p.string)).size,2);
    select('Pattern strings','both');
    const shellSeen=new Set();
    const shellTotal=getChordVoicings(Theory.buildChord(state.root,state.chordType),tuning,bases,{voicing:'shell',stringCount:'both'}).length;
    for(let i=0;i<shellTotal;i++) {
        shellSeen.add(new Set(shape.positions.map(p=>p.string)).size);
        panel.querySelectorAll('button').find(n=>n.textContent==='Next').fire('click');
    }
    assert.deepEqual([...shellSeen].sort(),[2,3]);
    toggle(false);toggle(true);
    assert.equal(context.getTriadPreferences().voicing,'shell');
    state.root='C';state.chordType='min7';refresh();
    select('Pattern strings','2');
    select('String group',instrument==='guitar'?'6-4':'4-2');
    select('Inversion','0');
    assert.equal(shape.bass.label,'1');
    assert.equal(shape.strings,instrument==='guitar'?'6-4':'4-2');

    state.chordType='min';refresh();
    assert.ok(shape.positions.every(p=>['1','b3','5'].includes(p.label)));
    assert.notEqual(context.getTriadPreferences().inversion,'3');


});
