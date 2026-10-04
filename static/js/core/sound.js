/**
 * Sound Module - Audio playback for chords using Tone.js
 * Exports playChord, playNote, playInterval, playArpeggio, playConfirmation, playError,
 * isPlaying, onPlaybackChange, setMusicalPlaybackSuppression,
 * getParams, getDefaults, setParam
 */
/* global Tone */

import * as MusicTheory from './music-theory.js';

const defaults = {
    oscillatorType: 'sawtooth',
    attack: 0.005,
    decay: 0.49,
    sustain: 0,
    release: 0.71,
    volume: -12,
    limiterThreshold: -6,
    strumDelay: 0.08,
    arpeggioDelay: 0.15,
    noteDuration: 0.8,
    arpeggioNoteDuration: 1,
    filterType: 'lowpass',
    filterFrequency: 4140,
    filterQ: 0.1,
    reverbDecay: 2.4,
    reverbWet: 0.5
};

const params = { ...defaults };

let synth = null;
let errorSynth = null;
let confirmationSynth = null;
let filter = null;
let reverb = null;
let limiter = null;

// Speech recognition on iOS is not reliable while the page is producing
// audio. Expose the audible playback window so hands-free input can pause and
// resume around notes, chords, and the wrong-answer signal.
let playbackTimer = null;
let playbackUntil = 0;
let playbackActive = false;
const playbackListeners = new Set();
let musicalPlaybackSuppression = null;
let nextConfirmationTime = 0;

function nowMs() {
    return (typeof performance !== 'undefined') ? performance.now() : Date.now();
}

function setPlaybackActive(active) {
    if (playbackActive === active) return;
    playbackActive = active;
    playbackListeners.forEach(listener => listener(active));
}

function finishPlaybackWindow() {
    const remaining = playbackUntil - nowMs();
    if (remaining > 10) {
        playbackTimer = setTimeout(finishPlaybackWindow, remaining);
        return;
    }
    playbackTimer = null;
    playbackUntil = 0;
    setPlaybackActive(false);
}

function markPlayback(seconds) {
    playbackUntil = Math.max(playbackUntil, nowMs() + seconds * 1000);
    setPlaybackActive(true);
    clearTimeout(playbackTimer);
    playbackTimer = setTimeout(finishPlaybackWindow, Math.max(0, playbackUntil - nowMs()));
}

function isPlaying() {
    return playbackActive;
}

function onPlaybackChange(listener) {
    playbackListeners.add(listener);
    return () => playbackListeners.delete(listener);
}

/** Let hands-free input suppress pitched feedback without muting error cues. */
function setMusicalPlaybackSuppression(shouldSuppress) {
    musicalPlaybackSuppression = typeof shouldSuppress === 'function' ? shouldSuppress : null;
}

function musicalPlaybackIsSuppressed() {
    return !!(musicalPlaybackSuppression && musicalPlaybackSuppression());
}

/**
 * Lazy-initialize the effect chain and PolySynth on first use.
 * Constructing Tone nodes lazily keeps a failed Tone.js CDN load from
 * breaking anything except audio playback.
 */
function ensureSynth() {
    if (!filter) {
        filter = new Tone.Filter({ type: params.filterType, frequency: params.filterFrequency, Q: params.filterQ });
        reverb = new Tone.Reverb({ decay: params.reverbDecay, wet: params.reverbWet });
        limiter = new Tone.Limiter(params.limiterThreshold).toDestination();
        filter.connect(reverb);
        reverb.connect(limiter);
    }
    if (!synth) {
        synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: params.oscillatorType },
            envelope: {
                attack: params.attack,
                decay: params.decay,
                sustain: params.sustain,
                release: params.release
            }
        }).connect(filter);
        synth.volume.value = params.volume;
    }
}

function getParams() {
    return { ...params };
}

function getDefaults() {
    return { ...defaults };
}

function setParam(key, value) {
    if (!(key in defaults)) return;
    params[key] = value;

    // Effect nodes are created lazily; params are picked up at construction
    if (filter) {
        switch (key) {
            case 'limiterThreshold':
                limiter.threshold.value = value;
                return;
            case 'filterType':
                filter.type = value;
                return;
            case 'filterFrequency':
                filter.frequency.value = value;
                return;
            case 'filterQ':
                filter.Q.value = value;
                return;
            case 'reverbDecay':
                reverb.decay = value;
                reverb.generate();
                return;
            case 'reverbWet':
                reverb.wet.value = value;
                return;
        }
    }

    if (!synth) return;

    switch (key) {
        case 'oscillatorType':
            synth.set({ oscillator: { type: value } });
            break;
        case 'attack':
        case 'decay':
        case 'sustain':
        case 'release':
            synth.set({ envelope: { [key]: value } });
            break;
        case 'volume':
            synth.volume.value = value;
            break;
        // strumDelay, arpeggioDelay, noteDuration, arpeggioNoteDuration
        // are read at call time — no live update needed
    }
}

/**
 * Assign octaves to note names so they ascend from octave 3
 * If a note's chromatic index is <= the previous note's index, bump the octave
 * @param {string[]} noteNames - Array of note names (e.g. ['C', 'E', 'G'])
 * @returns {string[]} Notes with octaves (e.g. ['C3', 'E3', 'G3'])
 */
function assignOctaves(noteNames, startOctave) {
    let octave = startOctave || 3;
    let prevIndex = -1;
    const result = [];

    for (const name of noteNames) {
        const index = MusicTheory.getNoteIndex(name);
        if (prevIndex >= 0 && index <= prevIndex) {
            octave++;
        }
        // Tone.js uses standard note names - convert flats to sharps for compatibility
        const sharpName = MusicTheory.CHROMATIC_NOTES[index];
        result.push(sharpName + octave);
        prevIndex = index;
    }

    return result;
}

