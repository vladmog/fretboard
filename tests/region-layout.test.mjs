import {test} from 'node:test';
import assert from 'node:assert/strict';
import {regionBoardFrame} from '../static/js/games/region-layout.js';

for (const [w,h] of [[393,852],[412,915],[768,1024]]) {
    test(`physical board position survives both landscape rotations at ${w}x${h}`,()=>{
        const portrait=regionBoardFrame(w,h,0);
        for (const angle of [90,270,-90]) {
            const landscape=regionBoardFrame(h,w,angle);
            assert.equal(landscape.width,portrait.width);
            assert.equal(landscape.height,portrait.height);
            // Invert the display rotation into the phone's portrait coordinates.
            const x=landscape.turn===-90 ? w-landscape.y : landscape.y;
            const y=landscape.turn===-90 ? landscape.x : h-landscape.x;
            assert.equal(x,portrait.x);
            assert.equal(y,portrait.y);
            assert.equal(landscape.controls,landscape.y>w/2?'top':'bottom');
        }
    });
}
