/**
 * Voice announcements for game questions (Web Speech API).
 * One global setting shared by every game, persisted under
 * 'fretboard-voice-settings'. Off by default. Games call speak() with plain
 * text built from spokenNote()/spokenName(); the framework renders the
 * settings section below each game's own settings.
 */

import { createSettingsStore } from './storage.js';

const synth = (typeof window !== 'undefined' && 'speechSynthesis' in window) ? window.speechSynthesis : null;

const store = createSettingsStore('fretboard-voice-settings', {
    enabled: false,
    voiceURI: null,
    rate: 1
}, s => {
    s.enabled = s.enabled === true;
    if (typeof s.voiceURI !== 'string') s.voiceURI = null;
    if (![0.9, 1, 1.1].includes(s.rate)) s.rate = 1;
});
const settings = store.settings;
store.load();

// ---- Voice selection ----

// Classic macOS novelty/robot voices — never auto-picked
const NOVELTY = /^(fred|albert|zarvox|bells|bubbles|whisper|trinoids|ralph|junior|kathy|bad news|good news|organ|cellos|boing|jester|superstar|wobble|bahh|grandma|grandpa|rocko|shelley|sandy|flo|eddy|reed)\b/i;
const HIGH_QUALITY = /premium|enhanced|natural|neural/i;
const KNOWN_GOOD = /^(ava|samantha|zoe|evan|allison|susan|tom|nathan|joelle|noelle|serena|daniel|karen|moira|google us english|google uk english female|microsoft .*online)/i;

let voices = [];

function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang));
}

if (synth) {
    loadVoices();
    if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', loadVoices);
    } else {
        synth.onvoiceschanged = loadVoices;
    }
}

function voiceScore(v) {
    let score = 0;
    if (HIGH_QUALITY.test(v.name)) score += 100;
    if (KNOWN_GOOD.test(v.name)) score += 50;
    if (NOVELTY.test(v.name)) score -= 1000;
    if (/^en[-_]US/i.test(v.lang)) score += 10;
    if (v.localService) score += 5;
    return score;
}

function pickVoice() {
    if (voices.length === 0) loadVoices();
    if (settings.voiceURI) {
        const chosen = voices.find(v => v.voiceURI === settings.voiceURI);
        if (chosen) return chosen;
    }
    let best = null;
    voices.forEach(v => {
        if (!best || voiceScore(v) > voiceScore(best)) best = v;
    });
    return best;
}

// ---- Speaking ----

let lastText = '';
let currentToken = 0;
let speaking = false;
const speakingListeners = new Set();

function setSpeaking(value) {
    if (speaking === value) return;
    speaking = value;
    speakingListeners.forEach(listener => listener(value));
}

export function isEnabled() {
    return !!(synth && settings.enabled);
}

export function isSpeaking() {
    return speaking;
}

export function onSpeakingChange(listener) {
    speakingListeners.add(listener);
    return () => speakingListeners.delete(listener);
}

/**
 * Speak text if voice is enabled. onDone runs once after the utterance ends
 * (or immediately when voice is off), so callers can sequence audio after
 * the announcement. A newer speak()/cancel() supersedes a pending onDone.
 */
export function speak(text, onDone) {
    const token = ++currentToken;
    const finish = () => {
        if (token !== currentToken) return;
        currentToken++;
        setSpeaking(false);
        if (onDone) onDone();
    };
    if (!text || !isEnabled()) {
        if (onDone) onDone();
        return;
    }
    lastText = text;
    if (synth.speaking || synth.pending) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
    }
    utterance.rate = settings.rate;
    utterance.onend = finish;
    utterance.onerror = finish;
    // Some engines never fire onend; don't hold follow-up audio hostage
    setTimeout(finish, 1500 + text.length * 90);
    setSpeaking(true);
    synth.speak(utterance);
}

/** Replay the most recent announcement. */
export function repeat() {
    if (lastText) speak(lastText);
}

export function cancel() {
    currentToken++;
    if (synth) synth.cancel();
    setSpeaking(false);
}

// ---- Spoken text helpers ----

