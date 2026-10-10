/**
 * Display Rendering
 * All fretboard/info-panel renderers and the updateDisplay() hub that
 * dispatches to the current mode's renderer on every state change.
 */

import { renderTriadControls } from './triad-shapes.js';
import { guide } from './harmony-guide.js';
import * as MusicTheory from '../core/music-theory.js';
import * as ChordProgressions from '../core/progressions.js';
import * as RotationToggle from './rotation-toggle.js';
import { getInstrumentTuning, isFindMode, state } from './state.js';
import { renderScaleChords } from './chord-list.js';
import { displayFindMarkers } from './find-mode.js';
import { updateTypeDropdown } from './controls.js';

/**
 * Get the display label for a marker position
 * @param {Object} pos - Fretboard position with noteIndex and label
 * @param {Object} noteSpelling - Map of noteIndex to spelled note name
 * @returns {string} Note name or interval label
 */
function getMarkerLabel(pos, noteSpelling) {
    if (state.showNoteNames && noteSpelling) {
        return noteSpelling[pos.noteIndex] || MusicTheory.getNoteName(pos.noteIndex, false);
    }
    return pos.label;
}

function getNotesOnActiveFretboard(noteToLabel, frets = 15, root = null) {
    return MusicTheory.getNotesOnFretboard(
        noteToLabel,
        frets,
        root,
        getInstrumentTuning()
    );
}
/**
 * Update visibility of the relative toggle based on current mode and selection
 */
export function updateRelToggleVisibility() {
    const relativeLabel = document.getElementById('relative-toggle')?.closest('.toggle-label');
    if (!relativeLabel) return;
    let supported = false;
    if (state.mode === 'scale') {
        supported = state.scaleType === 'major' || state.scaleType === 'natural_minor';
    } else if (state.mode === 'f.scale' && state.findSelectedIndex >= 0) {
        const result = state.findResults[state.findSelectedIndex];
        supported = result && (result.type === 'major' || result.type === 'natural_minor');
    }
    relativeLabel.style.display = supported ? '' : 'none';
    if (!supported && state.showRelative) {
        state.showRelative = false;
        const toggle = document.getElementById('relative-toggle');
        if (toggle) {
            toggle.checked = false;
            relativeLabel.classList.remove('checked');
        }
    }
}
/**
 * Display a scale on the fretboard
 * @param {Object} scale - Scale instance from buildScale()
 */
export function displayScale(scale) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    // Use relative scale if toggle is active
    let displayScale = scale;
    if (state.showRelative && (scale.type === 'major' || scale.type === 'natural_minor')) {
        const relativeInfo = MusicTheory.getRelativeScale(scale.root, scale.type);
        if (relativeInfo) {
            displayScale = MusicTheory.buildScale(relativeInfo.root, relativeInfo.scaleType);
        }
    }

    const positions = getNotesOnActiveFretboard(
        displayScale.noteToDegree,
        15,
        displayScale.root
    );

    const originalRootIndex = MusicTheory.getNoteIndex(scale.root);
    for (const pos of positions) {
        const colors = MusicTheory.getIntervalColor(pos.label);
        const isRoot = state.showRelative ? (pos.noteIndex === originalRootIndex) : (pos.label === '1');
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: colors.fill,
            borderColor: colors.border,
            rainbowBorder: isRoot,
            text: getMarkerLabel(pos, displayScale.noteSpelling),
            textColor: colors.text
        });
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    updateInfoPanel({
        title: `${displayScale.root} ${displayScale.name}`,
        notes: displayScale.notes,
        intervals: displayScale.degrees,
        noteToInterval: displayScale.noteToDegree,
        rainbowNoteIndex: MusicTheory.getNoteIndex(scale.root)
    });
}
/**
 * Display a chord on the fretboard
 * @param {Object} chord - Chord instance from buildChord()
 */
