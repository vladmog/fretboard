import test from 'node:test';
import assert from 'node:assert/strict';
import {quarterTurnPoint} from '../static/js/core/svg-quarter-turn.js';
for(const turn of [0,90,-90])test(`tap mapping includes ${turn} degree rotation and SVG letterboxing`,()=>{
    const width=275,height=1150,boxWidth=180,boxHeight=780;
    const scale=Math.min(boxWidth/width,boxHeight/height);
    const rect={left:30,top:40,width:turn?boxHeight:boxWidth,height:turn?boxWidth:boxHeight};
    for(const [x,y] of [[50,35],[225,90],[120,1100]]){
        const dx=(x-width/2)*scale,dy=(y-height/2)*scale;
        // Independent quarter-turn forward projection, including open strings.
        const sx=turn===90?-dy:turn===-90?dy:dx;
        const sy=turn===90?dx:turn===-90?-dx:dy;
        const result=quarterTurnPoint(rect,width,height,turn,rect.left+rect.width/2+sx,rect.top+rect.height/2+sy);
        assert.ok(Math.abs(result.x-x)<1e-8);assert.ok(Math.abs(result.y-y)<1e-8);
    }
});
