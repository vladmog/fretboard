import {test} from 'node:test';
import assert from 'node:assert/strict';
import {portableSong,songShape} from '../static/js/core/song-shape.js';
import {getChordVoicings} from '../static/js/core/chord-voicings.js';
import * as T from '../static/js/core/music-theory.js';
import {validateSongs} from '../static/js/core/songs.js';
test('song shapes are portable and retain the exact original grip',()=>{
 const shape=getChordVoicings(T.buildChord('C','maj'),T.BASS_TUNING,T.BASS_STRING_MIDI_BASES).find(s=>s.inversion===1);
 const original={root:'C',type:'maj',savedShape:{...shape,instrument:'bass'},instrument:'bass'};
 const song=portableSong({id:'test',title:'Test',artist:'Me',sections:[{name:'Verse',chords:[original]}]}, 'bass');
 assert.equal(song.savedWithInstrument,'bass');
 validateSongs([song]);const entry=song.sections[0].chords[0];
 assert.equal(entry.instrument,undefined);assert.equal(entry.savedShape.instrument,undefined);
 assert.deepEqual(songShape(entry,'bass').positions,shape.positions);
 assert.equal(songShape(entry,'guitar').inversion,1);
 assert.ok(songShape(entry,'guitar').positions.every(p=>T.getNoteAt(6-p.string,p.fret)===p.noteIndex));
 assert.equal(original.instrument,'bass');
});
