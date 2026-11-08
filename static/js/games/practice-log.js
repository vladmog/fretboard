import { createStatsStore } from './storage.js';
const store = createStatsStore();
/** Log the first graded attempt once per question, including mistakes.
 * Retries remain playable without inflating the question count. */
export function beginPracticeQuestion(game, path) {
    const started = Date.now();
    let logged = false;
    return correct => {
        if (logged) return;
        store.commitSession(game, [{path, correct: !!correct, timeMs: Math.max(0, Date.now() - started)}]);
        logged = true;
    };
}
