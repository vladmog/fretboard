/**
 * Chord Progressions Module
 * Data and parsing for Roman numeral chord progressions
 *
 * Data source: chord_progressions.md → static/data/progressions.json
 */

import * as MusicTheory from './music-theory.js';

// Progression data: 16 categories, ~162 progressions, loaded from
// static/data/progressions.json.
// Each category: { name, progressions: [{ numerals, description, chords }] }
// Top-level await: the module graph (and therefore app init) waits for the
// data, so consumers always see it fully populated. On failure the app still
// loads; prog mode is just empty.
async function loadProgressionData() {
    try {
        const res = await fetch(new URL('../../data/progressions.json', import.meta.url));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('Failed to load progression data:', e);
        return [];
    }
}

const PROGRESSION_CATEGORIES = await loadProgressionData();

// Major scale degree semitone offsets (1-indexed: degree 1=0, 2=2, 3=4, etc.)
const DEGREE_SEMITONES = [0, 0, 2, 4, 5, 7, 9, 11];

// Roman numeral patterns (longest first to avoid partial matches)
const UPPER_NUMERALS = [
    ['VII', 7], ['VI', 6], ['IV', 4], ['III', 3], ['II', 2], ['V', 5], ['I', 1]
];
const LOWER_NUMERALS = [
    ['vii', 7], ['vi', 6], ['iv', 4], ['iii', 3], ['ii', 2], ['v', 5], ['i', 1]
];

// Quality suffix → CHORD_TYPES key (order matters: longest match first)
const SUFFIX_MAP = [
    ['maj9', 'maj9'],
    ['maj7', 'maj7'],
    ['m7b5', 'min7b5'],
    ['add9', 'add9'],
    ['madd9', 'madd9'],
    ['7sus4', '7sus4'],
    ['sus2', 'sus2'],
    ['sus4', 'sus4'],
    ['m7', 'min7'],
    ['m9', 'min9'],
    ['\u00f87', 'min7b5'],  // ø7
    ['\u00b07', 'dim7'],     // °7
    ['\u00b0', 'dim'],       // °
    ['+', 'aug'],
    ['13', '13'],
    ['9', null],   // null = context-dependent (dominant vs minor)
    ['7', null],   // null = context-dependent
    ['5', '5'],
    ['6', '6'],
];

/**
 * Parse a Roman numeral chord token into root, type, and display numeral
 * @param {string} token - Roman numeral token (e.g., 'I', '\u266dVImaj7', 'V/vi', '\u00b07')
 * @param {string} key - Key root note (e.g., 'C', 'F#', 'Bb')
 * @returns {Object|null} { root, type, numeral } or null if unparseable
 */
function parseRomanNumeral(token, key) {
    // Handle secondary dominants (V/vi)
    if (token.includes('/')) {
        const parts = token.split('/');
        const secondary = parseRomanNumeral(parts[1], key);
        if (!secondary) return null;
        // Build V of the secondary chord's root
        const secScale = MusicTheory.buildScale(secondary.root, 'major');
        return { root: secScale.notes[4], type: 'maj', numeral: token };
    }

    let pos = 0;

    // 1. Extract accidental prefix
    let accidental = 0;
    if (token[pos] === '\u266d') { accidental = -1; pos++; }  // ♭
    else if (token[pos] === '\u266f') { accidental = 1; pos++; } // ♯

    const rest = token.substring(pos);

    // 2. Handle standalone symbols (no Roman numeral)
    if (rest === '\u00b07') {  // °7
        return buildChordFromDegree(key, 7, accidental, 'dim7', token);
    }
    if (rest === '\u00f87') {  // ø7
        return buildChordFromDegree(key, 7, accidental, 'min7b5', token);
    }
    if (rest === 'maj7') {
        return buildChordFromDegree(key, 1, accidental, 'maj7', token);
    }

    // 3. Match Roman numeral
    let degree = 0;
    let isUpper = true;
    let numeralLen = 0;

    for (const [numStr, deg] of UPPER_NUMERALS) {
        if (rest.startsWith(numStr)) {
            degree = deg;
            isUpper = true;
            numeralLen = numStr.length;
            break;
        }
    }
    if (degree === 0) {
        for (const [numStr, deg] of LOWER_NUMERALS) {
            if (rest.startsWith(numStr)) {
                degree = deg;
                isUpper = false;
                numeralLen = numStr.length;
                break;
            }
        }
    }
    if (degree === 0) return null;

    // 4. Parse quality suffix
    const suffix = rest.substring(numeralLen);
    let chordType = null;

    if (suffix === '') {
        chordType = isUpper ? 'maj' : 'min';
    } else {
        for (const [pat, type] of SUFFIX_MAP) {
            if (suffix === pat) {
                if (type === null) {
                    // Context-dependent: uppercase = dominant, lowercase = minor variant
                    if (pat === '7') chordType = isUpper ? '7' : 'min7';
                    else if (pat === '9') chordType = isUpper ? '9' : 'min9';
                }  else {
                    chordType = type;
                }
                break;
            }
        }
        // Fallback if suffix not matched
        if (chordType === null) {
            chordType = isUpper ? 'maj' : 'min';
        }
    }

    return buildChordFromDegree(key, degree, accidental, chordType, token);
}

