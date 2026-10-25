import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../static/js/games/framework.js',import.meta.url),'utf8');
const storage=readFileSync(new URL('../static/js/games/storage.js',import.meta.url),'utf8').replaceAll('export function','function');
function load(saved){
 const shown=[];const handlers={};const picker={value:'',addEventListener(type,fn){handlers[type]=fn;},blur(){}};
 const game={renderTitlePage(){shown.push('shown');},cleanup(){}};
 const c={console,gameState:{currentGame:'interval-training'},setAwaitingAdvance(){},markReady(){},isAwaitingAdvance(){return false;},
  localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
  document:{readyState:'complete',addEventListener(){},getElementById:id=>id==='games-select'?picker:null},
  Voice:{cancel(){}},Blackout:{attach(){},detach(){},hide(){}},NoteKeyboard:{attach(){},detach(){}}};
 for(const name of ['IntervalTraining','BlindIntervalTraining','EarTraining','ChromaticCircleDrills','FretboardDrills','IntervalId','NoteId','IntervalLocator','NoteLocator','VoiceLeading','NearestNote','NoteInBox','NoteOnString'])c[name]=game;
 vm.createContext(c);
 vm.runInContext(storage+'\n'+source.replace(/^import .*;\n/gm,'').replace('export const Games','globalThis.Games'),c);
 return {c,picker,handlers,shown};
}
test('last selected game survives leaving Games and a fresh page load',()=>{
 const saved=new Map();let app=load(saved);app.c.Games.activate();assert.equal(app.picker.value,'interval-training');
 app.handlers.change({target:{value:'note-in-box'}});app.c.Games.deactivate();app.c.Games.activate();
 assert.equal(app.picker.value,'note-in-box');
 app=load(saved);app.c.Games.activate();assert.equal(app.picker.value,'note-in-box');assert.equal(app.shown.length,1);
});
test('removed or invalid saved games fall back safely',()=>{
 for(const lastGame of ['removed-game','toString',null]){
  const app=load(new Map([['fretboard-games-settings',JSON.stringify({lastGame})]]));app.c.Games.activate();assert.equal(app.picker.value,'interval-training');
 }
});
