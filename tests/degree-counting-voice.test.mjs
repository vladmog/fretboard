import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DEGREE_LETTERS,degreeQuestions} from '../static/js/core/degree-counting.js';
test('degree questions announce root then degree, repeat, obey voice off, and cancel on exit',()=>{
 let spoken=[],enabled=true,cancelled=0;
 class E{constructor(){this.children=[];this.style={};this.dataset={};}append(...c){this.children.push(...c);}replaceChildren(...c){this.children=c;}setAttribute(){}addEventListener(k,f){this[k]=f;}querySelector(){return this.children.find(c=>c.className==='degree-counting-prompt');}}
 const root=new E();
 const c=vm.createContext({DEGREE_LETTERS,degreeQuestions,Math,createSettingsStore:(_,settings)=>({settings,load(){},save(){}}),beginPracticeQuestion:()=>()=>{},gameState:{soundEnabled:false},setAwaitingAdvance(){},Sound:{},getIntervalColor(){},document:{createElement:()=>new E(),getElementById:()=>root},Voice:{cancel(){cancelled++;},spokenNote:n=>n,spokenName:n=>n,speak:t=>{if(enabled)spoken.push(t);}}});
 const source=readFileSync(new URL('../static/js/games/scale-degree-counting.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default','globalThis.game=');vm.runInContext(source,c);
 c.game.renderTitlePage();root.children[0].children.at(-1).click();
 assert.equal(spoken.length,1);assert.match(spoken[0],/^[a-g]\n[2-7]$/);
 const prompt=root.children[0].children[1].querySelector();prompt.click();assert.equal(spoken[1],spoken[0]);
 c.game.repeatQuestion();assert.equal(spoken.length,3);
 enabled=false;c.game.repeatQuestion();assert.equal(spoken.length,3);
 const before=cancelled;c.game.cleanup();assert.ok(cancelled>before);enabled=true;c.game.repeatQuestion();assert.equal(spoken.length,3);
});