/**
 * Play a chord given an array of note names
 * @param {string[]} noteNames - Note names from buildChord() (e.g. ['C', 'E', 'G'])
 */
async function playChord(noteNames, startOctave) {
    if (!noteNames || noteNames.length === 0 || musicalPlaybackIsSuppressed()) return;

    await Tone.start();
    ensureSynth();

    const hasOctaves = noteNames.some(n => /\d/.test(n));
    let notesWithOctaves;
    if (hasOctaves) {
        notesWithOctaves = noteNames.map(n => {
            const match = n.match(/^([A-Ga-g][#b]*)(\d+)$/);
            if (match) {
                const index = MusicTheory.getNoteIndex(match[1]);
                return MusicTheory.CHROMATIC_NOTES[index] + match[2];
            }
            return n;
        });
    } else {
        notesWithOctaves = assignOctaves(noteNames, startOctave);
    }

    const now = Tone.now();
    const audibleSeconds = params.noteDuration + params.release +
        Math.max(0, notesWithOctaves.length - 1) * params.strumDelay;
    markPlayback(audibleSeconds);
    notesWithOctaves.forEach((note, i) => {
        synth.triggerAttackRelease(note, params.noteDuration, now + i * params.strumDelay);
    });
}

/**
 * Play a single note
 * @param {string} noteName - Note name (e.g. 'C', 'Eb')
 * @param {number} octave - Octave number (default 4)
 * @param {number} duration - Duration in seconds (default params.noteDuration)
 */
async function playNote(noteName, octave, duration) {
    if (musicalPlaybackIsSuppressed()) return;
    if (octave === undefined) octave = 4;
    if (duration === undefined) duration = params.noteDuration;

    await Tone.start();
    ensureSynth();

    const index = MusicTheory.getNoteIndex(noteName);
    const sharpName = MusicTheory.CHROMATIC_NOTES[index];
    markPlayback(duration + params.release);
    synth.triggerAttackRelease(sharpName + octave, duration);
}

/**
 * Play an interval (root + target note)
 * @param {string} rootName - Root note name
 * @param {string} targetName - Target note name
 * @param {number} semitone - Semitone distance (for octave calculation)
 * @param {number} rootOctave - Root octave (default 3)
 */
async function playInterval(rootName, targetName, semitone, rootOctave) {
    if (musicalPlaybackIsSuppressed()) return;
    if (rootOctave === undefined) rootOctave = 3;

    await Tone.start();
    ensureSynth();

    const rootIndex = MusicTheory.getNoteIndex(rootName);
    const targetIndex = MusicTheory.getNoteIndex(targetName);
    const rootSharp = MusicTheory.CHROMATIC_NOTES[rootIndex];
    const targetSharp = MusicTheory.CHROMATIC_NOTES[targetIndex];

    let targetOctave = rootOctave;
    if (semitone !== undefined && semitone >= 12) {
        targetOctave += Math.floor(semitone / 12);
    } else if (targetIndex < rootIndex) {
        targetOctave++;
    }

    const now = Tone.now();
    markPlayback(params.noteDuration + params.release + params.strumDelay);
    synth.triggerAttackRelease(rootSharp + rootOctave, params.noteDuration, now);
    synth.triggerAttackRelease(targetSharp + targetOctave, params.noteDuration, now + params.strumDelay);
}

/**
 * Play notes as an arpeggio (one at a time with longer delay)
 * @param {string[]} noteNames - Note names (e.g. ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
 */
async function playArpeggio(noteNames) {
    if (!noteNames || noteNames.length === 0 || musicalPlaybackIsSuppressed()) return;

    await Tone.start();
    ensureSynth();

    const notesWithOctaves = assignOctaves(noteNames);
    const now = Tone.now();
    const audibleSeconds = params.arpeggioNoteDuration + params.release +
        Math.max(0, notesWithOctaves.length - 1) * params.arpeggioDelay;
    markPlayback(audibleSeconds);
    notesWithOctaves.forEach((note, i) => {
        synth.triggerAttackRelease(note, params.arpeggioNoteDuration, now + i * params.arpeggioDelay);
    });
}

/**
 * Play a short dry acknowledgement when voice input accepts a correct note.
 * This bypasses pitched-feedback suppression and queues rapid multi-note
 * answers as distinct ticks.
 */
async function playConfirmation() {
    await Tone.start();
    ensureSynth();
    if (!confirmationSynth) {
        confirmationSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.002, decay: 0.025, sustain: 0, release: 0.02 }
        }).connect(limiter);
        confirmationSynth.volume.value = -18;
    }
    const now = Tone.now();
    const start = Math.max(now, nextConfirmationTime);
    nextConfirmationTime = start + 0.11;
    markPlayback((start - now) + 0.07);
    confirmationSynth.triggerAttackRelease('C6', 0.04, start);
}

/**
 * Play a short "wrong answer" buzz: two quick descending square-wave tones
 * a tritone apart, dry (no reverb) so it reads as a signal, not music.
 */
async function playError() {
    await Tone.start();
    ensureSynth();
    if (!errorSynth) {
        errorSynth = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.005, decay: 0.05, sustain: 0.7, release: 0.06 }
        }).connect(limiter);
        errorSynth.volume.value = -20;
    }
    const now = Tone.now();
    markPlayback(0.13 + 0.22 + 0.06);
    errorSynth.triggerAttackRelease('A#2', 0.11, now);
    errorSynth.triggerAttackRelease('E2', 0.22, now + 0.13);
}

export {
    playChord, playNote, playInterval, playArpeggio, playConfirmation, playError,
    isPlaying, onPlaybackChange, setMusicalPlaybackSuppression,
    getParams, getDefaults, setParam
};
