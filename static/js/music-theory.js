/**
 * Music Theory Module
 * Core data structures and functions for scales, chords, and intervals
 */

// Chromatic scale - 12 semitones indexed 0-11
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Flat equivalents for enharmonic spelling
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

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

// Border and text colors - darker versions for contrast
const INTERVAL_BORDER_COLORS = [
    '#CC0000',  // 0 - Root (1) - Dark Red
    '#CC6600',  // 1 - Minor 2nd (b2) - Dark Orange
    '#B8860B',  // 2 - Major 2nd (2) - Dark Goldenrod
    '#228B22',  // 3 - Minor 3rd (b3) - Forest Green
    '#006400',  // 4 - Major 3rd (3) - Dark Green
    '#008B8B',  // 5 - Perfect 4th (4) - Dark Cyan
    '#00008B',  // 6 - Tritone (b5) - Dark Blue
    '#191970',  // 7 - Perfect 5th (5) - Midnight Blue
    '#4B0082',  // 8 - Minor 6th/Aug 5th (b6/#5) - Indigo
    '#8B008B',  // 9 - Major 6th (6) - Dark Magenta
    '#C71585',  // 10 - Minor 7th (b7) - Medium Violet Red
    '#8B0A50'   // 11 - Major 7th (7) - Deep Magenta
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

// Standard guitar tuning (low E to high E, strings 6 to 1)
const STANDARD_TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];

// Open string notes as semitone indices (E=4, A=9, D=2, G=7, B=11, E=4)
const STRING_ROOTS = [4, 9, 2, 7, 11, 4];

/**
 * Get semitone index of a note
 * @param {string} note - Note name (e.g., 'C', 'C#', 'Db')
 * @returns {number} Semitone index (0-11)
 */
function getNoteIndex(note) {
    // Handle sharps
    let index = CHROMATIC_NOTES.indexOf(note);
    if (index !== -1) return index;

    // Handle flats
    index = FLAT_NOTES.indexOf(note);
    if (index !== -1) return index;

    return 0; // Default to C if not found
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
 * Get note at a specific fret position
 * @param {number} stringIndex - String index (0-5, 0 = low E)
 * @param {number} fret - Fret number (0 = open)
 * @returns {number} Semitone index of the note
 */
function getNoteAt(stringIndex, fret) {
    return (STRING_ROOTS[stringIndex] + fret) % 12;
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

    const notes = [];
    const degrees = [];
    const noteToDegree = {};

    for (const interval of scaleFormula.intervals) {
        const semitones = INTERVALS[interval];
        const noteIndex = (rootIndex + semitones) % 12;
        const noteName = getNoteName(noteIndex, useFlats);

        notes.push(noteName);
        degrees.push(interval);
        noteToDegree[noteIndex] = interval;
    }

    return {
        root,
        type,
        name: scaleFormula.name,
        notes,
        degrees,
        noteToDegree,
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

    const notes = [];
    const intervals = [];
    const noteToInterval = {};

    for (const interval of chordFormula.intervals) {
        const semitones = INTERVALS[interval];
        const noteIndex = (rootIndex + semitones) % 12;
        const noteName = getNoteName(noteIndex, useFlats);

        notes.push(noteName);
        intervals.push(interval);
        noteToInterval[noteIndex] = interval;
    }

    return {
        root,
        type,
        name: chordFormula.name,
        symbol: root + chordFormula.symbol,
        notes,
        intervals,
        noteToInterval,
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
 * Get colors for an interval based on semitone distance
 * @param {string} interval - Interval name (e.g., '1', '3', 'b3', '5')
 * @returns {Object} Object with fill and border colors
 */
function getIntervalColor(interval) {
    // Get semitone distance for this interval
    const semitones = INTERVALS[interval];

    // Return corresponding colors (0-11)
    if (semitones !== undefined && semitones >= 0 && semitones < INTERVAL_COLORS.length) {
        return {
            fill: INTERVAL_COLORS[semitones],
            border: INTERVAL_BORDER_COLORS[semitones]
        };
    }

    // Fallback to first color if interval not found
    return {
        fill: INTERVAL_COLORS[0],
        border: INTERVAL_BORDER_COLORS[0]
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

// Export for use in other modules
window.MusicTheory = {
    CHROMATIC_NOTES,
    FLAT_NOTES,
    INTERVALS,
    SCALES,
    CHORD_TYPES,
    STANDARD_TUNING,
    getNoteIndex,
    getNoteName,
    getNoteAt,
    buildScale,
    buildChord,
    getNotesOnFretboard,
    getIntervalColor,
    buildScaleChords,
    shouldUseFlats
};
