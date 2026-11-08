import { createStatsStore } from './storage.js';
const store = createStatsStore();
const key = 'note-in-box-position-times';
/** Time to solve, including retries; revealed answers do not count as recall. */
export function beginPositionTiming(instrument, now = () => performance.now()) {
    const started = now();
    let finished = false, assisted = false;
    return {
        reveal(){assisted = true;},
        complete(position){
            if(finished || assisted)return;
            finished = true;
            store.commitSession(key,[{path:[instrument,String(position.string),String(position.fret)],correct:true,timeMs:Math.max(0,now()-started)}]);
        }
    };
}
export function positionTimings(instrument) {
    const saved=store.load()[key]?.[instrument] || {};
    const result={};
    for(const [string,frets] of Object.entries(saved)) for(const [fret,entry] of Object.entries(frets)) {
        if(entry.timedCount>0 && Number.isFinite(entry.totalTimeMs))result[`${string}:${fret}`]={mean:entry.totalTimeMs/entry.timedCount,count:entry.timedCount};
    }
    return result;
}
