/**
 * Hands-free note and navigation input for games via Safari's Web Speech API.
 * Recognition feeds the same framework callbacks as note-keyboard.js, so all
 * scoring, wrong-answer sounds, builder resets, and progression stay shared.
 */

import { createSettingsStore } from './storage.js';
import { parseSpeechCommand } from './speech-commands.js';
import * as Voice from './voice.js';
import * as Sound from '../core/sound.js';

const Recognition = (typeof window !== 'undefined')
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
const isSecure = typeof window !== 'undefined' && window.isSecureContext;

const store = createSettingsStore('fretboard-speech-input-settings', {
    enabled: false
}, s => {
    s.enabled = s.enabled === true;
});
const settings = store.settings;
store.load();

let handlers = null;
let recognition = null;
let listening = false;
let starting = false;
let restartTimer = null;
let interimTimer = null;
let statusText = 'Off';
const statusNodes = new Set();

// Pitched feedback creates long periods where a fast next answer is lost.
// Hands-free mode keeps the short wrong-answer cue, but suppresses notes and
// chords while an eligible game is active.
Sound.setMusicalPlaybackSuppression(() =>
    !!(settings.enabled && handlers && handlers.isEligible())
);

function setStatus(text) {
    statusText = text;
    statusNodes.forEach(node => {
        if (!node.isConnected) statusNodes.delete(node);
        else node.textContent = text;
    });
}

function modalIsOpen() {
    const modal = document.getElementById('game-settings-modal');
    return !!(modal && getComputedStyle(modal).display !== 'none');
}

function canListen() {
    return !!(Recognition && isSecure && settings.enabled && handlers &&
        document.visibilityState === 'visible' && !Voice.isSpeaking() && !Sound.isPlaying());
}

function outputIsActive() {
    return Voice.isSpeaking() || Sound.isPlaying();
}

function scheduleStart(delay = 100) {
    clearTimeout(restartTimer);
    if (!canListen()) return;
    restartTimer = setTimeout(start, delay);
}

function parseResult(result) {
    for (let i = 0; i < result.length; i++) {
        const parsed = parseSpeechCommand(result[i].transcript);
        if (parsed) return parsed;
    }
    return null;
}

function dispatchResult(instance, parsed) {
    if (!parsed || recognition !== instance || !handlers) return;
    // End this short utterance before invoking the game. This prevents a
    // later final result from submitting the same command twice.
    stop();
    if (parsed.type === 'repeat') handlers.onRepeat();
    else if (parsed.type === 'advance') handlers.onAdvance();
    else {
        parsed.notes.forEach(note => {
            const correct = handlers.onNote(note, 'voice');
            if (correct === true) Sound.playConfirmation();
            else if (correct === false) Sound.playError();
        });
    }
    scheduleStart();
}

function createRecognition() {
    if (!Recognition) return null;
    const instance = new Recognition();
    recognition = instance;
    instance.lang = 'en-US';
    // Short sessions avoid WebKit's long-running continuous-recognition
    // stalls. Interim results let a stable short command land before Safari
    // waits for slower finalization.
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 5;

    // Newer engines can bias recognition toward our small vocabulary.
    // Safari currently ignores this path, so feature-detect it.
    const Phrase = window.SpeechRecognitionPhrase;
    if ('phrases' in instance && Phrase) {
        try {
            instance.phrases = [
                'A', 'B', 'C', 'D', 'E', 'F', 'G',
                'A sharp', 'B flat', 'C sharp', 'D flat', 'D sharp', 'E flat',
                'F sharp', 'G flat', 'G sharp', 'A flat',
                'repeat', 'next'
            ].map(phrase => new Phrase(phrase, 5));
        } catch (error) { /* optional experimental API */ }
    }

    instance.onstart = () => {
        if (recognition !== instance) return;
        starting = false;
        listening = true;
        setStatus('Listening');
    };

    instance.onresult = (event) => {
        if (recognition !== instance) return;
        if (!handlers || modalIsOpen() || !handlers.isEligible()) return;
        clearTimeout(interimTimer);
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const parsed = parseResult(result);
            if (!parsed) continue;
            if (result.isFinal) {
                dispatchResult(instance, parsed);
            } else {
                // Wait briefly for another interim update so phrases such as
                // “C E G” are not submitted after only the first note.
                interimTimer = setTimeout(() => dispatchResult(instance, parsed), 300);
            }
            return;
        }
    };

    instance.onerror = (event) => {
        if (recognition !== instance) return;
        starting = false;
        listening = false;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            settings.enabled = false;
            store.save();
            setStatus('Permission denied');
        } else if (event.error === 'audio-capture') {
            settings.enabled = false;
            store.save();
            setStatus('Microphone unavailable');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
            setStatus('Recognition interrupted');
        }
    };

    instance.onend = () => {
        if (recognition !== instance) return;
        recognition = null;
        starting = false;
        listening = false;
        if (canListen()) scheduleStart();
        else if (settings.enabled && outputIsActive()) setStatus('Paused for audio');
    };
    return instance;
}

