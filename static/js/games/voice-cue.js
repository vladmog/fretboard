/** Resume after speech/microphone audio-session changes; never silently skip a suspended cue. */
let context;
function getContext() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    if (!context || context.state === 'closed') context = new Audio();
    return context;
}
export function unlockVoiceCue() {
    const audio = getContext();
    if (audio) audio.resume().catch(()=>{});
}
export async function playVoiceCue(isCurrent = () => true, tones = [[0,880],[.14,1175]]) {
    const audio = getContext();
    if (!audio) return false;
    if (audio.state !== 'running') {
        let timeout;
        try {
            await Promise.race([
                audio.resume(),
                new Promise((_, reject) => { timeout = setTimeout(()=>reject(new Error('Audio resume timed out')),1000); })
            ]);
        } catch { return false; }
        finally { clearTimeout(timeout); }
    }
    if (!isCurrent()) return true; // Stale requests must not sound in the next question.
    if (audio.state !== 'running') return false;
    // Raise cues from the quiet setting without restoring the overpowering original peak.
    const peakGain = 0.06;
    const now = audio.currentTime;
    for (const [offset, frequency] of tones) {
        const oscillator=audio.createOscillator(), gain=audio.createGain();
        oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(0,now+offset);
        gain.gain.linearRampToValueAtTime(peakGain,now+offset+.01);
        gain.gain.setValueAtTime(peakGain,now+offset+.08);
        gain.gain.linearRampToValueAtTime(0,now+offset+.12);
        oscillator.connect(gain);gain.connect(audio.destination);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
        oscillator.start(now+offset);oscillator.stop(now+offset+.125);
    }
    return true;
}

/** A rising major arpeggio distinguishes success from the two-tone listening cue. */
export function playPositiveCue(isCurrent) {
    return playVoiceCue(isCurrent, [[0,523.25],[.13,659.25],[.26,783.99]]);
}
