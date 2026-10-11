/** Full-chord and shell inversion explorer inside Chords mode. */
import { guide } from './harmony-guide.js';
import { getChordVoicings, getVoicingIntervals, inversionName } from '../core/chord-voicings.js';
import { getShellIntervals } from '../core/shell-voicings.js';
import * as Theory from '../core/music-theory.js';
import { state, getInstrumentTuning, getInstrumentMidiBases } from './state.js';

let enabled = false;
let voicing = 'full';
let stringSet = 'all';
let stringCount = 3;
let inversion = 'all';
let index = 0;

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
    const height = 52 + 30 * new Set(shape.positions.map(p => p.string)).size;
    svg.setAttribute('viewBox', `0 0 220 ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${chord.symbol}, ${inversionName(chord, shape.inversion)}, strings ${shape.strings}, frets ${shape.positions.map(p => p.fret).join(', ')}`);
    const start = shape.low;
    const count = Math.max(3, shape.high - start + 1);
    const step = 176 / count;
    for (let col = 0; col <= count; col++) add('line', { x1: 30 + col * step, x2: 30 + col * step, y1: 24, y2: height - 20, stroke: '#bbb' });
    for (let col = 0; col < count; col++) add('text', { x: 30 + (col + 0.5) * step, y: 16, 'text-anchor': 'middle', 'font-size': 11 }, start + col);
    const strings = [...new Set(shape.positions.map(p => p.string))].sort((a,b) => a-b);
    strings.forEach((string, row) => {
        const y = 38 + row * 30;
        add('line', { x1: 30, x2: 206, y1: y, y2: y, stroke: '#333' });
        add('text', { x: 14, y: y + 4, 'text-anchor': 'middle', 'font-size': 11 }, string);
    });
    shape.positions.forEach(p => {
        const y = 38 + strings.indexOf(p.string) * 30;
        const x = 30 + (p.fret - start + 0.5) * step;
        add('circle', { cx: x, cy: y, r: 12, fill: ['maj', 'min', 'dim'].includes(chord.type) ? guide.triadColors[chord.intervals.indexOf(p.label)] : Theory.getIntervalColor(p.label).fill, stroke: Theory.getIntervalColor(p.label).border });
        add('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 12 }, state.showNoteNames ? chord.noteSpelling[p.noteIndex] : p.label);
    });
    return svg;
}

// Returns a voicing only when the explorer is enabled; normal chord display stays intact.
export function renderTriadControls(chord, refresh) {
    const panel = document.getElementById('triad-shapes');
    if (!panel || state.mode !== 'chord') return null;
    panel.style.display = 'grid'; panel.replaceChildren();
    const title = element('label', null, 'triad-toggle');
    const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = enabled;
    // Toggling changes the view, not the selected filters or voicing.
    checkbox.addEventListener('change', () => { enabled = checkbox.checked; refresh(); });
    title.append(checkbox, document.createTextNode('Inversions')); panel.appendChild(title);
    if (!enabled) return null;
    const supportsShell = getShellIntervals(chord.type).length > 0;
    const activeVoicing = supportsShell ? voicing : 'full';
    const all = getChordVoicings(chord, getInstrumentTuning(), getInstrumentMidiBases(), {voicing: activeVoicing, stringCount});
    const sets = [...new Set(all.map(s => s.strings))].sort().reverse();
    if (stringSet !== 'all' && !sets.includes(stringSet)) stringSet = 'all';
    const filters = element('div', null, 'triad-filters');
    panel.appendChild(filters);
    if (supportsShell) selectControl(filters, 'Voicing', activeVoicing, [['full', 'Full chord'], ['shell', 'Shell voicing']], value => { voicing = value; stringSet = 'all'; inversion = 'all'; });
    const triadPatterns = activeVoicing === 'full' && ['maj', 'min', 'dim'].includes(chord.type);
    if (triadPatterns || activeVoicing === 'shell') selectControl(filters, 'Pattern strings', String(stringCount), [['3', 'Three strings'], ['2', 'Two strings'], ['both', 'Two and three strings']], value => { stringCount = value === 'both' ? 'both' : Number(value); stringSet = 'all'; });
    selectControl(filters, !triadPatterns || stringCount === 'both' ? 'String group' : (stringCount === 2 ? 'Two-string group' : 'Three-string group'), stringSet, [['all', triadPatterns ? 'Any adjacent group' : 'Any string group'], ...sets.map(s => [s, `Strings ${s}`])], value => { stringSet = value; });
    const tones = getVoicingIntervals(chord, activeVoicing);
    const inversions = tones.map(tone => chord.intervals.indexOf(tone));
    if (inversion !== 'all' && !inversions.includes(Number(inversion))) inversion = 'all';
    selectControl(filters, 'Inversion', inversion, [['all', 'All inversions'], ...inversions.map(i => [String(i), inversionName(chord, i)])], value => { inversion = value; });
    if (activeVoicing === 'shell') panel.appendChild(element('p', `Shell: ${tones.join(' · ')}. Omitted: ${chord.intervals.filter(t => !tones.includes(t)).join(', ')}.`, 'triad-caption'));
    // Refresh after the individual selector has updated its filter.
    panel.querySelectorAll('select').forEach(select => select.addEventListener('change', refresh));
    const shapes = all.filter(s => (stringSet === 'all' || s.strings === stringSet) && (inversion === 'all' || s.inversion === Number(inversion)));
    if (!shapes.length) { panel.appendChild(element('p', 'No compact shape in frets 0–15 for these filters and instrument.')); return { positions: [] }; }
    index = Math.min(index, shapes.length - 1);
    const shape = shapes[index];
    const nav = element('div', null, 'triad-navigation');
    for (const [text, direction] of [['Previous', -1], ['Next', 1]]) {
        const button = element('button', text, 'btn btn-sm'); button.type = 'button';
        button.addEventListener('click', () => { index = (index + direction + shapes.length) % shapes.length; refresh(); });
        nav.appendChild(button);
    }
    filters.append(nav, element('p', `${index + 1} / ${shapes.length} · ${inversionName(chord, shape.inversion)}`, 'triad-caption'));
    const preview = element('details', null, 'triad-preview');
    preview.open = !window.matchMedia('(pointer: coarse) and (max-width: 1100px)').matches;
    preview.appendChild(element('summary', 'Shape diagram'));
    preview.append(diagram(shape, chord), element('p', `Bass ${chord.noteSpelling[shape.bass.noteIndex]} · Strings ${shape.strings} · Frets ${shape.positions.map(p => p.fret).join('–')}`, 'triad-caption'));
    preview.title = (new Set(shape.positions.map(p => p.string)).size < shape.positions.length ? 'Play the two notes on the same string successively. ' : '') + 'High string at top; fret numbers above; 0 is open. Unmarked strings are muted.';
    panel.appendChild(preview);
    return shape;
}

export function getTriadPreferences() {
    return { enabled, stringSet, inversion, index, stringCount, voicing };
}