export function displayChord(chord) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    const triad = renderTriadControls(chord, updateDisplay);
    const positions = triad ? triad.positions : getNotesOnActiveFretboard(
        chord.noteToInterval,
        15,
        chord.root
    );

    for (const pos of positions) {
        const colors = MusicTheory.getIntervalColor(pos.label);
        const isRoot = pos.label === '1';
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: triad ? guide.triadColors[chord.intervals.indexOf(pos.label)] : (isRoot ? '#000' : colors.fill),
            borderColor: triad ? '#222' : colors.border,
            text: getMarkerLabel(pos, chord.noteSpelling),
            textColor: triad ? '#000' : (isRoot ? '#fff' : colors.text)
        });
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    updateInfoPanel({
        title: triad?.bass ? `${chord.symbol} · ${guide.inversions[triad.inversion]}` : chord.symbol,
        notes: chord.notes,
        intervals: chord.intervals,
        noteToInterval: chord.noteToInterval
    });
}
/**
 * Display a scale chord on the fretboard with scale-relative degrees
 * @param {Object} chord - Chord instance from buildChord()
 * @param {Object} scale - Scale instance from buildScale() (parent scale)
 */
function displayScaleChord(chord, scale, parentRoot) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    // Draw all scale tones as greyed-out background context (not in prog mode)
    if (state.mode !== 'prog') {
        const allScalePositions = getNotesOnActiveFretboard(
            scale.noteToDegree, 15, scale.root
        );
        for (const pos of allScalePositions) {
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: '#fff',
                borderColor: '#ccc',
                text: state.showScaleDegrees
                    ? getMarkerLabel(pos, scale.noteSpelling)
                    : (state.showNoteNames ? getMarkerLabel(pos, scale.noteSpelling) : ''),
                textColor: '#bbb'
            });
        }
    }

    // Choose between scale degrees and chord intervals for labels
    const useScaleDegrees = state.showScaleDegrees;
    const chordNoteToDegree = useScaleDegrees
        ? (() => {
            const merged = {};
            const scaleRootIdx = MusicTheory.getNoteIndex(scale.root);
            for (const [noteIndex, interval] of Object.entries(chord.noteToInterval)) {
                if (scale.noteToDegree.hasOwnProperty(noteIndex)) {
                    merged[noteIndex] = scale.noteToDegree[noteIndex];
                } else {
                    // Compute interval relative to scale root, not chord root
                    const semitones = (parseInt(noteIndex) - scaleRootIdx + 12) % 12;
                    const scaleInterval = Object.keys(MusicTheory.INTERVALS).find(
                        name => MusicTheory.INTERVALS[name] === semitones
                    );
                    merged[noteIndex] = scaleInterval || interval;
                }
            }
            return merged;
        })()
        : chord.noteToInterval;

    const labelSpelling = useScaleDegrees ? scale.noteSpelling : chord.noteSpelling;

    const positions = getNotesOnActiveFretboard(
        chordNoteToDegree,
        15,
        useScaleDegrees ? scale.root : chord.root
    );

    const chordRootIndex = MusicTheory.getNoteIndex(chord.root);
    const scaleRootIndex = MusicTheory.getNoteIndex(scale.root);
    for (const pos of positions) {
        const colors = MusicTheory.getIntervalColor(pos.label);
        let fillColor = colors.fill;
        let textColor = colors.text;
        let borderColor = colors.border;
        let borderWidth = 2;
        if (pos.noteIndex === chordRootIndex) {
            borderColor = '#000000';
            borderWidth = 3.5;
            if (!useScaleDegrees) {
                fillColor = '#000';
                textColor = '#fff';
            }
        }
        const isScaleRoot = pos.noteIndex === scaleRootIndex;
        if (isScaleRoot) {
            borderColor = '#FF0000';
        }
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: fillColor,
            borderColor: borderColor,
            borderWidth: borderWidth,
            rainbowBorder: isScaleRoot,
            text: getMarkerLabel(pos, labelSpelling),
            textColor: textColor
        });
    }

    // Add ghost markers at scale root positions when the chord doesn't contain the root
    const rootIndex = MusicTheory.getNoteIndex(scale.root);
    if (!chordNoteToDegree.hasOwnProperty(rootIndex)) {
        const ghostPositions = getNotesOnActiveFretboard(
            { [rootIndex]: '1' }, 15, scale.root
        );
        for (const pos of ghostPositions) {
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: 'transparent',
                borderColor: '#FF0000',
                rainbowBorder: true,
                text: '',
                textColor: 'transparent'
            });
        }
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    // Build info panel: show chord symbol, chord notes, and their intervals
    const displayIntervals = useScaleDegrees
        ? chord.notes.map((noteName, i) => {
            const noteIndex = Object.keys(chord.noteSpelling).find(idx => chord.noteSpelling[idx] === noteName);
            if (noteIndex !== undefined && scale.noteToDegree[noteIndex]) {
                return scale.noteToDegree[noteIndex];
            }
            // Compute interval relative to scale root, not chord root
            const scaleRootIdx = MusicTheory.getNoteIndex(scale.root);
            const semitones = (parseInt(noteIndex) - scaleRootIdx + 12) % 12;
            const scaleInterval = Object.keys(MusicTheory.INTERVALS).find(
                name => MusicTheory.INTERVALS[name] === semitones
            );
            return scaleInterval || chord.intervals[i];
        })
        : chord.intervals;

    updateInfoPanel({
        title: chord.symbol,
        notes: chord.notes,
        intervals: displayIntervals,
        noteToInterval: useScaleDegrees ? chordNoteToDegree : chord.noteToInterval,
        rainbowNoteIndex: MusicTheory.getNoteIndex(parentRoot || scale.root),
        useScaleDegrees: useScaleDegrees
    });
}
/**
 * Display all chromatic intervals relative to a root note
 * @param {string} root - Root note
 */
