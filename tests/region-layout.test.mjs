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

test('entire rotated board stays inside iPhone safe areas in every orientation',()=>{
    for(const [width,height,angle,safe] of [
        [402,874,0,{top:62,bottom:34,left:0,right:0}],
        [874,402,90,{top:0,bottom:21,left:62,right:62}],
        [874,402,270,{top:0,bottom:21,left:62,right:62}],
        [874,402,-90,{top:0,bottom:21,left:62,right:62}]
    ]){
        const f=regionBoardFrame(width,height,angle,safe);
        const w=f.turn?f.height:f.width,h=f.turn?f.width:f.height;
        assert.ok(f.x-w/2>=safe.left);
        assert.ok(f.x+w/2<=width-safe.right);
        assert.ok(f.y-h/2>=safe.top);
        assert.ok(f.y+h/2<=height-safe.bottom);
        assert.ok(f.width>0&&f.height>0);
    }
});
