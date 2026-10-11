import { formatProgressionDegree } from '../static/js/core/progression-degree.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as MusicTheory from '../static/js/core/music-theory.js';
const source = name => readFileSync(new URL(`../static/js/app/${name}.js`, import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replaceAll('export function', 'function').replaceAll('export const', 'var');

test('chord key metadata survives storage and legacy entries remain unknown', () => {
    const saved = new Map();
    const context = vm.createContext({ console, localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) } });
    vm.runInContext(source('state'), context);
    vm.runInContext("state.chordList = [{root:'F',type:'maj',symbol:'F',referenceKey:'C',referenceScale:'major',progressionDegree:'IV'}]; saveChordList(); state.chordList=[]; loadChordList();", context);
    assert.equal(context.state.chordList[0].referenceKey, 'C');
    assert.equal(context.state.chordList[0].progressionDegree, 'IV');
    assert.equal(context.state.chordReferenceKey, 'C');
    assert.equal(context.state.chordReferenceScale, 'major');
    assert.equal(context.state.chordList[0].referenceScale, 'major');
    saved.set('fretboard-chord-list', JSON.stringify([{ root: 'F', type: 'maj', symbol: 'F' }]));
    context.loadChordList();
    assert.equal(context.state.chordList[0].referenceKey, null);
    assert.equal(context.state.chordList[0].progressionDegree, null);
    assert.equal(context.state.chordReferenceKey, null);
    vm.runInContext("state.userProgressions = [{id:1,chords:['I','IV','V'],referenceKey:'Eb'}]; saveUserProgressions(); state.userProgressions=[]; loadUserProgressions();", context);
    assert.equal(context.state.userProgressions[0].referenceKey, 'Eb');
});

test('adding a progression saves its key on every chord, independently of chord root', () => {
    const state = { root: 'C', progressionIndex: 0, chordList: [] };
    const context = vm.createContext({
        state, MusicTheory, formatProgressionDegree, getProgressionScale: () => 'natural_minor', saveChordList() {}, renderChordList() {},
        ChordProgressions: {
            flatIndexToCategory: () => ({ categoryIndex: 0, progressionIndex: 0 }),
            buildProgressionChords: () => ['C','F','G','C'].map((root,i) => ({root,type:'maj',numeral:['I','IV','V','I'][i]}))
        }
    });
    vm.runInContext(source('progressions-ui'), context);
    context.addProgressionToChordList();
    assert.deepEqual(state.chordList.map(chord => chord.referenceKey), ['C','C','C','C']);
    assert.equal(state.chordList[1].root, 'F');
    assert.deepEqual(state.chordList.map(c => c.progressionDegree), ['I','IV','V','I']);
    assert.equal(state.chordReferenceKey, 'C');
    assert.equal(state.chordReferenceScale, 'natural_minor');
    assert.ok(state.chordList.every(item => item.referenceScale === 'natural_minor'));
    state.root = 'G';
    context.addProgressionToChordList();
    assert.deepEqual(state.chordList.map(chord => chord.referenceKey), ['C','C','C','C','G','G','G','G']);
});

test('restoring a saved progression applies its key; legacy progressions keep the current key', () => {
    const state = { root: 'G' }, selector = { value: 'G' };
    const context = vm.createContext({ state, document: { getElementById: () => selector } });
    vm.runInContext(source('chord-key'), context);
    context.restoreProgressionKey({ referenceKey: 'Eb' });
    assert.equal(state.root, 'Eb'); assert.equal(selector.value, 'Eb');
    context.restoreProgressionKey({ chords: ['I','IV','V'] });
    assert.equal(state.root, 'Eb');
});

test('saving and editing a custom progression records the current key', () => {
    const state = { root: 'Eb', builderReferenceScale: 'natural_minor', builderRows: [{numeral:'I',quality:''},{numeral:'IV',quality:''}],
        builderDescription: '', editingProgressionId: null, userProgressions: [] };
    let persisted;
    const context = vm.createContext({ state, document: { querySelectorAll: () => [] },
        saveUserProgressions: () => { persisted = JSON.parse(JSON.stringify(state.userProgressions)); },
        updateTypeDropdown() {}, updateDisplay() {} });
    vm.runInContext(source('progressions-ui'), context);
    vm.runInContext('renderProgSubModeUI = () => {}; renderProgressionChords = () => {};', context);
    context.saveProgression();
    assert.equal(persisted[0].referenceKey, 'Eb');
    assert.equal(persisted[0].referenceScale, 'natural_minor');
    assert.equal(state._selectedUserProgId, persisted[0].id);
    state.editingProgressionId = persisted[0].id;
    state.root = 'G'; state.builderReferenceScale = 'dorian'; state.builderRows = [{numeral:'I',quality:''}];
    context.saveProgression();
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].referenceKey, 'G');
    assert.equal(persisted[0].referenceScale, 'dorian');
});

test('adding a selected progression chord retains its exact numeral; ordinary chords have none', () => {
    const state = {mode:'prog',root:'A',chordList:[],activeScaleChord:{root:'F',type:'maj',numeral:'♭VI'}};
    const context=vm.createContext({getActiveShapeMetadata:()=>({}),state,MusicTheory,formatProgressionDegree,getProgressionScale:()=> 'natural_minor',saveChordList(){}});
    vm.runInContext(source('chord-list'),context);
    vm.runInContext('renderChordList = () => {};',context);
    context.addChordToList('F','maj');
    assert.equal(state.chordList[0].progressionDegree,'♭VI');
    assert.equal(state.chordList[0].referenceKey,'A');
    state.mode='chord';context.addChordToList('F','maj');
    assert.equal(state.chordList[1].progressionDegree,null);
});

test('Roman degree case matches major, minor, and diminished chord qualities', () => {
    assert.equal(formatProgressionDegree('iv', 'maj'), 'IV');
    assert.equal(formatProgressionDegree('VI', 'min'), 'vi');
    assert.equal(formatProgressionDegree('VII°', 'dim'), 'vii°');
    assert.equal(formatProgressionDegree('♭vi', 'maj'), '♭VI');
    assert.equal(formatProgressionDegree('II7', 'min7'), 'ii7');
    assert.equal(formatProgressionDegree('V/vi', 'maj'), 'V/vi');
});
