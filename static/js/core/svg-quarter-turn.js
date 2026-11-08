/** Map a screen tap into a centered SVG viewBox after a CSS quarter turn.
 * Uses the observed rectangle so ancestor CSS rotations need not be reported
 * correctly by getScreenCTM. Supports xMidYMid meet letterboxing.
 */
export function quarterTurnPoint(rect, width, height, turn, clientX, clientY) {
    const rotated=Math.abs(turn)%180===90;
    const boxWidth=rotated?rect.height:rect.width;
    const boxHeight=rotated?rect.width:rect.height;
    const scale=Math.min(boxWidth/width,boxHeight/height);
    if(!(scale>0))return null;
    const dx=clientX-(rect.left+rect.width/2),dy=clientY-(rect.top+rect.height/2);
    const radians=turn*Math.PI/180;
    return {x:(dx*Math.cos(radians)+dy*Math.sin(radians))/scale+width/2,
        y:(-dx*Math.sin(radians)+dy*Math.cos(radians))/scale+height/2};
}
