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

export function appendHarmonyGuide(container, scaleType, chords) {
    if (!getHarmonicFunction(scaleType, 1)) return;
    const details = document.createElement('details');
    details.className = 'harmony-guide';
    const summary = document.createElement('summary');
    summary.textContent = 'Harmonic functions';
    details.appendChild(summary);
    for (const family of ['tonic', 'predominant', 'dominant']) {
        const p = document.createElement('p');
        p.textContent = `${guide.families[family].short} — ${guide.families[family].meaning}`;
        details.appendChild(p);
    }
    const list = document.createElement('ul');
    for (const chord of chords) {
        const info = getHarmonicFunction(scaleType, chord.degree);
        const li = document.createElement('li');
        li.textContent = `${chord.numeral} ${chord.symbol}: ${info.degreeName} · ${info.name}${info.qualification ? ' — ' + info.qualification : ''}`;
        list.appendChild(li);
    }
    details.appendChild(list);
    for (const text of [guide.contextNote, ...(scaleType.includes('minor') || scaleType === 'aeolian' ? [guide.minorNote] : [])]) {
        const p = document.createElement('p'); p.textContent = text; details.appendChild(p);
    }
    const source = document.createElement('a');
    source.href = guide.source; source.textContent = 'Read about harmonic function';
    source.target = '_blank'; source.rel = 'noopener'; details.appendChild(source);
    container.appendChild(details);
}
