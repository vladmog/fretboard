/** Optional triad-inversion explorer inside the existing Chord mode. */
import { getTriadShapes } from '../core/triads.js';
import { guide } from './harmony-guide.js';
import { state, getInstrumentTuning, getInstrumentMidiBases } from './state.js';

let enabled = false;
let stringSet = 'all';
let inversion = 'all';
let index = 0;
let previousKey = '';

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
}
function selectControl(panel, text, value, options, change) {
    const label = element('label', text);
    const select = element('select');
    select.setAttribute('aria-label', text);
    for (const [key, title] of options) {
        const option = element('option', title); option.value = key; select.appendChild(option);
    }
    select.value = value;
    select.addEventListener('change', () => { change(select.value); index = 0; });
    label.appendChild(select); panel.appendChild(label);
}
function diagram(shape, chord) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const add = (tag, attrs, text) => {
        const node = document.createElementNS(ns, tag);
        for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
        if (text !== undefined) node.textContent = text;
        svg.appendChild(node);
    };
    svg.setAttribute('viewBox', '0 0 220 132');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${chord.symbol}, ${guide.inversions[shape.inversion]}, strings ${shape.strings}, frets ${shape.positions.map(p => p.fret).join(', ')}`);
    const start = shape.low;
    const count = Math.max(3, shape.high - start + 1);
    const step = 176 / count;
    for (let col = 0; col <= count; col++) add('line', { x1: 30 + col * step, x2: 30 + col * step, y1: 24, y2: 112, stroke: '#bbb' });
    for (let col = 0; col < count; col++) add('text', { x: 30 + (col + 0.5) * step, y: 16, 'text-anchor': 'middle', 'font-size': 11 }, start + col);
    [...shape.positions].reverse().forEach((p, row) => {
        const y = 38 + row * 30;
        add('line', { x1: 30, x2: 206, y1: y, y2: y, stroke: '#333' });
        add('text', { x: 14, y: y + 4, 'text-anchor': 'middle', 'font-size': 11 }, p.string);
        const x = 30 + (p.fret - start + 0.5) * step;
        add('circle', { cx: x, cy: y, r: 12, fill: guide.triadColors[chord.intervals.indexOf(p.label)], stroke: '#222' });
        add('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 12 }, state.showNoteNames ? chord.noteSpelling[p.noteIndex] : p.label);
    });
    return svg;
}

// Returns a voicing only when the explorer is enabled; normal chord display stays intact.
export function renderTriadControls(chord, refresh) {
    const panel = document.getElementById('triad-shapes');
    if (!panel || state.mode !== 'chord' || !['maj', 'min', 'dim'].includes(chord.type)) return null;
    panel.style.display = 'block'; panel.replaceChildren();
    const key = `${chord.root}|${chord.type}|${state.instrument}`;
    if (key !== previousKey) { index = 0; previousKey = key; }
    const title = element('label', null, 'triad-toggle');
    const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = enabled;
    checkbox.addEventListener('change', () => { enabled = checkbox.checked; index = 0; refresh(); });
    title.append(checkbox, document.createTextNode('Triad inversions')); panel.appendChild(title);
    if (!enabled) return null;
    const all = getTriadShapes(chord, getInstrumentTuning(), getInstrumentMidiBases());
    const sets = [...new Set(all.map(s => s.strings))].sort().reverse();
    if (stringSet !== 'all' && !sets.includes(stringSet)) stringSet = 'all';
    selectControl(panel, 'Strings (low to high)', stringSet, [['all', 'All string sets'], ...sets.map(s => [s, s])], value => { stringSet = value; });
    selectControl(panel, 'Inversion', inversion, [['all', 'All inversions'], ...guide.inversions.map((v, i) => [String(i), v])], value => { inversion = value; });
    // Refresh after the individual selector has updated its filter.
    panel.querySelectorAll('select').forEach(select => select.addEventListener('change', refresh));
    const shapes = all.filter(s => (stringSet === 'all' || s.strings === stringSet) && (inversion === 'all' || s.inversion === Number(inversion)));
    if (!shapes.length) { panel.appendChild(element('p', 'No compact shape in frets 0–15 for these filters.')); return { positions: [] }; }
    index = Math.min(index, shapes.length - 1);
    const shape = shapes[index];
    const nav = element('div', null, 'triad-navigation');
    for (const [text, direction] of [['Previous', -1], ['Next', 1]]) {
        const button = element('button', text, 'btn btn-sm'); button.type = 'button';
        button.addEventListener('click', () => { index = (index + direction + shapes.length) % shapes.length; refresh(); });
        nav.appendChild(button);
    }
    panel.append(nav, element('p', `${index + 1} / ${shapes.length} · ${guide.inversions[shape.inversion]}`, 'triad-caption'), diagram(shape, chord));
    panel.appendChild(element('p', `Bass: ${chord.noteSpelling[shape.bass.noteIndex]} (${shape.bass.label}). Strings ${shape.strings}; frets ${shape.positions.map(p => p.fret).join('–')}.`, 'triad-caption'));
    panel.appendChild(element('p', 'Red = root · green = third · blue = fifth. Diagram: high string at top, fret numbers above; 0 is open. Inversions depend on the lowest sounding note. Move a closed shape along the neck to transpose; shapes crossing the B string differ because of guitar tuning.', 'triad-caption'));
    return shape;
}
