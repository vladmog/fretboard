import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('old favorites retain exact chords as custom entries and migrate only once',async()=>{
 const legacy=JSON.parse(readFileSync(new URL('../static/data/progressions-legacy.json',import.meta.url)));
 const p=legacy[1].progressions[0],key=legacy[1].name+'|'+p.numerals;
 const state={favoriteProgressions:[key],userProgressions:[{id:123,chords:['I']}]};let saves=0;
 const storage=new Map();
 const c=vm.createContext({state,console,URL,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},fetch:async()=>({ok:true,json:async()=>legacy}),saveUserProgressions(){saves++;}});
 const source=readFileSync(new URL('../static/js/app/catalog-migration.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.url','"file:///app/catalog-migration.js"').replace('export async','async');
 vm.runInContext(source,c);await c.preserveLegacyFavorites();await c.preserveLegacyFavorites();
 assert.equal(state.userProgressions.length,2);assert.equal(saves,1);
 assert.deepEqual(state.userProgressions[1].chords,p.chords);
 assert.equal(state.userProgressions[1].referenceScale,null);
 assert.equal(state.favoriteProgressions[0],key);
 state.userProgressions.pop();await c.preserveLegacyFavorites();assert.equal(state.userProgressions.length,1);
});
