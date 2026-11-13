export function angleDelta(from, to) {
    return ((to - from + 540) % 360) - 180;
}
/** A visual reference only. Capture a drag before note click handlers can grade it. */
export function attachRotatableCross(svg, size, onTap) {
    const ns = 'http://www.w3.org/2000/svg', center = size / 2, radius = size * (.32 + .38 * (35 / 72)) / 2; // Halfway between the original and main-app proportions.
    const group = document.createElementNS(ns, 'g');
    group.style.pointerEvents = 'none';
    for (const horizontal of [false, true]) {
        const line = document.createElementNS(ns, 'line');
        for (const [key, value] of Object.entries(horizontal
            ? {x1:center-radius,y1:center,x2:center+radius,y2:center}
            : {x1:center,y1:center-radius,x2:center,y2:center+radius})) line.setAttribute(key, value);
        line.setAttribute('stroke','#999');line.setAttribute('stroke-width',size*.004);group.append(line);
    }
    const dot=document.createElementNS(ns,'circle');
    dot.setAttribute('cx',center);dot.setAttribute('cy',center-radius+size*.01);
    dot.setAttribute('r',size*.01);dot.setAttribute('fill','#999');group.append(dot);
    svg.insertBefore(group,svg.firstChild);
    let enabled=false, free=false, rotation=0, gesture=null, suppress=false;
    function draw(){group.setAttribute('transform',`rotate(${rotation} ${center} ${center})`);}
    function point(event){
        const rect=svg.getBoundingClientRect();
        const x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2;
        return {angle:Math.atan2(y,x)*180/Math.PI, distance:Math.hypot(x,y)};
    }
    svg.addEventListener('pointerdown',event=>{
        if(!enabled||!free||event.isPrimary===false||event.button>0)return;
        suppress=false;
        const p=point(event);
        gesture={id:event.pointerId,last:p.angle,x:event.clientX,y:event.clientY,moved:false,valid:p.distance>12};
    },true);
    svg.addEventListener('pointermove',event=>{
        if(!gesture||gesture.id!==event.pointerId)return;
        const p=point(event);
        if(!gesture.moved&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>6){
            gesture.moved=true;svg.setPointerCapture(event.pointerId);
        }
        if(gesture.moved){
            event.preventDefault();
            if(gesture.valid&&p.distance>12){rotation+=angleDelta(gesture.last,p.angle);draw();}
        }
        gesture.last=p.angle;gesture.valid=p.distance>12;
    },true);
    function finish(event){
        if(!gesture||gesture.id!==event.pointerId)return;
        suppress=gesture.moved||event.type==='pointercancel';
        if (gesture.moved) { rotation = Math.round(rotation / 30) * 30; draw(); }
        if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
        gesture=null;
    }
    svg.addEventListener('pointerup',finish,true);
    svg.addEventListener('pointercancel',finish,true);
    svg.addEventListener('click',event=>{
        if(!enabled||!free)return;
        if(suppress){event.preventDefault();event.stopImmediatePropagation();suppress=false;return;}
        if(onTap()){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    return {update(show, manual, rootIndex){
        const changed=free!==manual;
        enabled=show;free=manual;
        group.style.display=show?'':'none';
        if(!free)rotation=rootIndex*30;else if(changed)rotation=0;
        svg.style.touchAction=show&&free?'none':'';
        if(show&&free)svg.setAttribute('data-free-rotation','');else svg.removeAttribute('data-free-rotation');
        draw();
    }};
}
