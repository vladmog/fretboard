import { createStatsStore } from './storage.js';
const store = createStatsStore();
const statsKey=mode=>mode==='note'?'note-in-box-position-times':`note-in-box-position-times-${mode}`;
/** Time to solve, including retries; revealed answers do not count as recall. */
export function beginPositionTiming(instrument, now = () => performance.now(), mode='note') {
    const started = now();
    let finished = false, assisted = false;
    return {
        reveal(){assisted = true;},
        complete(position){
            if(finished || assisted)return;
            finished = true;
            store.commitSession(statsKey(mode),[{path:[instrument,String(position.string),String(position.fret)],correct:true,timeMs:Math.max(0,now()-started)}]);
        }
    };
}
export function positionTimings(instrument,mode='note') {
    const saved=store.load()[statsKey(mode)]?.[instrument] || {};
    const result={};
    for(const [string,frets] of Object.entries(saved)) for(const [fret,entry] of Object.entries(frets)) {
        if(entry.timedCount>0 && Number.isFinite(entry.totalTimeMs))result[`${string}:${fret}`]={mean:entry.totalTimeMs/entry.timedCount,count:entry.timedCount};
    }
    return result;
}
