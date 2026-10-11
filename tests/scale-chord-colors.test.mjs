import { getMarkerColor } from '../static/js/app/marker-colors.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as MusicTheory from '../static/js/core/music-theory.js';

test('scale-degree toggle changes chord labels without changing chord colors', () => {
    const source=readFileSync(new URL('../static/js/app/display.js',import.meta.url),'utf8');
    const start=source.indexOf('function displayScaleChord(');
    const renderer=source.slice(start,source.indexOf('\n/**',start));
    let markers=[];
    const state={mode:'scale',showScaleDegrees:false,showNoteNames:false,fretboard:{clearMarkers(){markers=[];},setMarker(string,fret,options){markers.push({string,fret,...options});}}};
    const context=vm.createContext({getMarkerColor,state,MusicTheory,RotationToggle:{applyCurrentRotation(){}},updateInfoPanel(){},
        getNotesOnActiveFretboard:MusicTheory.getNotesOnFretboard,
        getMarkerLabel:pos=>pos.label});
    vm.runInContext(renderer,context);
    const scale=MusicTheory.buildScale('C','major');
    for(const [root,type] of [['F','maj'],['D','min'],['B','dim']]) {
        const chord=MusicTheory.buildChord(root,type);
        state.showScaleDegrees=false;context.displayScaleChord(chord,scale);
        const chordMarkers=markers.filter(m=>m.textColor!=='#bbb');
        state.showScaleDegrees=true;context.displayScaleChord(chord,scale);
        const scaleMarkers=markers.filter(m=>m.textColor!=='#bbb');
        assert.deepEqual(scaleMarkers.map(({text,...style})=>style),chordMarkers.map(({text,...style})=>style));
        assert.notDeepEqual(scaleMarkers.map(m=>m.text),chordMarkers.map(m=>m.text));
        for(const marker of scaleMarkers.filter(m=>m.text)) {
            const note=MusicTheory.getNoteAt(6-marker.string,marker.fret);
            assert.equal(marker.text,scale.noteToDegree[note]);
        }
    }
});

test('chromatic circle retains chord fills and borders when scale-relative labels switch',()=>{
    const source=readFileSync(new URL('../static/js/app/display.js',import.meta.url),'utf8');
    const start=source.indexOf('function renderChromaticCircle(');
    const svg={children:[],set innerHTML(_){this.children=[];},appendChild(n){this.children.push(n);}};
    const context=vm.createContext({getMarkerColor,MusicTheory,state:{root:'C'},document:{getElementById:()=>svg,createElementNS:(_,tag)=>({tag,attrs:{},classList:{add(){}},setAttribute(k,v){this.attrs[k]=v;}})}});
    vm.runInContext(source.slice(start,source.indexOf('\n/**',start)),context);
    const chord=MusicTheory.buildChord('F','maj'),scale=MusicTheory.buildScale('C','major');
    const labels=Object.fromEntries(Object.keys(chord.noteToInterval).map(n=>[n,scale.noteToDegree[n]]));
    context.renderChromaticCircle(chord.noteToInterval,0,undefined,false,undefined,chord.noteToInterval);
    const circles=svg.children.filter(n=>n.tag==='circle').map(n=>({...n.attrs}));
    const text=svg.children.filter(n=>n.tag==='text').map(n=>n.textContent);
    context.renderChromaticCircle(labels,0,undefined,true,undefined,chord.noteToInterval);
    // The small root indicator can move; note marker colors must not.
    const markerColors=nodes=>nodes.filter(n=>n.r===13).map(n=>[n.fill,n.stroke]);
    assert.deepEqual(markerColors(svg.children.filter(n=>n.tag==='circle').map(n=>n.attrs)),markerColors(circles));
    assert.notDeepEqual(svg.children.filter(n=>n.tag==='text').map(n=>n.textContent),text);
});
