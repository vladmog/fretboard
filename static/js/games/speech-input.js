/**
 * Hands-free note and navigation input for games via Safari's Web Speech API.
 * Recognition feeds the same framework callbacks as note-keyboard.js, so all
 * scoring, wrong-answer sounds, builder resets, and progression stay shared.
 */

import { createSettingsStore } from './storage.js';
import { parseSpeechCommand } from './speech-commands.js';
import * as Voice from './voice.js';

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
let statusText = 'Off';
const statusNodes = new Set();

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
        document.visibilityState === 'visible' && !Voice.isSpeaking());
}

function scheduleStart(delay = 250) {
    clearTimeout(restartTimer);
    if (!canListen()) return;
    restartTimer = setTimeout(start, delay);
}

function createRecognition() {
    if (recognition || !Recognition) return recognition;
    recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
        starting = false;
        listening = true;
        setStatus('Listening');
    };

    recognition.onresult = (event) => {
        if (!handlers || modalIsOpen() || !handlers.isEligible()) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (!result.isFinal) continue;
            let parsed = null;
            for (let j = 0; j < result.length; j++) {
                parsed = parseSpeechCommand(result[j].transcript);
                if (parsed) break;
            }
            if (!parsed) continue;
            if (parsed.type === 'repeat') handlers.onRepeat();
            else if (parsed.type === 'advance') handlers.onAdvance();
            else parsed.notes.forEach(handlers.onNote);
        }
    };

    recognition.onerror = (event) => {
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

    recognition.onend = () => {
        starting = false;
        listening = false;
        if (canListen()) scheduleStart();
        else if (settings.enabled && Voice.isSpeaking()) setStatus('Paused while speaking');
    };
    return recognition;
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
        starting = false;
        if (error && error.name !== 'InvalidStateError') setStatus('Could not start');
        scheduleStart(500);
    }
}

function stop() {
    clearTimeout(restartTimer);
    const wasActive = listening || starting;
    starting = false;
    if (!recognition || !wasActive) return;
    try { recognition.abort(); } catch (error) { /* already stopped */ }
    listening = false;
}

Voice.onSpeakingChange(speaking => {
    if (!settings.enabled) return;
    if (speaking) {
        setStatus('Paused while speaking');
        stop();
    } else {
        scheduleStart(300);
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
        if (settings.enabled) start();
        else {
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
    hint.textContent = 'Say “note C”, “C sharp”, “repeat”, or “next”. Siri must be enabled on iPhone.';
    group.appendChild(hint);
    container.appendChild(group);
}
