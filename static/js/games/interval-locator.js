/**
 * Interval Locator — Matrix Drills (inverse of Interval ID)
 * The chromatic circle prompts a target interval; click every matrix cell
 * that equals it. Registered in games/framework.js.
 */

import { createMatrixGame } from './matrix-game.js';

export default createMatrixGame({
    id: 'interval-locator',
    title: 'Interval Locator',
    explanation: 'A matrix shows one interval in the center. Moving right adds a semitone; moving up a row adds a perfect 4th. The chromatic circle highlights a target interval — click every matrix cell that equals it.',
    domain: 'interval',
    input: 'matrix'
});
