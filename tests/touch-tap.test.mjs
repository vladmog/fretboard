import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindTouchTap } from '../static/js/core/touch-tap.js';

test('rotation accepts only brief stationary touch taps, not swipes, scrolling, pinches or clicks', () => {
    const handlers = {};
    let taps = 0;
    bindTouchTap({addEventListener(type, fn){handlers[type]=fn;}},()=>taps++,target=>target==='board');
    const touch=(x,y,id=1)=>({clientX:x,clientY:y,identifier:id});
    const fire=(type,touches,changedTouches=[],timeStamp=0,target='board')=>handlers[type]?.({type,touches,changedTouches,timeStamp,target});
    fire('touchstart',[touch(50,50)]);
    fire('touchend',[],[touch(53,51)],100);
    assert.equal(taps,1);
    // No pointerup prerequisite: catches Safari touchend before pointerup too.
    for(const [x,y] of [[150,50],[50,150]]) {
        fire('touchstart',[touch(50,50)]);
        fire('touchend',[],[touch(x,y)],100);
    }
    fire('touchstart',[touch(50,50)]);
    fire('touchmove',[touch(100,50)]);
    fire('touchend',[],[touch(50,50)],100); // swipe out and back is not a tap
    fire('touchstart',[touch(50,50)]);
    fire('touchcancel',[]);
    fire('touchend',[],[touch(50,50)],100);
    fire('touchstart',[touch(50,50)]);
    fire('touchstart',[touch(50,50),touch(70,50,2)]);
    fire('touchend',[],[touch(50,50)],100);
    fire('touchstart',[touch(50,50)]);
    fire('touchend',[],[touch(50,50)],700);
    fire('touchstart',[touch(50,50)],[],0,'button');
    fire('touchend',[],[touch(50,50)],100);
    fire('click',[],[],100);
    assert.equal(taps,1);
    fire('touchstart',[touch(50,50)],[],800);
    fire('touchend',[],[touch(50,50)],900);
    assert.equal(taps,2,'a fresh tap after swiping still works');
});
