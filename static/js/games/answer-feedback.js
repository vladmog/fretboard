/** Visible and screen-reader feedback: text and symbols carry the result, not color alone. */
export function showAnswerFeedback(element, correct, detail) {
    element.dataset.result = correct ? 'correct' : 'incorrect';
    element.textContent = `${correct ? '✓ Correct' : '✕ Not quite'}${detail ? ` — ${detail}` : ''}`;
}
export function clearAnswerFeedback(element) {
    delete element.dataset.result;
}
