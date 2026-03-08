/**
 * Fretboard App - UI State & Event Handling
 * Connects music theory module with fretboard visualization
 */

(function() {
    'use strict';

    // Application state
    const state = {
        mode: 'scale',          // 'scale', 'chord', 'interval', 'caged', 'modes', 'prog', 'f.chord', 'f.scale', or 'games'
        root: 'C',
        scaleType: 'major',
        chordType: 'maj',
        modeType: 'ionian',    // Selected mode in 'modes' mode
        cagedShape: 'all',      // 'all', 'C', 'A', 'G', 'E', or 'D'
        chordList: [],          // Array of { root, type, symbol }
        selectedChordIndex: -1, // Index in chord list, -1 = none selected
        showSevenths: false,    // Toggle for scale chord builder
        showRelative: false,    // Toggle for relative major/minor
        showNoteNames: false,   // Toggle for note names vs intervals on markers
        showScaleDegrees: false, // Toggle for scale-root degrees vs chord-root intervals
        soundEnabled: true,     // Toggle for chord list sound playback
        fretboard: null,        // Fretboard API instance
        findMarkers: {},        // Find mode: map keyed by "string-fret" → { string, fret, noteIndex }
        findResults: [],        // Find mode: results from MusicTheory.findChords()
        findSelectedIndex: -1,  // Find mode: index in findResults, -1 = user markers view
        activeScaleChord: null, // Scale mode: previewed chord { root, type, symbol } or null
        progressionIndex: 0,   // Prog mode: flat index into all progressions
        favoriteProgressions: [],    // Prog mode: array of "categoryName|numerals" keys
        browsingFavorites: false,    // Prog mode: currently in favorites section
        progSubMode: 'play',        // Prog mode: 'play', 'create', 'edit'
        userProgressions: [],       // Loaded from localStorage
        editingProgressionId: null, // ID of progression being edited (null in create)
        builderRows: [],            // [{numeral: 'I', quality: ''}, ...]
        builderDescription: '',     // Description for builder
        _selectedUserProgId: null,  // ID of currently selected user progression in play mode
        intervalFilter: new Set(['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'])
    };

    // Storage key for chord list persistence
    const STORAGE_KEY = 'fretboard-chord-list';
    const FAVORITES_STORAGE_KEY = 'fretboard-prog-favorites';
    const USER_PROGRESSIONS_STORAGE_KEY = 'fretboard-user-progressions';

    /**
     * Check if the current mode is a find mode (f.chord or f.scale)
     * @param {string} mode - Mode string
     * @returns {boolean}
     */
    function isFindMode(mode) {
        return mode === 'f.chord' || mode === 'f.scale';
    }

    /**
     * Load chord list from localStorage
     */
    function loadChordList() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                state.chordList = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load chord list:', e);
            state.chordList = [];
        }
    }

    /**
     * Save chord list to localStorage
     */
    function saveChordList() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chordList));
        } catch (e) {
            console.error('Failed to save chord list:', e);
        }
    }

    function getProgressionKey(flatIndex) {
        const { categoryIndex, progressionIndex } = ChordProgressions.flatIndexToCategory(flatIndex);
        const cat = ChordProgressions.PROGRESSION_CATEGORIES[categoryIndex];
        if (!cat) return null;
        const prog = cat.progressions[progressionIndex];
        if (!prog) return null;
        return cat.name + '|' + prog.numerals;
    }

    function favKeyToFlatIndex(key) {
        const sep = key.indexOf('|');
        if (sep < 0) return -1;
        const catName = key.substring(0, sep);
        const numerals = key.substring(sep + 1);
        let flatIdx = 0;
        for (const cat of ChordProgressions.PROGRESSION_CATEGORIES) {
            for (const prog of cat.progressions) {
                if (cat.name === catName && prog.numerals === numerals) return flatIdx;
                flatIdx++;
            }
        }
        return -1;
    }

    function getResolvedFavorites() {
        return state.favoriteProgressions
            .map(favKeyToFlatIndex)
            .filter(idx => idx >= 0);
    }

    function loadFavorites() {
        try {
            const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (saved) state.favoriteProgressions = JSON.parse(saved);
        } catch (e) {
            state.favoriteProgressions = [];
        }
    }

    function saveFavorites() {
        try {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favoriteProgressions));
        } catch (e) { /* ignore */ }
    }

    // --- User Progressions CRUD ---

    function loadUserProgressions() {
        try {
            const saved = localStorage.getItem(USER_PROGRESSIONS_STORAGE_KEY);
            if (saved) state.userProgressions = JSON.parse(saved);
        } catch (e) {
            state.userProgressions = [];
        }
    }

    function saveUserProgressions() {
        try {
            localStorage.setItem(USER_PROGRESSIONS_STORAGE_KEY, JSON.stringify(state.userProgressions));
        } catch (e) { /* ignore */ }
    }

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

    function renderProgSubModeUI() {
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

    function renderBuilderRows() {
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

    function saveProgression() {
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

    function deleteProgression() {
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

    function loadProgressionIntoBuilder(id) {
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

    function addFromChordList() {
        if (state.chordList.length === 0) return;

        const newRows = state.chordList.map(chord => {
            const token = chordToRomanNumeral(chord.root, chord.type, state.root);
            return parseTokenToRow(token);
        });

        state.builderRows = state.builderRows.concat(newRows);
        renderBuilderRows();
    }

    function updateFavButton() {
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

    /**
     * Update visibility of the relative toggle based on current mode and selection
     */
    function updateRelToggleVisibility() {
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
    function displayScale(scale) {
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

        const positions = MusicTheory.getNotesOnFretboard(
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
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

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
    function displayChord(chord) {
        if (!state.fretboard) return;

        state.fretboard.clearMarkers();

        const positions = MusicTheory.getNotesOnFretboard(
            chord.noteToInterval,
            15,
            chord.root
        );

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

        // Apply current rotation to newly created markers
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

        updateInfoPanel({
            title: chord.symbol,
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
            const allScalePositions = MusicTheory.getNotesOnFretboard(
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

        const positions = MusicTheory.getNotesOnFretboard(
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
            const ghostPositions = MusicTheory.getNotesOnFretboard(
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
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

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

        const positions = MusicTheory.getNotesOnFretboard(
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
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

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
        const scalePositions = MusicTheory.getNotesOnFretboard(scale.noteToDegree, 15, root);
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
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

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

        const positions = MusicTheory.getNotesOnFretboard(
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

        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

        updateInfoPanel({
            title: `${modeRoot} ${mode.name} (${parentRoot} Major)`,
            notes: scale.notes,
            intervals: scale.degrees,
            noteToInterval: scale.noteToDegree,
            rainbowNoteIndex: MusicTheory.getNoteIndex(parentRoot)
        });
    }

    // ========================================
    // FIND MODE
    // ========================================

    /**
     * Register click handler for Find mode fretboard interaction
     */
    function registerFindClickHandler() {
        if (!state.fretboard) return;
        state.fretboard.onFretClick((string, fret) => {
            // If a result chord is selected, deselect it first
            if (state.findSelectedIndex >= 0) {
                state.findSelectedIndex = -1;
            }

            const key = string + '-' + fret;

            if (state.findMarkers[key]) {
                // Same position — toggle off
                delete state.findMarkers[key];
            } else {
                // In f.chord mode, remove any existing marker on this string first
                if (state.mode === 'f.chord') {
                    for (const k of Object.keys(state.findMarkers)) {
                        if (state.findMarkers[k].string === string) {
                            delete state.findMarkers[k];
                        }
                    }
                }

                const stringIndex = 6 - string;
                const noteIndex = MusicTheory.getNoteAt(stringIndex, fret);
                state.findMarkers[key] = { string, fret, noteIndex };

                if (state.soundEnabled) {
                    const noteName = MusicTheory.getNoteName(noteIndex, false);
                    const octave = MusicTheory.getOctaveAt(stringIndex, fret);
                    Sound.playNote(noteName, octave);
                }
            }

            updateFindResults();
            displayFindMarkers();
        });
    }

    /**
     * Update find results based on current markers
     */
    function updateFindResults() {
        const noteSet = new Set();
        for (const marker of Object.values(state.findMarkers)) {
            noteSet.add(marker.noteIndex);
        }
        state.findResults = state.mode === 'f.chord'
            ? MusicTheory.findChords(noteSet)
            : MusicTheory.findScales(noteSet);
        state.findSelectedIndex = -1;
        state.activeScaleChord = null;
        renderFindResults();
        if (state.mode === 'f.scale') {
            renderFindScaleChords();
        }
    }

    /**
     * Display user-placed find markers on the fretboard
     */
    function displayFindMarkers() {
        if (!state.fretboard) return;
        state.fretboard.clearMarkers();

        const notes = [];
        for (const marker of Object.values(state.findMarkers)) {
            const noteName = MusicTheory.getNoteName(marker.noteIndex, false);
            notes.push(noteName);
            state.fretboard.setMarker(marker.string, marker.fret, {
                color: '#555',
                borderColor: '#000',
                text: noteName,
                textColor: '#fff'
            });
        }

        // Apply current rotation to newly created markers
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

        const modeLabel = state.mode === 'f.scale' ? 'f.scale' : 'f.chord';
        updateInfoPanel({
            title: notes.length > 0 ? modeLabel + ': ' + notes.join(' ') : modeLabel,
            notes: notes.length > 0 ? notes : ['Tap fretboard to place notes'],
            intervals: []
        });
    }

    /**
     * Render find results list UI
     */
    function renderFindResults() {
        const listEl = document.getElementById('find-results-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        const addBtn = document.getElementById('find-add-btn');

        const isScaleMode = state.mode === 'f.scale';
        const thingName = isScaleMode ? 'scales' : 'chords';

        if (Object.keys(state.findMarkers).length < 2) {
            const li = document.createElement('li');
            li.className = 'find-result-placeholder';
            li.textContent = 'Place 2+ notes to find ' + thingName;
            listEl.appendChild(li);
            if (addBtn) addBtn.disabled = true;
            return;
        }

        if (state.findResults.length === 0) {
            const li = document.createElement('li');
            li.className = 'find-result-placeholder';
            li.textContent = 'No matching ' + thingName;
            listEl.appendChild(li);
            if (addBtn) addBtn.disabled = true;
            return;
        }

        state.findResults.forEach((result, index) => {
            const li = document.createElement('li');
            li.className = 'find-result-item';
            if (index === state.findSelectedIndex) {
                li.classList.add('selected');
            }

            const symbolSpan = document.createElement('span');
            symbolSpan.className = 'find-result-symbol';
            symbolSpan.textContent = isScaleMode
                ? result.root + ' ' + result.name
                : result.symbol;

            const notesSpan = document.createElement('span');
            notesSpan.className = 'find-result-notes';
            notesSpan.textContent = result.notes.join(' ');

            li.appendChild(symbolSpan);
            li.appendChild(notesSpan);
            li.addEventListener('click', () => selectFindResult(index));
            listEl.appendChild(li);
        });

        if (addBtn) addBtn.disabled = state.findSelectedIndex < 0;
    }

    /**
     * Select or deselect a find result chord
     * @param {number} index - Index in findResults
     */
    function selectFindResult(index) {
        state.activeScaleChord = null;
        if (state.findSelectedIndex === index) {
            // Deselect — show user markers
            state.findSelectedIndex = -1;
            displayFindMarkers();
        } else {
            state.findSelectedIndex = index;
            const result = state.findResults[index];
            if (state.mode === 'f.scale') {
                displayScale(result);
                if (state.soundEnabled) {
                    Sound.playArpeggio(result.notes);
                }
            } else {
                displayChord(result);
                if (state.soundEnabled) {
                    Sound.playChord(result.notes);
                }
            }
        }
        renderFindResults();
        if (state.mode === 'f.scale') {
            renderFindScaleChords();
            updateRelToggleVisibility();
        }
    }

    /**
     * Add selected find result to chord list
     */
    function addFindResultToChordList() {
        if (state.findSelectedIndex < 0 || state.findSelectedIndex >= state.findResults.length) return;
        const chord = state.findResults[state.findSelectedIndex];
        addChordToList(chord.root, chord.type);
    }

    /**
     * Clear all find markers and results
     */
    function clearFindMarkers() {
        state.findMarkers = {};
        state.findResults = [];
        state.findSelectedIndex = -1;
        state.activeScaleChord = null;
        renderFindResults();
        if (state.mode === 'f.scale') {
            renderFindScaleChords();
            updateRelToggleVisibility();
        }
        displayFindMarkers();
    }

    /**
     * Render the chromatic circle SVG showing active notes with interval colors
     * @param {Object} noteToInterval - Map of semitone index (0-11) to interval name
     */
    function renderChromaticCircle(noteToInterval, rainbowNoteIndex, highlightedNotes, useScaleDegrees) {
        const svg = document.getElementById('chromatic-circle-svg');
        if (!svg) return;

        svg.innerHTML = '';
        const ns = 'http://www.w3.org/2000/svg';
        const cx = 100, cy = 100, radius = 72, noteRadius = 13;
        const useFlats = MusicTheory.shouldUseFlats(state.root);
        const noteNames = useFlats ? MusicTheory.FLAT_NOTES : MusicTheory.CHROMATIC_NOTES;
        const SEMITONE_LABELS = ['1','b2','2','b3','3','4','b5','5','#5','6','b7','7'];
        const rootEntry = Object.entries(noteToInterval).find(([, v]) => v === '1');
        const rootIndex = rootEntry ? parseInt(rootEntry[0]) : (rainbowNoteIndex !== undefined ? rainbowNoteIndex : MusicTheory.getNoteIndex(state.root));

        for (let i = 0; i < 12; i++) {
            const angle = (i * 30 - 90) * Math.PI / 180;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const interval = noteToInterval[i];
            const isActive = interval !== undefined;

            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', noteRadius);

            if (isActive) {
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

            if (isActive) {
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

    /**
     * Update the info panel with current selection details
     * @param {Object} info - { title, notes, intervals, noteToInterval }
     */
    function updateInfoPanel(info) {
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
            renderChromaticCircle(info.noteToInterval || {}, info.rainbowNoteIndex, info.highlightedNotes, info.useScaleDegrees);
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

        renderChromaticCircle(info.noteToInterval || {}, info.rainbowNoteIndex, info.highlightedNotes, info.useScaleDegrees);
    }

    /**
     * Update display based on current state
     */
    function updateDisplay() {
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

    /**
     * Render the chord list UI
     */
    function renderChordList() {
        const listEl = document.getElementById('chord-list-items');
        if (!listEl) return;

        listEl.innerHTML = '';

        state.chordList.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'chord-list-item';
            if (index === state.selectedChordIndex) {
                li.classList.add('selected');
            }

            const span = document.createElement('span');
            span.textContent = item.symbol;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-chord-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeChordFromList(index);
            });

            li.appendChild(span);
            li.appendChild(removeBtn);
            li.addEventListener('click', () => selectChordFromList(index));
            listEl.appendChild(li);
        });
    }

    /**
     * Add a chord to the list
     * @param {string} root - Chord root note
     * @param {string} type - Chord type
     */
    function addChordToList(root, type) {
        const chord = MusicTheory.buildChord(root, type);
        state.chordList.push({
            root,
            type,
            symbol: chord.symbol
        });
        saveChordList();
        renderChordList();
    }

    /**
     * Remove a chord from the list
     * @param {number} index - Index to remove
     */
    function removeChordFromList(index) {
        state.chordList.splice(index, 1);

        // Adjust selected index if needed
        if (state.selectedChordIndex === index) {
            state.selectedChordIndex = -1;
            updateDisplay();
        } else if (state.selectedChordIndex > index) {
            state.selectedChordIndex--;
        }

        saveChordList();
        renderChordList();
    }

    /**
     * Select a chord from the list
     * @param {number} index - Index to select
     */
    function selectChordFromList(index) {
        if (state.selectedChordIndex === index) {
            // Deselect if clicking same item
            state.selectedChordIndex = -1;
        } else {
            state.selectedChordIndex = index;
            // Play the chord sound on select (if enabled)
            if (state.soundEnabled) {
                const item = state.chordList[index];
                const chord = MusicTheory.buildChord(item.root, item.type);
                Sound.playChord(chord.notes);
            }
        }
        renderChordList();
        updateDisplay();
    }

    /**
     * Clear all chords from the list
     */
    function clearChordList() {
        state.chordList = [];
        state.selectedChordIndex = -1;
        saveChordList();
        renderChordList();
        updateDisplay();
    }

    /**
     * Render scale chord builder
     */
    function renderScaleChords() {
        const container = document.getElementById('scale-chords');
        if (!container) return;

        let chordRoot, chordScaleType;

        if (state.mode === 'modes') {
            chordRoot = MusicTheory.getModeRoot(state.root, state.modeType);
            chordScaleType = MusicTheory.MODES[state.modeType].scaleType;
        } else {
            // Use relative scale if toggle is active
            chordRoot = state.root;
            chordScaleType = state.scaleType;

            if (state.showRelative) {
                const relativeInfo = MusicTheory.getRelativeScale(state.root, state.scaleType);
                if (relativeInfo) {
                    chordRoot = relativeInfo.root;
                    chordScaleType = relativeInfo.scaleType;
                }
            }
        }

        const chords = MusicTheory.buildScaleChords(chordRoot, chordScaleType, state.showSevenths);

        if (chords.length === 0) {
            container.innerHTML = '<p class="scale-chords-note">Scale chords not available for this scale type</p>';
            return;
        }

        container.innerHTML = '';

        const chordsRow = document.createElement('div');
        chordsRow.className = 'scale-chords-list';

        chords.forEach((chord) => {
            const btn = document.createElement('button');
            btn.className = 'scale-chord-item';
            if (state.activeScaleChord && state.activeScaleChord.root === chord.root && state.activeScaleChord.type === chord.type) {
                btn.classList.add('selected');
            }
            btn.innerHTML = `<span class="numeral">${chord.numeral}</span><span class="chord-name">${chord.symbol}</span>`;
            btn.addEventListener('click', () => {
                if (state.activeScaleChord && state.activeScaleChord.root === chord.root && state.activeScaleChord.type === chord.type) {
                    // Deactivate — return to scale view
                    state.activeScaleChord = null;
                } else {
                    state.activeScaleChord = { root: chord.root, type: chord.type, symbol: chord.symbol };
                    if (state.soundEnabled) {
                        const builtChord = MusicTheory.buildChord(chord.root, chord.type);
                        const scaleRootIndex = MusicTheory.getNoteIndex(chordRoot);
                        const chordRootIndex = MusicTheory.getNoteIndex(chord.root);
                        const startOctave = chordRootIndex < scaleRootIndex ? 4 : 3;
                        Sound.playChord(builtChord.notes, startOctave);
                    }
                }
                state.selectedChordIndex = -1;
                renderScaleChords();
                renderChordList();
                updateDisplay();
            });
            chordsRow.appendChild(btn);
        });

        container.appendChild(chordsRow);
    }

    /**
     * Render progression chords for prog mode
     */
    function renderProgressionChords() {
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

    /**
     * Render scale chord builder for f.scale mode
     * Uses the selected find result scale to populate diatonic chords
     */
    function renderFindScaleChords() {
        const builderSection = document.getElementById('scale-chord-builder');
        const container = document.getElementById('scale-chords');
        if (!builderSection || !container) return;

        if (state.findSelectedIndex < 0 || state.findSelectedIndex >= state.findResults.length) {
            builderSection.classList.add('disabled');
            container.innerHTML = '<p class="scale-chords-note">Select a scale to see chords</p>';
            return;
        }

        builderSection.classList.remove('disabled');
        const selectedScale = state.findResults[state.findSelectedIndex];

        let chordRoot = selectedScale.root;
        let chordScaleType = selectedScale.type;
        if (state.showRelative) {
            const relativeInfo = MusicTheory.getRelativeScale(selectedScale.root, selectedScale.type);
            if (relativeInfo) {
                chordRoot = relativeInfo.root;
                chordScaleType = relativeInfo.scaleType;
            }
        }
        const chords = MusicTheory.buildScaleChords(chordRoot, chordScaleType, state.showSevenths);

        if (chords.length === 0) {
            container.innerHTML = '<p class="scale-chords-note">Scale chords not available for this scale type</p>';
            return;
        }

        container.innerHTML = '';
        const chordsRow = document.createElement('div');
        chordsRow.className = 'scale-chords-list';

        chords.forEach((chord) => {
            const btn = document.createElement('button');
            btn.className = 'scale-chord-item';
            if (state.activeScaleChord && state.activeScaleChord.root === chord.root && state.activeScaleChord.type === chord.type) {
                btn.classList.add('selected');
            }
            btn.innerHTML = `<span class="numeral">${chord.numeral}</span><span class="chord-name">${chord.symbol}</span>`;
            btn.addEventListener('click', () => {
                if (state.activeScaleChord && state.activeScaleChord.root === chord.root && state.activeScaleChord.type === chord.type) {
                    state.activeScaleChord = null;
                } else {
                    state.activeScaleChord = { root: chord.root, type: chord.type, symbol: chord.symbol };
                    if (state.soundEnabled) {
                        const builtChord = MusicTheory.buildChord(chord.root, chord.type);
                        Sound.playChord(builtChord.notes);
                    }
                }
                state.selectedChordIndex = -1;
                renderFindScaleChords();
                renderChordList();
                updateDisplay();
            });
            chordsRow.appendChild(btn);
        });

        container.appendChild(chordsRow);
    }

    /**
     * Update scale type dropdown options based on mode
     * Uses optgroups to organize options by category
     */
    function updateTypeDropdown() {
        const dropdown = document.getElementById('type-select');
        if (!dropdown) return;

        dropdown.innerHTML = '';

        if (state.mode === 'scale') {
            // Organize scales into categories
            const scaleCategories = {
                'Common': ['major', 'natural_minor', 'harmonic_minor', 'melodic_minor', 'pentatonic_major', 'pentatonic_minor', 'blues'],
                'Modes': ['dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']
            };

            for (const [category, scaleKeys] of Object.entries(scaleCategories)) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;

                for (const key of scaleKeys) {
                    const scale = MusicTheory.SCALES[key];
                    if (scale) {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = scale.name;
                        if (key === state.scaleType) {
                            option.selected = true;
                        }
                        optgroup.appendChild(option);
                    }
                }

                if (optgroup.children.length > 0) {
                    dropdown.appendChild(optgroup);
                }
            }

            // Add any remaining scales not in categories
            const categorizedKeys = Object.values(scaleCategories).flat();
            const remainingScales = Object.entries(MusicTheory.SCALES)
                .filter(([key]) => !categorizedKeys.includes(key));

            if (remainingScales.length > 0) {
                const otherGroup = document.createElement('optgroup');
                otherGroup.label = 'Other';
                for (const [key, scale] of remainingScales) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = scale.name;
                    if (key === state.scaleType) {
                        option.selected = true;
                    }
                    otherGroup.appendChild(option);
                }
                dropdown.appendChild(otherGroup);
            }
        } else if (state.mode === 'modes') {
            for (const [key, mode] of Object.entries(MusicTheory.MODES)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = mode.name;
                if (key === state.modeType) {
                    option.selected = true;
                }
                dropdown.appendChild(option);
            }
        } else if (state.mode === 'caged') {
            // CAGED mode: triadic chord types + maj7/min7
            const cagedTypes = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'min7'];
            for (const key of cagedTypes) {
                const chord = MusicTheory.CHORD_TYPES[key];
                if (chord) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = chord.name;
                    if (key === state.chordType) {
                        option.selected = true;
                    }
                    dropdown.appendChild(option);
                }
            }
        } else if (state.mode === 'prog') {
            // Favorites optgroup
            const resolvedFavs = getResolvedFavorites();
            if (resolvedFavs.length > 0) {
                const favGroup = document.createElement('optgroup');
                favGroup.label = '\u2665 Favorites';
                resolvedFavs.forEach(flatIdx => {
                    const { categoryIndex, progressionIndex } = ChordProgressions.flatIndexToCategory(flatIdx);
                    const cat = ChordProgressions.PROGRESSION_CATEGORIES[categoryIndex];
                    const prog = cat.progressions[progressionIndex];
                    const option = document.createElement('option');
                    option.value = 'fav-' + flatIdx;
                    option.textContent = prog.numerals;
                    if (state.browsingFavorites && flatIdx === state.progressionIndex) {
                        option.selected = true;
                    }
                    favGroup.appendChild(option);
                });
                dropdown.appendChild(favGroup);
            }

            // User progressions optgroup
            if (state.userProgressions.length > 0) {
                const userGroup = document.createElement('optgroup');
                userGroup.label = 'My Progressions';
                state.userProgressions.forEach(prog => {
                    const option = document.createElement('option');
                    option.value = 'user-' + prog.id;
                    option.textContent = prog.numerals;
                    if (state._selectedUserProgId === prog.id) {
                        option.selected = true;
                    }
                    userGroup.appendChild(option);
                });
                dropdown.appendChild(userGroup);
            }

            // Regular progression categories as optgroups
            let flatIdx = 0;
            for (let ci = 0; ci < ChordProgressions.PROGRESSION_CATEGORIES.length; ci++) {
                const cat = ChordProgressions.PROGRESSION_CATEGORIES[ci];
                const optgroup = document.createElement('optgroup');
                optgroup.label = cat.name;

                for (let pi = 0; pi < cat.progressions.length; pi++) {
                    const prog = cat.progressions[pi];
                    const option = document.createElement('option');
                    option.value = flatIdx;
                    option.textContent = prog.numerals;
                    if (!state.browsingFavorites && flatIdx === state.progressionIndex) {
                        option.selected = true;
                    }
                    optgroup.appendChild(option);
                    flatIdx++;
                }
                dropdown.appendChild(optgroup);
            }
        } else {
            // Organize chords into categories
            const chordCategories = {
                'Triads': ['maj', 'min', 'dim', 'aug'],
                'Sevenths': ['maj7', 'min7', 'dom7', 'dim7', 'min7b5', 'minmaj7', 'augmaj7'],
                'Extended': ['maj9', 'min9', 'dom9', 'maj11', 'min11', 'dom11', 'maj13', 'min13', 'dom13'],
                'Suspended': ['sus2', 'sus4', '7sus4'],
                'Added': ['add9', 'madd9', 'add11', '6', 'min6']
            };

            for (const [category, chordKeys] of Object.entries(chordCategories)) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;

                for (const key of chordKeys) {
                    const chord = MusicTheory.CHORD_TYPES[key];
                    if (chord) {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = chord.name;
                        if (key === state.chordType) {
                            option.selected = true;
                        }
                        optgroup.appendChild(option);
                    }
                }

                if (optgroup.children.length > 0) {
                    dropdown.appendChild(optgroup);
                }
            }

            // Add any remaining chords not in categories
            const categorizedKeys = Object.values(chordCategories).flat();
            const remainingChords = Object.entries(MusicTheory.CHORD_TYPES)
                .filter(([key]) => !categorizedKeys.includes(key));

            if (remainingChords.length > 0) {
                const otherGroup = document.createElement('optgroup');
                otherGroup.label = 'Other';
                for (const [key, chord] of remainingChords) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = chord.name;
                    if (key === state.chordType) {
                        option.selected = true;
                    }
                    otherGroup.appendChild(option);
                }
                dropdown.appendChild(otherGroup);
            }
        }
    }

    /**
     * Handle mode change (scale/chord/interval/caged toggle)
     * @param {string} mode - 'scale', 'chord', 'interval', or 'caged'
     */
    function setMode(mode) {
        // Handle games mode transition
        if (mode === 'games') {
            if (window.Games) {
                window.Games.setPreviousMode(state.mode);
            }
            document.getElementById('controls-panel').style.display = 'none';
            document.getElementById('fretboard-panel').style.display = 'none';
            if (window.Games) window.Games.activate();
            return;
        }

        // Leaving games mode — restore main UI
        if (state.mode === 'games' || document.getElementById('games-panel').style.display === 'block') {
            document.getElementById('controls-panel').style.display = '';
            document.getElementById('fretboard-panel').style.display = '';
            if (window.Games) window.Games.deactivate();
        }

        // Leaving Find mode — clean up
        if (isFindMode(state.mode)) {
            if (state.fretboard) state.fretboard.onFretClick(null);
            state.findMarkers = {};
            state.findResults = [];
            state.findSelectedIndex = -1;
            document.body.classList.remove('find-mode-active');
            const builderSection = document.getElementById('scale-chord-builder');
            if (builderSection) builderSection.classList.remove('disabled');
        }

        state.mode = mode;
        state.selectedChordIndex = -1; // Deselect list item when changing mode
        state.activeScaleChord = null;
        state.browsingFavorites = false;
        updateTypeDropdown();
        renderChordList();

        // Show/hide type selector based on mode (hide for interval and find)
        const typeGroup = document.querySelector('.control-group:has(#type-select)');
        if (typeGroup) {
            typeGroup.style.display = (mode === 'interval' || isFindMode(mode)) ? 'none' : 'block';
        }

        // When entering CAGED mode, ensure chordType is a valid CAGED type
        const cagedTypes = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'min7'];
        if (mode === 'caged' && !cagedTypes.includes(state.chordType)) {
            state.chordType = 'maj';
        }

        // Update type label based on mode
        const typeLabel = document.getElementById('type-label');
        if (typeLabel) {
            if (mode === 'scale') {
                typeLabel.textContent = 'Scale Type';
            } else if (mode === 'modes') {
                typeLabel.textContent = 'Mode';
            } else if (mode === 'prog') {
                typeLabel.textContent = 'Progression';
            } else {
                typeLabel.textContent = 'Chord Type';
            }
        }

        // Update root label based on mode
        const rootLabel = document.getElementById('root-label');
        if (rootLabel) {
            rootLabel.textContent = (mode === 'modes' || mode === 'prog') ? 'Key' : 'Root Note';
        }

        // Show/hide root note selector (hide in find mode)
        const rootGroup = document.querySelector('.control-group:has(#root-note)');
        if (rootGroup) {
            rootGroup.style.display = isFindMode(mode) ? 'none' : 'block';
        }

        const rootSelect = document.getElementById('root-note');
        if (rootSelect) {
            const rainbowModes = ['scale', 'interval', 'modes', 'prog'];
            rootSelect.classList.toggle('rainbow-select', rainbowModes.includes(mode));
        }

        // Show/hide CAGED shape selector
        const cagedSelector = document.getElementById('caged-shape-selector');
        if (cagedSelector) {
            cagedSelector.style.display = mode === 'caged' ? 'block' : 'none';
        }

        // Show/hide interval filter
        const intervalFilter = document.getElementById('interval-filter');
        if (intervalFilter) {
            intervalFilter.style.display = mode === 'interval' ? 'block' : 'none';
        }

        // Show/hide scale chord builder (scale, modes, prog)
        const builderSection = document.getElementById('scale-chord-builder');
        if (builderSection) {
            builderSection.style.display = (mode === 'scale' || mode === 'modes' || mode === 'f.scale' || mode === 'prog') ? 'block' : 'none';
            const builderLabel = builderSection.querySelector('label');
            if (builderLabel) {
                builderLabel.textContent = mode === 'prog' ? 'Progression Chords' : 'Scale Chords';
            }
        }

        // Show/hide prog navigation buttons
        const progNav = document.getElementById('prog-nav');
        if (progNav) {
            progNav.style.display = mode === 'prog' ? 'flex' : 'none';
        }

        // Reset prog sub-mode when entering prog mode
        if (mode === 'prog') {
            state.progSubMode = 'play';
            state._selectedUserProgId = null;
            const submodeRadios = document.querySelectorAll('input[name="prog-submode"]');
            submodeRadios.forEach(r => {
                r.checked = r.value === 'play';
                const label = r.closest('.radio-label');
                if (label) label.classList.toggle('checked', r.checked);
            });
            renderProgSubModeUI();
        } else {
            renderProgSubModeUI();
        }

        // Show/hide toggles based on mode
        const seventhsLabel = document.getElementById('sevenths-toggle')?.closest('.toggle-label');
        const relativeLabel = document.getElementById('relative-toggle')?.closest('.toggle-label');
        const scaleLabel = document.getElementById('chord-intervals-toggle')?.closest('.toggle-label');
        const toggleRow = document.querySelector('#scale-chord-builder .toggle-row');
        if (mode === 'prog') {
            if (seventhsLabel) seventhsLabel.style.display = 'none';
            if (relativeLabel) relativeLabel.style.display = 'none';
            if (scaleLabel) scaleLabel.style.display = '';
            if (toggleRow) toggleRow.style.display = '';
        } else {
            if (seventhsLabel) seventhsLabel.style.display = '';
            // relativeLabel visibility handled by updateRelToggleVisibility()
            if (scaleLabel) scaleLabel.style.display = '';
            if (toggleRow) toggleRow.style.display = '';
        }

        // Rename scale toggle label contextually
        const scaleToggleText = scaleLabel?.querySelector('.toggle-text');
        if (scaleToggleText) {
            scaleToggleText.textContent = mode === 'prog' ? 'key' : 'scale';
        }

        // Update relative toggle visibility for current mode
        updateRelToggleVisibility();

        // Show/hide find controls
        const findControls = document.getElementById('find-controls');
        if (findControls) {
            findControls.style.display = isFindMode(mode) ? 'block' : 'none';
        }

        // Show/hide Add button based on mode
        const addChordBtn = document.getElementById('add-chord-btn');
        if (addChordBtn) {
            addChordBtn.style.display = (mode === 'chord' || mode === 'scale' || mode === 'modes' || mode === 'f.scale' || mode === 'prog') ? 'flex' : 'none';
        }

        if (mode === 'scale' || mode === 'modes') {
            renderScaleChords();
        } else if (mode === 'f.scale') {
            renderFindScaleChords();
        } else if (mode === 'prog') {
            renderProgressionChords();
        }

        // Enter Find mode
        if (isFindMode(mode)) {
            document.body.classList.add('find-mode-active');
            // Set label and Add button visibility based on sub-mode
            const findLabel = document.querySelector('#find-controls > label');
            if (findLabel) {
                findLabel.textContent = mode === 'f.chord' ? 'Matching Chords' : 'Matching Scales';
            }
            const findAddBtn = document.getElementById('find-add-btn');
            if (findAddBtn) {
                findAddBtn.style.display = mode === 'f.scale' ? 'none' : '';
            }
            registerFindClickHandler();
            renderFindResults();
            displayFindMarkers();
            return;
        }

        updateDisplay();
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // Mode toggle (scale/chord)
        const modeRadios = document.querySelectorAll('input[name="mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                setMode(e.target.value);
            });
        });

        // Root note selector
        const rootSelect = document.getElementById('root-note');
        if (rootSelect) {
            rootSelect.addEventListener('change', (e) => {
                state.root = e.target.value;
                state.selectedChordIndex = -1;
                state.activeScaleChord = null;
                renderChordList();
                if (state.mode === 'scale' || state.mode === 'modes') {
                    renderScaleChords();
                } else if (state.mode === 'prog') {
                    if (state.progSubMode === 'play') {
                        renderProgressionChords();
                    } else {
                        renderBuilderRows();
                    }
                }
                updateDisplay();
                if (state.mode === 'chord' && state.soundEnabled) {
                    const chord = MusicTheory.buildChord(state.root, state.chordType);
                    Sound.playChord(chord.notes);
                }
            });
        }

        // Type selector (scale or chord type)
        const typeSelect = document.getElementById('type-select');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                if (state.mode === 'scale') {
                    state.scaleType = e.target.value;
                    state.activeScaleChord = null;
                    updateRelToggleVisibility();
                    renderScaleChords();
                } else if (state.mode === 'modes') {
                    state.modeType = e.target.value;
                    state.activeScaleChord = null;
                    renderScaleChords();
                } else if (state.mode === 'prog') {
                    const val = e.target.value;
                    if (val.startsWith('user-')) {
                        state._selectedUserProgId = parseInt(val.slice(5));
                        state.browsingFavorites = false;
                    } else if (val.startsWith('fav-')) {
                        state._selectedUserProgId = null;
                        state.progressionIndex = parseInt(val.slice(4)) || 0;
                        state.browsingFavorites = true;
                    } else {
                        state._selectedUserProgId = null;
                        state.progressionIndex = parseInt(val) || 0;
                        state.browsingFavorites = false;
                    }
                    state.activeScaleChord = null;
                    updateFavButton();
                    renderProgressionChords();
                } else {
                    state.chordType = e.target.value;
                }
                state.selectedChordIndex = -1;
                renderChordList();
                updateDisplay();
                if ((state.mode === 'chord' || state.mode === 'caged') && state.soundEnabled) {
                    const chord = MusicTheory.buildChord(state.root, state.chordType);
                    Sound.playChord(chord.notes);
                }
            });
        }

        // Triads/7ths toggle
        const seventhsToggle = document.getElementById('sevenths-toggle');
        if (seventhsToggle) {
            seventhsToggle.addEventListener('change', (e) => {
                state.showSevenths = e.target.checked;
                state.activeScaleChord = null;
                if (state.mode === 'f.scale') {
                    renderFindScaleChords();
                } else {
                    renderScaleChords();
                }
                updateDisplay();
            });
        }

        // Sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                state.soundEnabled = e.target.checked;
            });
        }

        // Note names toggle
        const noteNamesToggle = document.getElementById('notenames-toggle');
        if (noteNamesToggle) {
            noteNamesToggle.addEventListener('change', (e) => {
                state.showNoteNames = e.target.checked;
                updateDisplay();
            });
        }

        // Relative scale toggle
        const relativeToggle = document.getElementById('relative-toggle');
        if (relativeToggle) {
            relativeToggle.addEventListener('change', (e) => {
                state.showRelative = e.target.checked;
                state.activeScaleChord = null;
                if (state.mode === 'f.scale') {
                    renderFindScaleChords();
                } else {
                    renderScaleChords();
                }
                updateDisplay();
            });
        }

        // Chord intervals toggle
        const chordIntervalsToggle = document.getElementById('chord-intervals-toggle');
        if (chordIntervalsToggle) {
            chordIntervalsToggle.addEventListener('change', (e) => {
                state.showScaleDegrees = e.target.checked;
                updateDisplay();
            });
        }

        // Handle checkbox visual state for toggle buttons
        // Replaces CSS :has() selector which has timing issues on mobile
        const checkboxToggles = document.querySelectorAll('.toggle-label input[type="checkbox"]');
        checkboxToggles.forEach(checkbox => {
            const label = checkbox.closest('.toggle-label');

            // Set initial state based on checked attribute
            if (checkbox.checked) {
                label.classList.add('checked');
            }

            // Update class on change event
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            });
        });

        // Handle radio button visual state
        // Replaces CSS :has() selector which has timing issues on mobile
        const radioLabels = document.querySelectorAll('.radio-label');
        radioLabels.forEach(label => {
            const radio = label.querySelector('input[type="radio"]');

            if (radio) {
                // Set initial state
                if (radio.checked) {
                    label.classList.add('checked');
                }

                // Update on change
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        // Remove checked class from all radios in same group
                        const groupName = this.name;
                        document.querySelectorAll(`input[type="radio"][name="${groupName}"]`).forEach(r => {
                            r.closest('.radio-label').classList.remove('checked');
                        });

                        // Add checked class to current label
                        label.classList.add('checked');
                    }
                });
            }
        });

        // CAGED shape selector
        const cagedShapeRadios = document.querySelectorAll('input[name="caged-shape"]');
        cagedShapeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.cagedShape = e.target.value;
                updateDisplay();
            });
        });

        // Prog mode navigation buttons
        function navigateProgression(direction) {
            const favs = getResolvedFavorites();
            const total = ChordProgressions.getTotalProgressionCount();
            const userProgs = state.userProgressions;

            // Build ordered sections: [favorites] → [user progressions] → [built-in]
            // Navigation: built-in → (wrap to favs or user or built-in start)
            //             favs → user progs → built-in
            //             user progs → built-in

            if (state._selectedUserProgId) {
                // Currently on a user progression
                const userIdx = userProgs.findIndex(p => p.id === state._selectedUserProgId);
                if (direction === 'next') {
                    if (userIdx >= userProgs.length - 1) {
                        // Move to first built-in
                        state._selectedUserProgId = null;
                        state.browsingFavorites = false;
                        state.progressionIndex = 0;
                    } else {
                        state._selectedUserProgId = userProgs[userIdx + 1].id;
                    }
                } else {
                    if (userIdx <= 0) {
                        // Move to last favorite, or last built-in
                        state._selectedUserProgId = null;
                        if (favs.length > 0) {
                            state.browsingFavorites = true;
                            state.progressionIndex = favs[favs.length - 1];
                        } else {
                            state.browsingFavorites = false;
                            state.progressionIndex = total - 1;
                        }
                    } else {
                        state._selectedUserProgId = userProgs[userIdx - 1].id;
                    }
                }
            } else if (state.browsingFavorites && favs.length > 0) {
                const favIdx = favs.indexOf(state.progressionIndex);
                if (direction === 'next') {
                    if (favIdx >= favs.length - 1) {
                        // Move to first user prog, or first built-in
                        if (userProgs.length > 0) {
                            state._selectedUserProgId = userProgs[0].id;
                            state.browsingFavorites = false;
                        } else {
                            state.browsingFavorites = false;
                            state.progressionIndex = 0;
                        }
                    } else {
                        state.progressionIndex = favs[favIdx + 1];
                    }
                } else {
                    if (favIdx <= 0) {
                        state.browsingFavorites = false;
                        state.progressionIndex = total - 1;
                    } else {
                        state.progressionIndex = favs[favIdx - 1];
                    }
                }
            } else {
                // Built-in progressions
                if (direction === 'next') {
                    if (state.progressionIndex >= total - 1) {
                        // Wrap: go to favs, then user, then built-in start
                        if (favs.length > 0) {
                            state.browsingFavorites = true;
                            state.progressionIndex = favs[0];
                        } else if (userProgs.length > 0) {
                            state._selectedUserProgId = userProgs[0].id;
                        } else {
                            state.progressionIndex = 0;
                        }
                    } else {
                        state.progressionIndex++;
                    }
                } else {
                    if (state.progressionIndex <= 0) {
                        // Wrap backwards: user progs, then favs, then end of built-in
                        if (userProgs.length > 0) {
                            state._selectedUserProgId = userProgs[userProgs.length - 1].id;
                        } else if (favs.length > 0) {
                            state.browsingFavorites = true;
                            state.progressionIndex = favs[favs.length - 1];
                        } else {
                            state.progressionIndex = total - 1;
                        }
                    } else {
                        state.progressionIndex--;
                    }
                }
            }

            state.activeScaleChord = null;
            updateFavButton();
            updateTypeDropdown();
            renderProgressionChords();
            updateDisplay();
        }

        const progPrev = document.getElementById('prog-prev');
        const progNext = document.getElementById('prog-next');
        if (progPrev) {
            progPrev.addEventListener('click', () => navigateProgression('prev'));
        }
        if (progNext) {
            progNext.addEventListener('click', () => navigateProgression('next'));
        }

        // Prog mode favorite toggle button
        const progFav = document.getElementById('prog-fav');
        if (progFav) {
            progFav.addEventListener('click', () => {
                const key = getProgressionKey(state.progressionIndex);
                if (!key) return;
                const pos = state.favoriteProgressions.indexOf(key);
                if (pos >= 0) {
                    state.favoriteProgressions.splice(pos, 1);
                } else {
                    state.favoriteProgressions.push(key);
                }
                saveFavorites();
                updateFavButton();
                updateTypeDropdown();
            });
        }

        // Prog sub-mode radios
        const progSubModeRadios = document.querySelectorAll('input[name="prog-submode"]');
        progSubModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.progSubMode = e.target.value;
                state.builderRows = [];
                state.builderDescription = '';
                state.editingProgressionId = null;
                renderProgSubModeUI();
            });
        });

        // Builder: Add Row
        const addRowBtn = document.getElementById('prog-builder-add-row');
        if (addRowBtn) {
            addRowBtn.addEventListener('click', () => {
                state.builderRows.push({ numeral: 'I', quality: '' });
                renderBuilderRows();
            });
        }

        // Builder: Add from Chord List
        const fromListBtn = document.getElementById('prog-builder-from-list');
        if (fromListBtn) {
            fromListBtn.addEventListener('click', addFromChordList);
        }

        // Builder: Save
        const saveBtn = document.getElementById('prog-builder-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveProgression);
        }

        // Builder: Delete
        const delBtn = document.getElementById('prog-builder-delete');
        if (delBtn) {
            delBtn.addEventListener('click', deleteProgression);
        }

        // Builder: Description input
        const descInput = document.getElementById('prog-builder-description');
        if (descInput) {
            descInput.addEventListener('input', (e) => {
                state.builderDescription = e.target.value;
            });
        }

        // Edit selector
        const editSelect = document.getElementById('prog-edit-select');
        if (editSelect) {
            editSelect.addEventListener('change', (e) => {
                const id = parseInt(e.target.value);
                if (id) loadProgressionIntoBuilder(id);
            });
        }

        // Add chord button (from dropdowns)
        const addChordBtn = document.getElementById('add-chord-btn');
        if (addChordBtn) {
            addChordBtn.addEventListener('click', () => {
                if ((state.mode === 'scale' || state.mode === 'modes' || state.mode === 'f.scale' || state.mode === 'prog') && state.activeScaleChord) {
                    addChordToList(state.activeScaleChord.root, state.activeScaleChord.type);
                } else if (state.mode === 'f.scale') {
                    return; // No active scale chord in f.scale — do nothing
                } else {
                    addChordToList(state.root, state.chordType);
                }
            });
        }

        // Clear chord list button
        const clearListBtn = document.getElementById('clear-list-btn');
        if (clearListBtn) {
            clearListBtn.addEventListener('click', clearChordList);
        }

        // Find mode buttons
        const findAddBtn = document.getElementById('find-add-btn');
        if (findAddBtn) {
            findAddBtn.addEventListener('click', addFindResultToChordList);
        }

        const findClearBtn = document.getElementById('find-clear-btn');
        if (findClearBtn) {
            findClearBtn.addEventListener('click', clearFindMarkers);
        }

        // Interval filter checkboxes
        const intervalChecks = document.querySelectorAll('.interval-check input[type="checkbox"]');
        intervalChecks.forEach(checkbox => {
            const label = checkbox.closest('.interval-check');
            const interval = label.dataset.interval;

            // Set initial checked class
            if (checkbox.checked) {
                label.classList.add('checked');
            }

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    state.intervalFilter.add(interval);
                    label.classList.add('checked');
                } else {
                    state.intervalFilter.delete(interval);
                    label.classList.remove('checked');
                }
                updateDisplay();
            });
        });

        // Interval filter: Select All
        const intervalSelectAll = document.getElementById('interval-select-all');
        if (intervalSelectAll) {
            intervalSelectAll.addEventListener('click', () => {
                const allIntervals = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
                state.intervalFilter = new Set(allIntervals);
                document.querySelectorAll('.interval-check').forEach(label => {
                    label.querySelector('input').checked = true;
                    label.classList.add('checked');
                });
                updateDisplay();
            });
        }

        // Interval filter: Deselect All
        const intervalDeselectAll = document.getElementById('interval-deselect-all');
        if (intervalDeselectAll) {
            intervalDeselectAll.addEventListener('click', () => {
                state.intervalFilter.clear();
                document.querySelectorAll('.interval-check').forEach(label => {
                    label.querySelector('input').checked = false;
                    label.classList.remove('checked');
                });
                updateDisplay();
            });
        }

    }

    /**
     * Initialize the application
     */
    function init() {
        // Load persisted data
        loadChordList();
        loadFavorites();
        loadUserProgressions();

        // Initialize fretboard
        const container = document.getElementById('fretboard-panel');
        if (container) {
            state.fretboard = createFretboard(container, {
                tuning: MusicTheory.STANDARD_TUNING,
                frets: 15
            });
        }

        // Initialize UI
        updateTypeDropdown();
        renderChordList();
        renderScaleChords();
        initEventListeners();

        // Color-code interval filter checkboxes
        document.querySelectorAll('.interval-check').forEach(label => {
            const interval = label.dataset.interval;
            const colors = MusicTheory.getIntervalColor(interval);
            label.style.setProperty('--interval-color', colors.border);
            label.style.setProperty('--interval-fill', colors.fill);
        });

        // Set initial mode-dependent UI states
        const addChordBtn = document.getElementById('add-chord-btn');
        if (addChordBtn) {
            addChordBtn.style.display = (state.mode === 'chord' || state.mode === 'scale' || state.mode === 'modes' || state.mode === 'f.scale' || state.mode === 'prog') ? 'flex' : 'none';
        }

        // Hide type selector in interval/find mode
        const typeGroup = document.querySelector('.control-group:has(#type-select)');
        if (typeGroup) {
            typeGroup.style.display = (state.mode === 'interval' || isFindMode(state.mode)) ? 'none' : 'block';
        }

        // Apply rainbow border on root-note select for applicable modes
        const rootSelect = document.getElementById('root-note');
        if (rootSelect) {
            const rainbowModes = ['scale', 'interval', 'modes', 'prog'];
            rootSelect.classList.toggle('rainbow-select', rainbowModes.includes(state.mode));
        }

        // Initial display
        updateDisplay();

        // Handle resize
        window.addEventListener('resize', () => {
            container.innerHTML = '';
            state.fretboard = createFretboard(container, {
                tuning: MusicTheory.STANDARD_TUNING,
                frets: 15
            });
            if (isFindMode(state.mode)) {
                registerFindClickHandler();
            }
            updateDisplay();
        });
    }

    // Export for external access
    window.FretboardApp = {
        init,
        getState: () => ({ ...state }),
        addChordToList,
        clearChordList
    };

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();
