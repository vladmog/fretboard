/**
 * Interval ID — Matrix Drills
 * A matrix shows one interval in the center; identify the highlighted cell's
 * interval by clicking the chromatic circle. Registered in games/framework.js.
 */

import { createMatrixGame } from './matrix-game.js';

export default createMatrixGame({
    id: 'interval-id',
    title: 'Interval ID',
    explanation: 'A matrix shows one interval in the center. Moving right adds a semitone; moving up a row adds a perfect 4th. Work out the highlighted cell’s interval and click it on the chromatic circle.',
    domain: 'interval',
    input: 'circle'
});
