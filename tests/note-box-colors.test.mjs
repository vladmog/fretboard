import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {getIntervalColor} from '../static/js/core/music-theory.js';
import {makeBoxQuestion} from '../static/js/core/note-box-question.js';
const source=readFileSync(new URL('../static/js/games/note-region.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function intervalMarker('),source.indexOf('function paint('));
test('reference and answer colors follow their shared root in every interval mode',()=>{
 for(const mode of ['root-to-interval','interval-to-root','interval-to-interval'])for(let target=0;target<12;target++)for(let interval=1;interval<12;interval++){
  const question=makeBoxQuestion(target,mode,[interval],()=>0);
  const ctx=vm.createContext({question,getIntervalColor});vm.runInContext(fn,ctx);
  for(const pitch of [question.given,question.target]){
   const degree=(pitch-question.root+12)%12;
   const style=ctx.intervalMarker(pitch);
   const expected=getIntervalColor(['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'][degree]);
   assert.equal(style.borderColor,expected.border);
   assert.equal(style.color,degree===0?'#000':expected.fill);
   assert.equal(style.textColor,degree===0?'#fff':expected.text);
  }
 }
});
