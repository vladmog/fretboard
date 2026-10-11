/** Root + guide-tone shells; extensions and altered fifths are deliberately omitted. */
import * as Theory from './music-theory.js';

export function getShellIntervals(type) {
    const intervals = Theory.CHORD_TYPES[type]?.intervals ?? [];
    const third = intervals.find(i => i === '3' || i === 'b3') ?? (intervals.includes('4') ? '4' : null);
    const upper = intervals.find(i => ['7', 'b7', 'bb7'].includes(i)) ?? (intervals.includes('6') ? '6' : null);
    return third && upper ? ['1', third, upper] : [];
}