function displayIntervals(root) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    // Build a map of all 12 chromatic intervals
    const rootIndex = MusicTheory.getNoteIndex(root);
    const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const rootLetterIdx = NOTE_LETTERS.indexOf(root[0]);
    const noteToInterval = {};
    const allIntervals = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
    const allNotes = [];
    const noteSpelling = {};

    for (let i = 0; i < 12; i++) {
        const noteIndex = (rootIndex + i) % 12;
        const interval = allIntervals[i];
        noteToInterval[noteIndex] = interval;
        const degreeNum = MusicTheory.getDegreeNumber(interval);
        const degreeLetter = NOTE_LETTERS[(rootLetterIdx + degreeNum - 1) % 7];
        const noteName = MusicTheory.spellNoteForDegree(noteIndex, degreeLetter);
        allNotes.push(noteName);
        noteSpelling[noteIndex] = noteName;
    }

    const positions = getNotesOnActiveFretboard(
        noteToInterval,
        15,
        root
    );

    for (const pos of positions) {
        const isRoot = pos.label === '1';
        if (!isRoot && !state.intervalFilter.has(pos.label)) continue;
        const colors = MusicTheory.getIntervalColor(pos.label);
        const showMarker = state.intervalFilter.has(pos.label);
        if (isRoot) {
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: showMarker ? colors.fill : 'transparent',
                borderColor: colors.border,
                borderWidth: 3.5,
                text: showMarker ? getMarkerLabel(pos, noteSpelling) : '',
                textColor: colors.text,
                rainbowBorder: true
            });
        } else {
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: colors.fill,
                borderColor: colors.border,
                text: getMarkerLabel(pos, noteSpelling),
                textColor: colors.text
            });
        }
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    // Filter info panel to only show checked intervals
    const filteredNotes = [];
    const filteredIntervals = [];
    const filteredNoteToInterval = {};
    for (let i = 0; i < allIntervals.length; i++) {
        if (state.intervalFilter.has(allIntervals[i])) {
            filteredNotes.push(allNotes[i]);
            filteredIntervals.push(allIntervals[i]);
            const noteIndex = (rootIndex + i) % 12;
            filteredNoteToInterval[noteIndex] = allIntervals[i];
        }
    }

    updateInfoPanel({
        title: `${root} Chromatic Intervals`,
        notes: filteredNotes,
        intervals: filteredIntervals,
        noteToInterval: filteredNoteToInterval,
        rainbowNoteIndex: rootIndex
    });
}
/**
 * Display CAGED chord shapes
 * @param {string} root - Root note
 * @param {string} shapeName - Shape name ('all' or specific shape letter)
 */
