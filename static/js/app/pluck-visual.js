import { getNoteIndex } from '../core/music-theory.js';
const running = new WeakMap();
/** Match pitch identity, so note-name and scale-relative labels work equally. */
export function pulsePluck(note, target = document.getElementById('fretboard-panel')) {
    if (!target || !target.isConnected || !target.getClientRects().length) return;
    const pitch = getNoteIndex(note.replace(/-?\d+$/, ''));
    for (const marker of target.querySelectorAll(`.marker[data-pitch-class="${pitch}"] circle`)) {
        running.get(marker)?.cancel();
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animation = marker.animate([
            {strokeWidth: 2},
            {strokeWidth: 8},
            {strokeWidth: 2}
        ], {duration: reduced ? 100 : 240, easing: 'ease-out'});
        running.set(marker, animation);
    }
}
