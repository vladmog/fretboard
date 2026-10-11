import * as Theory from './music-theory.js';
/** Sounding pitches, low to high; never infer octaves from chord-note order. */
export function voicingNotes(shape, instrument = 'guitar') {
    const bases = instrument === 'bass' ? Theory.BASS_STRING_MIDI_BASES : [40,45,50,55,59,64];
    return (shape?.positions || []).map(({string, fret}) => {
        if (!Number.isInteger(string) || string < 1 || string > bases.length || !Number.isInteger(fret) || fret < 0) throw new Error('Invalid voicing position');
        return bases[bases.length - string] + fret;
    }).sort((a,b) => a-b).map(midi => `${Theory.CHROMATIC_NOTES[midi % 12]}${Math.floor(midi/12)-1}`);
}
