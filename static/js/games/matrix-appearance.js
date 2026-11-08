/** Update presentation in place, preserving the question and answered cells. */
export function refreshMatrixAppearance(root, settings, center, colorFor) {
    if (!root) return;
    for (const group of root.querySelectorAll('[data-semitone]')) {
        const tone = Number(group.dataset.semitone);
        const colors = settings.circleColors ? colorFor(tone, center, true)
            : {fill: tone % 2 === 0 ? '#000' : '#777', border: tone % 2 === 0 ? '#000' : '#777', text: '#fff'};
        // Locator rings precede the marker; keep their outlines unchanged.
        const circles = group.querySelectorAll('circle');
        const marker = circles[circles.length - 1];
        const text = group.querySelector('text');
        marker.setAttribute('fill', colors.fill);
        marker.setAttribute('stroke', colors.border);
        text.setAttribute('fill', colors.text);
        text.setAttribute('visibility', settings.circleLabels ? 'visible' : 'hidden');
    }
    for (const group of root.querySelectorAll('[data-matrix-tone]')) {
        const colors = colorFor(Number(group.dataset.matrixTone), center, settings.showColors);
        const rect = group.querySelector('rect');
        rect.setAttribute('fill', colors.fill);
        rect.setAttribute('stroke', colors.border);
        group.querySelector('text').setAttribute('fill', colors.text);
    }
}
