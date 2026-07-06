/**
 * Note ID — Matrix Drills
 * A matrix shows one note in the center; identify the highlighted cell's note
 * by clicking the chromatic circle. Registered in games/framework.js.
 */

import { createMatrixGame } from './matrix-game.js';

export default createMatrixGame({
    id: 'note-id',
    title: 'Note ID',
    explanation: 'A matrix shows one note in the center. Moving right adds a semitone; moving up a row adds a perfect 4th. Work out the highlighted cell’s note and click it on the chromatic circle.',
    domain: 'note',
    input: 'circle'
});
