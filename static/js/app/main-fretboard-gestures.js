/** Reuse comparison gestures and the actual triad navigation actions. */
import { bindFretboardGestures } from './fretboard-gestures.js';
import { state } from './state.js';
const bound = new WeakSet();
function navigation() {
    if (state.mode === 'creator') {
        return [...document.querySelectorAll('#song-creator .creator-shape-nav button')].filter(button => !button.disabled);
    }
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
        }, () => navigation().length === 2, fraction => {
            navigation()[0]?.parentElement.dispatchEvent(new CustomEvent('shape-scrub', {detail:fraction}));
        }, () => state.inversionScrubbing);
        bound.add(svg);
    }
    const active = navigation().length === 2;
    svg.style.touchAction = active ? (vertical ? 'pan-x pinch-zoom' : 'pan-y pinch-zoom') : 'auto';
    svg.tabIndex = active ? 0 : -1;
    svg.setAttribute('aria-label', active
        ? (state.inversionScrubbing
            ? `Fretboard. Drag ${vertical ? 'top to bottom' : 'left to right'} to scrub from first to last chord shape.`
            : `Fretboard. Swipe ${vertical ? 'up or down' : 'left or right'} for Previous or Next chord shape.`)
        : 'Fretboard');
}
