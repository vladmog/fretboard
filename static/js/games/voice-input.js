import { resolveSpokenAlternatives, parseConfirmation } from '../core/spoken-answer.js';

/** One recognition owner; generation guards invalidate every delayed event after a transition. */
export function createVoiceInput({ Recognition, speak, cancelSpeech, onAnswer, onCommand, onStatus, onListening = () => {},
    setTimer = setTimeout, clearTimer = clearTimeout, isHidden = () => document.hidden }) {
    let pending = null;
    let enabled = false, generation = 0, recognizer = null, timer = null, cueTimer = null, failures = 0;
    const status = (state, message) => onStatus({ state, message, enabled });
    function clear() {
        generation++;
        clearTimer(timer); timer = null;
        clearTimer(cueTimer); cueTimer = null;
        if (recognizer) {
            const old = recognizer; recognizer = null;
            old.onresult = old.onerror = old.onend = old.onstart = old.onaudiostart = null;
            try { old.abort(); } catch { /* Already ended. */ }
        }
    }
    function pause(message = 'Paused. Tap Resume voice to listen again.') {
        enabled = false; pending = null; clear(); cancelSpeech(); status('paused',message);
    }
    function fail(message) {
        pause(message); status('error',message);
        const token = generation;
        timer = setTimer(() => { if (generation === token) speak(message,()=>{}); },250);
    }
    function say(text, after, beforeSpeech, preserveConfirmation = false) {
        if (!preserveConfirmation) pending = null;
        if (!enabled) return;
        clear(); cancelSpeech();
        const token = generation;
        status(text ? 'speaking' : 'feedback',text || 'Playing feedback…');
        // Let the input release its audio session before starting speech output.
        timer = setTimer(() => {
            if (!enabled || token !== generation) return;
            const speakNow = () => {
                if (!enabled || token !== generation) return;
                const finishedSpeech = success => {
                    if (!enabled || token !== generation) return;
                    if (success === false) { fail('Speech output failed. Tap Resume voice to retry.'); return; }
                    timer = setTimer(() => {
                        if (enabled && token === generation) (after || listen)();
                    }, 450); // Speaker tail must not become an answer.
                };
                if (text) speak(text, finishedSpeech);
                else finishedSpeech(true);
            };
            if (!beforeSpeech) { speakNow(); return; }
            // Bound audio initialization; a failed sound must not block spoken feedback.
            let finished = false;
            const finishCue = () => {
                if (finished) return;
                finished = true;
                if (!enabled || token !== generation) return;
                clearTimer(cueTimer); cueTimer = null;
                speakNow();
            };
            cueTimer = setTimer(finishCue, 2000);
            try { Promise.resolve(beforeSpeech(() => enabled && token === generation)).then(finishCue, finishCue); }
            catch { finishCue(); }

        }, 250);
    }
    function retry(message) {
        clear();
        if (++failures > 3) { fail('Microphone stopped responding. Tap Resume voice to reconnect.'); return; }
        say(message, undefined, undefined, true);
    }
    function resumeAfterSilence() {
        clear();
        const token = generation;
        status('starting','Reconnecting microphone…');
        timer = setTimer(() => { if (enabled && token === generation) listen(); }, 1000);
    }
    function listen(initialQuestion) {
        if (!enabled) return;
        if (isHidden()) { pause('Paused while the app is in the background.'); return; }
        clear();
        const token = generation;
        const current = recognizer = new Recognition();
        current.lang = 'en-US'; current.continuous = false;
        current.interimResults = true; current.maxAlternatives = 5;
        let submitted = false, startedAt = null;
        const valid = () => enabled && generation === token && recognizer === current;
        status('starting','Connecting microphone…');
        current.onstart = () => {
            if (!valid()) return;
            startedAt = Date.now();
            if (initialQuestion) { say(initialQuestion); return; }
            status('listening','Listening — say a word starting A–G, optionally sharp or flat, or repeat or pause.');
            Promise.resolve(onListening(valid)).then(played => {
                if (valid() && played === false) fail('The listening chime could not start. Tap Resume voice to restore audio.');
            }).catch(() => { if (valid()) fail('The listening chime could not start. Tap Resume voice to restore audio.'); });
        };
        current.onresult = event => {
            if (!valid() || submitted) return;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (!result.isFinal) {
                    status('listening',`Hearing: ${result[0].transcript}`);
                    continue;
                }
                submitted = true;
                const confirmation = pending && parseConfirmation(result[0]?.transcript);
                const answer = resolveSpokenAlternatives(Array.from(result));
                const heard = result[0]?.transcript || '';
                clear(); failures = 0;
                if (pending && confirmation !== null) {
                    const note = pending.note; pending = null;
                    if (confirmation) onAnswer(note);
                    else say('Please say the note again.');
                    return;
                }
                if (pending && !answer) {
                    say(`Did you say ${pending.label}? Say yes or no.`, undefined, undefined, true); return;
                }
                pending = null;
                if (!answer) { say('Say that again?'); return; }
                if (answer.confirm !== undefined) {
                    pending = {note:answer.confirm,label:answer.label};
                    say(`Did you say ${answer.label}? Say yes or no.`, undefined, undefined, true); return;
                }
                status('processing',`Heard: ${heard}`);
                if (answer.command === 'pause') { pause(); return; }
                if (answer.command) onCommand(answer.command);
                else onAnswer(answer.note);
                return;
            }
        };
        current.onerror = event => {
            if (!valid()) return;
            const fatal = {
                'not-allowed':'Microphone permission was denied. Allow it in the browser, then tap Resume voice.',
                'service-not-allowed':'Speech recognition is unavailable. Check Siri and browser speech permissions.',
                'audio-capture':'No microphone is available. Check the microphone, then tap Resume voice.',
                'language-not-supported':'English speech recognition is unavailable on this device.'
            };
            if (event.error === 'no-speech') { resumeAfterSilence(); return; }
            if (fatal[event.error]) fail(fatal[event.error]);
            else retry(event.error === 'network' ? 'Speech connection interrupted. Trying again.' : 'I did not hear an answer. Please try again.');
        };
        current.onend = () => {
            if (!valid() || submitted) return;
            if (startedAt !== null && Date.now() - startedAt >= 1000) resumeAfterSilence();
            else retry('The microphone could not stay connected. Trying again.');
        };
        // Covers engines which stall without error/end, including mobile audio-session failures.
        timer = setTimer(() => {
            if (!valid()) return;
            if (startedAt !== null) resumeAfterSilence();
            else retry('The microphone stopped responding. Reconnecting.');
        }, 60000);
        try { current.start(); } catch { if (valid()) retry('The microphone could not start. Trying again.'); }
    }
    return {
        start(question) {
            if (!Recognition) { fail('Voice answers are not supported in this browser.'); return; }
            enabled = true; pending = null; failures = 0; listen(question); // Called directly by a user gesture for permission.
        }, say, pause,
        stop() { enabled = false; pending = null; clear(); cancelSpeech(); },
        get enabled() { return enabled; }
    };
}
