/** Learning annotations; no changes to chord generation or musical state. */
const response = await fetch(new URL('../../data/harmony-guide.json', import.meta.url));
if (!response.ok) throw new Error('Could not load harmony guide');
export const guide = await response.json();

export function getHarmonicFunction(scaleType, degree) {
    const scale = scaleType === 'aeolian' ? 'natural_minor' : scaleType;
    const family = guide.scales[scale]?.[degree - 1];
    if (!family) return null;
    return {
        ...guide.families[family], family,
        degreeName: scale === 'natural_minor' && degree === 7 ? 'Subtonic' : guide.degrees[degree - 1],
        qualification: scale === 'natural_minor' && degree === 5 ? 'Weaker dominant: no raised leading tone.' : ''
    };
}

export function annotateChordButton(button, scaleType, chord) {
    const info = getHarmonicFunction(scaleType, chord.degree);
    if (!info) return;
    button.classList.add('has-function');
    const badge = document.createElement('span');
    badge.className = `function-badge function-${info.family}`;
    badge.textContent = info.short;
    badge.title = `${info.degreeName} · ${info.name}. ${info.qualification}`;
    button.title = `${chord.numeral}: ${info.degreeName} · ${info.name}. ${info.qualification}`;
    button.setAttribute('aria-label', `${chord.numeral} ${chord.symbol}, ${info.degreeName}, ${info.name}`);
    button.appendChild(badge);
}
