import * as Sound from '../core/sound.js';
import { voicingNotes } from '../core/voicing-audio.js';
import { getChordVoicings } from '../core/chord-voicings.js';
import { getShellIntervals } from '../core/shell-voicings.js';
import { getTriadPreferences } from './triad-shapes.js';
import { state, getInstrumentTuning, getInstrumentMidiBases } from './state.js';
export function playCurrentChord(chord) {
    const p = getTriadPreferences();
    if (state.mode !== 'chord' || !p.enabled) return Sound.playChord(chord.notes);
    const voicing = getShellIntervals(chord.type).length ? p.voicing : 'full';
    const shapes = getChordVoicings(chord, getInstrumentTuning(), getInstrumentMidiBases(), {...p,voicing})
        .filter(s => (p.stringSet === 'all' || s.strings === p.stringSet) && (p.inversion === 'all' || s.inversion === Number(p.inversion)));
    const shape = shapes[Math.min(p.index, shapes.length-1)];
    if (shape) return Sound.playChord(voicingNotes(shape,state.instrument));
}
