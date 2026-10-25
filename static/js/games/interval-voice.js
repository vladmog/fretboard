import * as Voice from './voice.js';
import * as Theory from '../core/music-theory.js';
import * as Session from './session.js';
import { createVoiceInput } from './voice-input.js';
import { unlockVoiceCue, playVoiceCue, playPositiveCue } from './voice-cue.js';

export function createIntervalVoice({ getState, question, submit, next, restart, roundSounds, inputFactory = createVoiceInput, positiveSound = playPositiveCue }) {
    let roundComplete = false;
    let bar = null, button = null, label = null, lastStatus = 'Voice answers off.';
    const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const controller = inputFactory({
        Recognition: recognition, onListening: playVoiceCue,
        speak: (text, done) => Voice.speak(text, done, { force:true }), cancelSpeech: Voice.cancel,
        onStatus({ message, enabled }) {
            lastStatus = message;
            if (label) label.textContent = message;
            if (button) button.textContent = enabled ? 'Pause voice' : 'Resume voice';
        },
        onAnswer(note) { if (roundComplete) { controller.say('Say next to start another round.'); return; } submit(note, (note - getState().currentRootIndex + 12) % 12); },
        onCommand(command) {
            if (command === 'repeat') { if (roundComplete) controller.say('Round complete. Say next to start another round.'); else announce(); }
            if (command === 'next') {
                if (roundComplete) { roundComplete = false; restart(); }
                else if (getState().answered) { Session.setAwaitingAdvance(false); next(); }
                else controller.say('Answer this question first. ' + question());
            }
        }
    });
    function announce() {
        roundComplete = false;
        if (controller.enabled) controller.say(question() + (getState().answered ? '. Say next to continue.' : ''));
        else Voice.speak(question(), () => {
            if (!controller.enabled && !Voice.isEnabled()) roundSounds();
        });
    }
    function expected() {
        const s = getState();
        if (s.activeMode === 'scale-builder') return s.scaleNotes[s.currentDegreeIndex];
        if (s.activeMode === 'chord-builder') return s.chordNotes[s.currentDegreeIndex];
        if (s.activeMode === 'interval-to-root') return s.currentRootIndex;
        return (s.currentRootIndex + (s.activeMode === 'interval-to-interval' ? s.targetSemitone : s.currentSemitone)) % 12;
    }
    function answer(note, action) {
        if (!controller.enabled) { action(); return; }
        const s = getState();
        if (s.answered || s.inputLocked) {
            if (controller.enabled) controller.say(s.answered ? 'Say next for the next question.' : 'Please try again.');
            return;
        }
        const correct = note === expected();
        action();
        if (controller.enabled) {
            const advance = correct && s.answered;
            const heard = Voice.spokenNote(Theory.getNoteName(note, Theory.shouldUseFlats(s.currentRoot)));
            controller.say(correct ? '' : `${heard} is wrong.`, advance ? () => {
                Session.setAwaitingAdvance(false);
                next();
            } : undefined, correct && Session.getState().soundEnabled ? async isCurrent => {
                await positiveSound(isCurrent);
                // Let the success cue finish before starting the next question.
                await new Promise(resolve => setTimeout(resolve, 500));
            } : undefined);
        }
    }
    function mount(container) {
        container.classList.toggle('interval-voice-calibrated',!!container.querySelector('.magsafe-circle'));
        bar = document.createElement('div'); bar.className = 'interval-voice-controls';
        button = document.createElement('button'); button.type = 'button';
        button.className = 'game-setting-btn';
        button.textContent = controller.enabled ? 'Pause voice' : 'Start voice answers';
        label = document.createElement('p'); label.setAttribute('role','status'); label.textContent = lastStatus;
        button.addEventListener('click',event => {
            event.stopPropagation();
            if (controller.enabled) controller.pause();
            else {
                if (!window.isSecureContext) { label.textContent = 'Microphone requires HTTPS. Open the secure app address.'; return; }
                unlockVoiceCue(); controller.start();
            }
        });
        bar.addEventListener('click',event=>event.stopPropagation());
        const help = document.createElement('small');
        help.textContent = 'After the listening chime, say any single word starting with A through G, followed by sharp or flat if needed (apple sharp = A sharp). Repeat, next, continue, and pause remain commands; yes/no and correct are confirmations. Correct answers advance automatically. Keep the app open. Your browser’s speech service may process audio online.';
        bar.append(button,label,help); container.append(bar);
    }
    window.addEventListener('resize',()=>{
        const container = bar?.parentElement;
        if (container) container.classList.toggle('interval-voice-calibrated',!!container.querySelector('.magsafe-circle'));
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden && controller.enabled)controller.pause('Paused in the background. Tap Resume voice when ready.');});
    return { mount, announce, answer,
        get enabled() { return controller.enabled; },
        pause: () => { if(controller.enabled) controller.pause(); },
        stop: () => { controller.stop(); roundComplete = false; bar = button = label = null; lastStatus = 'Voice answers off.'; },
        finish() { roundComplete = true; if(controller.enabled) controller.say(`Round complete. ${getState().correctCount} correct. Say next to log your results and start another round.`); }
    };
}
