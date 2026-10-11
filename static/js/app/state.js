/**
 * Application State & Persistence
 * The single mutable state object shared by every app module, plus
 * localStorage persistence. Storage keys are a public contract with
 * existing users — never rename them. Imports nothing from app/ so it
 * sits at the bottom of the module graph.
 */

import * as MusicTheory from '../core/music-theory.js';
import * as ChordProgressions from '../core/progressions.js';

// Application state
export const state = {
    fretboardTapAction: 'rotate',
    inversionScrubbing: true,
    instrument: 'guitar',  // 'guitar' or 'bass'
    mode: 'scale',          // 'scale', 'chord', 'interval', 'caged', 'modes', 'prog', 'f.chord', 'f.scale', or 'games'
    root: 'C',
    scaleType: 'major',
    chordType: 'maj',
    chordScaleDegrees: false,
    chordReferenceScale: null,
    builderReferenceScale: 'major',
    chordReferenceKey: null, // Key context, distinct from the chord root
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
    songPreview: null,
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

export function getInstrumentTuning() {
    return state.instrument === 'bass'
        ? MusicTheory.BASS_TUNING
        : MusicTheory.STANDARD_TUNING;
}

export function getInstrumentMidiBases() {
    return state.instrument === 'bass'
        ? MusicTheory.BASS_STRING_MIDI_BASES
        : undefined;
}
// Storage key for chord list persistence
const INSTRUMENT_STORAGE_KEY = 'fretboard-instrument';
export function loadInstrument() {
    try {
        const saved = localStorage.getItem(INSTRUMENT_STORAGE_KEY);
        if (saved === 'guitar' || saved === 'bass') state.instrument = saved;
    } catch { /* Storage may be unavailable; retain the default instrument. */ }
}
export function saveInstrument() {
    try { localStorage.setItem(INSTRUMENT_STORAGE_KEY, state.instrument); }
    catch { /* Instrument switching still works without persistent storage. */ }
}
const STORAGE_KEY = 'fretboard-chord-list';
const FAVORITES_STORAGE_KEY = 'fretboard-prog-favorites';
const USER_PROGRESSIONS_STORAGE_KEY = 'fretboard-user-progressions';
/**
 * Check if the current mode is a find mode (f.chord or f.scale)
 * @param {string} mode - Mode string
 * @returns {boolean}
 */
export function isFindMode(mode) {
    return mode === 'f.chord' || mode === 'f.scale';
}
/**
 * Load chord list from localStorage
 */
export function loadChordList() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            // Additive migration: old entries have no recoverable key context.
            state.chordList = JSON.parse(saved).map(item => ({ referenceKey: null, referenceScale: null, progressionDegree: null, ...item }));
            const scales = new Set(state.chordList.map(item => item.referenceScale));
            state.chordReferenceScale = scales.size === 1 ? [...scales][0] : null;
            const keys = new Set(state.chordList.map(item => item.referenceKey));
            state.chordReferenceKey = keys.size === 1 ? [...keys][0] : null;
        }
    } catch (e) {
        console.error('Failed to load chord list:', e);
        state.chordList = [];
    }
}
/**
 * Save chord list to localStorage
 */
export function saveChordList() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chordList));
    } catch (e) {
        console.error('Failed to save chord list:', e);
    }
}
export function getProgressionKey(flatIndex) {
    const { categoryIndex, progressionIndex } = ChordProgressions.flatIndexToCategory(flatIndex);
    const cat = ChordProgressions.PROGRESSION_CATEGORIES[categoryIndex];
    if (!cat) return null;
    const prog = cat.progressions[progressionIndex];
    if (!prog) return null;
    return prog.id || cat.name + '|' + prog.numerals;
}
function favKeyToFlatIndex(key) {
    let index = 0;
    for (const cat of ChordProgressions.PROGRESSION_CATEGORIES) {
        for (const prog of cat.progressions) { if (prog.id === key) return index; index++; }
    }
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
export function getResolvedFavorites() {
    return state.favoriteProgressions
        .map(favKeyToFlatIndex)
        .filter(idx => idx >= 0);
}
export function loadFavorites() {
    try {
        const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (saved) state.favoriteProgressions = JSON.parse(saved);
    } catch (e) {
        state.favoriteProgressions = [];
    }
}
export function saveFavorites() {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favoriteProgressions));
    } catch (e) { /* ignore */ }
}
export function loadUserProgressions() {
    try {
        const saved = localStorage.getItem(USER_PROGRESSIONS_STORAGE_KEY);
        if (saved) state.userProgressions = JSON.parse(saved).map(prog => ({ referenceKey: null, referenceScale: null, ...prog }));
    } catch (e) {
        state.userProgressions = [];
    }
}
export function saveUserProgressions() {
    try {
        localStorage.setItem(USER_PROGRESSIONS_STORAGE_KEY, JSON.stringify(state.userProgressions));
    } catch (e) { /* ignore */ }
}

const SCRUB_STORAGE_KEY = 'fretboard-inversion-scrubbing';
export function loadInversionScrubbing() {
    try { state.inversionScrubbing = localStorage.getItem(SCRUB_STORAGE_KEY) !== 'false'; }
    catch { state.inversionScrubbing = true; }
}
export function saveInversionScrubbing() {
    try { localStorage.setItem(SCRUB_STORAGE_KEY, String(state.inversionScrubbing)); }
    catch { /* Keep the current preference when storage is unavailable. */ }
}

const TAP_ACTION_STORAGE_KEY = 'fretboard-tap-action';
export function loadTapAction() {
    try { state.fretboardTapAction = localStorage.getItem(TAP_ACTION_STORAGE_KEY) === 'play' ? 'play' : 'rotate'; }
    catch { state.fretboardTapAction = 'rotate'; }
}
export function saveTapAction() {
    try { localStorage.setItem(TAP_ACTION_STORAGE_KEY, state.fretboardTapAction); }
    catch { /* Tap behavior remains available without storage. */ }
}
