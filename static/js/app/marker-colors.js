/** Main-app notation palette. Games retain the core palette. */
import { getIntervalColor } from '../core/music-theory.js';
export function getMarkerColor(interval) {
    return interval === '1'
        ? { fill: '#000', border: '#FF0000', text: '#fff' }
        : getIntervalColor(interval);
}
