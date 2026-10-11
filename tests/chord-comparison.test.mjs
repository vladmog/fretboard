import { voicingNotes } from '../static/js/core/voicing-audio.js';
import { shapePreferences, songShape } from '../static/js/core/song-shape.js';
import { getMarkerColor } from '../static/js/app/marker-colors.js';
import { getComparisonVoicings, getChordVoicings, getVoicingIntervals, inversionName } from '../static/js/core/chord-voicings.js';
import { getShellIntervals } from '../static/js/core/shell-voicings.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Theory from '../static/js/core/music-theory.js';
import { getChordScaleContext, drawChordScaleBackground } from '../static/js/app/chord-scale-context.js';
import { getTriadShapes } from '../static/js/core/triads.js';

for (const stringCount of [2,3,'both']) for (const enabled of [false, true]) test(`comparison follows triad checkbox: ${enabled}, strings: ${stringCount}`, () => {
    class Element {
        constructor() { this.dataset = {}; this.children = []; this.scrollTop = 0; this.clientWidth = 800; this.clientHeight = 150; }
        setAttribute() {}
        addEventListener(event, fn) { this[event] = fn; }
        set textContent(value) { this.text = value; }
        get textContent() { return this.text || this.children.map(c => c.textContent || '').join(''); }
        appendChild(node) { this.children.push(node); }
        replaceChildren() { this.children = []; }
        querySelector() { return { setAttribute() {} }; }
    }
    const container = new Element();
    const boards = [];
    const gestures = [];
    const played = [];
    let stored;
    let listRenders = 0;
    const context = vm.createContext({songShape, structuredClone, saveChordList: () => { stored = JSON.stringify(context.state.chordList); }, renderChordList: () => listRenders++, shapePreferences, getMarkerColor, voicingNotes, Sound: {playChord: notes => played.push(notes)},
        getChordScaleContext, drawChordScaleBackground, bindFretboardGestures: (_, __, advance) => gestures.push(advance), applyCurrentRotation() {}, Theory, getTriadShapes, getComparisonVoicings, getChordVoicings, inversionName, getShellIntervals, state: { showNoteNames: false, soundEnabled: true, instrument: 'guitar' },
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
    vm.runInContext(`entries = [{root:'C',type:'maj'}, {root:'A',type:'min'}, {root:'G',type:'dim'}];
        state.chordList = entries.map(item=>({...item})); entries.forEach((item,i)=>item.sourceChord=state.chordList[i]);
        preferences = {enabled:${enabled},stringCount:${JSON.stringify(stringCount)},stringSet:'${stringCount===2?'2-1':'3-2-1'}',inversion:'all',index:0}; renderBoards();`, context);
    assert.equal(boards.length, 3);
    for (const [index, [root, type]] of [['C', 'maj'], ['A', 'min'], ['G', 'dim']].entries()) {
        const chord = Theory.buildChord(root, type);
        const expected = enabled
            ? getTriadShapes(chord, undefined, undefined, 15, stringCount).filter(shape => shape.strings === (stringCount===2?'2-1':'3-2-1'))[0].positions
            : Theory.getNotesOnFretboard(chord.noteToInterval, 15, root);
        assert.deepEqual(boards[index], expected.map(p => [p.string, p.fret]));
    }
    container.children[0].children[0].children[1].click();
    if (enabled) assert.ok(played.at(-1).every(note => /\d$/.test(note)), 'shape playback uses explicit pitches');
    else assert.deepEqual(played.at(-1), Theory.buildChord('C','maj').notes);
    context.state.soundEnabled = false;
    const beforeMuted = played.length;
    container.children[0].children[0].children[1].click();
    assert.equal(played.length,beforeMuted);
    context.state.soundEnabled = true;
    if (enabled) {
        vm.runInContext("preferences.inversion = 'all'; renderBoards();", context);
        const first = boards.at(-3), second = boards.at(-2);
        const originalFirst = JSON.stringify(first), originalSecond = JSON.stringify(second);
        gestures.at(-3)(1);
        assert.notEqual(JSON.stringify(first), originalFirst);
        assert.equal(JSON.stringify(second), originalSecond, 'other chord must not change');
        assert.equal(vm.runInContext('preferences.index', context), 0, 'shared settings stay intact');
        const swipedNotes = played.at(-1);
        container.children[0].children[0].children[1].click();
        assert.deepEqual(played.at(-1), swipedNotes, 'name plays the currently displayed shape after swipe');
        const saved = JSON.parse(stored);
        assert.equal(listRenders,1);
        assert.deepEqual(saved[0].savedShape.positions.map(p=>[p.string,p.fret]),first);
        assert.equal(saved[1].savedShape,undefined,'other list entries stay untouched');
        const restored = shapePreferences(saved[0],'guitar');
        const restoredShapes = getComparisonVoicings(Theory.buildChord('C','maj'),undefined,undefined,restored).shapes;
        assert.deepEqual(restoredShapes[restored.index].positions.map(p=>[p.string,p.fret]),first,'saved metadata restores exact displayed shape after reload');
        const changedFirst = JSON.stringify(first);
        context.renderBoards();
        assert.equal(JSON.stringify(boards.at(-3)), changedFirst, 'selection survives orientation rerender');
        // Reopening must retain the broad browsing filters, not lock to the
        // saved shape's single inversion and string group.
        vm.runInContext('entries = state.chordList.map(chord=>({...chord,sourceChord:chord})); renderBoards();',context);
        assert.equal(JSON.stringify(boards.at(-3)),changedFirst,'reopen restores exact saved shape');
        const reopenedFirst=boards.at(-3);
        const available=getComparisonVoicings(Theory.buildChord('C','maj'),undefined,undefined,context.state.chordList[0].filters).shapes.length;
        const visited=new Set();
        const advance=gestures.at(-3);
        for(let i=0;i<available;i++) {
            visited.add(JSON.stringify(reopenedFirst));
            advance(1);
        }
        assert.equal(visited.size,available,'all original shape options remain swipeable after saving and reopening');

    }

    // A saved full voicing must not override an explicit shell selection.
    vm.runInContext(`{
        const chord=Theory.buildChord('C','maj7');
        const full=getChordVoicings(chord,undefined,undefined,{voicing:'full'})[0];
        state.chordList=[{root:'C',type:'maj7',savedShape:{...full,instrument:'guitar'},filters:{voicing:'full',stringCount:3,stringSet:'all',inversion:'all',index:0}}];
        entries=state.chordList.map(chord=>({...chord,sourceChord:chord}));
        preferences={enabled:true,voicing:'shell',stringCount:3,stringSet:'all',inversion:'all',index:0};
        renderBoards();
    }`,context);
    assert.equal(boards.at(-1).length,3,'shell selection overrides saved full seventh');
    gestures.at(-1)(1);
    assert.equal(context.state.chordList[0].filters.voicing,'shell');
    vm.runInContext(`entries=state.chordList.map(chord=>({...chord,sourceChord:chord})); preferences.voicing='full'; renderBoards();`,context);
    assert.equal(boards.at(-1).length,4,'full selection overrides saved shell');

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
