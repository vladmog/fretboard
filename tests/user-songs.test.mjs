import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readUserSongs, saveUserSong, deleteUserSong, chordsForSongSection } from '../static/js/core/user-songs.js';
import { buildSongSection } from '../static/js/core/songs.js';
import { getChordVoicings } from '../static/js/core/chord-voicings.js';
import * as Theory from '../static/js/core/music-theory.js';
test('created songs retain exact shapes and section contexts through save, edit, import and deletion', () => {
 const data = new Map(); const storage = {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const shape=getChordVoicings(Theory.buildChord('C','maj'))[2];
 const song={id:'user-test',title:'Test',artist:'Me',sections:[{name:'Verse',referenceKey:'C',referenceScale:'major',chords:[{root:'C',type:'maj',savedShape:{...shape,instrument:'guitar'}}]},{name:'Chorus',referenceKey:'A',referenceScale:'natural_minor',chords:[{root:'E',type:'maj'}]}]};
 saveUserSong(song,storage);
 const loaded=readUserSongs(storage)[0];
 assert.deepEqual(buildSongSection(loaded,loaded.sections[0])[0].savedShape,song.sections[0].chords[0].savedShape);
 assert.equal(buildSongSection(loaded,loaded.sections[1])[0].referenceKey,'A');
 loaded.title='Edited';saveUserSong(loaded,storage);
 assert.equal(readUserSongs(storage).length,1);assert.equal(readUserSongs(storage)[0].title,'Edited');
 deleteUserSong(song.id,storage);assert.deepEqual(readUserSongs(storage),[]);
});
test('invalid saves and corrupt storage are not silently overwritten',()=>{
 let raw='broken';const storage={getItem:()=>raw,setItem:(k,v)=>raw=v};
 assert.throws(()=>readUserSongs(storage));
 assert.throws(()=>saveUserSong({id:'bad'},storage));assert.equal(raw,'broken');
});

test('chord-list import retains order and repeats without overriding section key',()=>{
 const chords=[{root:'C',type:'maj',referenceKey:'C'},{root:'G',type:'7'},{root:'C',type:'maj'}];
 const imported=chordsForSongSection(chords);
 assert.deepEqual(imported.map(c=>c.root),['C','G','C']);
 const result=buildSongSection({id:'test'},{name:'Bridge',referenceKey:'F',referenceScale:'major',chords:imported});
 assert.ok(result.every(c=>c.referenceKey==='F'));
 imported[0].root='D';assert.equal(chords[0].root,'C');
});

test('whole chords and optional exact shapes coexist in saved songs', () => {
 const data=new Map();const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const song={id:'optional',title:'Optional shapes',artist:'Me',sections:[{name:'Verse',chords:[{root:'C',type:'maj'},{root:'G',type:'7'}]}]};
 saveUserSong(song,storage);
 const saved=readUserSongs(storage)[0];
 assert.ok(buildSongSection(saved,saved.sections[0]).every(c=>!c.savedShape));
});
