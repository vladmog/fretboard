import {notePositions} from './nearest-note.js';
export function sanitizeDrillDistance(value){
    const n=Number(value);
    return Number.isFinite(n)?Math.max(1,Math.min(15,Math.round(n))):1;
}
export function drillCandidates(instrument,previous,limited=false,distance=1,history=[]){
    const radius=sanitizeDrillDistance(distance);
    const same=(a,b)=>a&&b&&a.string===b.string&&a.fret===b.fret;
    const banned=history.length>=3&&same(history.at(-1),history.at(-3))?history.at(-2):null;
    return notePositions(instrument).filter(p=>!same(p,banned)).filter(p=>!previous||(
        (p.string!==previous.string||p.fret!==previous.fret)&&
        (!limited||(Math.abs(p.string-previous.string)<=radius&&Math.abs(p.fret-previous.fret)<=radius))
    ));
}
