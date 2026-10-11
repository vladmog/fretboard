/** Shared disclosure motion, including controls rebuilt by the renderers. */
const timing = { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
const running = new WeakMap();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function slide(node, from, to, finish = () => {}) {
    running.get(node)?.cancel();
    if (reduced() || !node.animate || Math.abs(from - to) < 1) { finish(); return; }
    const animation = node.animate([
        { height: `${from}px`, overflow: 'clip' },
        { height: `${to}px`, overflow: 'clip' }
    ], timing);
    running.set(node, animation);
    animation.finished.then(() => {
        if (running.get(node) !== animation) return;
        running.delete(node);
        finish();
    }).catch(() => {});
}

export function initDisclosureMotion() {
    const desired = new WeakMap();
    // Delegation also covers newly rendered song sections and shape diagrams.
    document.addEventListener('click', event => {
        const summary = event.target.closest('summary');
        const details = summary?.parentElement;
        if (details?.tagName !== 'DETAILS') return;
        event.preventDefault();
        const from = details.getBoundingClientRect().height;
        const open = !(desired.get(details) ?? details.open);
        desired.set(details, open);
        running.get(details)?.cancel();
        details.open = true;
        const expanded = details.getBoundingClientRect().height;
        details.open = false;
        const collapsed = details.getBoundingClientRect().height;
        details.open = true;
        summary.setAttribute('aria-expanded', String(open));
        slide(details, from, open ? expanded : collapsed, () => {
            details.open = open;
            desired.delete(details);
        });
    }, true);

    // Capture before synchronous state/render handlers; measure their final layout
    // next frame. No animation for a shape change with unchanged panel height.
    let pending = false;
    for (const type of ['click', 'change']) document.addEventListener(type, event => {
        if (pending || reduced() || event.target.closest('summary')) return;
        if (!event.target.closest('#controls-panel, #games-panel')) return;
        const panels = [...document.querySelectorAll('.control-workspace .mode-controls > .control-group, #scale-chord-builder, #find-controls, #game-content')];
        const before = panels.map(node => [node, node.getBoundingClientRect().height]);
        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            for (const [node, from] of before) {
                if (!node.isConnected) continue;
                running.get(node)?.cancel();
                const to = node.getBoundingClientRect().height;
                // Hidden mode controls should not be made interactive again.
                if (from && to) slide(node, from, to);
                else if (to) slide(node, 0, to);
            }
        });
    }, true);
}
