/**
 * Fretboard App - UI State & Event Handling
 * Connects music theory module with fretboard visualization
 */

(function() {
    'use strict';

    // Application state
    const state = {
        mode: 'scale',          // 'scale' or 'chord'
        root: 'C',
        scaleType: 'major',
        chordType: 'maj',
        chordList: [],          // Array of { root, type, symbol }
        selectedChordIndex: -1, // Index in chord list, -1 = none selected
        showSevenths: false,    // Toggle for scale chord builder
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
     * Display a scale on the fretboard
     * @param {Object} scale - Scale instance from buildScale()
     */
    function displayScale(scale) {
        if (!state.fretboard) return;

        state.fretboard.clearMarkers();

        const positions = MusicTheory.getNotesOnFretboard(
            scale.noteToDegree,
            15,
            scale.root
        );

        for (const pos of positions) {
            const color = MusicTheory.getIntervalColor(pos.label);
            state.fretboard.setMarker(pos.string, pos.fret, {
                color,
                text: pos.label,
                textColor: pos.label === '1' ? '#fff' : '#fff'
            });
        }

        updateInfoPanel({
            title: `${scale.root} ${scale.name}`,
            notes: scale.notes,
            intervals: scale.degrees
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
            const color = MusicTheory.getIntervalColor(pos.label);
            state.fretboard.setMarker(pos.string, pos.fret, {
                color,
                text: pos.label,
                textColor: '#fff'
            });
        }

        updateInfoPanel({
            title: chord.symbol,
            notes: chord.notes,
            intervals: chord.intervals
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
            const chord = MusicTheory.buildChord(item.root, item.type);
            displayChord(chord);
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

        const chords = MusicTheory.buildScaleChords(state.root, state.scaleType, state.showSevenths);

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
     */
    function updateTypeDropdown() {
        const dropdown = document.getElementById('type-select');
        if (!dropdown) return;

        dropdown.innerHTML = '';

        if (state.mode === 'scale') {
            for (const [key, scale] of Object.entries(MusicTheory.SCALES)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = scale.name;
                if (key === state.scaleType) {
                    option.selected = true;
                }
                dropdown.appendChild(option);
            }
        } else {
            for (const [key, chord] of Object.entries(MusicTheory.CHORD_TYPES)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = chord.name;
                if (key === state.chordType) {
                    option.selected = true;
                }
                dropdown.appendChild(option);
            }
        }
    }

    /**
     * Handle mode change (scale/chord toggle)
     * @param {string} mode - 'scale' or 'chord'
     */
    function setMode(mode) {
        state.mode = mode;
        state.selectedChordIndex = -1; // Deselect list item when changing mode
        updateTypeDropdown();
        renderChordList();

        // Update root label based on mode
        const rootLabel = document.getElementById('root-label');
        if (rootLabel) {
            rootLabel.textContent = mode === 'scale' ? 'Scale Root' : 'Chord Root';
        }

        // Show/hide scale chord builder
        const builderSection = document.getElementById('scale-chord-builder');
        if (builderSection) {
            builderSection.style.display = mode === 'scale' ? 'block' : 'none';
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
                    renderScaleChords();
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
