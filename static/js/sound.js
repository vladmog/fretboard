/**
 * Sound Module - Audio playback for chords using Tone.js
 * Exposes window.Sound with playChord, playNote, playInterval, playArpeggio,
 * getParams, getDefaults, setParam
 */

(function() {
    'use strict';

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
    const filter = new Tone.Filter({ type: params.filterType, frequency: params.filterFrequency, Q: params.filterQ });
    const reverb = new Tone.Reverb({ decay: params.reverbDecay, wet: params.reverbWet });
    const limiter = new Tone.Limiter(params.limiterThreshold).toDestination();
    filter.connect(reverb);
    reverb.connect(limiter);

    /**
     * Lazy-initialize the PolySynth on first use
     */
    function ensureSynth() {
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

        // Effect nodes exist at module scope — always update
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
        if (!noteNames || noteNames.length === 0) return;

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
        if (octave === undefined) octave = 4;
        if (duration === undefined) duration = params.noteDuration;

        await Tone.start();
        ensureSynth();

        const index = MusicTheory.getNoteIndex(noteName);
        const sharpName = MusicTheory.CHROMATIC_NOTES[index];
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
        synth.triggerAttackRelease(rootSharp + rootOctave, params.noteDuration, now);
        synth.triggerAttackRelease(targetSharp + targetOctave, params.noteDuration, now + params.strumDelay);
    }

    /**
     * Play notes as an arpeggio (one at a time with longer delay)
     * @param {string[]} noteNames - Note names (e.g. ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
     */
    async function playArpeggio(noteNames) {
        if (!noteNames || noteNames.length === 0) return;

        await Tone.start();
        ensureSynth();

        const notesWithOctaves = assignOctaves(noteNames);
        const now = Tone.now();
        notesWithOctaves.forEach((note, i) => {
            synth.triggerAttackRelease(note, params.arpeggioNoteDuration, now + i * params.arpeggioDelay);
        });
    }

    window.Sound = { playChord, playNote, playInterval, playArpeggio, getParams, getDefaults, setParam };
})();
