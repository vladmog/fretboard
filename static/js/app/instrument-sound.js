import { pulsePluck } from './pluck-visual.js';
/** App chord playback follows the selected instrument; explicit pitches stay exact. */
import * as Sound from '../core/sound.js';
import { state } from './state.js';
export * from '../core/sound.js';

export function playChord(notes, startOctave = 3, target) {
    // Saved voicings already encode the selected instrument's tuning and octave.
    const explicitPitches = notes?.some(note => /\d/.test(note));
    const octave = !explicitPitches && state.instrument === 'bass' ? startOctave - 1 : startOctave;
    return Sound.playChord(notes, octave, note => pulsePluck(note, target));
}
