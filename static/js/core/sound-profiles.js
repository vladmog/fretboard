/** Persistent instrument sound preferences; independent of fretboard pitches. */
export const SOUND_KEY = 'fretboard-sound-profiles-v1';
export const SOUND_DEFAULTS = {
    guitar: { oscillatorType: 'sawtooth', attack: 0.005, decay: 0.49, release: 0.71, filterFrequency: 4140, reverbWet: 0.5, volume: -12, strumDelay: 0.08 },
    bass: { oscillatorType: 'sawtooth', attack: 0.001, decay: 0.84, release: 0.79, filterFrequency: 2700, reverbWet: 0.29, volume: -12, strumDelay: 0.155 }
};
export const SOUND_RANGES = { attack: [0.001, 0.2], decay: [0.05, 2], release: [0.05, 3], filterFrequency: [200, 10000], reverbWet: [0, 1], volume: [-36, -6], strumDelay: [0, 0.5] };
export function sanitizeProfile(value, instrument) {
    const result = { ...SOUND_DEFAULTS[instrument] };
    if (!value || typeof value !== 'object') return result;
    if (['sine', 'triangle', 'sawtooth', 'square'].includes(value.oscillatorType)) result.oscillatorType = value.oscillatorType;
    for (const [key, [min, max]] of Object.entries(SOUND_RANGES)) {
        if (typeof value[key] === 'number' && Number.isFinite(value[key])) result[key] = Math.max(min, Math.min(max, value[key]));
    }
    return result;
}
export function loadSoundProfiles(storage) {
    let saved;
    try { saved = JSON.parse(storage.getItem(SOUND_KEY)); } catch { /* Use defaults. */ }
    return Object.fromEntries(['guitar', 'bass'].map(i => [i, sanitizeProfile(saved?.[i], i)]));
}
export function saveSoundProfiles(storage, profiles) {
    try { storage.setItem(SOUND_KEY, JSON.stringify(profiles)); return true; } catch { return false; }
}
export function exportSoundProfiles(profiles) {
    return JSON.stringify({ version: 1, guitar: sanitizeProfile(profiles.guitar, 'guitar'), bass: sanitizeProfile(profiles.bass, 'bass') }, null, 2);
}