function displayCaged(root, shapeName) {
    if (!state.fretboard) return;

    state.fretboard.clearMarkers();

    const chord = MusicTheory.buildChord(root, state.chordType);

    // Determine parent scale type for background markers
    const scaleType = ['min', 'dim', 'min7'].includes(state.chordType) ? 'natural_minor' : 'major';
    const scale = MusicTheory.buildScale(root, scaleType);

    // Collect all CAGED positions for overlap detection
    const cagedPosKeys = new Set();
    const shapesToDraw = shapeName === 'all' ? ['C', 'A', 'G', 'E', 'D'] : [shapeName];
    for (const shape of shapesToDraw) {
        const positions = MusicTheory.getCagedPositions(root, shape, state.chordType);
        for (const pos of positions) {
            cagedPosKeys.add(pos.string + '-' + pos.fret);
        }
    }

    // Draw background scale markers first (non-chord scale tones as visual context)
    const scalePositions = getNotesOnActiveFretboard(scale.noteToDegree, 15, root);
    for (const pos of scalePositions) {
        const key = pos.string + '-' + pos.fret;
        if (cagedPosKeys.has(key)) {
            continue;
        }
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: '#fff',
            borderColor: '#ccc',
            text: getMarkerLabel(pos, scale.noteSpelling),
            textColor: '#bbb'
        });
    }

    // Shape border colors for "All" mode
    const shapeBorderColors = {
        'C': '#FF4444',
        'A': '#FF8C00',
        'G': '#32CD32',
        'E': '#4169E1',
        'D': '#9370DB'
    };

    // Draw CAGED chord markers on top
    if (shapeName === 'all') {
        for (const shape of ['C', 'A', 'G', 'E', 'D']) {
            const positions = MusicTheory.getCagedPositions(root, shape, state.chordType);
            const borderColor = shapeBorderColors[shape];

            for (const pos of positions) {
                const colors = MusicTheory.getIntervalColor(pos.label);
                const isRoot = pos.label === '1';
                state.fretboard.setMarker(pos.string, pos.fret, {
                    color: isRoot ? '#000' : MusicTheory.lightenColor(borderColor),
                    borderColor: borderColor,
                    text: getMarkerLabel(pos, chord.noteSpelling),
                    textColor: isRoot ? '#fff' : colors.text
                });
            }
        }
    } else {
        const positions = MusicTheory.getCagedPositions(root, shapeName, state.chordType);

        for (const pos of positions) {
            const colors = MusicTheory.getIntervalColor(pos.label);
            const isRoot = pos.label === '1';
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: isRoot ? '#000' : colors.fill,
                borderColor: colors.border,
                text: getMarkerLabel(pos, chord.noteSpelling),
                textColor: isRoot ? '#fff' : colors.text
            });
        }
    }

    // Apply current rotation to newly created markers
    RotationToggle.applyCurrentRotation();

    const chordSymbol = chord.symbol;
    const title = shapeName === 'all'
        ? `${chordSymbol} CAGED`
        : `${chordSymbol} CAGED - ${shapeName} Shape`;

    updateInfoPanel({
        title: title,
        notes: chord.notes,
        intervals: chord.intervals,
        noteToInterval: chord.noteToInterval
    });
}
/**
 * Display a mode on the fretboard given a parent key and mode name
 * @param {string} parentRoot - Parent major key (e.g., 'C')
 * @param {string} modeName - Mode key (e.g., 'dorian')
 */
function displayMode(parentRoot, modeName) {
    if (!state.fretboard) return;

    const mode = MusicTheory.MODES[modeName];
    const modeRoot = MusicTheory.getModeRoot(parentRoot, modeName);
    const scale = MusicTheory.buildScale(modeRoot, mode.scaleType);

    state.fretboard.clearMarkers();

    const positions = getNotesOnActiveFretboard(
        scale.noteToDegree,
        15,
        scale.root
    );

    const parentRootIndex = MusicTheory.getNoteIndex(parentRoot);

    for (const pos of positions) {
        const colors = MusicTheory.getIntervalColor(pos.label);
        const isParentRoot = pos.noteIndex === parentRootIndex;
        state.fretboard.setMarker(pos.string, pos.fret, {
            color: colors.fill,
            borderColor: colors.border,
            rainbowBorder: isParentRoot,
            text: getMarkerLabel(pos, scale.noteSpelling),
            textColor: colors.text
        });
    }

    RotationToggle.applyCurrentRotation();

    updateInfoPanel({
        title: `${modeRoot} ${mode.name} (${parentRoot} Major)`,
        notes: scale.notes,
        intervals: scale.degrees,
        noteToInterval: scale.noteToDegree,
        rainbowNoteIndex: MusicTheory.getNoteIndex(parentRoot)
    });
}
/**
 * Render the chromatic circle SVG showing active notes with interval colors
 * @param {Object} noteToInterval - Map of semitone index (0-11) to interval name
 */
