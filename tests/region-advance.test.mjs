import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('completed region questions capture the next tap before SVG hit testing',()=>{
 const source=readFileSync(new URL('../static/js/games/framework.js',import.meta.url),'utf8');
 const start=source.indexOf("tapSurface.addEventListener('click'",source.indexOf('// Handle a completed region'));
 const end=source.indexOf('}, true);',start)+9;
 let handler,ready=false,advances=0,stops=0;
 const state={currentGame:'note-in-box'};
 vm.runInNewContext(source.slice(start,end),{
  tapSurface:{addEventListener(type,fn,capture){assert.equal(type,'click');assert.equal(capture,true);handler=fn;}},
  gameState:state,isAwaitingAdvance:()=>ready,Blackout:{isActive:()=>false},document:{getElementById:()=>null},
  tryAdvance(){ready=false;advances++;}
 });
 const tap=(control=false)=>handler({target:{closest:()=>control},stopPropagation(){stops++;}});
 tap();assert.equal(advances,0,'answer tap proceeds to fretboard');
 ready=true;tap(true);assert.equal(advances,0,'controls retain their action');
 tap();assert.equal(advances,1);assert.equal(stops,1,'advancing tap never reaches the new board');
 tap();assert.equal(advances,1);
 state.currentGame='interval-training';ready=true;tap();assert.equal(advances,1,'other games keep their flow');
});
