import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as MusicTheory from '../static/js/core/music-theory.js';
const source=readFileSync(new URL('../static/js/app/state.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export function','function').replaceAll('export const','var');
function boot(localStorage){const c=vm.createContext({localStorage,MusicTheory});vm.runInContext(source,c);c.loadInstrument();return c;}
test('instrument survives a fresh load in both directions and supplies the right tuning',()=>{
 const data=new Map();const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 let c=boot(storage);assert.equal(c.state.instrument,'guitar');
 c.state.instrument='bass';c.saveInstrument();c=boot(storage);
 assert.equal(c.state.instrument,'bass');assert.equal(c.getInstrumentTuning().length,4);
 c.state.instrument='guitar';c.saveInstrument();c=boot(storage);
 assert.equal(c.state.instrument,'guitar');assert.equal(c.getInstrumentTuning().length,6);
});
test('invalid or blocked storage retains a usable guitar default',()=>{
 assert.equal(boot({getItem:()=> 'violin'}).state.instrument,'guitar');
 const c=boot({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
 assert.equal(c.state.instrument,'guitar');c.state.instrument='bass';assert.doesNotThrow(()=>c.saveInstrument());
});
