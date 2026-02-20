/**
 * Music Theory Module
 * Core data structures and functions for scales, chords, and intervals
 */

// Chromatic scale - 12 semitones indexed 0-11
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Flat equivalents for enharmonic spelling
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Musical alphabet and their semitone positions (for degree-based spelling)
const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

// Keys that prefer flats
const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];

// Color palette for interval markers (indexed by semitone distance 0-11)
// Fill colors - vibrant primary and conventional colors
const INTERVAL_COLORS = [
    '#FF4444',  // 0 - Root (1) - Red
    '#FF8C00',  // 1 - Minor 2nd (b2) - Dark Orange
    '#FFD700',  // 2 - Major 2nd (2) - Gold
    '#90EE90',  // 3 - Minor 3rd (b3) - Light Green
    '#32CD32',  // 4 - Major 3rd (3) - Lime Green
    '#00CED1',  // 5 - Perfect 4th (4) - Dark Turquoise
    '#1E90FF',  // 6 - Tritone (b5) - Dodger Blue
    '#4169E1',  // 7 - Perfect 5th (5) - Royal Blue
    '#9370DB',  // 8 - Minor 6th/Aug 5th (b6/#5) - Medium Purple
    '#BA55D3',  // 9 - Major 6th (6) - Medium Orchid
    '#FF69B4',  // 10 - Minor 7th (b7) - Hot Pink
    '#FF1493'   // 11 - Major 7th (7) - Deep Pink
];

// Border colors - vibrant and saturated for high contrast
const INTERVAL_BORDER_COLORS = [
    '#FF0000',  // 0  - Root (1)  - Red
    '#AA7733',  // 1  - m2 (b2)   - Dark Amber     (2nds dark)
    '#EEBB00',  // 2  - M2 (2)    - Bright Gold     (2nds bright)
    '#007744',  // 3  - m3 (b3)   - Dark Teal       (3rds dark)
    '#44CC66',  // 4  - M3 (3)    - Bright Green    (3rds bright)
    '#2299DD',  // 5  - P4 (4)    - Sky Blue        (perfects light)
    '#EE7700',  // 6  - TT (b5)   - Orange          (tritone unique)
    '#0055BB',  // 7  - P5 (5)    - Royal Blue      (perfects deep)
    '#6644AA',  // 8  - m6 (b6)   - Dark Purple     (6ths dark)
    '#BB77FF',  // 9  - M6 (6)    - Bright Lavender (6ths bright)
    '#AA2255',  // 10 - m7 (b7)   - Burgundy        (7ths dark)
    '#FF66AA'   // 11 - M7 (7)    - Bright Pink     (7ths bright)
];

// Interval definitions - semitone distance from root
const INTERVALS = {
    '1': 0,    // root/unison
    'b2': 1,   // minor 2nd
    '2': 2,    // major 2nd
    'b3': 3,   // minor 3rd
    '3': 4,    // major 3rd
    '4': 5,    // perfect 4th
    'b5': 6,   // diminished 5th / tritone
    '5': 7,    // perfect 5th
    '#5': 8,   // augmented 5th
    'b6': 8,   // minor 6th (enharmonic with #5)
    '6': 9,    // major 6th
    'bb7': 9,  // diminished 7th (enharmonic with 6)
    'b7': 10,  // minor 7th
    '7': 11    // major 7th
};

