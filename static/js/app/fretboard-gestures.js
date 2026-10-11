/** Parallel gestures change one board; the perpendicular axis stays native scroll. */
export function bindFretboardGestures(host, vertical, advance, isEnabled = () => true) {
    host.style.touchAction = vertical ? 'pan-x pinch-zoom' : 'pan-y pinch-zoom';
    host.style.userSelect = 'none';
    host.tabIndex = 0;
    host.setAttribute('aria-label', vertical
        ? 'Swipe up or down to change this chord shape; swipe sideways for more chords'
        : 'Swipe left or right to change this chord shape; scroll vertically for more chords');
    let start = null;
    let suppressClickUntil = 0;
    const axes = (x, y) => vertical ? [y, x] : [x, y];
    host.addEventListener('pointerdown', event => {
        if (!isEnabled()) return;
        if (!event.isPrimary || event.button !== 0) return;
        suppressClickUntil = 0; // A fresh tap is distinct from the prior swipe's click.
        start = { x: event.clientX, y: event.clientY, id: event.pointerId };
        host.setPointerCapture(event.pointerId);
    });
    const trackSwipe = event => {
        if (!isEnabled()) { start = null; return; }
        if (!start || start.id !== event.pointerId) return;
        const [parallel, perpendicular] = axes(event.clientX - start.x, event.clientY - start.y);
        if (Math.max(Math.abs(parallel), Math.abs(perpendicular)) > 10) {
            suppressClickUntil = event.timeStamp + 500;
        }
        // Commit once while moving, so a slight return before lift-off cannot
        // erase a swipe. Keep perpendicular movement available for list scrolling.
        if (!start.stepped && Math.abs(parallel) >= 20 && Math.abs(parallel) > Math.abs(perpendicular)) {
            start.stepped = true;
            advance(parallel > 0 ? 1 : -1);
        }
    };
    host.addEventListener('pointermove', trackSwipe);
    host.addEventListener('pointerup', event => {
        trackSwipe(event);
        if (start?.id === event.pointerId) start = null;
    });
    host.addEventListener('pointercancel', () => { start = null; });
    host.addEventListener('click', event => {
        if (event.timeStamp <= suppressClickUntil) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    host.addEventListener('touchend', event => {
        if (event.timeStamp <= suppressClickUntil) event.stopPropagation();
    }, true);

    // A trackpad's momentum belongs to one gesture, not dozens of Next presses.
    let wheelTime = -Infinity, wheelTotal = 0, wheelDirection = 0, wheelStepped = false;
    host.addEventListener('wheel', event => {
        if (!isEnabled()) return;
        if (event.ctrlKey) return; // Browser pinch-to-zoom.
        const [parallel, perpendicular] = axes(event.deltaX, event.deltaY);
        if (Math.abs(parallel) <= Math.abs(perpendicular) * 1.25) return;
        event.preventDefault();
        const direction = Math.sign(parallel);
        if (event.timeStamp - wheelTime > 180 || direction !== wheelDirection) {
            wheelTotal = 0; wheelStepped = false;
        }
        wheelTime = event.timeStamp; wheelDirection = direction;
        wheelTotal += Math.abs(parallel) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
        if (!wheelStepped && wheelTotal >= 32) {
            wheelStepped = true;
            advance(direction);
        }
    }, { passive: false });
    host.addEventListener('keydown', event => {
        if (!isEnabled()) return;
        const next = vertical ? 'ArrowDown' : 'ArrowRight';
        const previous = vertical ? 'ArrowUp' : 'ArrowLeft';
        if (event.key === next || event.key === previous) {
            event.preventDefault();
            advance(event.key === next ? 1 : -1);
        }
    });
}