function renderChromaticCircle(noteToInterval, rainbowNoteIndex, highlightedNotes, useScaleDegrees, plainMarkerNotes) {
    const svg = document.getElementById('chromatic-circle-svg');
    if (!svg) return;

    svg.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    const cx = 100, cy = 100, radius = 72, noteRadius = 13;
    const useFlats = MusicTheory.shouldUseFlats(state.root);
    const noteNames = useFlats ? MusicTheory.FLAT_NOTES : MusicTheory.CHROMATIC_NOTES;
    const SEMITONE_LABELS = ['1','b2','2','b3','3','4','b5','5','#5','6','b7','7'];
    const isPlainMode = plainMarkerNotes !== undefined;
    const rootEntry = Object.entries(noteToInterval).find(([, v]) => v === '1');
    const rootIndex = rootEntry ? parseInt(rootEntry[0]) : (rainbowNoteIndex !== undefined ? rainbowNoteIndex : MusicTheory.getNoteIndex(state.root));

    // Draw perpendicular cross lines: root↔tritone and b3↔M6 (skip in plain marker mode)
    if (!isPlainMode) {
        const lineRadius = 35;
        [
            [rootIndex, rootIndex + 6],      // root to tritone
            [rootIndex + 3, rootIndex + 9]   // b3 to M6 (perpendicular)
        ].forEach(([from, to]) => {
            const a1 = (from * 30 - 90) * Math.PI / 180;
            const a2 = (to * 30 - 90) * Math.PI / 180;
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', cx + lineRadius * Math.cos(a1));
            line.setAttribute('y1', cy + lineRadius * Math.sin(a1));
            line.setAttribute('x2', cx + lineRadius * Math.cos(a2));
            line.setAttribute('y2', cy + lineRadius * Math.sin(a2));
            line.setAttribute('stroke', '#999');
            line.setAttribute('stroke-width', '1.5');
            svg.appendChild(line);
        });

        // Root indicator circle at root end of root↔tritone line
        const rootAngle = (rootIndex * 30 - 90) * Math.PI / 180;
        const dotRadius = (1.5 * 5) / 2; // diameter = 5x line thickness
        const dotDist = lineRadius - dotRadius;
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', cx + dotDist * Math.cos(rootAngle));
        dot.setAttribute('cy', cy + dotDist * Math.sin(rootAngle));
        dot.setAttribute('r', dotRadius);
        dot.setAttribute('fill', '#999');
        svg.appendChild(dot);
    }

    for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const interval = noteToInterval[i];
        const isActive = interval !== undefined;
        const isPlainMarker = isPlainMode && plainMarkerNotes.has(i);

        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', noteRadius);

        if (isPlainMarker) {
            circle.setAttribute('fill', '#000');
            circle.setAttribute('stroke', '#000');
            circle.setAttribute('stroke-width', '2');
        } else if (isActive) {
            const colors = MusicTheory.getIntervalColor(interval);
            const isRoot = interval === '1';
            circle.setAttribute('fill', (isRoot && !useScaleDegrees) ? '#000' : colors.fill);
            circle.setAttribute('stroke', colors.border);
            circle.setAttribute('stroke-width', '2');
        } else if (highlightedNotes && highlightedNotes.has(i)) {
            const hlInterval = SEMITONE_LABELS[(i - rootIndex + 12) % 12];
            const hlColors = MusicTheory.getIntervalColor(hlInterval);
            const hlIsRoot = hlInterval === '1';
            circle.setAttribute('fill', (hlIsRoot && !useScaleDegrees) ? '#000' : hlColors.fill);
            circle.setAttribute('stroke', hlColors.border);
            circle.setAttribute('stroke-width', '2');
        } else {
            circle.setAttribute('fill', '#ddd');
            circle.setAttribute('stroke', '#bbb');
            circle.setAttribute('stroke-width', '1.5');
        }

        if (i === rainbowNoteIndex) {
            circle.classList.add('rainbow-border');
        }

        svg.appendChild(circle);

        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('font-size', '9');
        text.setAttribute('font-family', 'Monaco, Consolas, monospace');
        text.setAttribute('font-weight', '700');

        if (isPlainMarker) {
            text.setAttribute('fill', '#fff');
        } else if (isActive) {
            const colors = MusicTheory.getIntervalColor(interval);
            const isRoot = interval === '1';
            text.setAttribute('fill', (isRoot && !useScaleDegrees) ? '#fff' : colors.text);
        } else if (highlightedNotes && highlightedNotes.has(i)) {
            const hlInterval = SEMITONE_LABELS[(i - rootIndex + 12) % 12];
            const hlColors = MusicTheory.getIntervalColor(hlInterval);
            const hlIsRoot = hlInterval === '1';
            text.setAttribute('fill', (hlIsRoot && !useScaleDegrees) ? '#fff' : hlColors.text);
        } else {
            text.setAttribute('fill', '#999');
        }

        text.textContent = noteNames[i];
        svg.appendChild(text);

        // Inner interval labels (skip in plain marker mode)
        if (!isPlainMode) {
            const ilRadius = radius - noteRadius - 12;
            const lx = cx + ilRadius * Math.cos(angle);
            const ly = cy + ilRadius * Math.sin(angle);
            const label = document.createElementNS(ns, 'text');
            label.setAttribute('x', lx);
            label.setAttribute('y', ly);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'central');
            const isHighlighted = highlightedNotes && highlightedNotes.has(i);
            label.setAttribute('font-size', (isActive || isHighlighted) ? '10' : '8');
            label.setAttribute('font-weight', '600');
            label.setAttribute('font-family', 'Monaco, Consolas, monospace');
            label.setAttribute('fill', (isActive || isHighlighted) ? '#000' : '#ccc');
            label.textContent = isActive ? interval : SEMITONE_LABELS[(i - rootIndex + 12) % 12];
            svg.appendChild(label);
        }
    }
}
/**
 * Update the info panel with current selection details
 * @param {Object} info - { title, notes, intervals, noteToInterval }
 */