// Scale formulas using interval names
const SCALES = {
    'major': {
        name: 'Major',
        intervals: ['1', '2', '3', '4', '5', '6', '7']
    },
    'natural_minor': {
        name: 'Natural Minor',
        intervals: ['1', '2', 'b3', '4', '5', 'b6', 'b7']
    },
    'harmonic_minor': {
        name: 'Harmonic Minor',
        intervals: ['1', '2', 'b3', '4', '5', 'b6', '7']
    },
    'melodic_minor': {
        name: 'Melodic Minor',
        intervals: ['1', '2', 'b3', '4', '5', '6', '7']
    },
    'pentatonic_major': {
        name: 'Major Pentatonic',
        intervals: ['1', '2', '3', '5', '6']
    },
    'pentatonic_minor': {
        name: 'Minor Pentatonic',
        intervals: ['1', 'b3', '4', '5', 'b7']
    },
    'blues': {
        name: 'Blues',
        intervals: ['1', 'b3', '4', 'b5', '5', 'b7']
    },
    'dorian': {
        name: 'Dorian',
        intervals: ['1', '2', 'b3', '4', '5', '6', 'b7']
    },
    'phrygian': {
        name: 'Phrygian',
        intervals: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7']
    },
    'lydian': {
        name: 'Lydian',
        intervals: ['1', '2', '3', '#4', '5', '6', '7']
    },
    'mixolydian': {
        name: 'Mixolydian',
        intervals: ['1', '2', '3', '4', '5', '6', 'b7']
    },
    'locrian': {
        name: 'Locrian',
        intervals: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7']
    }
};

// Add #4 interval for Lydian mode
INTERVALS['#4'] = 6;

// Chord formulas using interval names
const CHORD_TYPES = {
    'maj': {
        name: 'Major',
        symbol: '',
        intervals: ['1', '3', '5']
    },
    'min': {
        name: 'Minor',
        symbol: 'm',
        intervals: ['1', 'b3', '5']
    },
    'dim': {
        name: 'Diminished',
        symbol: 'dim',
        intervals: ['1', 'b3', 'b5']
    },
    'aug': {
        name: 'Augmented',
        symbol: 'aug',
        intervals: ['1', '3', '#5']
    },
    'maj7': {
        name: 'Major 7th',
        symbol: 'maj7',
        intervals: ['1', '3', '5', '7']
    },
    'min7': {
        name: 'Minor 7th',
        symbol: 'm7',
        intervals: ['1', 'b3', '5', 'b7']
    },
    '7': {
        name: 'Dominant 7th',
        symbol: '7',
        intervals: ['1', '3', '5', 'b7']
    },
    'dim7': {
        name: 'Diminished 7th',
        symbol: 'dim7',
        intervals: ['1', 'b3', 'b5', 'bb7']
    },
    'min7b5': {
        name: 'Half-Diminished',
        symbol: 'm7b5',
        intervals: ['1', 'b3', 'b5', 'b7']
    },
    'sus2': {
        name: 'Suspended 2nd',
        symbol: 'sus2',
        intervals: ['1', '2', '5']
    },
    'sus4': {
        name: 'Suspended 4th',
        symbol: 'sus4',
        intervals: ['1', '4', '5']
    },
    'add9': {
        name: 'Add 9',
        symbol: 'add9',
        intervals: ['1', '3', '5', '2']
    },
    '6': {
        name: 'Major 6th',
        symbol: '6',
        intervals: ['1', '3', '5', '6']
    },
    'min6': {
        name: 'Minor 6th',
        symbol: 'm6',
        intervals: ['1', 'b3', '5', '6']
    }
};

// Mode definitions - maps each mode to its degree in the parent major scale
const MODES = {
    'ionian':     { name: 'Ionian',     degree: 1, scaleType: 'major' },
    'dorian':     { name: 'Dorian',     degree: 2, scaleType: 'dorian' },
    'phrygian':   { name: 'Phrygian',   degree: 3, scaleType: 'phrygian' },
    'lydian':     { name: 'Lydian',     degree: 4, scaleType: 'lydian' },
    'mixolydian': { name: 'Mixolydian', degree: 5, scaleType: 'mixolydian' },
    'aeolian':    { name: 'Aeolian',    degree: 6, scaleType: 'natural_minor' },
    'locrian':    { name: 'Locrian',    degree: 7, scaleType: 'locrian' }
};

// Standard guitar tuning (low E to high E, strings 6 to 1)
const STANDARD_TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];

// Open string notes as semitone indices (E=4, A=9, D=2, G=7, B=11, E=4)
const STRING_ROOTS = [4, 9, 2, 7, 11, 4];

