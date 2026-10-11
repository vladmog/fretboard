/** Recognize a stationary single-finger tap, independently of pointer event order. */
export function bindTouchTap(host, onTap, accepts = () => true) {
    let start = null;
    const options = { capture: true, passive: true };
    host.addEventListener('touchstart', event => {
        if (event.touches.length !== 1 || !accepts(event.target)) { start = null; return; }
        const touch = event.touches[0];
        start = { id: touch.identifier, x: touch.clientX, y: touch.clientY, time: event.timeStamp };
    }, options);
    const moved = touch => Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10;
    host.addEventListener('touchmove', event => {
        if (!start) return;
        const touch = [...event.touches].find(t => t.identifier === start.id);
        if (event.touches.length !== 1 || !touch || moved(touch)) start = null;
    }, options);
    host.addEventListener('touchcancel', () => { start = null; }, options);
    host.addEventListener('touchend', event => {
        if (!start) return;
        const touch = [...event.changedTouches].find(t => t.identifier === start.id);
        const tap = touch && event.touches.length === 0 && !moved(touch) && event.timeStamp - start.time <= 500;
        start = null;
        if (tap) onTap(event);
    }, options);
}
