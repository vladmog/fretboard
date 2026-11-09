/** Drag along the long screen axis; store a fraction so rotation/resizing stays safe. */
export function attachCircleDrag(handle,circle,settings,save,onTap=()=>{}){
    let drag=null;
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    function geometry(){
        circle.style.translate='0px 0px';
        const rect=circle.getBoundingClientRect(),landscape=innerWidth>innerHeight;
        const low=landscape?12:64,high=landscape?innerWidth-12:innerHeight-56;
        const start=landscape?rect.left:rect.top,end=landscape?rect.right:rect.bottom;
        return {landscape,key:landscape?'circleLandscape':'circlePortrait',min:Math.min(0,low-start),max:Math.max(0,high-end)};
    }
    function move(g,value){circle.style.translate=g.landscape?`${value}px 0px`:`0px ${value}px`;}
    function apply(){const g=geometry(),fraction=clamp(Number(settings[g.key])||0,-1,1);move(g,fraction*(fraction<0?-g.min:g.max));}
    handle.style.touchAction='none';handle.setAttribute('aria-label','Drag answer circle: vertically in portrait, horizontally in landscape');
    handle.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;e.preventDefault();e.stopPropagation();
        const g=geometry(),fraction=clamp(Number(settings[g.key])||0,-1,1);
        drag={...g,id:e.pointerId,startX:e.clientX,startY:e.clientY,started:Date.now(),moved:false,start:g.landscape?e.clientX:e.clientY,offset:fraction*(fraction<0?-g.min:g.max)};
        move(g,drag.offset);handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove',e=>{
        if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
        if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8)drag.moved=true;
        if(!drag.moved)return;
        const value=clamp(drag.offset+(drag.landscape?e.clientX:e.clientY)-drag.start,drag.min,drag.max);
        settings[drag.key]=value===0?0:value/(value<0?-drag.min:drag.max);move(drag,value);
    });
    const end=e=>{
        if(!drag||e.pointerId!==drag.id)return;
        const tap=e.type!=='pointercancel'&&!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<=8&&Date.now()-drag.started<500;
        drag=null;save();if(tap)onTap();
    };
    handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
    return apply;
}