// MIDI note numbers for open strings (E2=40, A2=45, D3=50, G3=55, B3=59, E4=64)
const STRING_MIDI_BASES = [40, 45, 50, 55, 59, 64];

// CAGED chord shapes - positions relative to root note
// Each shape has a rootString (which string the root note is on, 1-6 where 1=high E)
// and positions array with { string (1-6), offset (fret distance from root), interval }
const CAGED_SHAPES = {
    'C': {
        rootString: 5,
        positions: [
            { string: 5, offset: 0, interval: '1' },    // Root on A string
            { string: 4, offset: -1, interval: '3' },   // Third on D string
            { string: 3, offset: -3, interval: '5' },   // Fifth on G string
            { string: 2, offset: -3, interval: '7' },   // Seventh on B string
            { string: 2, offset: -2, interval: '1' },   // Root on B string
            { string: 1, offset: -3, interval: '3' }    // Third on high E string
        ]
    },
    'A': {
        rootString: 5,
        positions: [
            { string: 5, offset: 0, interval: '1' },   // Root on A string
            { string: 4, offset: 2, interval: '5' },   // Fifth on D string
            { string: 3, offset: 1, interval: '7' },   // Seventh on G string
            { string: 3, offset: 2, interval: '1' },   // Root on G string
            { string: 2, offset: 2, interval: '3' },   // Third on B string
            { string: 1, offset: 0, interval: '5' }    // Fifth on high E string
        ]
    },
    'G': {
        rootString: 6,
        positions: [
            { string: 6, offset: 0, interval: '1' },    // Root on low E string
            { string: 5, offset: -1, interval: '3' },   // Third on A string
            { string: 4, offset: -3, interval: '5' },   // Fifth on D string
            { string: 3, offset: -3, interval: '1' },   // Root on G string
            { string: 2, offset: -3, interval: '3' },   // Third on B string
            { string: 1, offset: -1, interval: '7' },   // Seventh on high E string
            { string: 1, offset: 0, interval: '1' }     // Root on high E string
        ]
    },
    'E': {
        rootString: 6,
        positions: [
            { string: 6, offset: 0, interval: '1' },   // Root on low E string
            { string: 5, offset: 2, interval: '5' },   // Fifth on A string
            { string: 4, offset: 1, interval: '7' },   // Seventh on D string
            { string: 4, offset: 2, interval: '1' },   // Root on D string
            { string: 3, offset: 1, interval: '3' },   // Third on G string
            { string: 2, offset: 0, interval: '5' },   // Fifth on B string
            { string: 1, offset: 0, interval: '1' }    // Root on high E string
        ]
    },
    'D': {
        rootString: 4,
        positions: [
            { string: 4, offset: 0, interval: '1' },   // Root on D string
            { string: 3, offset: 2, interval: '5' },   // Fifth on G string
            { string: 2, offset: 2, interval: '7' },   // Seventh on B string
            { string: 2, offset: 3, interval: '1' },   // Root on B string
            { string: 1, offset: 2, interval: '3' }    // Third on high E string
        ]
    }
};

/**
 * Get semitone index of a note
 * @param {string} note - Note name (e.g., 'C', 'C#', 'Db')
 * @returns {number} Semitone index (0-11)
 */
function getNoteIndex(note) {
    // Fast path: standard sharp names
    let index = CHROMATIC_NOTES.indexOf(note);
    if (index !== -1) return index;

    // Fast path: standard flat names
    index = FLAT_NOTES.indexOf(note);
    if (index !== -1) return index;

    // General parser for double accidentals and enharmonic spellings
    // (Fb, Cb, E#, B#, Bbb, Dbb, F##, etc.)
    const letter = note[0];
    const letterIdx = NOTE_LETTERS.indexOf(letter);
    if (letterIdx === -1) return 0;
    let semitone = LETTER_SEMITONES[letterIdx];
    for (let i = 1; i < note.length; i++) {
        if (note[i] === '#') semitone++;
        else if (note[i] === 'b') semitone--;
    }
    return ((semitone % 12) + 12) % 12;
}