function start() {
    clearTimeout(restartTimer);
    if (!canListen() || listening || starting) return;
    const instance = createRecognition();
    if (!instance) return;
    starting = true;
    setStatus('Starting…');
    try {
        instance.start();
    } catch (error) {
        if (recognition === instance) recognition = null;
        starting = false;
        if (error && error.name !== 'InvalidStateError') setStatus('Could not start');
        scheduleStart(500);
    }
}

function stop() {
    clearTimeout(restartTimer);
    clearTimeout(interimTimer);
    const instance = recognition;
    recognition = null;
    starting = false;
    listening = false;
    if (!instance) return;
    try { instance.abort(); } catch (error) { /* already stopped */ }
}

Voice.onSpeakingChange(speaking => {
    if (!settings.enabled) return;
    if (speaking) {
        setStatus('Paused for audio');
        stop();
    } else {
        scheduleStart(200);
    }
});

Sound.onPlaybackChange(playing => {
    if (!settings.enabled) return;
    if (playing) {
        setStatus('Paused for audio');
        stop();
    } else {
        scheduleStart(200);
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleStart();
    else stop();
});

export function attach(onNote, onRepeat, onAdvance, isEligible) {
    handlers = { onNote, onRepeat, onAdvance, isEligible };
    if (settings.enabled) scheduleStart();
}

export function detach() {
    handlers = null;
    stop();
    if (settings.enabled) setStatus('Ready');
}

function makeToggle(value, onChange) {
    const select = document.createElement('select');
    select.className = 'game-setting-select';
    [['off', 'Off'], ['on', 'On']].forEach(([val, text]) => {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = text;
        option.selected = val === value;
        select.appendChild(option);
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
}

/** Append global voice-input controls after Voice Announce settings. */
export function renderSettings(container) {
    const group = document.createElement('div');
    group.className = 'game-setting-group';
    const label = document.createElement('label');
    label.className = 'game-setting-label';
    label.textContent = 'Voice Input';
    group.appendChild(label);

    if (!isSecure || !Recognition) {
        const unsupported = document.createElement('p');
        unsupported.className = 'voice-settings-hint';
        unsupported.textContent = !isSecure
            ? 'Voice input requires HTTPS. Use the deployed GitHub Pages app.'
            : 'Speech recognition is not supported in this browser.';
        group.appendChild(unsupported);
        container.appendChild(group);
        return;
    }

    group.appendChild(makeToggle(settings.enabled ? 'on' : 'off', value => {
        settings.enabled = value === 'on';
        store.save();
        if (settings.enabled) {
            // Tone.start() must run from this physical change gesture on iOS.
            // Confirm the unlock audibly before recognition starts so the
            // user knows answer feedback is available.
            stop();
            setStatus('Enabling audio…');
            Sound.unlock()
                .then(() => Sound.playConfirmation())
                .catch(() => {
                    setStatus('Audio unavailable');
                    scheduleStart();
                });
        } else {
            stop();
            setStatus('Off');
        }
    }));

    const status = document.createElement('p');
    status.className = 'voice-settings-status';
    status.textContent = settings.enabled ? statusText : 'Off';
    statusNodes.add(status);
    group.appendChild(status);

    const hint = document.createElement('p');
    hint.className = 'voice-settings-hint';
    hint.textContent = 'Turning Voice Input on plays a test tick. Say “note C”, “C sharp”, “repeat”, or “next”. A high tick confirms a correct note; wrong notes buzz. Siri must be enabled on iPhone.';
    group.appendChild(hint);
    container.appendChild(group);
}
