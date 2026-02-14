/**
 * Sound Module - Audio playback for chords using Tone.js
 * Exposes window.Sound with playChord(notes) function
 */

(function() {
    'use strict';

    let synth = null;
    const limiter = new Tone.Limiter(-6).toDestination();

    /**
     * Lazy-initialize the PolySynth on first use
     */
    function ensureSynth() {
        if (!synth) {
            synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.005,
                    decay: 0.4,
                    sustain: 0.05,
                    release: 1.0
                }
            }).connect(limiter);
            synth.volume.value = -12;
        }
    }

    /**
     * Assign octaves to note names so they ascend from octave 3
     * If a note's chromatic index is <= the previous note's index, bump the octave
     * @param {string[]} noteNames - Array of note names (e.g. ['C', 'E', 'G'])
     * @returns {string[]} Notes with octaves (e.g. ['C3', 'E3', 'G3'])
     */
    function assignOctaves(noteNames) {
        let octave = 3;
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
    async function playChord(noteNames) {
        if (!noteNames || noteNames.length === 0) return;

        await Tone.start();
        ensureSynth();

        const notesWithOctaves = assignOctaves(noteNames);
        const strumDelay = 0.08; // 80ms between each note
        const now = Tone.now();
        notesWithOctaves.forEach((note, i) => {
            synth.triggerAttackRelease(note, 0.8, now + i * strumDelay);
        });
    }

    window.Sound = { playChord };
})();
