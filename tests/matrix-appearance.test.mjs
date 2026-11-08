import {test} from 'node:test';
import assert from 'node:assert/strict';
import {refreshMatrixAppearance} from '../static/js/games/matrix-appearance.js';
test('live display changes preserve nodes and update circle and matrix independently',()=>{
 const element=()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}});
 const ring=element(),marker=element(),label=element(),rect=element(),text=element();
 label.textContent='b3';text.textContent='2';
 const circle={dataset:{semitone:'3'},querySelectorAll:()=>[ring,marker],querySelector:()=>label};
 const cell={dataset:{matrixTone:'2'},querySelector:s=>s==='rect'?rect:text};
 const root={querySelectorAll:s=>s==='[data-semitone]'?[circle]:[cell]};
 const colors=(_tone,_center,on)=>on?{fill:'yellow',border:'gold',text:'black'}:{fill:'#000',border:'#000',text:'#fff'};
 refreshMatrixAppearance(root,{circleColors:false,circleLabels:false,showColors:true},0,colors);
 assert.equal(marker.attrs.fill,'#777');assert.equal(marker.attrs.stroke,'#777');assert.equal(label.attrs.visibility,'hidden');assert.equal(rect.attrs.fill,'yellow');
 assert.deepEqual(ring.attrs,{});assert.equal(text.textContent,'2');assert.equal(label.textContent,'b3');
 refreshMatrixAppearance(root,{circleColors:true,circleLabels:true,showColors:false},0,colors);
 assert.equal(marker.attrs.fill,'yellow');assert.equal(label.attrs.visibility,'visible');assert.equal(rect.attrs.fill,'#000');
});
