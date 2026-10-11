import * as Sound from '../core/sound.js';
import { SOUND_DEFAULTS, SOUND_RANGES, loadSoundProfiles, saveSoundProfiles, exportSoundProfiles } from '../core/sound-profiles.js';
import { state } from './state.js';

export function initSoundSettings() {
    let storage;
    try { storage = window.localStorage; } catch { /* Private/restricted storage. */ }
    const profiles = loadSoundProfiles(storage);
    const host = document.getElementById('sound-settings');
    if (!host) return;
    host.innerHTML = `<summary>Playback sound</summary>
        <p id="sound-profile-name" class="settings-label"></p>
        <label>Pluck character<select id="sound-character"><option value="sine">Pure</option><option value="triangle">Soft</option><option value="sawtooth">Bright</option><option value="square">Hollow</option></select></label>
        <div id="sound-sliders"></div>
        <div class="sound-actions"><button type="button" id="sound-preview">Preview chord</button><button type="button" id="sound-reset">Reset this instrument</button><button type="button" id="sound-copy">Copy sound settings</button></div>
        <p id="sound-status" role="status" class="settings-hint"></p>
        <textarea id="sound-copy-fallback" aria-label="Sound settings to copy" readonly hidden></textarea>`;
    const definitions = [
        ['filterFrequency', 'Brightness', 50, v => `${v} Hz`],
        ['attack', 'Attack', 0.001, v => `${Math.round(v * 1000)} ms`],
        ['decay', 'Pluck decay', 0.01, v => `${v.toFixed(2)} s`],
        ['release', 'Release', 0.01, v => `${v.toFixed(2)} s`],
        ['reverbWet', 'Reverb', 0.01, v => `${Math.round(v * 100)}%`],
        ['volume', 'Volume', 1, v => `${v} dB`],
        ['strumDelay', 'Time between notes', 0.005, v => v === 0 ? 'Together' : `${Math.round(v * 1000)} ms`]
    ];
    const sliders = host.querySelector('#sound-sliders');
    for (const [key, label, step] of definitions) {
        const [min, max] = SOUND_RANGES[key];
        sliders.insertAdjacentHTML('beforeend', `<label for="sound-${key}">${label}<output id="sound-value-${key}" for="sound-${key}"></output></label><input id="sound-${key}" type="range" min="${min}" max="${max}" step="${step}">`);
    }
    const status = host.querySelector('#sound-status');
    const apply = () => {
        const profile = profiles[state.instrument];
        for (const [key, value] of Object.entries(profile)) Sound.setParam(key, value);
        host.querySelector('#sound-profile-name').textContent = `${state.instrument === 'bass' ? 'Bass' : 'Guitar'} sound`;
        host.querySelector('#sound-character').value = profile.oscillatorType;
        for (const [key, , , format] of definitions) {
            host.querySelector(`#sound-${key}`).value = profile[key];
            host.querySelector(`#sound-value-${key}`).textContent = format(profile[key]);
        }
    };
    const update = (key, value) => {
        profiles[state.instrument][key] = value;
        apply();
        status.textContent = saveSoundProfiles(storage, profiles) ? 'Saved for this instrument.' : 'Applied for this session; browser storage is unavailable.';
    };
    host.querySelector('#sound-character').addEventListener('change', e => update('oscillatorType', e.target.value));
    for (const [key] of definitions) host.querySelector(`#sound-${key}`).addEventListener('input', e => update(key, Number(e.target.value)));
    document.querySelectorAll('input[name="instrument"]').forEach(radio => radio.addEventListener('change', () => { apply(); status.textContent = ''; }));
    host.querySelector('#sound-reset').addEventListener('click', () => {
        profiles[state.instrument] = { ...SOUND_DEFAULTS[state.instrument] };
        apply();
        status.textContent = saveSoundProfiles(storage, profiles) ? 'Defaults restored for this instrument.' : 'Defaults restored for this session.';
    });
    host.querySelector('#sound-preview').addEventListener('click', async () => {
        try { await Sound.playChord(state.instrument === 'bass' ? ['C2', 'E2', 'G2'] : ['C3', 'E3', 'G3']); }
        catch { status.textContent = 'Audio unavailable. Try again after the page finishes loading.'; }
    });
    host.querySelector('#sound-copy').addEventListener('click', async () => {
        const text = exportSoundProfiles(profiles);
        const fallback = host.querySelector('#sound-copy-fallback');
        try { await navigator.clipboard.writeText(text); fallback.hidden = true; status.textContent = 'Copied guitar and bass settings.'; }
        catch {
            fallback.hidden = false; fallback.value = text; fallback.focus(); fallback.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch { /* Manual copy remains available. */ }
            status.textContent = copied ? 'Copied guitar and bass settings.' : 'Select and copy the settings below.';
            if (copied) fallback.hidden = true;
        }
    });
    apply();
}
