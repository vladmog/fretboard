/** A separate, read-only comparison view; the main workspace stays intact. */
import * as Theory from '../core/music-theory.js';
import { createFretboard } from '../core/fretboard.js';
import { getTriadShapes } from '../core/triads.js';
import { state, getInstrumentTuning, getInstrumentMidiBases } from './state.js';
import { guide } from './harmony-guide.js';
import { getTriadPreferences } from './triad-shapes.js';

let entries = [];
let preferences;
let resizeObserver;
let lastSize = '';

export function updateComparisonButton() {
    const button = document.getElementById('compare-chords');
    if (!button) return;
    button.hidden = state.mode !== 'chord';
    button.disabled = state.chordList.length === 0;
    button.title = button.disabled ? 'Add chords to your chord list first' : 'Compare saved chords using the current triad settings';
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
}

function renderBoards() {
    const container = document.getElementById('comparison-boards');
    const scroll = container.scrollTop;
    const vertical = window.matchMedia('(orientation: portrait) and (max-width: 600px)').matches;
    container.replaceChildren();
    entries.forEach((item, order) => {
        const chord = Theory.buildChord(item.root, item.type);
        const card = element('section', 'comparison-card');
        card.appendChild(element('h3', '', `${order + 1}. ${chord.symbol}`));
        container.appendChild(card);
        const shapes = getTriadShapes(chord, getInstrumentTuning(), getInstrumentMidiBases())
            .filter(shape => (preferences.stringSet === 'all' || shape.strings === preferences.stringSet)
                && (preferences.inversion === 'all' || shape.inversion === Number(preferences.inversion)));
        if (!shapes.length) {
            card.appendChild(element('p', 'comparison-empty', ['maj', 'min', 'dim'].includes(item.type)
                ? 'No triad shape matches the selected filters.'
                : 'Triad inversions are available for major, minor, and diminished chords.'));
            return;
        }
        const shape = shapes[Math.min(preferences.index, shapes.length - 1)];
        card.appendChild(element('p', 'comparison-caption', `${guide.inversions[shape.inversion]} · Strings ${shape.strings} · Frets ${shape.positions.map(p => p.fret).join('–')}`));
        const host = element('div', 'comparison-fretboard');
        card.appendChild(host);
        const board = createFretboard(host, { tuning: getInstrumentTuning(), frets: 15, vertical, stringSpacing: 48, markerScale: 1.35 });
        host.querySelector('svg').setAttribute('role', 'img');
        host.querySelector('svg').setAttribute('aria-label', `${chord.symbol}, ${guide.inversions[shape.inversion]}, strings ${shape.strings}`);
        for (const position of shape.positions) {
            board.setMarker(position.string, position.fret, {
                color: guide.triadColors[chord.intervals.indexOf(position.label)],
                borderColor: '#222', textColor: '#000',
                text: state.showNoteNames ? chord.noteSpelling[position.noteIndex] : position.label
            });
        }
    });
    container.scrollTop = scroll;
}

export function initTriadComparison() {
    const dialog = document.getElementById('triad-comparison');
    const button = document.getElementById('compare-chords');
    const back = document.getElementById('comparison-back');
    if (!dialog || !button || !back) return;
    button.addEventListener('click', () => {
        entries = state.chordList.map(chord => ({ ...chord }));
        preferences = getTriadPreferences();
        document.getElementById('comparison-count').textContent = `${entries.length} chords`;
        dialog.showModal();
        renderBoards();
        document.getElementById('comparison-boards').scrollTop = 0;
        back.focus({ preventScroll: true });
    });
    back.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        document.getElementById('comparison-boards').replaceChildren();
        entries = [];
        button.focus({ preventScroll: true });
    });
    resizeObserver = new ResizeObserver(() => {
        if (!dialog.open) return;
        const size = `${dialog.clientWidth}x${dialog.clientHeight}`;
        if (size === lastSize) return;
        lastSize = size;
        renderBoards();
    });
    resizeObserver.observe(dialog);
    updateComparisonButton();
}
