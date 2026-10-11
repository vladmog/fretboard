import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as Theory from '../static/js/core/music-theory.js';
import {getChordScaleContext,drawChordScaleBackground} from '../static/js/app/chord-scale-context.js';
const catalog=JSON.parse(readFileSync(new URL('../static/data/progressions.json',import.meta.url)));
const context=vm.createContext({MusicTheory:Theory, console, fetch:async()=>({ok:true,json:async()=>catalog})});
const code=readFileSync(new URL('../static/js/core/progressions.js',import.meta.url),'utf8').replaceAll('import.meta.url', '"file:///catalog.js"').replace(/^import .*;$/gm,'').replace('const PROGRESSION_CATEGORIES = await loadProgressionData();','const PROGRESSION_CATEGORIES = catalog;').replace(/export \{[\s\S]*?\};/,'');
context.catalog=catalog;vm.runInContext(code,context);
const formulas={major:[0,2,4,5,7,9,11],natural_minor:[0,2,3,5,7,8,10],harmonic_minor:[0,2,3,5,7,8,11],dorian:[0,2,3,5,7,9,10],mixolydian:[0,2,4,5,7,9,10],lydian:[0,2,4,6,7,9,11],phrygian:[0,1,3,5,7,8,10]};
test('every catalog chord belongs to its explicitly assigned scale in every key',()=>{
 const ids=new Set();let count=0;
 for(const [ci,cat] of catalog.entries()) for(const [pi,p] of cat.progressions.entries()) {
  assert.ok(p.id&&!ids.has(p.id));ids.add(p.id);assert.equal(p.numeralBasis,'major');assert.ok(formulas[p.referenceScale]);
  for(const root of Theory.CHROMATIC_NOTES) {
   const chords=context.buildProgressionChords(ci,pi,root);assert.equal(chords.length,p.chords.length);
   const tonic=Theory.getNoteIndex(root);const allowed=new Set(formulas[p.referenceScale].map(n=>(n+tonic)%12));
   for(const c of chords) for(const note of Object.keys(Theory.buildChord(c.root,c.type).noteToInterval)) {
    assert.ok(allowed.has(Number(note)),`${p.id} ${root} ${c.symbol} note ${note} outside ${p.referenceScale}`);count++;
   }
  }
 }
 assert.equal(ids.size,48);assert.ok(count>6000);
});
test('known natural and harmonic minor progressions build concrete expected chords',()=>{
 assert.deepEqual(Array.from(context.buildProgressionChords(1,1,'A'),c=>c.symbol),['Am','F','C','G']);
 assert.deepEqual(Array.from(context.buildProgressionChords(2,0,'A'),c=>c.symbol),['Am','Dm','E','Am']);
});
test('minor context labels and muted markers use the assigned scale; unknown stays unknown',()=>{
 const chord=Theory.buildChord('E','maj');const ctx=getChordScaleContext(chord,'A',true,'harmonic_minor');
 assert.equal(ctx.noteToDegree[4],'5');assert.equal(ctx.noteToDegree[8],'7');assert.equal(ctx.noteToDegree[11],'2');
 assert.equal(getChordScaleContext(chord,'A',true,null),null);
 const active=Theory.getNotesOnFretboard(chord.noteToInterval,15,'E');const markers=[];
 drawChordScaleBackground({setMarker:(string,fret,opts)=>markers.push({string,fret,...opts})},ctx,active,Theory.STANDARD_TUNING,false);
 assert.ok(markers.length>0);
 for(const m of markers){assert.equal(m.color,'#fff');assert.equal(m.borderColor,'#ccc');assert.equal(m.textColor,'#bbb');const note=Theory.getNoteAt(6-m.string,m.fret);assert.ok([9,11,0,2,4,5,8].includes(note));assert.equal(m.text,ctx.scale.noteToDegree[note]);assert.ok(!active.some(p=>p.string===m.string&&p.fret===m.fret));}
});
