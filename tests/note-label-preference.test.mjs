import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../static/js/app/state.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
test('note names and intervals both persist across fresh page state',()=>{
 const data=new Map();
 const fresh=()=>{const c=vm.createContext({console,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});vm.runInContext(source,c);return c;};
 let c=fresh();assert.equal(vm.runInContext('loadNoteNames();state.showNoteNames',c),false);
 vm.runInContext('state.showNoteNames=true;saveNoteNames()',c);
 c=fresh();assert.equal(vm.runInContext('loadNoteNames();state.showNoteNames',c),true);
 vm.runInContext('state.showNoteNames=false;saveNoteNames()',c);
 c=fresh();assert.equal(vm.runInContext('loadNoteNames();state.showNoteNames',c),false);
});
