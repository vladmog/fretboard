import { createFretboard } from '../core/fretboard.js';
import { instrumentConfig } from '../core/voice-leading.js';
import { notePositions } from '../core/nearest-note.js';
import { getNoteName } from '../core/music-theory.js';
import { reactionTimeToColor } from './game-utils.js';
import { positionTimings } from './note-position-stats.js';

export function renderPositionHeatmap(parent,instrument){
    const section=document.createElement('section');section.className='note-position-heatmap';
    const heading=document.createElement('h3');heading.textContent='Time to identify';
    const legend=document.createElement('p');legend.className='note-position-legend';
    legend.textContent='Faster → slower · Gray: not practiced';
    const host=document.createElement('div');host.className='note-position-board';
    host.setAttribute('aria-label','Average time to identify each string and fret position');
    const detail=document.createElement('p');detail.className='note-position-detail';detail.setAttribute('role','status');
    detail.textContent='Tap a marker for its average time. Unassisted answers only.';
    section.append(heading,legend,host,detail);parent.append(section);
    const stats=positionTimings(instrument), times=Object.values(stats).map(s=>s.mean);
    const min=Math.min(...times),max=Math.max(...times);
    let width=-1;
    function draw(){
        if(width===host.clientWidth)return;
        width=host.clientWidth;host.replaceChildren();
        const board=createFretboard(host,{tuning:instrumentConfig(instrument).tuning,frets:15,vertical:width<600,fretSpacing:40,stringSpacing:width<600?44:30,markerScale:0.7});
        for(const pos of notePositions(instrument)){
            const stat=stats[`${pos.string}:${pos.fret}`];
            const color=stat?reactionTimeToColor(stat.mean,min,max):'#ddd';
            board.setMarker(pos.string,pos.fret,{text:getNoteName(pos.midi%12,true),color,borderColor:'#444',textColor:'#111'});
        }
        board.onFretClick((string,fret)=>{
            const stat=stats[`${string}:${fret}`];
            const name=getNoteName(notePositions(instrument).find(p=>p.string===string&&p.fret===fret).midi%12,true);
            detail.textContent=`${name} · String ${string}, ${fret===0?'open':`fret ${fret}`} · ${stat?`${(stat.mean/1000).toFixed(1)}s average · ${stat.count} answer${stat.count===1?'':'s'}`:'Not practiced yet'}`;
        });
    }
    draw();const observer=new ResizeObserver(draw);observer.observe(host);
    return ()=>observer.disconnect();
}