const ORDINALS = {
    '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth',
    '6th': 'sixth', '7th': 'seventh', '8th': 'eighth', '9th': 'ninth',
    '10th': 'tenth', '11th': 'eleventh', '12th': 'twelfth', '13th': 'thirteenth',
    '14th': 'fourteenth'
};
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'];

/** 'C#' -> 'C sharp', 'Bb' -> 'B flat' */
export function spokenNote(name) {
    const m = /^([A-Ga-g])(#|b)?$/.exec(name || '');
    if (!m) return name || '';
    const letter = m[1].toUpperCase();
    if (m[2] === '#') return letter + ' sharp';
    if (m[2] === 'b') return letter + ' flat';
    return letter;
}

/** 'Dominant 7th sus4' -> 'dominant seventh sus four' */
export function spokenName(name) {
    return (name || '')
        .replace(/-/g, ' ')
        .replace(/\b(\d+)(st|nd|rd|th)\b/gi, (w) => ORDINALS[w.toLowerCase()] || w)
        .replace(/([a-z]+)(\d+)\b/gi, '$1 $2')
        .replace(/\b(\d+)\b/g, (d) => NUMBERS[+d] || d)
        .toLowerCase();
}

// ---- Settings UI ----

function makeSelect(options, value, onChange) {
    const select = document.createElement('select');
    select.className = 'game-setting-select';
    options.forEach(([val, text]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = text;
        if (String(val) === String(value)) opt.selected = true;
        select.appendChild(opt);
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
}

/** Render the global voice settings into the given (cleared) container. */
export function renderVoiceSettings(container) {
    container.innerHTML = '';

    const group = document.createElement('div');
    group.className = 'game-setting-group';
    const label = document.createElement('label');
    label.className = 'game-setting-label';
    label.textContent = 'Voice Announce';
    group.appendChild(label);

    if (!synth) {
        const note = document.createElement('p');
        note.className = 'voice-settings-hint';
        note.textContent = 'Speech is not supported in this browser.';
        group.appendChild(note);
        container.appendChild(group);
        return;
    }

    const row = document.createElement('div');
    row.className = 'voice-settings-row';

    row.appendChild(makeSelect([['off', 'Off'], ['on', 'On']], settings.enabled ? 'on' : 'off', (val) => {
        settings.enabled = val === 'on';
        store.save();
        if (!settings.enabled) cancel();
    }));

    row.appendChild(makeSelect([[0.9, 'Slower'], [1, 'Normal'], [1.1, 'Faster']], settings.rate, (val) => {
        settings.rate = parseFloat(val);
        store.save();
    }));

    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'game-setting-btn voice-settings-test';
    testBtn.textContent = 'Test';
    testBtn.addEventListener('click', () => {
        const wasEnabled = settings.enabled;
        settings.enabled = true;
        speak('C sharp minor seventh');
        settings.enabled = wasEnabled;
    });
    row.appendChild(testBtn);
    group.appendChild(row);

    const voiceSelectHolder = document.createElement('div');
    voiceSelectHolder.className = 'voice-settings-voice';
    group.appendChild(voiceSelectHolder);

    const renderVoiceSelect = () => {
        loadVoices();
        const ranked = voices.filter(v => !NOVELTY.test(v.name)).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
        const auto = pickVoice();
        const options = [['', 'Auto' + (auto ? ` (${auto.name})` : '')]]
            .concat(ranked.map(v => [v.voiceURI, `${v.name} — ${v.lang}`]));
        voiceSelectHolder.innerHTML = '';
        voiceSelectHolder.appendChild(makeSelect(options, settings.voiceURI || '', (val) => {
            settings.voiceURI = val || null;
            store.save();
        }));
    };
    renderVoiceSelect();
    if (voices.length === 0) setTimeout(renderVoiceSelect, 500);

    const hint = document.createElement('p');
    hint.className = 'voice-settings-hint';
    hint.textContent = 'For the most natural sound, download a Premium or Enhanced voice in your device’s Spoken Content settings, then pick it here.';
    group.appendChild(hint);

    container.appendChild(group);
}
