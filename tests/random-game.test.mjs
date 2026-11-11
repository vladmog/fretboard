import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createSettingsStore} from '../static/js/games/storage.js';
import {setRoundRoute,routeNextRound} from '../static/js/games/round-routing.js';
test('Random preserves saved inclusion, delegates input, switches once and cleans up routing',()=>{
 const data=new Map([['fretboard-random-settings',JSON.stringify({included:['a','b']})]]);
 globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 class E {constructor(){this.children=[];this.events={};}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}addEventListener(k,f){this.events[k]=f;}}
 const root=new E(),body=new E(),starts=[],inputs=[],stops=[];
 const games=Object.fromEntries(['a','b','excluded'].map(id=>[id,{startRound(){assert.equal(routeNextRound(),false);starts.push(id);},continueRound(){assert.equal(routeNextRound(),false);starts.push(id+' continued');},cleanup(){stops.push(id);},handleNoteKey(n){inputs.push([id,n]);}}]));
 const c=vm.createContext({createSettingsStore,setRoundRoute,setAwaitingAdvance(){},Voice:{cancel(){}},document:{createElement:()=>new E(),getElementById:()=>root},Math});
 const source=readFileSync(new URL('../static/js/games/random-game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 vm.runInContext(source,c);const game=c.createRandomGame(games,()=>({a:'A',b:'B',excluded:'Excluded'}),()=>0);
 game.renderTitlePage();root.children[0].children[2].events.click();
 assert.deepEqual(starts,['a']);game.handleNoteKey(7);assert.deepEqual(inputs,[['a',7]]);
 assert.equal(routeNextRound(),true);assert.deepEqual(starts,['a','b']);assert.deepEqual(stops,['a']);
 game.renderSettings(body);const a=body.children[1].children[0].children[0];a.checked=false;a.events.change();
 routeNextRound();assert.deepEqual(starts,['a','b','b continued']);
 assert.deepEqual(JSON.parse(data.get('fretboard-random-settings')).included,['b']);
 game.cleanup();assert.equal(routeNextRound(),false);delete globalThis.localStorage;
});
