/**
 * Progression Mode UI
 * Prog sub-modes (play/create/edit): the roman-numeral builder,
 * user-progression CRUD, favorites, and the progression chord strip.
 */

import * as MusicTheory from '../core/music-theory.js';
import * as ChordProgressions from '../core/progressions.js';
import * as Sound from '../core/sound.js';
import { getProgressionKey, saveChordList, saveUserProgressions, state } from './state.js';
import { displayChord, updateDisplay, updateInfoPanel } from './display.js';
import { renderChordList } from './chord-list.js';
import { relocateAddButton, updateTypeDropdown } from './controls.js';

// Numeral options for builder dropdowns
const BUILDER_NUMERALS = [
    { label: 'Major', options: ['I', '\u266dII', 'II', '\u266dIII', 'III', 'IV', '\u266fIV', 'V', '\u266dVI', 'VI', '\u266dVII', 'VII'] },
    { label: 'Minor', options: ['i', '\u266dii', 'ii', '\u266diii', 'iii', 'iv', '\u266fiv', 'v', '\u266dvi', 'vi', '\u266dvii', 'vii'] }
];
// Quality options for builder dropdowns
const BUILDER_QUALITIES = [
    { value: '', label: 'maj' },
    { value: 'maj7', label: 'maj7' },
    { value: 'm7', label: 'm7' },
    { value: '7', label: '7' },
    { value: 'dim7', label: 'dim7' },
    { value: '\u00b07', label: '\u00b07' },
    { value: '\u00f87', label: '\u00f87' },
    { value: '+', label: '+' },
    { value: 'sus2', label: 'sus2' },
    { value: 'sus4', label: 'sus4' },
    { value: '7sus4', label: '7sus4' },
    { value: 'add9', label: 'add9' },
    { value: 'madd9', label: 'madd9' },
    { value: '6', label: '6' },
    { value: '9', label: '9' },
    { value: 'm9', label: 'm9' },
    { value: 'maj9', label: 'maj9' },
    { value: '13', label: '13' },
    { value: '5', label: '5' },
    { value: 'm7b5', label: 'm7b5' }
];
function buildTokenFromRow(row) {
    return row.numeral + row.quality;
}
export function renderProgSubModeUI() {
    const progSubMode = document.getElementById('prog-submode');
    const progNav = document.getElementById('prog-nav');
    const typeGroup = document.querySelector('.control-group:has(#type-select)');
    const builderSection = document.getElementById('scale-chord-builder');
    const progBuilder = document.getElementById('prog-builder');
    const progEditSelector = document.getElementById('prog-edit-selector');
    const progDescGroup = document.getElementById('prog-builder-desc-group');
    const toggleRow = document.querySelector('#scale-chord-builder .toggle-row');

    if (state.mode !== 'prog') {
        if (progSubMode) progSubMode.style.display = 'none';
        if (progBuilder) progBuilder.style.display = 'none';
        if (progEditSelector) progEditSelector.style.display = 'none';
        if (progDescGroup) progDescGroup.style.display = 'none';
        return;
    }

    if (progSubMode) progSubMode.style.display = 'block';

    if (state.progSubMode === 'play') {
        if (typeGroup) typeGroup.style.display = 'block';
        if (progNav) progNav.style.display = 'flex';
        if (builderSection) builderSection.style.display = 'block';
        if (toggleRow) toggleRow.style.display = '';
        if (progBuilder) progBuilder.style.display = 'none';
        if (progEditSelector) progEditSelector.style.display = 'none';
        if (progDescGroup) progDescGroup.style.display = 'none';
    } else if (state.progSubMode === 'create') {
        if (typeGroup) typeGroup.style.display = 'none';
        if (progNav) progNav.style.display = 'none';
        if (builderSection) builderSection.style.display = 'none';
        if (progBuilder) progBuilder.style.display = 'block';
        if (progEditSelector) progEditSelector.style.display = 'none';
        if (progDescGroup) progDescGroup.style.display = 'block';
        const deleteBtn = document.getElementById('prog-builder-delete');
        if (deleteBtn) deleteBtn.style.display = 'none';
        state.editingProgressionId = null;
        if (state.builderRows.length === 0) {
            state.builderRows = [{ numeral: 'I', quality: '' }];
        }
        state.builderDescription = '';
        const descInput = document.getElementById('prog-builder-description');
        if (descInput) descInput.value = '';
        renderBuilderRows();
    } else if (state.progSubMode === 'edit') {
        if (typeGroup) typeGroup.style.display = 'none';
        if (progNav) progNav.style.display = 'none';
        if (builderSection) builderSection.style.display = 'none';
        if (progBuilder) progBuilder.style.display = 'block';
        if (progEditSelector) progEditSelector.style.display = 'block';
        if (progDescGroup) progDescGroup.style.display = 'block';
        const deleteBtn = document.getElementById('prog-builder-delete');
        if (deleteBtn) deleteBtn.style.display = '';
        populateEditSelector();
        // Load first user progression into builder if available
        if (state.userProgressions.length > 0) {
            loadProgressionIntoBuilder(state.userProgressions[0].id);
        } else {
            state.builderRows = [{ numeral: 'I', quality: '' }];
            state.builderDescription = '';
            state.editingProgressionId = null;
            renderBuilderRows();
        }
    }
}
export function renderBuilderRows() {
    const container = document.getElementById('prog-builder-rows');
    if (!container) return;
    container.innerHTML = '';

    state.builderRows.forEach((row, idx) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'prog-builder-row';

        // Numeral select
        const numeralSelect = document.createElement('select');
        numeralSelect.className = 'prog-numeral-select';
        BUILDER_NUMERALS.forEach(group => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.label;
            group.options.forEach(num => {
                const opt = document.createElement('option');
                opt.value = num;
                opt.textContent = num;
                if (num === row.numeral) opt.selected = true;
                optgroup.appendChild(opt);
            });
            numeralSelect.appendChild(optgroup);
        });
        numeralSelect.addEventListener('change', () => {
            state.builderRows[idx].numeral = numeralSelect.value;
            updateBuilderReadout(rowEl, idx);
        });

        // Quality select
        const qualitySelect = document.createElement('select');
        qualitySelect.className = 'prog-quality-select';
        BUILDER_QUALITIES.forEach(q => {
            const opt = document.createElement('option');
            opt.value = q.value;
            opt.textContent = q.label;
            if (q.value === row.quality) opt.selected = true;
            qualitySelect.appendChild(opt);
        });
        qualitySelect.addEventListener('change', () => {
            state.builderRows[idx].quality = qualitySelect.value;
            updateBuilderReadout(rowEl, idx);
        });

        // Readout
        const readout = document.createElement('span');
        readout.className = 'prog-chord-readout';
        readout.addEventListener('click', () => {
            const row = state.builderRows[idx];
            const token = buildTokenFromRow(row);
            const parsed = ChordProgressions.parseRomanNumeral(token, state.root);
            if (!parsed) return;
            const chord = MusicTheory.buildChord(parsed.root, parsed.type);
            displayChord(chord);
            if (state.soundEnabled) {
                const scaleRootIndex = MusicTheory.getNoteIndex(state.root);
                const chordRootIndex = MusicTheory.getNoteIndex(parsed.root);
                const startOctave = chordRootIndex < scaleRootIndex ? 4 : 3;
                Sound.playChord(chord.notes, startOctave);
            }
        });

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'prog-row-delete';
        delBtn.innerHTML = '&times;';
        delBtn.addEventListener('click', () => {
            state.builderRows.splice(idx, 1);
            if (state.builderRows.length === 0) {
                state.builderRows = [{ numeral: 'I', quality: '' }];
            }
            renderBuilderRows();
        });

        rowEl.appendChild(numeralSelect);
        rowEl.appendChild(qualitySelect);
        // Up button
        const upBtn = document.createElement('button');
        upBtn.className = 'prog-row-move prog-row-move-up';
        upBtn.innerHTML = '&#9650;';
        upBtn.disabled = idx === 0;
        upBtn.addEventListener('click', () => {
            [state.builderRows[idx - 1], state.builderRows[idx]] =
                [state.builderRows[idx], state.builderRows[idx - 1]];
            renderBuilderRows();
        });

        // Down button
        const downBtn = document.createElement('button');
        downBtn.className = 'prog-row-move prog-row-move-down';
        downBtn.innerHTML = '&#9660;';
        downBtn.disabled = idx === state.builderRows.length - 1;
        downBtn.addEventListener('click', () => {
            [state.builderRows[idx], state.builderRows[idx + 1]] =
                [state.builderRows[idx + 1], state.builderRows[idx]];
            renderBuilderRows();
        });

        rowEl.appendChild(readout);
        rowEl.appendChild(upBtn);
        rowEl.appendChild(downBtn);
        rowEl.appendChild(delBtn);
        container.appendChild(rowEl);

        updateBuilderReadout(rowEl, idx);
    });
}
function updateBuilderReadout(rowEl, idx) {
    const readout = rowEl.querySelector('.prog-chord-readout');
    if (!readout) return;
    const row = state.builderRows[idx];
    const token = buildTokenFromRow(row);
    const parsed = ChordProgressions.parseRomanNumeral(token, state.root);
    if (parsed) {
        const chordDef = MusicTheory.CHORD_TYPES[parsed.type];
        readout.textContent = parsed.root + (chordDef ? chordDef.symbol : '');
    } else {
        readout.textContent = '?';
    }
}
export function saveProgression() {
    if (state.builderRows.length === 0) return;

    const chords = state.builderRows.map(buildTokenFromRow);
    const numerals = chords.join(' \u2013 ');
    const description = state.builderDescription || '';

    if (state.editingProgressionId !== null) {
        // Update existing
        const prog = state.userProgressions.find(p => p.id === state.editingProgressionId);
        if (prog) {
            prog.numerals = numerals;
            prog.description = description;
            prog.chords = chords;
        }
    } else {
        // Create new
        state.userProgressions.push({
            id: Date.now(),
            numerals: numerals,
            description: description,
            chords: chords
        });
    }

    saveUserProgressions();

    // Switch to play mode and select the saved progression
    state.progSubMode = 'play';
    const submodeRadios = document.querySelectorAll('input[name="prog-submode"]');
    submodeRadios.forEach(r => {
        r.checked = r.value === 'play';
        const label = r.closest('.radio-label');
        if (label) label.classList.toggle('checked', r.checked);
    });
    state.builderRows = [];
    state.builderDescription = '';
    state.editingProgressionId = null;
    updateTypeDropdown();
    renderProgSubModeUI();
    renderProgressionChords();
    updateDisplay();
}
export function deleteProgression() {
    if (state.editingProgressionId === null) return;
    state.userProgressions = state.userProgressions.filter(p => p.id !== state.editingProgressionId);
    saveUserProgressions();

    state.progSubMode = 'play';
    const submodeRadios = document.querySelectorAll('input[name="prog-submode"]');
    submodeRadios.forEach(r => {
        r.checked = r.value === 'play';
        const label = r.closest('.radio-label');
        if (label) label.classList.toggle('checked', r.checked);
    });
    state.builderRows = [];
    state.builderDescription = '';
    state.editingProgressionId = null;
    updateTypeDropdown();
    renderProgSubModeUI();
    renderProgressionChords();
    updateDisplay();
}
function populateEditSelector() {
    const select = document.getElementById('prog-edit-select');
    if (!select) return;
    select.innerHTML = '';

    if (state.userProgressions.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'No custom progressions';
        opt.disabled = true;
        select.appendChild(opt);
        return;
    }

    state.userProgressions.forEach(prog => {
        const opt = document.createElement('option');
        opt.value = prog.id;
        opt.textContent = prog.numerals + (prog.description ? ' - ' + prog.description : '');
        select.appendChild(opt);
    });
}
export function loadProgressionIntoBuilder(id) {
    const prog = state.userProgressions.find(p => p.id === id);
    if (!prog) return;

    state.editingProgressionId = id;
    state.builderDescription = prog.description || '';
    state.builderRows = prog.chords.map(token => {
        // Parse token back into numeral + quality
        const { numeral, quality } = parseTokenToRow(token);
        return { numeral, quality };
    });

    const descInput = document.getElementById('prog-builder-description');
    if (descInput) descInput.value = state.builderDescription;
    renderBuilderRows();
}
function parseTokenToRow(token) {
    // Extract accidental prefix
    let pos = 0;
    let prefix = '';
    if (token[pos] === '\u266d') { prefix = '\u266d'; pos++; }
    else if (token[pos] === '\u266f') { prefix = '\u266f'; pos++; }

    const rest = token.substring(pos);

    // Match Roman numeral
    const UPPER = [['VII', 7], ['VI', 6], ['IV', 4], ['V', 5], ['III', 3], ['II', 2], ['I', 1]];
    const LOWER = [['vii', 7], ['vi', 6], ['iv', 4], ['v', 5], ['iii', 3], ['ii', 2], ['i', 1]];

    let numeral = '';
    let suffix = '';

    for (const [numStr] of UPPER) {
        if (rest.startsWith(numStr)) {
            numeral = prefix + numStr;
            suffix = rest.substring(numStr.length);
            break;
        }
    }
    if (!numeral) {
        for (const [numStr] of LOWER) {
            if (rest.startsWith(numStr)) {
                numeral = prefix + numStr;
                suffix = rest.substring(numStr.length);
                break;
            }
        }
    }
    if (!numeral) {
        return { numeral: 'I', quality: '' };
    }
    return { numeral, quality: suffix };
}
function chordToRomanNumeral(root, type, key) {
    const scale = MusicTheory.buildScale(key, 'major');
    const rootIndex = MusicTheory.getNoteIndex(root);

    // Find degree match
    let degree = 0;
    let accidental = 0;
    for (let i = 0; i < 7; i++) {
        const scaleNoteIndex = MusicTheory.getNoteIndex(scale.notes[i]);
        if (scaleNoteIndex === rootIndex) {
            degree = i + 1;
            accidental = 0;
            break;
        }
    }

    // If no exact match, find closest degree with accidental
    if (degree === 0) {
        for (let i = 0; i < 7; i++) {
            const scaleNoteIndex = MusicTheory.getNoteIndex(scale.notes[i]);
            const diff = ((rootIndex - scaleNoteIndex) + 12) % 12;
            if (diff === 1) {
                degree = i + 1;
                // Use ♯ for degree 4, ♭ for degree+1 otherwise
                if (i + 1 === 4) {
                    accidental = 1; // ♯IV
                } else {
                    // This is ♭(next degree)
                    degree = (i + 1) % 7 + 1;
                    accidental = -1;
                }
                break;
            }
            if (diff === 11) {
                degree = i + 1;
                accidental = -1;
                break;
            }
        }
    }

    if (degree === 0) degree = 1; // fallback

    // Determine case: minor-quality types → lowercase
    const minorTypes = ['min', 'min7', 'dim', 'dim7', 'min7b5', 'min9', 'min6', 'minmaj7'];
    const isMinor = minorTypes.includes(type);
    const numeralStrings = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    let numeral = numeralStrings[degree - 1];
    if (isMinor) numeral = numeral.toLowerCase();

    // Accidental prefix
    let prefix = '';
    if (accidental === -1) prefix = '\u266d';
    else if (accidental === 1) prefix = '\u266f';

    // Quality suffix: reverse-map from chord type to suffix used in tokens
    const typeToSuffix = {
        'maj': '', 'min': '', 'maj7': 'maj7', 'min7': 'm7', '7': '7',
        'dom7': '7', 'dim': '', 'dim7': 'dim7', 'min7b5': 'm7b5', 'aug': '+',
        'sus2': 'sus2', 'sus4': 'sus4', '7sus4': '7sus4', 'add9': 'add9', 'madd9': 'madd9',
        '6': '6', 'min6': '6', '9': '9', 'dom9': '9', 'min9': 'm9',
        'maj9': 'maj9', '13': '13', 'dom13': '13', '5': '5',
        'minmaj7': 'maj7', 'augmaj7': '+maj7'
    };
    const suffix = typeToSuffix[type] || '';

    return prefix + numeral + suffix;
}
export function addFromChordList() {
    if (state.chordList.length === 0) return;

    const newRows = state.chordList.map(chord => {
        const token = chordToRomanNumeral(chord.root, chord.type, state.root);
        return parseTokenToRow(token);
    });

    state.builderRows = state.builderRows.concat(newRows);
    renderBuilderRows();
}
export function updateFavButton() {
    const btn = document.getElementById('prog-fav');
    if (!btn) return;
    if (state._selectedUserProgId) {
        btn.style.display = 'none';
        return;
    }
    btn.style.display = '';
    const key = getProgressionKey(state.progressionIndex);
    const isFav = key && state.favoriteProgressions.includes(key);
    btn.innerHTML = isFav ? '&#9829;' : '&#9825;';
    btn.classList.toggle('active', isFav);
}
/**
 * Add all chords from the current progression to the chord list
 */