/**
 * Get note name from semitone index
 * @param {number} index - Semitone index (0-11)
 * @param {boolean} useFlats - Whether to use flat notation
 * @returns {string} Note name
 */
function getNoteName(index, useFlats = false) {
    const normalizedIndex = ((index % 12) + 12) % 12;
    return useFlats ? FLAT_NOTES[normalizedIndex] : CHROMATIC_NOTES[normalizedIndex];
}

/**
 * Determine if a key should use flat notation
 * @param {string} root - Root note
 * @returns {boolean}
 */
function shouldUseFlats(root) {
    return FLAT_KEYS.includes(root) || root.includes('b');
}

/**
 * Check if a chromatic index is an accidental (has both sharp and flat names)
 * @param {number} index - Chromatic note index
 * @returns {boolean}
 */
function isAccidentalNote(index) {
    const normalizedIndex = ((index % 12) + 12) % 12;
    return CHROMATIC_NOTES[normalizedIndex] !== FLAT_NOTES[normalizedIndex];
}

/**
 * Spell a note correctly for a given scale/chord degree letter
 * @param {number} noteIndex - Semitone index (0-11)
 * @param {string} degreeLetter - Expected letter name (e.g., 'E' for 3rd degree of C)
 * @returns {string} Correctly spelled note (e.g., 'Eb', 'F#', 'G')
 */
function spellNoteForDegree(noteIndex, degreeLetter) {
    const naturalSemitone = LETTER_SEMITONES[NOTE_LETTERS.indexOf(degreeLetter)];
    const diff = ((noteIndex - naturalSemitone) + 12) % 12;
    if (diff === 0) return degreeLetter;
    if (diff === 1) return degreeLetter + '#';
    if (diff === 11) return degreeLetter + 'b';
    if (diff === 2) return degreeLetter + '##';
    if (diff === 10) return degreeLetter + 'bb';
    // Fallback for unusual intervals
    return getNoteName(noteIndex, diff > 6);
}

/**
 * Extract numeric degree from an interval string
 * @param {string} interval - Interval name (e.g., 'b3', '#4', '5')
 * @returns {number} Degree number
 */
