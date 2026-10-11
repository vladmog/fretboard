import { getNoteIndex } from '../core/music-theory.js';
const running = new WeakMap();
/** Match pitch identity, so note-name and scale-relative labels work equally. */
export function pulsePluck(note, target = document.getElementById('fretboard-panel')) {
    const pitch = getNoteIndex(note.replace(/-?\d+$/, ''));
    const circle = globalThis.document?.getElementById('chromatic-circle-svg');
    const visible = element => element?.isConnected && element.getClientRects().length;
    const markers = [
        ...(visible(target) ? target.querySelectorAll(`.marker[data-pitch-class="${pitch}"] circle`) : []),
        ...(visible(circle) ? circle.querySelectorAll(`circle[data-pitch-class="${pitch}"]`) : [])
    ];
    for (const marker of markers) {
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
