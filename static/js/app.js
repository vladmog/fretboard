/**
 * Fretboard App - UI State & Event Handling
 * Connects music theory module with fretboard visualization
 */

(function() {
    'use strict';

    // Application state
    const state = {
        mode: 'scale',          // 'scale', 'chord', 'interval', 'caged', or 'modes'
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
        soundEnabled: true,     // Toggle for chord list sound playback
        fretboard: null         // Fretboard API instance
    };

    // Storage key for chord list persistence
    const STORAGE_KEY = 'fretboard-chord-list';

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

        for (const pos of positions) {
            const colors = MusicTheory.getIntervalColor(pos.label);
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: colors.fill,
                borderColor: colors.border,
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
            intervals: displayScale.degrees
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
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: colors.fill,
                borderColor: colors.border,
                text: getMarkerLabel(pos, chord.noteSpelling),
                textColor: colors.text
            });
        }

        // Apply current rotation to newly created markers
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

        updateInfoPanel({
            title: chord.symbol,
            notes: chord.notes,
            intervals: chord.intervals
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
            const colors = MusicTheory.getIntervalColor(pos.label);
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: colors.fill,
                borderColor: colors.border,
                text: getMarkerLabel(pos, noteSpelling),
                textColor: colors.text
            });
        }

        // Apply current rotation to newly created markers
        if (window.RotationToggle) {
            window.RotationToggle.applyCurrentRotation();
        }

        updateInfoPanel({
            title: `${root} Chromatic Intervals`,
            notes: allNotes,
            intervals: allIntervals
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
                    state.fretboard.setMarker(pos.string, pos.fret, {
                        color: pos.label === '1' ? colors.fill : MusicTheory.lightenColor(borderColor),
                        borderColor: borderColor,
                        text: getMarkerLabel(pos, chord.noteSpelling),
                        textColor: colors.text
                    });
                }
            }
        } else {
            const positions = MusicTheory.getCagedPositions(root, shapeName, state.chordType);

            for (const pos of positions) {
                const colors = MusicTheory.getIntervalColor(pos.label);
                state.fretboard.setMarker(pos.string, pos.fret, {
                    color: colors.fill,
                    borderColor: colors.border,
                    text: getMarkerLabel(pos, chord.noteSpelling),
                    textColor: colors.text
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
            intervals: chord.intervals
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

        for (const pos of positions) {
            const colors = MusicTheory.getIntervalColor(pos.label);
            state.fretboard.setMarker(pos.string, pos.fret, {
                color: colors.fill,
                borderColor: colors.border,
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
            intervals: scale.degrees
        });
    }

    /**
     * Update the info panel with current selection details
     * @param {Object} info - { title, notes, intervals }
     */
    function updateInfoPanel(info) {
        const titleEl = document.getElementById('info-title');
        const notesEl = document.getElementById('info-notes');
        const intervalsEl = document.getElementById('info-intervals');

        if (titleEl) titleEl.textContent = info.title;
        if (notesEl) notesEl.textContent = info.notes.join(' ');
        if (intervalsEl) intervalsEl.textContent = info.intervals.join(' ');
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
        } else if (state.mode === 'caged') {
            displayCaged(state.root, state.cagedShape);
        } else if (state.mode === 'modes') {
            displayMode(state.root, state.modeType);
        } else if (state.mode === 'interval') {
            displayIntervals(state.root);
        } else if (state.mode === 'scale') {
            const scale = MusicTheory.buildScale(state.root, state.scaleType);
            displayScale(scale);
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

        // Only show for supported scale types
        if (state.scaleType !== 'major' && state.scaleType !== 'natural_minor') {
            container.innerHTML = '<p class="scale-chords-note">Chord builder available for Major and Natural Minor scales</p>';
            return;
        }

        // Use relative scale if toggle is active
        let chordRoot = state.root;
        let chordScaleType = state.scaleType;

        if (state.showRelative) {
            const relativeInfo = MusicTheory.getRelativeScale(state.root, state.scaleType);
            if (relativeInfo) {
                chordRoot = relativeInfo.root;
                chordScaleType = relativeInfo.scaleType;
            }
        }

        const chords = MusicTheory.buildScaleChords(chordRoot, chordScaleType, state.showSevenths);

        container.innerHTML = '';

        const chordsRow = document.createElement('div');
        chordsRow.className = 'scale-chords-row';

        chords.forEach((chord) => {
            const btn = document.createElement('button');
            btn.className = 'scale-chord-btn';
            btn.innerHTML = `<span class="numeral">${chord.numeral}</span><span class="chord-name">${chord.symbol}</span>`;
            btn.addEventListener('click', () => {
                addChordToList(chord.root, chord.type);
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
        } else {
            // Organize chords into categories
            const chordCategories = {
                'Triads': ['maj', 'min', 'dim', 'aug'],
                'Sevenths': ['maj7', 'min7', 'dom7', 'dim7', 'min7b5', 'minmaj7', 'augmaj7'],
                'Extended': ['maj9', 'min9', 'dom9', 'maj11', 'min11', 'dom11', 'maj13', 'min13', 'dom13'],
                'Suspended': ['sus2', 'sus4', '7sus4'],
                'Added': ['add9', 'add11', '6', 'min6']
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
        state.mode = mode;
        state.selectedChordIndex = -1; // Deselect list item when changing mode
        updateTypeDropdown();
        renderChordList();

        // Show/hide type selector based on mode (hide for interval only)
        const typeGroup = document.querySelector('.control-group:has(#type-select)');
        if (typeGroup) {
            typeGroup.style.display = mode === 'interval' ? 'none' : 'block';
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
            } else {
                typeLabel.textContent = 'Chord Type';
            }
        }

        // Update root label based on mode
        const rootLabel = document.getElementById('root-label');
        if (rootLabel) {
            rootLabel.textContent = mode === 'modes' ? 'Key' : 'Root Note';
        }

        // Show/hide CAGED shape selector
        const cagedSelector = document.getElementById('caged-shape-selector');
        if (cagedSelector) {
            cagedSelector.style.display = mode === 'caged' ? 'block' : 'none';
        }

        // Show/hide scale chord builder (only in scale mode)
        const builderSection = document.getElementById('scale-chord-builder');
        if (builderSection) {
            builderSection.style.display = mode === 'scale' ? 'block' : 'none';
        }

        // Show/hide Add button based on mode
        // Scale mode: use scale chord buttons only
        // Chord mode: show Add button
        // Interval/CAGED mode: hide Add button
        const addChordBtn = document.getElementById('add-chord-btn');
        if (addChordBtn) {
            addChordBtn.style.display = (mode === 'chord') ? 'flex' : 'none';
        }

        if (mode === 'scale') {
            renderScaleChords();
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
                renderChordList();
                if (state.mode === 'scale') {
                    renderScaleChords();
                }
                updateDisplay();
            });
        }

        // Type selector (scale or chord type)
        const typeSelect = document.getElementById('type-select');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                if (state.mode === 'scale') {
                    state.scaleType = e.target.value;
                    // Reset relative toggle if switching to unsupported scale type
                    if (state.scaleType !== 'major' && state.scaleType !== 'natural_minor') {
                        state.showRelative = false;
                        const relativeToggle = document.getElementById('relative-toggle');
                        if (relativeToggle) {
                            relativeToggle.checked = false;
                            relativeToggle.closest('.toggle-label').classList.remove('checked');
                        }
                    }
                    renderScaleChords();
                } else if (state.mode === 'modes') {
                    state.modeType = e.target.value;
                } else {
                    state.chordType = e.target.value;
                }
                state.selectedChordIndex = -1;
                renderChordList();
                updateDisplay();
            });
        }

        // Triads/7ths toggle
        const seventhsToggle = document.getElementById('sevenths-toggle');
        if (seventhsToggle) {
            seventhsToggle.addEventListener('change', (e) => {
                state.showSevenths = e.target.checked;
                renderScaleChords();
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
                renderScaleChords();
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

        // Add chord button (from dropdowns)
        const addChordBtn = document.getElementById('add-chord-btn');
        if (addChordBtn) {
            addChordBtn.addEventListener('click', () => {
                addChordToList(state.root, state.chordType);
            });
        }

        // Clear chord list button
        const clearListBtn = document.getElementById('clear-list-btn');
        if (clearListBtn) {
            clearListBtn.addEventListener('click', clearChordList);
        }

    }

    /**
     * Initialize the application
     */
    function init() {
        // Load persisted chord list
        loadChordList();

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

        // Set initial mode-dependent UI states
        const addChordBtn = document.getElementById('add-chord-btn');
        if (addChordBtn) {
            addChordBtn.style.display = state.mode === 'chord' ? 'flex' : 'none';
        }

        // Hide type selector in interval mode only
        const typeGroup = document.querySelector('.control-group:has(#type-select)');
        if (typeGroup) {
            typeGroup.style.display = (state.mode === 'interval') ? 'none' : 'block';
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
