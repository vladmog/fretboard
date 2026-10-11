import {test} from 'node:test';
import assert from 'node:assert/strict';
import {circlePoint,positionCircle} from '../static/js/app/circle-order.js';
test('circle toggle animates pitch positions and returns to chromatic order',()=>{
    const frames=[];
    globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
    globalThis.cancelAnimationFrame=()=>{};
    globalThis.window={matchMedia:()=>({matches:false})};
    const nodes=Array.from({length:12},(_,i)=>{
        const [cx,cy]=circlePoint(i,72,false);
        return {tagName:'circle',dataset:{orbitNote:i,orbitRadius:72},attrs:{cx,cy},
            getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;}};
    });
    const svg={dataset:{},events:{},setAttribute(){},addEventListener(k,f){this.events[k]=f;},
        querySelectorAll(selector){return selector==='[data-orbit-note]'?nodes:[];}};
    try {
        positionCircle(svg);
        svg.events.click();
        assert.equal(svg.dataset.order,'fifths');
        assert.ok(frames.length);
        frames.pop()(performance.now()+300);
        for(let i=0;i<12;i++){
            const expected=circlePoint(i,72,true);
            assert.ok(Math.abs(nodes[i].attrs.cx-expected[0])<1e-8);
            assert.ok(Math.abs(nodes[i].attrs.cy-expected[1])<1e-8);
        }
        // G is immediately clockwise from C in fifths order.
        assert.deepEqual(circlePoint(7,72,true),circlePoint(1,72,false));
        globalThis.window.matchMedia=()=>({matches:true});
        svg.events.keydown({key:'Enter',preventDefault(){}});
        assert.equal(svg.dataset.order,'chromatic');
        assert.deepEqual([nodes[1].attrs.cx,nodes[1].attrs.cy],circlePoint(1,72,false));
    } finally {
        delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame;delete globalThis.window;
    }
});
