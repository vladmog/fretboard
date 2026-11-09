import {test} from 'node:test';
import assert from 'node:assert/strict';
import {degreeLetter,degreeQuestions} from '../static/js/core/degree-counting.js';
test('degree counting uses letter distance rather than semitones',()=>{
 assert.equal(degreeLetter('C',5),'G');assert.equal(degreeLetter('B',2),'C');
 assert.equal(degreeLetter('F',4),'B');assert.equal(degreeLetter('G',7),'F');
 const questions=degreeQuestions();assert.equal(questions.length,42);
 for(const q of questions){assert.match(q.answer,/^[A-G]$/);assert.notEqual(q.answer,q.root);}
 assert.throws(()=>degreeLetter('C',1));assert.throws(()=>degreeLetter('C#',3));
});