function getDegreeNumber(interval) {
    return parseInt(interval.replace(/[b#]/g, ''));
}

/**
 * Get note at a specific fret position
 * @param {number} stringIndex - String index (0-5, 0 = low E)
 * @param {number} fret - Fret number (0 = open)
 * @returns {number} Semitone index of the note
 */
function getNoteAt(stringIndex, fret) {
    return (STRING_ROOTS[stringIndex] + fret) % 12;
}

/**
 * Get the octave number at a specific fret position
 * @param {number} stringIndex - String index (0-5, 0 = low E)
 * @param {number} fret - Fret number (0 = open)
 * @returns {number} Octave number (e.g., 2 for low E open, 4 for high E open)
 */
function getOctaveAt(stringIndex, fret) {
    return Math.floor((STRING_MIDI_BASES[stringIndex] + fret) / 12) - 1;
}

/**
 * Build a scale from root and type
 * @param {string} root - Root note (e.g., 'C', 'G#')
 * @param {string} type - Scale type key (e.g., 'major', 'natural_minor')
 * @returns {Object} Scale instance
 */
function buildScale(root, type) {
    const scaleFormula = SCALES[type];
    if (!scaleFormula) {
        throw new Error(`Unknown scale type: ${type}`);
    }

    const rootIndex = getNoteIndex(root);
    const useFlats = shouldUseFlats(root);
    const rootLetterIdx = NOTE_LETTERS.indexOf(root[0]);

    const notes = [];
    const degrees = [];
    const noteToDegree = {};
    const noteSpelling = {};

    for (const interval of scaleFormula.intervals) {
        const semitones = INTERVALS[interval];
        const noteIndex = (rootIndex + semitones) % 12;
        const degreeNum = getDegreeNumber(interval);
        const degreeLetter = NOTE_LETTERS[(rootLetterIdx + degreeNum - 1) % 7];
        const noteName = spellNoteForDegree(noteIndex, degreeLetter);

        notes.push(noteName);
        degrees.push(interval);
        noteToDegree[noteIndex] = interval;
        noteSpelling[noteIndex] = noteName;
    }

    return {
        root,
        type,
        name: scaleFormula.name,
        notes,
        degrees,
        noteToDegree,
        noteSpelling,
        useFlats
    };
}

/**
 * Build a chord from root and type
 * @param {string} root - Root note (e.g., 'C', 'Am')
 * @param {string} type - Chord type key (e.g., 'maj', 'min7')
 * @returns {Object} Chord instance
 */
function buildChord(root, type) {
    const chordFormula = CHORD_TYPES[type];
    if (!chordFormula) {
        throw new Error(`Unknown chord type: ${type}`);
    }

    const rootIndex = getNoteIndex(root);
    const useFlats = shouldUseFlats(root);
    const rootLetterIdx = NOTE_LETTERS.indexOf(root[0]);

    const notes = [];
    const intervals = [];
    const noteToInterval = {};
    const noteSpelling = {};

    for (const interval of chordFormula.intervals) {
        const semitones = INTERVALS[interval];
        const noteIndex = (rootIndex + semitones) % 12;
        const degreeNum = getDegreeNumber(interval);
        const degreeLetter = NOTE_LETTERS[(rootLetterIdx + degreeNum - 1) % 7];
        const noteName = spellNoteForDegree(noteIndex, degreeLetter);

        notes.push(noteName);
        intervals.push(interval);
        noteToInterval[noteIndex] = interval;
        noteSpelling[noteIndex] = noteName;
    }

    return {
        root,
        type,
        name: chordFormula.name,
        symbol: root + chordFormula.symbol,
        notes,
        intervals,
        noteToInterval,
        noteSpelling,
        useFlats
    };
}

/**
 * Get all fretboard positions for a set of notes
 * @param {Object} noteToLabel - Map of note index to label (degree or interval)
 * @param {number} frets - Number of frets (default 15)
 * @param {string} root - Root note for highlighting
 * @returns {Array} Array of fretboard positions
 */
function getNotesOnFretboard(noteToLabel, frets = 15, root = null) {
    const positions = [];
    const rootIndex = root ? getNoteIndex(root) : null;

    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
        for (let fret = 0; fret <= frets; fret++) {
            const noteIndex = getNoteAt(stringIndex, fret);

            if (noteToLabel.hasOwnProperty(noteIndex)) {
                positions.push({
                    string: 6 - stringIndex, // Convert to 1-6 (1 = high E)
                    fret,
                    noteIndex,
                    label: noteToLabel[noteIndex],
                    isRoot: noteIndex === rootIndex
                });
            }
        }
    }

    return positions;
}

/**
 * Lighten a hex color by mixing it with white
 * @param {string} hex - Hex color string (e.g., '#FF0000')
 * @param {number} amount - Mix amount (0 = original, 1 = white). Default 0.82 for soft pastels.
 * @returns {string} Lightened hex color
 */
function lightenColor(hex, amount = 0.82) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.round(r + (255 - r) * amount);
    const lg = Math.round(g + (255 - g) * amount);
    const lb = Math.round(b + (255 - b) * amount);
    return '#' + [lr, lg, lb].map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Get colors for an interval based on semitone distance
 * @param {string} interval - Interval name (e.g., '1', '3', 'b3', '5')
 * @returns {Object} Object with fill, border, and text colors
 */
function getIntervalColor(interval) {
    // Get semitone distance for this interval
    const semitones = INTERVALS[interval];

    // Root is special: black fill with white text
    if (interval === '1') {
        return {
            fill: '#000',
            border: INTERVAL_BORDER_COLORS[0],
            text: '#fff'
        };
    }

    // All other intervals: light tinted fill matching border color
    if (semitones !== undefined && semitones >= 0 && semitones < INTERVAL_BORDER_COLORS.length) {
        return {
            fill: lightenColor(INTERVAL_BORDER_COLORS[semitones]),
            border: INTERVAL_BORDER_COLORS[semitones],
            text: '#000'
        };
    }

    // Fallback
    return {
        fill: '#ddd',
        border: INTERVAL_BORDER_COLORS[0],
        text: '#000'
    };
}

/**
 * Build diatonic chords for a scale
 * @param {string} root - Root note
 * @param {string} scaleType - Scale type (currently supports 'major' and 'natural_minor')
 * @param {boolean} sevenths - Whether to include 7th chords
 * @returns {Array} Array of chord objects with degree information
 */
function buildScaleChords(root, scaleType, sevenths = false) {
    const scale = buildScale(root, scaleType);
    const chords = [];

    // Diatonic chord qualities for major scale
    const majorTriadQualities = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
    const majorSeventhQualities = ['maj7', 'min7', 'min7', 'maj7', '7', 'min7', 'min7b5'];

    // Diatonic chord qualities for natural minor scale
    const minorTriadQualities = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'];
    const minorSeventhQualities = ['min7', 'min7b5', 'maj7', 'min7', 'min7', 'maj7', '7'];

    // Roman numeral labels
    const majorNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const minorNumerals = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

    let qualities, numerals;

    if (scaleType === 'major') {
        qualities = sevenths ? majorSeventhQualities : majorTriadQualities;
        numerals = majorNumerals;
    } else if (scaleType === 'natural_minor') {
        qualities = sevenths ? minorSeventhQualities : minorTriadQualities;
        numerals = minorNumerals;
    } else {
        // Default to major for other scale types
        qualities = sevenths ? majorSeventhQualities : majorTriadQualities;
        numerals = majorNumerals;
    }

    // Update numerals for 7th chords
    if (sevenths && scaleType === 'major') {
        numerals = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'];
    } else if (sevenths && scaleType === 'natural_minor') {
        numerals = ['i7', 'iiø7', 'IIImaj7', 'iv7', 'v7', 'VImaj7', 'VII7'];
    }

    for (let i = 0; i < scale.notes.length && i < 7; i++) {
        const chordRoot = scale.notes[i];
        const quality = qualities[i];
        const chord = buildChord(chordRoot, quality);

        chords.push({
            ...chord,
            degree: i + 1,
            numeral: numerals[i],
            scaleSource: {
                scale: `${root} ${scale.name}`,
                degree: numerals[i]
            }
        });
    }

    return chords;
}

/**
 * Get the mode root note given a parent key and mode name
 * @param {string} parentRoot - Parent major key (e.g., 'C')
 * @param {string} modeName - Mode name key (e.g., 'dorian')
 * @returns {string} The root note of the mode
 */
function getModeRoot(parentRoot, modeName) {
    const mode = MODES[modeName];
    if (!mode) {
        throw new Error(`Unknown mode: ${modeName}`);
    }
    const scale = buildScale(parentRoot, 'major');
    return scale.notes[mode.degree - 1];
}

/**
 * Get the relative scale (major <-> natural minor)
 * @param {string} root - Root note
 * @param {string} scaleType - Scale type ('major' or 'natural_minor')
 * @returns {Object|null} Object with root and scaleType, or null if not supported
 */
function getRelativeScale(root, scaleType) {
    if (scaleType !== 'major' && scaleType !== 'natural_minor') {
        return null;
    }

    const rootIndex = getNoteIndex(root);
    const rootLetterIdx = NOTE_LETTERS.indexOf(root[0]);

    let relativeRootIndex, relativeScaleType, degreeOffset;

    if (scaleType === 'major') {
        // Relative minor: 6th degree (letter offset 5)
        relativeRootIndex = (rootIndex + 9) % 12;
        relativeScaleType = 'natural_minor';
        degreeOffset = 5;
    } else {
        // Relative major: 3rd degree (letter offset 2)
        relativeRootIndex = (rootIndex + 3) % 12;
        relativeScaleType = 'major';
        degreeOffset = 2;
    }

    const degreeLetter = NOTE_LETTERS[(rootLetterIdx + degreeOffset) % 7];

    return {
        root: spellNoteForDegree(relativeRootIndex, degreeLetter),
        scaleType: relativeScaleType
    };
}

/**
 * Get voicing priority for an interval in CAGED conflict resolution
 * Higher priority notes are kept when two notes land on the same string
 * or when the voicing must be trimmed to fit a 4-fret span.
 * @param {string} interval - Interval name (e.g., '1', 'b3', '7')
 * @param {boolean} isOnRootString - Whether this note is on the shape's root string
 * @returns {number} Priority score (higher = more important to keep)
 */
function getVoicingPriority(interval, isOnRootString) {
    if (interval === '1' && isOnRootString) return 10; // Root on root string — CAGED anchor
    if (interval === '7' || interval === 'b7' || interval === 'bb7') return 8; // 7th family
    if (interval === '3' || interval === 'b3') return 7; // 3rd family
    if (interval === '2' || interval === '4') return 6;  // Sus intervals
    if (interval === '5' || interval === 'b5' || interval === '#5') return 5; // 5th family
    if (interval === '1') return 4; // Doubled root
    return 3; // Anything else (6th, etc.)
}

/**
 * Get fretboard positions for a CAGED shape
 * @param {string} root - Root note (e.g., 'C', 'G#')
 * @param {string} shapeName - CAGED shape name ('C', 'A', 'G', 'E', 'D')
 * @param {string} chordType - Chord type key (default 'maj')
 * @returns {Array} Array of fretboard positions with { string, fret, noteIndex, label, isRoot }
 */
function getCagedPositions(root, shapeName, chordType = 'maj') {
    const shape = CAGED_SHAPES[shapeName];
    if (!shape) {
        throw new Error(`Unknown CAGED shape: ${shapeName}`);
    }

    // Build interval substitution map from major shape to target chord type
    const chord = CHORD_TYPES[chordType];
    const intervalMap = { '1': '1', '3': '3', '5': '5' };
    if (chord && chord.intervals.length >= 3) {
        intervalMap['3'] = chord.intervals[1]; // e.g. 'b3' for minor
        intervalMap['5'] = chord.intervals[2]; // e.g. 'b5' for dim
    }
    if (chord && chord.intervals.length >= 4) {
        intervalMap['7'] = chord.intervals[3]; // e.g. '7' for maj7, 'b7' for min7
    }

    const rootIndex = getNoteIndex(root);
    const positions = [];

    // Find the fret where the root note appears on the root string
    // Convert rootString (1-6 where 1=high E) to stringIndex (0-5 where 0=low E)
    const rootStringIndex = 6 - shape.rootString;
    const openStringNote = STRING_ROOTS[rootStringIndex];

    // Calculate root fret: how many frets up from open string to reach the root note
    let rootFret = (rootIndex - openStringNote + 12) % 12;

    // Apply offsets to get actual fret positions
    for (const pos of shape.positions) {
        if (pos.interval === '7' && !('7' in intervalMap)) continue;
        const newInterval = intervalMap[pos.interval] || pos.interval;
        const offsetAdjust = INTERVALS[newInterval] - INTERVALS[pos.interval];
        const fret = rootFret + pos.offset + offsetAdjust;

        // Skip positions outside the 0-15 fret range
        if (fret < 0 || fret > 15) {
            continue;
        }

        // Calculate note index at this position
        const stringIndex = 6 - pos.string;
        const noteIndex = getNoteAt(stringIndex, fret);

        const isOnRootString = pos.string === shape.rootString && pos.interval === '1';
        positions.push({
            string: pos.string,
            fret,
            noteIndex,
            label: newInterval,
            isRoot: pos.interval === '1',
            _isOnRootString: isOnRootString,
            _priority: getVoicingPriority(newInterval, isOnRootString)
        });
    }

    // Phase 1: One note per string — keep highest-priority note on each string
    const byString = {};
    for (const pos of positions) {
        if (!byString[pos.string] || pos._priority > byString[pos.string]._priority) {
            byString[pos.string] = pos;
        }
    }
    let filtered = Object.values(byString);

    // Phase 2: Max 4-fret span — find the best 4-fret window
    const frettedNotes = filtered.filter(p => p.fret > 0);
    if (frettedNotes.length > 0) {
        const minFretted = Math.min(...frettedNotes.map(p => p.fret));
        const maxFretted = Math.max(...frettedNotes.map(p => p.fret));

        if (maxFretted - minFretted > 3) {
            // Try every possible 4-fret window and pick the best one
            let bestWindow = null;
            let bestScore = -1;

            for (let windowStart = minFretted; windowStart <= maxFretted - 3; windowStart++) {
                const windowEnd = windowStart + 3;
                let score = 0;
                for (const p of filtered) {
                    // Open strings are always included (no finger needed)
                    if (p.fret === 0) continue;
                    if (p.fret >= windowStart && p.fret <= windowEnd) {
                        score += p._priority;
                        if (p._isOnRootString) score += 10;
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestWindow = { start: windowStart, end: windowEnd };
                }
            }

            // Drop fretted notes outside the best window
            filtered = filtered.filter(p =>
                p.fret === 0 || (p.fret >= bestWindow.start && p.fret <= bestWindow.end)
            );
        }
    }

    // Clean up internal fields before returning
    return filtered.map(({ _isOnRootString, _priority, ...rest }) => rest);
}

/**
 * Find all chords whose notes are a subset of the given note set
 * @param {Set<number>} noteSet - Set of semitone indices (0-11)
 * @returns {Array} Array of chord objects with root, type, symbol, notes
 */
function findChords(noteSet) {
    if (noteSet.size < 2) return [];

    const results = [];
    const chordTypeKeys = Object.keys(CHORD_TYPES);

    for (let rootIndex = 0; rootIndex < 12; rootIndex++) {
        for (const typeKey of chordTypeKeys) {
            const chordFormula = CHORD_TYPES[typeKey];
            // Compute chord's semitone set
            const chordNotes = chordFormula.intervals.map(
                interval => (rootIndex + INTERVALS[interval]) % 12
            );
            // Check if all selected notes are in this chord
            const chordNoteSet = new Set(chordNotes);
            const isSubset = [...noteSet].every(n => chordNoteSet.has(n));
            if (isSubset) {
                const rootName = getNoteName(rootIndex, FLAT_KEYS.includes(FLAT_NOTES[rootIndex]));
                // Use sharp or flat root depending on convention
                const root = CHROMATIC_NOTES[rootIndex].includes('#')
                    ? (FLAT_KEYS.includes(FLAT_NOTES[rootIndex]) ? FLAT_NOTES[rootIndex] : CHROMATIC_NOTES[rootIndex])
                    : CHROMATIC_NOTES[rootIndex];
                const chord = buildChord(root, typeKey);
                results.push(chord);
            }
        }
    }

    return results;
}

// Export for use in other modules
window.MusicTheory = {
    CHROMATIC_NOTES,
    FLAT_NOTES,
    INTERVALS,
    SCALES,
    CHORD_TYPES,
    STANDARD_TUNING,
    CAGED_SHAPES,
    MODES,
    getNoteIndex,
    getNoteName,
    getNoteAt,
    buildScale,
    buildChord,
    getNotesOnFretboard,
    getIntervalColor,
    buildScaleChords,
    getRelativeScale,
    getModeRoot,
    getCagedPositions,
    shouldUseFlats,
    isAccidentalNote,
    lightenColor,
    spellNoteForDegree,
    getDegreeNumber,
    findChords,
    getOctaveAt
};
