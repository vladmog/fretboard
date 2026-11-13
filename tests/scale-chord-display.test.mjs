import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as MusicTheory from '../static/js/core/music-theory.js';
const source=readFileSync(new URL('../static/js/games/interval-training.js',import.meta.url),'utf8');
const paint=source.slice(source.indexOf('    function paintScaleChordCircle()'),source.indexOf('    function applySettingsToCurrentRound()'));
test('scale highlights use parent degrees and survive hidden labels and monochrome settings',()=>{
 const node=()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}});
 const groups=Array.from({length:12},(_,pitch)=>({circle:node(),text:node(),il:node(),getAttribute:()=>pitch,setAttribute(){},querySelector(s){return s==='circle'?this.circle:s==='text'?this.text:this.il;}}));
 const settings={showColors:true,highlightScaleNotes:true,showLabels:false,showIntervalLabels:false};
 const state={circleApi:{noteGroups:groups},scaleChordQuestion:{scaleRoot:'G',scaleType:'lydian'},chordNotes:[1,4,7],chordIntervals:['1','b3','b5'],currentDegreeIndex:1};
 const c=vm.createContext({updateReferenceCross(){},MusicTheory,gameState:state,settings});vm.runInContext(paint,c);c.paintScaleChordCircle();
 assert.equal(groups[7].circle.attrs.fill,'#000');
 assert.equal(groups[1].circle.attrs.fill,'#000');
 assert.equal(groups[0].circle.attrs.fill,'#ddd');
 assert.equal(groups[1].circle.attrs.stroke,MusicTheory.getIntervalColor('#4').border);
 assert.equal(groups[1].text.attrs.visibility,'visible');
 assert.equal(groups[4].text.attrs.visibility,'hidden');
 settings.showColors=false;settings.showIntervalLabels=true;c.paintScaleChordCircle();
 assert.equal(groups[1].circle.attrs.fill,'#000');assert.equal(groups[0].circle.attrs.fill,'#ddd');
 assert.equal(groups[4].circle.attrs.fill,'#000');
 assert.equal(groups[1].il.textContent,'#4');assert.equal(groups[1].il.attrs.visibility,'visible');
 assert.equal(groups[1].text.attrs.visibility,'visible');
 assert.equal(groups[4].text.attrs.visibility,'hidden');
 settings.highlightScaleNotes=false;state.currentDegreeIndex=3;c.paintScaleChordCircle();
 assert.equal(groups[4].circle.attrs.stroke,MusicTheory.getIntervalColor('6').border);
 assert.equal(groups[7].circle.attrs.stroke,MusicTheory.getIntervalColor('1').border);
 assert.equal(groups[1].circle.attrs.fill,'#000');
 assert.equal(groups[4].circle.attrs.fill,MusicTheory.getIntervalColor('b3').fill);
 assert.equal(groups[7].circle.attrs.fill,MusicTheory.getIntervalColor('b5').fill);
 assert.equal(groups[0].circle.attrs.fill,'#000');
 for(const pitch of [1,4,7]) {
  assert.equal(groups[pitch].text.attrs.visibility,'visible');
  assert.equal(groups[pitch].il.attrs.visibility,'visible');
 }
 settings.showIntervalLabels=false;state.currentDegreeIndex=0;c.paintScaleChordCircle();
 assert.equal(groups[1].circle.attrs.fill,'#777');
 assert.equal(groups[4].circle.attrs.fill,'#000');
 for(const group of groups) {
  assert.equal(group.text.attrs.visibility,'hidden');
  assert.equal(group.il.attrs.visibility,'hidden');
 }
});
