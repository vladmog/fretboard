import { preserveScrollPosition } from './scroll-position.js';
/** Local song editor; shares the chord explorer's voicing generator and diagram. */
import * as Theory from '../core/music-theory.js';
import { getShellIntervals } from '../core/shell-voicings.js';
import { getChordVoicings, inversionName } from '../core/chord-voicings.js';
import { readUserSongs, saveUserSong, deleteUserSong, chordsForSongSection } from '../core/user-songs.js';
import { state } from './state.js';
import { diagram } from './triad-shapes.js';
import { updateDisplay } from './display.js';
import { initSongs } from './songs-ui.js';
let draft, sectionIndex = 0, chordIndex = 0;
const node = (tag, text) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
const freshSection = () => ({ name: 'Verse', referenceKey: 'C', referenceScale: 'major', chords: [] });
function fresh() { draft = {id: `user-${Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join('-')}`, title: 'Untitled song', artist: 'Me', sections: [freshSection()]}; sectionIndex = chordIndex = 0; }
export function initSongCreator() {
    return preserveScrollPosition(document.getElementById('song-creator'), renderCreator);
}
function renderCreator() {
    if (!draft) fresh();
    const host = document.getElementById('song-creator');
    host.replaceChildren();
    const status = node('p'); status.setAttribute('role', 'status');
    const act = (text, fn, parent = host) => { const b = node('button', text); b.type = 'button'; b.className = 'btn btn-sm'; b.onclick = fn; parent.append(b); return b; };
    const field = (title, value, change, options, parent = host) => {
        const label = node('label', title), input = node(options ? 'select' : 'input');
        input.setAttribute('aria-label', title);
        if (options) for (const [key,text] of options) { const o = node('option',text); o.value = key; input.append(o); }
        input.value = value; input[options ? 'onchange' : 'oninput'] = () => change(input.value); label.append(input); parent.append(label); return input;
    };
    let saved;
    try { saved = readUserSongs(); } catch (error) { host.append(node('p', `Saved songs could not be read: ${error.message}`)); return; }
    field('Edit saved song', saved.some(s => s.id === draft.id) ? draft.id : '', id => { if (!id) return; draft = structuredClone(saved.find(s => s.id === id)); sectionIndex = chordIndex = 0; initSongCreator(); }, [['','Choose a song'],...saved.map(s => [s.id,s.title])]);
    act('New song', () => { if (confirm('Start a new draft? Save first to keep this draft.')) { fresh(); initSongCreator(); } });
    field('Song title', draft.title, v => draft.title = v);
    field('Artist', draft.artist, v => draft.artist = v);
    field('Section', String(sectionIndex), v => { sectionIndex = Number(v); chordIndex = 0; initSongCreator(); }, draft.sections.map((s,i) => [String(i),`${i+1}. ${s.name}`]));
    act('Add section', () => { draft.sections.push(freshSection()); sectionIndex = draft.sections.length-1; chordIndex=0; initSongCreator(); });
    act('Delete section', () => { if (draft.sections.length > 1 && confirm('Delete this section?')) { draft.sections.splice(sectionIndex,1); sectionIndex=0; chordIndex=0; initSongCreator(); } });
    const section = draft.sections[sectionIndex];
    field('Section name', section.name, v => section.name = v);
    const notes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'].map(n=>[n,n]);
    field('Section key', section.referenceKey || '', v => section.referenceKey = v || null, [['','Not assigned'],...notes]);
    field('Section scale', section.referenceScale || '', v => section.referenceScale = v || null, [['','Not assigned'],...Object.entries(Theory.SCALES).map(([k,v])=>[k,v.name])]);
    const list = node('div'); list.className='song-creator-chords'; host.append(list);
    section.chords.forEach((c,i) => act(`${i+1}. ${Theory.buildChord(c.root,c.type).symbol}`, () => {chordIndex=i; initSongCreator();},list));
    act('Add chord', () => { section.chords.push({root:'C',type:'maj'}); chordIndex=section.chords.length-1; initSongCreator(); });
    const importButton = act('Add chord list to section', () => {
        const start = section.chords.length;
        section.chords.push(...chordsForSongSection(state.chordList));
        chordIndex = start;
        initSongCreator();
    });
    importButton.disabled = !state.chordList.length;
    const entry = section.chords[chordIndex];
    if (!entry && state.mode === 'creator') { state.songPreview = null; updateDisplay(); }
    if (entry) {
        const changeChord = (key,v) => { entry[key]=v; delete entry.savedShape; initSongCreator(); };
        field('Chord root',entry.root,v=>changeChord('root',v),notes);
        field('Chord type',entry.type,v=>changeChord('type',v),Object.entries(Theory.CHORD_TYPES).map(([k,v])=>[k,v.name]));
        act('Remove chord',()=>{section.chords.splice(chordIndex,1);chordIndex=Math.max(0,chordIndex-1);initSongCreator();});
        for (const [label,delta] of [['Move earlier',-1],['Move later',1]]) act(label,()=>{ const j=chordIndex+delta; if(j<0||j>=section.chords.length)return; [section.chords[j],section.chords[chordIndex]]=[entry,section.chords[j]]; chordIndex=j;initSongCreator(); });
        const f = entry.filters ||= {voicing:'full',stringCount:'3',stringSet:'all',inversion:'all',index:0};
        const update = (k,v) => {f[k]=v;f.index=0;delete entry.savedShape;initSongCreator();};
        if (getShellIntervals(entry.type).length) field('Voicing',f.voicing,v=>update('voicing',v),[['full','Full chord'],['shell','Shell voicing']]);
        if (f.voicing === 'shell' || ['maj','min','dim'].includes(entry.type)) field('Pattern strings',f.stringCount,v=>update('stringCount',v),[['3','Three strings'],['2','Two strings'],['both','Two and three strings']]);
        if (!getShellIntervals(entry.type).length) f.voicing = 'full';
        entry.instrument ||= entry.savedShape?.instrument || state.instrument;
        field('Shape instrument', entry.instrument, v => { entry.instrument=v; delete entry.savedShape; f.index=0; initSongCreator(); }, [['guitar','Guitar'],['bass','Bass']]);
        const chord = Theory.buildChord(entry.root,entry.type);
        const all = getChordVoicings(chord,entry.instrument === 'bass' ? Theory.BASS_TUNING : Theory.STANDARD_TUNING, entry.instrument === 'bass' ? Theory.BASS_STRING_MIDI_BASES : undefined,{voicing:f.voicing,stringCount:f.stringCount==='both'?'both':Number(f.stringCount)});
        const sets = [...new Set(all.map(s=>s.strings))];
        field('String group',f.stringSet,v=>update('stringSet',v),[['all','Any string group'],...sets.map(s=>[s,s])]);
        field('Inversion',f.inversion,v=>update('inversion',v),[['all','All inversions'],...[...new Set(all.map(s=>s.inversion))].sort().map(i=>[String(i),inversionName(chord,i)])]);
        const shapes=all.filter(s=>(f.stringSet==='all'||s.strings===f.stringSet)&&(f.inversion==='all'||s.inversion===Number(f.inversion)));
        f.index=Math.min(f.index,Math.max(0,shapes.length-1));
        const shape=entry.savedShape || shapes[f.index];
        for(const [label,delta] of [['Previous shape',-1],['Next shape',1]]) act(label,()=>{if(!shapes.length)return;f.index=(f.index+delta+shapes.length)%shapes.length;delete entry.savedShape;initSongCreator();});
        if(shape){
            entry.savedShape={...structuredClone(shape),instrument:entry.instrument};
            host.append(node('p',`${f.index+1} / ${shapes.length} · ${inversionName(chord,shape.inversion)} · ${entry.instrument}`),diagram(shape,chord));
        } else {delete entry.savedShape;host.append(node('p','No shape for these filters. Choose another voicing or string group.'));}
        state.songPreview={...entry,referenceKey:section.referenceKey,referenceScale:section.referenceScale};
        if(state.mode==='creator')updateDisplay();
    }
    act('Save song',async()=>{try{
        if(draft.sections.some(s=>!s.chords.length||s.chords.some(c=>!c.savedShape)))throw new Error('Every section needs chords, and every chord needs a selected shape.');
        saveUserSong(draft);await initSongs();state.songPreview = entry ? {...entry} : null; if(state.mode==='creator')updateDisplay();status.textContent='Saved. Available in Songs.';
    }catch(error){status.textContent=error.message;}});
    act('Delete saved song',async()=>{if(confirm('Delete this saved song?')){try{deleteUserSong(draft.id);fresh();await initSongs();initSongCreator();}catch(error){status.textContent=error.message;}}});
    host.append(status);
}
