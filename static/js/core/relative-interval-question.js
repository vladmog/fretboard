/** Keep the sampled interval, anchoring its given note to the last correct answer. */
export function relativeIntervalQuestion(question, mode, previousAnswer, roots) {
    if (!Number.isInteger(previousAnswer) || mode.endsWith('-builder')) return question;
    const givenOffset = mode === 'interval-to-root' ? question.semitone
        : mode === 'interval-to-interval' ? question.givenSemitone : 0;
    const rootIndex = ((previousAnswer - givenOffset) % 12 + 12) % 12;
    return { ...question, root: roots[rootIndex] };
}
