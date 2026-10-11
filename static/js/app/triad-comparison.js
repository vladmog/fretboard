import { getChordScaleContext, drawChordScaleBackground } from './chord-scale-context.js';
import { bindFretboardGestures } from './fretboard-gestures.js';
/** Independent chord comparisons; the main workspace stays intact. */
import * as Theory from '../core/music-theory.js';
import { createFretboard } from '../core/fretboard.js';
import { getTriadShapes } from '../core/triads.js';
import { state, getInstrumentTuning, getInstrumentMidiBases } from './state.js';
import { guide } from './harmony-guide.js';
import { applyCurrentRotation, toggleRotation } from './rotation-toggle.js';
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
    button.title = button.disabled ? 'Add chords to your chord list first' : 'Compare saved chords using the current chord display settings';
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
    const scrollLeft = container.scrollLeft;
    const vertical = window.matchMedia('(orientation: portrait) and (max-width: 600px)').matches;
    container.replaceChildren();
    entries.forEach((item, order) => {
        const chord = Theory.buildChord(item.root, item.type);
        const card = element('section', 'comparison-card');
        card.appendChild(element('h3', '', `${order + 1}. ${chord.symbol}`));
        container.appendChild(card);
        let shapes = [];
        if (preferences.enabled && ['maj', 'min', 'dim'].includes(item.type)) {
            shapes = getTriadShapes(chord, getInstrumentTuning(), getInstrumentMidiBases())
                .filter(shape => (preferences.stringSet === 'all' || shape.strings === preferences.stringSet)
                    && (preferences.inversion === 'all' || shape.inversion === Number(preferences.inversion)));
            if (!shapes.length) {
                card.appendChild(element('p', 'comparison-empty', 'No triad shape matches the selected filters.'));
                return;
            }
            item.shapeIndex = Math.min(item.shapeIndex ?? preferences.index, shapes.length - 1);
        }
        const caption = element('p', 'comparison-caption');
        card.appendChild(caption);
        const host = element('div', 'comparison-fretboard');
        card.appendChild(host);
        const tuning = getInstrumentTuning();
        // Spread horizontal frets across the row without stretching note circles.
        const boardHeight = (tuning.length - 1) * 48 + 100;
        const fretSpacing = vertical ? 70 : Math.max(70, (host.clientWidth / Math.max(1, host.clientHeight) * boardHeight - 100) / 15);
        const board = createFretboard(host, { tuning, frets: 15, vertical, stringSpacing: 48, markerScale: 1.35, fretSpacing });
        host.querySelector('svg').setAttribute('role', 'img');
        const draw = () => {
            const shape = shapes[item.shapeIndex] ?? null;
            const description = shape
                ? `${item.shapeIndex + 1}/${shapes.length} · ${guide.inversions[shape.inversion]} · Strings ${shape.strings} · Frets ${shape.positions.map(p => p.fret).join('–')}`
                : 'All chord notes';
            caption.textContent = `${item.referenceKey ? `Key ${item.referenceKey} ${Theory.SCALES[item.referenceScale]?.name || '(scale not set)'}` : 'Key not set'} · ${description}`;
            host.querySelector('svg').setAttribute('aria-label', `${chord.symbol}, ${description}`);
            board.clearMarkers();
            const positions = shape ? shape.positions
                : Theory.getNotesOnFretboard(chord.noteToInterval, 15, chord.root, tuning);
            const context = getChordScaleContext(chord, item.referenceKey, state.chordScaleDegrees, item.referenceScale);
            drawChordScaleBackground(board, context, positions, tuning, state.showNoteNames);
            for (const position of positions) {
                const colors = Theory.getIntervalColor(position.label);
                const isRoot = position.label === '1';
                board.setMarker(position.string, position.fret, {
                    color: shape ? guide.triadColors[chord.intervals.indexOf(position.label)] : (isRoot ? '#000' : colors.fill),
                    borderColor: shape ? '#222' : (isRoot ? '#000' : colors.border),
                    textColor: shape ? '#000' : (isRoot ? '#fff' : colors.text),
                    text: state.showNoteNames ? chord.noteSpelling[position.noteIndex] : (context?.noteToDegree[position.noteIndex] ?? position.label)
                });
            }
        };
        draw();
        if (shapes.length > 1) {
            bindFretboardGestures(host, vertical, direction => {
                item.shapeIndex = (item.shapeIndex + direction + shapes.length) % shapes.length;
                draw();
                applyCurrentRotation();
            });
        }
    });
    applyCurrentRotation();
    container.scrollTop = scroll;
    container.scrollLeft = scrollLeft;
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
        document.getElementById('comparison-boards').scrollLeft = 0;
        back.focus({ preventScroll: true });
    });
    back.addEventListener('click', () => dialog.close());
    document.getElementById('comparison-boards').addEventListener('click', event => {
        if (event.target.closest('.comparison-fretboard')) toggleRotation(event);
    });
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
