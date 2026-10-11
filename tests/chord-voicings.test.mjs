import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Theory from '../static/js/core/music-theory.js';
import { getComparisonVoicings, getChordVoicings, inversionName } from '../static/js/core/chord-voicings.js';
import { getShellIntervals } from '../static/js/core/shell-voicings.js';

test('shell formulas cover seventh, sixth and extended families without inventing tones',()=>{
    for(const [type,expected] of Object.entries({maj7:['1','3','7'],min7:['1','b3','b7'],'7':['1','3','b7'],dim7:['1','b3','bb7'],min7b5:['1','b3','b7'],'6':['1','3','6'],min6:['1','b3','6'],minmaj7:['1','b3','7'],augmaj7:['1','3','7'],maj9:['1','3','7'],min9:['1','b3','b7'],'9':['1','3','b7'],'13':['1','3','b7'],'7sus4':['1','4','b7']})) assert.deepEqual(getShellIntervals(type),expected);
    for(const type of ['maj','min','dim','aug','sus2','sus4','add9','madd9','5']) assert.deepEqual(getShellIntervals(type),[]);
});
for(const instrument of ['guitar','bass']) test(`${instrument}: full and shell voicings are complete compact grips with correct bass inversions in all keys`,()=>{
    const tuning=instrument==='guitar'?Theory.STANDARD_TUNING:Theory.BASS_TUNING;
    const bases=instrument==='guitar'?[40,45,50,55,59,64]:Theory.BASS_STRING_MIDI_BASES;
    for(const root of ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']) for(const type of Object.keys(Theory.CHORD_TYPES)) for(const voicing of ['full','shell']) {
        const chord=Theory.buildChord(root,type), tones=voicing==='shell'?getShellIntervals(type):chord.intervals;
        const shapes=getChordVoicings(chord,tuning,bases,{voicing});
        if(!tones.length||tones.length>tuning.length) {assert.equal(shapes.length,0);continue;}
        assert.ok(shapes.length,`${root} ${type} ${voicing}`);
        const seen=new Set();
        for(const shape of shapes) {
            assert.deepEqual(shape.positions.map(p=>p.label).sort(),[...tones].sort());
            assert.equal(new Set(shape.positions.map(p=>p.string)).size,tones.length);
            assert.ok(shape.high-shape.low<=3);
            for(const p of shape.positions) {
                const idx=tuning.length-p.string;
                assert.equal(p.noteIndex,(bases[idx]+p.fret)%12);
                assert.equal(p.midi,bases[idx]+p.fret);
                assert.ok(p.fret>=0&&p.fret<=15);
            }
            assert.equal(shape.bass.midi,Math.min(...shape.positions.map(p=>p.midi)));
            assert.equal(chord.intervals[shape.inversion],shape.bass.label);
            const key=JSON.stringify(shape.positions.map(p=>[p.string,p.fret]));
            assert.ok(!seen.has(key));seen.add(key);
        }
    }
});
test('seventh inversion and familiar C major seventh shell are available',()=>{
    const chord=Theory.buildChord('C','maj7');
    assert.equal(inversionName(chord,3),'Third inversion');
    const shapes=getChordVoicings(chord,undefined,undefined,{voicing:'shell'});
    assert.ok(shapes.some(s=>JSON.stringify(s.positions.map(p=>[p.string,p.fret]))==='[[5,3],[4,2],[3,4]]'));
    assert.ok(shapes.some(s=>s.inversion===3));
});

test('mixed comparisons retain third inversion for sevenths and visibly fall back for triads',()=>{
    const preferences={enabled:true,voicing:'full',stringCount:3,inversion:'3',stringSet:'all',index:0};
    const seventh=getComparisonVoicings(Theory.buildChord('C','maj7'),undefined,undefined,preferences);
    assert.ok(seventh.shapes.length);assert.equal(seventh.notice,'');
    assert.ok(seventh.shapes.every(s=>s.bass.label==='7'));
    const triad=getComparisonVoicings(Theory.buildChord('F','maj'),undefined,undefined,preferences);
    assert.ok(triad.shapes.length);assert.match(triad.notice,/inversion unavailable/);
    assert.deepEqual([...new Set(triad.shapes.map(s=>s.inversion))].sort(),[0,1,2]);
    const shell=getComparisonVoicings(Theory.buildChord('F','maj'),undefined,undefined,{...preferences,voicing:'shell',stringSet:'6-4-3-2'});
    assert.ok(shell.shapes.length);assert.match(shell.notice,/No shell/);assert.match(shell.notice,/string group unavailable/);
    assert.equal(preferences.inversion,'3');
});

test('two-string shells and combined sets retain all shell tones and full-chord bass labels',()=>{
    for(const [tuning,bases] of [[Theory.STANDARD_TUNING,undefined],[Theory.BASS_TUNING,Theory.BASS_STRING_MIDI_BASES]]) {
        for(const root of ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']) for(const type of Object.keys(Theory.CHORD_TYPES)) {
            const tones=getShellIntervals(type);if(!tones.length)continue;
            const chord=Theory.buildChord(root,type);
            const two=getChordVoicings(chord,tuning,bases,{voicing:'shell',stringCount:2});
            const three=getChordVoicings(chord,tuning,bases,{voicing:'shell',stringCount:3});
            const both=getChordVoicings(chord,tuning,bases,{voicing:'shell',stringCount:'both'});
            assert.ok(two.length,`${root} ${type}`);
            assert.equal(both.length,two.length+three.length);
            const key=s=>JSON.stringify(s.positions.map(p=>[p.string,p.fret]));
            assert.equal(new Set(both.map(key)).size,both.length);
            assert.deepEqual(new Set(both.map(key)),new Set([...two,...three].map(key)));
            for(const shape of two) {
                assert.deepEqual(shape.positions.map(p=>p.label).sort(),[...tones].sort());
                const strings=[...new Set(shape.positions.map(p=>p.string))];
                assert.equal(strings.length,2);
                assert.ok(shape.high-shape.low<=3);
                assert.equal(shape.bass.midi,Math.min(...shape.positions.map(p=>p.midi)));
                assert.equal(chord.intervals[shape.inversion],shape.bass.label);
            }
            const comparison=getComparisonVoicings(chord,tuning,bases,{voicing:'shell',stringCount:2,inversion:'all',stringSet:'all'});
            assert.deepEqual(comparison.shapes,two);
        }
    }
});

test('nonadjacent two-string shells include a compact C minor seventh root position',()=>{
    const chord=Theory.buildChord('C','min7');
    const result=getComparisonVoicings(chord,undefined,undefined,{voicing:'shell',stringCount:2,stringSet:'6-4',inversion:'0'});
    assert.equal(result.notice,'');
    assert.ok(result.shapes.some(s=>JSON.stringify(s.positions.map(p=>[p.string,p.fret]))==='[[6,8],[6,11],[4,8]]'));
    assert.ok(result.shapes.every(s=>s.strings==='6-4'&&s.inversion===0&&s.high-s.low<=3));
    const major=getChordVoicings(Theory.buildChord('C','maj7'),undefined,undefined,{voicing:'shell',stringCount:2});
    assert.equal(major.filter(s=>s.inversion===0).length,0,'major seventh root position still requires a wider span');
});
