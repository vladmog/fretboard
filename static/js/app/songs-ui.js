import { songShape } from '../core/song-shape.js';
import { voicingNotes } from '../core/voicing-audio.js';
import { readUserSongs } from '../core/user-songs.js';
/** Browse curated song analyses and import sections into the persistent chord list. */
import * as MusicTheory from '../core/music-theory.js';
import * as Sound from '../core/sound.js';
import { buildSongSection, loadSongs } from '../core/songs.js';
import { state, saveChordList } from './state.js';
import { renderChordList } from './chord-list.js';
import { updateDisplay } from './display.js';

function contextLabel(key, scale) {
    return key ? `${key} ${MusicTheory.SCALES[scale]?.name || '(scale not assigned)'}` : 'Key not assigned';
}

function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
}

export async function initSongs() {
    const container = document.getElementById('song-browser');
    if (!container) return;
    try {
        const warnings = [];
        let catalog = [], saved = [];
        try { catalog = await loadSongs(); } catch (error) { warnings.push(`Built-in songs unavailable: ${error.message}`); }
        try { saved = readUserSongs(); } catch (error) { warnings.push(`Saved songs could not be read: ${error.message}. Stored data has not been changed.`); }
        const songs = [...catalog, ...saved];
        container.replaceChildren();
        warnings.forEach(message => container.append(element('p', message)));
        if (!songs.length) {
            container.append(element('p', 'No songs saved yet. Ask for a song analysis to add its key and progressions here.'));
            return;
        }
        const label = element('label', 'Song');
        label.htmlFor = 'song-select';
        const select = element('select');
        select.id = 'song-select';
        for (const song of songs) {
            const option = element('option', `${song.title} — ${song.artist}`);
            option.value = song.id;
            select.append(option);
        }
        const details = element('div');
        container.append(label, select, details);
        const render = () => {
            const song = songs.find(item => item.id === select.value);
            state.songPreview = null;
            state.selectedChordIndex = -1;
            details.replaceChildren();
            if (song.version) details.append(element('p', song.version));
            if (song.tuning && song.tuning !== 'standard') details.append(element('p', `Tuning: ${song.tuning}`));
            details.append(element('p', song.artist));
            if (song.referenceKey) details.append(element('p', contextLabel(song.referenceKey, song.referenceScale)));
            const analysis = element('details');
            analysis.append(element('summary', 'Analysis & sources'));
            if (song.notes) analysis.append(element('p', song.notes));
            if (song.bassStudy) {
                const bassStudy = element('details');
                bassStudy.append(element('summary', 'Bass study'), element('p', song.bassStudy.notes));
                details.append(bassStudy);
            }
            for (const section of song.sections) {
                const chords = buildSongSection(song, section);
                const block = element('details', '', 'song-section');
                block.append(element('summary', section.name));
                block.append(element('p', contextLabel(Object.hasOwn(section, 'referenceKey') ? section.referenceKey : song.referenceKey, Object.hasOwn(section, 'referenceScale') ? section.referenceScale : song.referenceScale)));
                if (section.notes) block.append(element('p', section.notes));
                const list = element('div', '', 'scale-chords-list');
                for (const chord of chords) {
                    const button = element('button', '', 'scale-chord-item');
                    button.type = 'button';
                    button.title = contextLabel(chord.referenceKey, chord.referenceScale);
                    button.append(element('span', chord.progressionDegree || '—', 'numeral'), element('span', chord.symbol, 'chord-name'));
                    button.addEventListener('click', () => {
                        if (state.soundEnabled) {
                            const built = MusicTheory.buildChord(chord.root, chord.type);
                            const octave = chord.referenceKey && MusicTheory.getNoteIndex(chord.root) < MusicTheory.getNoteIndex(chord.referenceKey) ? 4 : 3;
                            Sound.playChord(chord.savedShape ? voicingNotes(songShape(chord,state.instrument),state.instrument) : built.notes, octave);
                        }
                        state.songPreview = chord;
                        state.selectedChordIndex = -1;
                        container.querySelectorAll('.scale-chord-item').forEach(item => item.classList.toggle('selected', item === button));
                        updateDisplay();
                    });
                    list.append(button);
                }
                const add = element('button', 'Add section to chord list', 'btn btn-add');
                add.type = 'button';
                add.setAttribute('aria-label', `Add ${section.name} to chord list`);
                const status = element('p');
                status.setAttribute('role', 'status');
                add.addEventListener('click', () => {
                    state.chordList.push(...chords.map(chord => ({ ...chord })));
                    saveChordList();
                    renderChordList();
                    status.textContent = `Added ${section.name} (${chords.length} chords).`;
                });
                block.append(add, list, status);
                details.append(block);
            }
            for (const source of song.sources || []) {
                try {
                    const url = new URL(source.url);
                    if (!['https:', 'http:'].includes(url.protocol)) continue;
                    const link = element('a', source.title || url.hostname);
                    link.href = url.href;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    analysis.append(link);
                } catch { /* Ignore invalid source URLs. */ }
            }
            if (song.notes || song.sources?.length) details.append(analysis);
            if (state.mode === 'song') updateDisplay();
        };
        select.addEventListener('change', render);
        render();
    } catch (error) {
        container.replaceChildren(element('p', `Songs unavailable: ${error.message}`));
    }
}