export function updateInfoPanel(info) {
    const titleEl = document.getElementById('info-title');
    const gridEl = document.getElementById('info-grid');

    if (titleEl) titleEl.textContent = info.title;

    if (!gridEl) return;
    gridEl.innerHTML = '';

    // Remove any existing description element
    var existingDesc = gridEl.parentNode.querySelector('.info-grid-description');
    if (existingDesc) existingDesc.remove();

    // Prog mode fallback: no intervals means show notes as plain text
    if (!info.intervals || info.intervals.length === 0) {
        gridEl.style.display = 'block';
        gridEl.style.gridTemplateColumns = '';
        gridEl.textContent = info.notes.join(' ');
        gridEl.className = 'info-grid info-grid-text';
        renderChromaticCircle(info.noteToInterval || {}, info.rainbowNoteIndex, info.highlightedNotes, info.useScaleDegrees, info.plainMarkerNotes);
        return;
    }

    gridEl.className = 'info-grid';
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = 'repeat(' + info.notes.length + ', 1fr)';

    // Row 1: intervals
    info.intervals.forEach(function(interval) {
        const cell = document.createElement('div');
        cell.className = 'info-grid-cell info-grid-interval';
        cell.textContent = interval;
        gridEl.appendChild(cell);
    });

    // Row 2: notes
    info.notes.forEach(function(note) {
        const cell = document.createElement('div');
        cell.className = 'info-grid-cell info-grid-note';
        cell.textContent = note;
        gridEl.appendChild(cell);
    });

    // Optional description below grid (used in Prog mode)
    if (info.description) {
        const descEl = document.createElement('div');
        descEl.className = 'info-grid-description';
        descEl.textContent = info.description;
        gridEl.parentNode.appendChild(descEl);
    }

    renderChromaticCircle(info.noteToInterval || {}, info.rainbowNoteIndex, info.highlightedNotes, info.useScaleDegrees, info.plainMarkerNotes);
}
/**
 * Update display based on current state
 */