export function addProgressionToChordList() {
    let chords;
    if (state._selectedUserProgId) {
        const userProg = state.userProgressions.find(p => p.id === state._selectedUserProgId);
        if (userProg) {
            chords = ChordProgressions.buildProgressionChordsFromTokens(userProg.chords, state.root);
        }
    }
    if (!chords) {
        const { categoryIndex, progressionIndex } = ChordProgressions.flatIndexToCategory(state.progressionIndex);
        chords = ChordProgressions.buildProgressionChords(categoryIndex, progressionIndex, state.root);
    }
    chords.forEach(chord => {
        const built = MusicTheory.buildChord(chord.root, chord.type);
        state.chordList.push({ root: chord.root, type: chord.type, symbol: built.symbol });
    });
    saveChordList();
    renderChordList();
}
/**
 * Render progression chords for prog mode
 */
export function renderProgressionChords() {
    const container = document.getElementById('scale-chords');
    if (!container) return;

    let chords, category, progression, isUserProg = false;

    if (state._selectedUserProgId) {
        const userProg = state.userProgressions.find(p => p.id === state._selectedUserProgId);
        if (userProg) {
            chords = ChordProgressions.buildProgressionChordsFromTokens(userProg.chords, state.root);
            category = { name: 'My Progressions' };
            progression = userProg;
            isUserProg = true;
        }
    }

    if (!isUserProg) {
        const { categoryIndex, progressionIndex } = ChordProgressions.flatIndexToCategory(state.progressionIndex);
        chords = ChordProgressions.buildProgressionChords(categoryIndex, progressionIndex, state.root);
        category = ChordProgressions.PROGRESSION_CATEGORIES[categoryIndex];
        progression = category ? category.progressions[progressionIndex] : null;
    }

    if (chords.length === 0) {
        container.innerHTML = '<p class="scale-chords-note">No chords available</p>';
        relocateAddButton(state.mode);
        return;
    }

    container.innerHTML = '';
    const chordsRow = document.createElement('div');
    chordsRow.className = 'scale-chords-list';

    const keyRootIndex = MusicTheory.getNoteIndex(state.root);

    chords.forEach((chord) => {
        const btn = document.createElement('button');
        btn.className = 'scale-chord-item';
        if (state.activeScaleChord && state.activeScaleChord.root === chord.root && state.activeScaleChord.type === chord.type
            && state.activeScaleChord._progIdx === chords.indexOf(chord)) {
            btn.classList.add('selected');
        }
        btn.innerHTML = `<span class="numeral">${chord.numeral}</span><span class="chord-name">${chord.symbol}</span>`;
        btn.addEventListener('click', () => {
            const idx = chords.indexOf(chord);
            if (state.activeScaleChord && state.activeScaleChord.root === chord.root
                && state.activeScaleChord.type === chord.type && state.activeScaleChord._progIdx === idx) {
                state.activeScaleChord = null;
            } else {
                state.activeScaleChord = { root: chord.root, type: chord.type, symbol: chord.symbol, _progIdx: idx };
                if (state.soundEnabled) {
                    const builtChord = MusicTheory.buildChord(chord.root, chord.type);
                    const chordRootIndex = MusicTheory.getNoteIndex(chord.root);
                    const startOctave = chordRootIndex < keyRootIndex ? 4 : 3;
                    Sound.playChord(builtChord.notes, startOctave);
                }
            }
            state.selectedChordIndex = -1;
            renderProgressionChords();
            renderChordList();
            updateDisplay();
        });
        chordsRow.appendChild(btn);
    });

    container.appendChild(chordsRow);
    relocateAddButton(state.mode);

    // Update info panel based on selection state
    if (!state.activeScaleChord && category && chords.length > 0) {
        updateInfoPanel({
            title: category.name,
            notes: chords.map(c => c.symbol),
            intervals: chords.map(c => c.numeral),
            description: progression ? progression.description : '',
            highlightedNotes: new Set(chords.map(c => MusicTheory.getNoteIndex(c.root))),
            useScaleDegrees: state.showScaleDegrees
        });
    }

    updateFavButton();
}
