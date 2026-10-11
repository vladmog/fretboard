/** The existing pitch circle can rearrange without changing pitch identities. */
let fifths = false;
const bound = new WeakSet();
const animations = new WeakMap();
export function circlePoint(note, radius, useFifths = fifths) {
    const slot = ((note * (useFifths ? 7 : 1)) % 12 + 12) % 12;
    const angle = (slot * 30 - 90) * Math.PI / 180;
    return [100 + radius * Math.cos(angle), 100 + radius * Math.sin(angle)];
}
export function positionCircle(svg, animate = false) {
    cancelAnimationFrame(animations.get(svg));
    const changes = [];
    for (const node of svg.querySelectorAll('[data-orbit-note]')) {
        const [x, y] = circlePoint(Number(node.dataset.orbitNote), Number(node.dataset.orbitRadius));
        const attrs = node.tagName.toLowerCase() === 'circle' ? ['cx','cy'] : ['x','y'];
        attrs.forEach((attr, i) => changes.push({node, attr, from: Number(node.getAttribute(attr)), to: [x,y][i]}));
    }
    for (const node of svg.querySelectorAll('[data-orbit-from]')) {
        const from = circlePoint(Number(node.dataset.orbitFrom),35);
        const to = circlePoint(Number(node.dataset.orbitTo),35);
        ['x1','y1','x2','y2'].forEach((attr,i)=>changes.push({node,attr,from:Number(node.getAttribute(attr)),to:[...from,...to][i]}));
    }
    const label = fifths ? 'Circle of fifths' : 'Chromatic circle';
    svg.setAttribute('aria-label', `${label}. Activate to switch to ${fifths ? 'chromatic order' : 'circle of fifths'}.`);
    svg.setAttribute('aria-pressed',String(fifths));
    svg.dataset.order = fifths ? 'fifths' : 'chromatic';
    const duration = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 240 : 0;
    const start = performance.now();
    const frame = now => {
        const t = duration ? Math.min(1,(now-start)/duration) : 1;
        const eased = 1-Math.pow(1-t,3);
        for(const {node,attr,from,to} of changes) node.setAttribute(attr,t === 1 ? to : from+(to-from)*eased);
        if(t<1) animations.set(svg,requestAnimationFrame(frame));
    };
    frame(start);
    if (!bound.has(svg)) {
        bound.add(svg);
        svg.setAttribute('role','button');
        svg.setAttribute('tabindex','0');
        const toggle = () => { fifths = !fifths; positionCircle(svg,true); };
        svg.addEventListener('click',toggle);
        svg.addEventListener('keydown',event=>{
            if(event.key==='Enter'||event.key===' ') {event.preventDefault();toggle();}
        });
    }
}
