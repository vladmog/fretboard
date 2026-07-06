/**
 * Note Locator — Matrix Drills (inverse of Note ID)
 * The chromatic circle prompts a target note; click every matrix cell that
 * equals it. Registered in games/framework.js.
 */

import { createMatrixGame } from './matrix-game.js';

export default createMatrixGame({
    id: 'note-locator',
    title: 'Note Locator',
    explanation: 'A matrix shows one note in the center. Moving right adds a semitone; moving up a row adds a perfect 4th. The chromatic circle highlights a target note — click every matrix cell that equals it.',
    domain: 'note',
    input: 'matrix'
});
