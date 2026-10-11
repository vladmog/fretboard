import { shapePreferences } from '../core/song-shape.js';
import * as Sound from '../core/sound.js';
import { voicingNotes } from '../core/voicing-audio.js';
import { getMarkerColor } from './marker-colors.js';
import { bindTouchTap } from '../core/touch-tap.js';
import { getChordScaleContext, drawChordScaleBackground } from './chord-scale-context.js';
import { bindFretboardGestures } from './fretboard-gestures.js';
/** Independent chord comparisons; the main workspace stays intact. */
import * as Theory from '../core/music-theory.js';
import { createFretboard } from '../core/fretboard.js';
import { getComparisonVoicings, inversionName } from '../core/chord-voicings.js';
import { state, getInstrumentTuning, getInstrumentMidiBases } from './state.js';
import { applyCurrentRotation, toggleRotation } from './rotation-toggle.js';
import { getTriadPreferences } from './triad-shapes.js';

let entries = [];
let preferences;
let resizeObserver;
let lastSize = '';
let showNoteNames = false;
let scaleRelative = false;

function syncComparisonSwitches() {
    const notes = document.getElementById('comparison-note-names');
    const scale = document.getElementById('comparison-scale-degrees');
    notes.setAttribute('aria-checked', String(showNoteNames));
    notes.textContent = showNoteNames ? 'Notes' : 'Intervals';
    scale.setAttribute('aria-checked', String(scaleRelative));
    scale.textContent = scaleRelative ? 'Scale relative' : 'Chord relative';
    scale.disabled = !entries.some(item => item.referenceKey && Theory.SCALES[item.referenceScale]);
    scale.title = scale.disabled ? 'Save a reference key and scale on a chord to enable scale-relative degrees' : 'Use each chord’s saved reference key and scale';
}


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
    container.className = entries.length > 4 ? 'comparison-five-rows' : '';
    container.dataset.instrument = state.instrument;
    const scroll = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const vertical = window.matchMedia('(orientation: portrait) and (max-width: 600px)').matches;
    container.replaceChildren();
    entries.forEach((item, order) => {
        const chord = Theory.buildChord(item.root, item.type);
        const card = element('section', 'comparison-card');
        card.appendChild(element('h3', '', `${item.progressionDegree ? `${item.progressionDegree} ·` : `${order + 1}.`} ${chord.symbol}`));
        container.appendChild(card);
        const boardPreferences = shapePreferences(item, state.instrument) || preferences;
        let shapes = [], notice = '';
        if (boardPreferences.enabled) {
            ({shapes, notice} = getComparisonVoicings(chord, getInstrumentTuning(), getInstrumentMidiBases(), boardPreferences));
            if (!shapes.length) {
                card.appendChild(element('p', 'comparison-empty', 'No compact chord shape matches these filters and instrument.'));
                return;
            }
            item.shapeIndex = Math.min(item.shapeIndex ?? boardPreferences.index, shapes.length - 1);
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
                ? `${item.shapeIndex + 1}/${shapes.length} · ${inversionName(chord, shape.inversion)} · Strings ${shape.strings} · Frets ${shape.positions.map(p => p.fret).join('–')}`
                : 'All chord notes';
            caption.textContent = `${notice ? `${notice} · ` : ''}${item.referenceKey ? `Key ${item.referenceKey} ${Theory.SCALES[item.referenceScale]?.name || '(scale not set)'}` : 'Key not set'} · ${description}`;
            host.querySelector('svg').setAttribute('aria-label', `${chord.symbol}, ${description}`);
            board.clearMarkers();
            const positions = shape ? shape.positions
                : Theory.getNotesOnFretboard(chord.noteToInterval, 15, chord.root, tuning);
            const context = getChordScaleContext(chord, item.referenceKey, scaleRelative, item.referenceScale);
            drawChordScaleBackground(board, context, positions, tuning, showNoteNames);
            for (const position of positions) {
                const colors = getMarkerColor(position.label);
                board.setMarker(position.string, position.fret, {
                    color: colors.fill,
                    borderColor: colors.border,
                    textColor: colors.text,
                    text: showNoteNames ? chord.noteSpelling[position.noteIndex] : (context?.noteToDegree[position.noteIndex] ?? position.label)
                });
            }
        };
        draw();
        if (shapes.length > 1) {
            bindFretboardGestures(host, vertical, direction => {
                item.shapeIndex = (item.shapeIndex + direction + shapes.length) % shapes.length;
                draw();
                if (state.soundEnabled) Sound.playChord(voicingNotes(shapes[item.shapeIndex],state.instrument));
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
        showNoteNames = state.showNoteNames;
        scaleRelative = false;
        syncComparisonSwitches();
        dialog.showModal();
        renderBoards();
        document.getElementById('comparison-boards').scrollTop = 0;
        document.getElementById('comparison-boards').scrollLeft = 0;
        back.focus({ preventScroll: true });
    });
    document.getElementById('comparison-note-names').addEventListener('click', () => {
        showNoteNames = !showNoteNames; syncComparisonSwitches(); renderBoards();
    });
    document.getElementById('comparison-scale-degrees').addEventListener('click', () => {
        scaleRelative = !scaleRelative; syncComparisonSwitches(); renderBoards();
    });
    back.addEventListener('click', () => dialog.close());
    bindTouchTap(document.getElementById('comparison-boards'), toggleRotation,
        target => !!target.closest('.comparison-fretboard'));
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
