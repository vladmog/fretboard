import test from 'node:test';
import assert from 'node:assert/strict';
import {attachRotatableCross,angleDelta} from '../static/js/games/rotatable-cross.js';
test('rotation crosses the angle boundary smoothly without snapping',()=>{
 assert.equal(angleDelta(179,-179),2);assert.equal(angleDelta(-179,179),-2);
 assert.ok(Math.abs(angleDelta(12,12.37)-.37)<1e-10);
});
test('cross follows roots, drags continuously, suppresses drag clicks and preserves taps',()=>{
 class E {
  constructor(){this.style={};this.attrs={};this.children=[];this.events={};this.capture=null;}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
  append(x){this.children.push(x);}insertBefore(x){this.children.unshift(x);}
  addEventListener(k,fn){this.events[k]=fn;}getBoundingClientRect(){return {left:0,top:0,width:200,height:200};}
  setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
 }
 globalThis.document={createElementNS:()=>new E()};
 let taps=0;const svg=new E(),cross=attachRotatableCross(svg,200,()=>{taps++;return false;});
 cross.update(true,false,7);assert.equal(svg.children[0].attrs.transform,'rotate(210 100 100)');
 cross.update(true,true,7);assert.equal(svg.children[0].attrs.transform,'rotate(0 100 100)');
 const e=(x,y)=>({pointerId:1,clientX:x,clientY:y,button:0,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}});
 svg.events.pointerdown(e(100,20));svg.events.pointermove(e(180,100));svg.events.pointerup(e(180,100));
 assert.equal(svg.children[0].attrs.transform,'rotate(90 100 100)');
 const click=e();svg.events.click(click);assert.equal(click.stopped,true);assert.equal(taps,0);
 cross.update(true,true,7);assert.equal(svg.children[0].attrs.transform,'rotate(90 100 100)');
 svg.events.pointerdown(e(100,20));svg.events.pointerup(e(100,20));svg.events.click(e());assert.equal(taps,1);
 // 20 degrees of clockwise movement remains smooth, then snaps from 110 to 120.
 svg.events.pointerdown(e(100,20));
 const end=e(100+80*Math.sin(Math.PI/9),100-80*Math.cos(Math.PI/9));
 svg.events.pointermove(end);
 assert.ok(Math.abs(Number(svg.children[0].attrs.transform.match(/rotate\(([^ ]+)/)[1])-110)<1e-9);
 svg.events.pointerup(end);assert.equal(svg.children[0].attrs.transform,'rotate(120 100 100)');
 // Counterclockwise movement snaps as well.
 svg.events.pointerdown(e(100,20));
 const back=e(100-80*Math.sin(Math.PI/9),100-80*Math.cos(Math.PI/9));
 svg.events.pointermove(back);svg.events.pointerup(back);
 assert.equal(svg.children[0].attrs.transform,'rotate(90 100 100)');
 cross.update(false,true,7);assert.equal(svg.children[0].style.display,'none');assert.equal(svg.attrs['data-free-rotation'],undefined);
 delete globalThis.document;
});
