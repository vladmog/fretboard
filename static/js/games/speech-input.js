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
        document.visibilityState === 'visible' && !Voice.isSpeaking() && !Sound.isPlaying());
}

function outputIsActive() {
    return Voice.isSpeaking() || Sound.isPlaying();
}

function scheduleStart(delay = 250) {
    clearTimeout(restartTimer);
    if (!canListen()) return;
    restartTimer = setTimeout(start, delay);
}

function createRecognition() {
    if (!Recognition) return null;
    const instance = new Recognition();
    recognition = instance;
    instance.lang = 'en-US';
    instance.continuous = true;
    instance.interimResults = false;
    instance.maxAlternatives = 5;

    instance.onstart = () => {
        if (recognition !== instance) return;
        starting = false;
        listening = true;
        setStatus('Listening');
    };

    instance.onresult = (event) => {
        if (recognition !== instance) return;
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
            if (parsed.type === 'repeat') {
                handlers.onRepeat();
                return;
            } else if (parsed.type === 'advance') {
                handlers.onAdvance();
                return;
            } else {
                parsed.notes.forEach(handlers.onNote);
            }
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
        scheduleStart(300);
    }
});

Sound.onPlaybackChange(playing => {
    if (!settings.enabled) return;
    if (playing) {
        setStatus('Paused for audio');
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