/**
 * Build a chord result from a scale degree
 * @param {string} key - Key root note
 * @param {number} degree - Scale degree (1-7)
 * @param {number} accidental - Semitone shift (-1, 0, or 1)
 * @param {string} chordType - CHORD_TYPES key
 * @param {string} numeral - Original Roman numeral string for display
 * @returns {Object} { root, type, numeral }
 */
function buildChordFromDegree(key, degree, accidental, chordType, numeral) {
    const scale = MusicTheory.buildScale(key, 'major');
    const scaleNote = scale.notes[degree - 1];
    let rootIndex = (MusicTheory.getNoteIndex(scaleNote) + accidental + 12) % 12;

    const useFlats = MusicTheory.shouldUseFlats(key) || accidental < 0;
    const root = MusicTheory.getNoteName(rootIndex, useFlats);

    return { root, type: chordType, numeral };
}

/**
 * Build chord objects for a progression
 * @param {number} categoryIndex - Index into PROGRESSION_CATEGORIES
 * @param {number} progressionIndex - Index into category's progressions array
 * @param {string} key - Key root note (e.g., 'C')
 * @returns {Array} Array of { root, type, symbol, numeral }
 */
function buildProgressionChords(categoryIndex, progressionIndex, key) {
    const category = PROGRESSION_CATEGORIES[categoryIndex];
    if (!category) return [];
    const progression = category.progressions[progressionIndex];
    if (!progression) return [];

    const results = [];
    for (const token of progression.chords) {
        const parsed = parseRomanNumeral(token, key);
        if (parsed) {
            const chordDef = MusicTheory.CHORD_TYPES[parsed.type];
            const symbol = parsed.root + (chordDef ? chordDef.symbol : '');
            results.push({
                root: parsed.root,
                type: parsed.type,
                symbol: symbol,
                numeral: parsed.numeral
            });
        }
    }
    return results;
}

/**
 * Get the total number of progressions across all categories
 * @returns {number}
 */
function getTotalProgressionCount() {
    let count = 0;
    for (const cat of PROGRESSION_CATEGORIES) {
        count += cat.progressions.length;
    }
    return count;
}

/**
 * Convert a flat index (0..total-1) to { categoryIndex, progressionIndex }
 * @param {number} flatIndex
 * @returns {Object} { categoryIndex, progressionIndex }
 */
function flatIndexToCategory(flatIndex) {
    let remaining = flatIndex;
    for (let i = 0; i < PROGRESSION_CATEGORIES.length; i++) {
        const cat = PROGRESSION_CATEGORIES[i];
        if (remaining < cat.progressions.length) {
            return { categoryIndex: i, progressionIndex: remaining };
        }
        remaining -= cat.progressions.length;
    }
    return { categoryIndex: 0, progressionIndex: 0 };
}

/**
 * Convert { categoryIndex, progressionIndex } to a flat index
 * @param {number} categoryIndex
 * @param {number} progressionIndex
 * @returns {number}
 */
function categoryToFlatIndex(categoryIndex, progressionIndex) {
    let flat = 0;
    for (let i = 0; i < categoryIndex && i < PROGRESSION_CATEGORIES.length; i++) {
        flat += PROGRESSION_CATEGORIES[i].progressions.length;
    }
    return flat + progressionIndex;
}

/**
 * Build chord objects from raw token array (for user progressions)
 * @param {Array} chords - Array of Roman numeral tokens (e.g., ['I', 'IVmaj7', 'V7', 'vi'])
 * @param {string} key - Key root note (e.g., 'C')
 * @returns {Array} Array of { root, type, symbol, numeral }
 */
function buildProgressionChordsFromTokens(chords, key) {
    const results = [];
    for (const token of chords) {
        const parsed = parseRomanNumeral(token, key);
        if (parsed) {
            const chordDef = MusicTheory.CHORD_TYPES[parsed.type];
            const symbol = parsed.root + (chordDef ? chordDef.symbol : '');
            results.push({
                root: parsed.root,
                type: parsed.type,
                symbol: symbol,
                numeral: parsed.numeral
            });
        }
    }
    return results;
}

// Public API
export {
    PROGRESSION_CATEGORIES,
    parseRomanNumeral,
    buildProgressionChords,
    buildProgressionChordsFromTokens,
    getTotalProgressionCount,
    flatIndexToCategory,
    categoryToFlatIndex
};