export function updateDisplay() {
    const triadPanel = document.getElementById('triad-shapes');
    if (triadPanel) triadPanel.style.display = 'none';
    if (state.selectedChordIndex >= 0 && state.selectedChordIndex < state.chordList.length) {
        // Display selected chord from list
        const item = state.chordList[state.selectedChordIndex];

        // In CAGED mode, show CAGED shapes for the selected chord's root and type
        if (state.mode === 'caged') {
            const cagedTypes = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'min7'];
            state.chordType = cagedTypes.includes(item.type) ? item.type : 'maj';
            updateTypeDropdown();
            displayCaged(item.root, state.cagedShape);
        } else {
            const chord = MusicTheory.buildChord(item.root, item.type);
            displayChord(chord);
        }
    } else if (isFindMode(state.mode)) {
        if (state.findSelectedIndex < 0) {
            displayFindMarkers();
        } else {
            const result = state.findResults[state.findSelectedIndex];
            if (state.mode === 'f.scale') {
                if (state.activeScaleChord) {
                    const scale = MusicTheory.buildScale(result.root, result.type);
                    const chord = MusicTheory.buildChord(state.activeScaleChord.root, state.activeScaleChord.type);
                    displayScaleChord(chord, scale);
                } else {
                    displayScale(result);
                }
            } else {
                displayChord(result);
            }
        }
        return;
    } else if (state.mode === 'caged') {
        displayCaged(state.root, state.cagedShape);
    } else if (state.mode === 'modes') {
        if (state.activeScaleChord) {
            const modeRoot = MusicTheory.getModeRoot(state.root, state.modeType);
            const modeScaleType = MusicTheory.MODES[state.modeType].scaleType;
            const scale = MusicTheory.buildScale(modeRoot, modeScaleType);
            const chord = MusicTheory.buildChord(state.activeScaleChord.root, state.activeScaleChord.type);
            displayScaleChord(chord, scale, state.root);
        } else {
            displayMode(state.root, state.modeType);
        }
    } else if (state.mode === 'interval') {
        displayIntervals(state.root);
    } else if (state.mode === 'scale') {
        if (state.activeScaleChord) {
            // Resolve relative toggle (same logic as displayScale/renderScaleChords)
            let scaleRoot = state.root;
            let scaleType = state.scaleType;
            if (state.showRelative && (scaleType === 'major' || scaleType === 'natural_minor')) {
                const relativeInfo = MusicTheory.getRelativeScale(scaleRoot, scaleType);
                if (relativeInfo) {
                    scaleRoot = relativeInfo.root;
                    scaleType = relativeInfo.scaleType;
                }
            }
            const scale = MusicTheory.buildScale(scaleRoot, scaleType);
            const chord = MusicTheory.buildChord(state.activeScaleChord.root, state.activeScaleChord.type);
            displayScaleChord(chord, scale);
        } else {
            const scale = MusicTheory.buildScale(state.root, state.scaleType);
            displayScale(scale);
        }
    } else if (state.mode === 'prog') {
        const scale = MusicTheory.buildScale(state.root, 'major');
        if (state.activeScaleChord) {
            const chord = MusicTheory.buildChord(state.activeScaleChord.root, state.activeScaleChord.type);
            displayScaleChord(chord, scale);
        } else {
            displayScale(scale);
            // Restore progression info panel (displayScale overwrites it)
            if (state._selectedUserProgId) {
                const userProg = state.userProgressions.find(p => p.id === state._selectedUserProgId);
                if (userProg) {
                    const chords = ChordProgressions.buildProgressionChordsFromTokens(userProg.chords, state.root);
                    if (chords.length > 0) {
                        updateInfoPanel({
                            title: 'My Progressions',
                            notes: chords.map(c => c.symbol),
                            intervals: chords.map(c => c.numeral),
                            description: userProg.description || '',
                            highlightedNotes: new Set(chords.map(c => MusicTheory.getNoteIndex(c.root))),
                            useScaleDegrees: state.showScaleDegrees
                        });
                    }
                }
            } else {
                const { categoryIndex, progressionIndex } = ChordProgressions.flatIndexToCategory(state.progressionIndex);
                const category = ChordProgressions.PROGRESSION_CATEGORIES[categoryIndex];
                const chords = ChordProgressions.buildProgressionChords(categoryIndex, progressionIndex, state.root);
                const progression = category ? category.progressions[progressionIndex] : null;
                if (category && chords.length > 0) {
                    updateInfoPanel({
                        title: category.name,
                        notes: chords.map(c => c.symbol),
                        intervals: chords.map(c => c.numeral),
                        description: progression ? progression.description : '',
                        highlightedNotes: new Set(chords.map(c => MusicTheory.getNoteIndex(c.root))),
                        useScaleDegrees: state.showScaleDegrees
                    });
                }
            }
        }
    } else {
        const chord = MusicTheory.buildChord(state.root, state.chordType);
        displayChord(chord);
    }
}
