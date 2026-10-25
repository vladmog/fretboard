import * as MusicTheory from '../core/music-theory.js';
import * as Voice from './voice.js';
import * as Sound from '../core/sound.js';
import * as GameSession from './session.js';
export function createIntervalPrompts(gameState, LONG_NAMES, GAME_OCTAVE, getNoteOctave) {
    // Spoken form of the current question; intervals always use long names
    function questionSpeech() {
        const mode = gameState.activeMode;
        const root = Voice.spokenNote(gameState.currentRoot);
        const useFlats = MusicTheory.shouldUseFlats(gameState.currentRoot);
        const noteName = (index) => Voice.spokenNote(MusicTheory.getNoteName(index, useFlats));
        const interval = (semitone) => Voice.spokenName(LONG_NAMES[semitone]);
        if (mode === 'scale-builder') {
            return root + ' ' + Voice.spokenName(MusicTheory.SCALES[gameState.currentScaleType].name);
        }
        if (mode === 'chord-builder') {
            return root + ' ' + Voice.spokenName(MusicTheory.CHORD_TYPES[gameState.currentChordType].name);
        }
        if (mode === 'root-to-interval') {
            return interval(gameState.currentSemitone) + ' from ' + root;
        }
        if (mode === 'interval-to-root') {
            return noteName(gameState.givenNoteIndex) + ' is the ' + interval(gameState.givenSemitone);
        }
        if (mode === 'interval-to-interval') {
            return noteName(gameState.givenNoteIndex) + ' is the ' + interval(gameState.givenSemitone) +
                '. Find the ' + interval(gameState.targetSemitone);
        }
        return '';
    }

    function playRoundStartSounds() {
        if (Voice.isEnabled()) return;
        // Skip if the round moved on while the announcement was playing
        if (!gameState.circleApi || !gameState.circleApi.svg.isConnected) return;
        const mode = gameState.activeMode;
        const gamesState = GameSession.getState();
        if (gamesState && gamesState.soundEnabled) {
            if (mode === 'root-to-interval') {
                // Play root, then target interval note
                const targetIndex = (gameState.currentRootIndex + gameState.currentSemitone) % 12;
                const targetNote = MusicTheory.getNoteName(targetIndex, MusicTheory.shouldUseFlats(gameState.currentRoot));
                Sound.playNote(gameState.currentRoot, GAME_OCTAVE);
                setTimeout(() => {
                    if (Voice.isEnabled()) return;
                    Sound.playNote(targetNote, getNoteOctave(targetIndex, gameState.currentRootIndex));
                }, 400);
            } else if (mode === 'interval-to-root') {
                // Play interval note, then root
                const givenNoteName = MusicTheory.getNoteName(gameState.givenNoteIndex, false);
                Sound.playNote(givenNoteName, getNoteOctave(gameState.givenNoteIndex, gameState.currentRootIndex));
                setTimeout(() => {
                    if (Voice.isEnabled()) return;
                    Sound.playNote(gameState.currentRoot, GAME_OCTAVE);
                }, 400);
            } else if (mode === 'scale-builder' || mode === 'chord-builder') {
                Sound.playNote(gameState.currentRoot, GAME_OCTAVE);
            } else if (mode === 'interval-to-interval') {
                // Play given note, then target note
                const givenNoteName = MusicTheory.getNoteName(gameState.givenNoteIndex, false);
                const targetIndex = (gameState.currentRootIndex + gameState.targetSemitone) % 12;
                const targetNote = MusicTheory.getNoteName(targetIndex, false);
                Sound.playNote(givenNoteName, getNoteOctave(gameState.givenNoteIndex, gameState.currentRootIndex));
                setTimeout(() => {
                    if (Voice.isEnabled()) return;
                    Sound.playNote(targetNote, getNoteOctave(targetIndex, gameState.currentRootIndex));
                }, 400);
            }
        }
    }

    return { questionSpeech, playRoundStartSounds };
}
