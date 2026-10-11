/** Reuse comparison gestures and the actual triad navigation actions. */
import { bindFretboardGestures } from './fretboard-gestures.js';
import { state } from './state.js';
const bound = new WeakSet();
function navigation() {
    if (state.mode !== 'chord') return [];
    const panel = document.getElementById('triad-shapes');
    if (!panel || panel.style.display === 'none') return [];
    return [...panel.querySelectorAll('.triad-navigation button')];
}
export function syncMainFretboardGestures() {
    const svg = document.querySelector('#fretboard-panel > svg');
    if (!svg) return;
    const vertical = state.fretboard.isVertical;
    if (!bound.has(svg)) {
        bindFretboardGestures(svg, vertical, direction => {
            navigation()[direction > 0 ? 1 : 0]?.click();
        }, () => navigation().length === 2);
        bound.add(svg);
    }
    const active = navigation().length === 2;
    svg.style.touchAction = active ? (vertical ? 'pan-x pinch-zoom' : 'pan-y pinch-zoom') : 'auto';
    svg.tabIndex = active ? 0 : -1;
    svg.setAttribute('aria-label', active
        ? `Fretboard. Swipe ${vertical ? 'down for Next, up for Previous' : 'right for Next, left for Previous'} chord shape.`
        : 'Fretboard');
}
