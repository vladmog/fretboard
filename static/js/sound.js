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
                envelope: {
                    attack: 0.3,
                    decay: 0.5,
                    sustain: 1,
                    release: 0.5
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
        synth.triggerAttackRelease(notesWithOctaves, 0.8);
    }

    window.Sound = { playChord };
})();
