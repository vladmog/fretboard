/** Song records are curated in static/data/songs.json as songs are analyzed. */
import * as MusicTheory from './music-theory.js';
import { formatProgressionDegree } from './progression-degree.js';
const validNote = note => typeof note === 'string' && /^[A-G](?:#{1,2}|b{1,2})?$/.test(note);

export function buildSongSection(song, section) {
    if (!Array.isArray(section.chords) || !section.chords.length) throw new Error('A section needs chords.');
    return section.chords.map(chord => {
        // Explicit null means unknown; omission inherits the parent context.
        const context = key => Object.hasOwn(chord, key) ? chord[key]
            : Object.hasOwn(section, key) ? section[key] : song[key] ?? null;
        const referenceKey = context('referenceKey');
        const referenceScale = context('referenceScale');
        if (referenceKey !== null && !validNote(referenceKey)) throw new Error('Invalid reference key.');
        if (referenceScale !== null && !MusicTheory.SCALES[referenceScale]) throw new Error('Invalid reference scale.');
        if (!validNote(chord.root) || !MusicTheory.CHORD_TYPES[chord.type]) {
            throw new Error('Invalid song chord.');
        }
        return {
            root: chord.root, type: chord.type,
            symbol: MusicTheory.buildChord(chord.root, chord.type).symbol,
            progressionDegree: referenceKey && chord.degree ? formatProgressionDegree(chord.degree, chord.type) : null,
            referenceKey, referenceScale, songId: song.id, songSection: section.name
        };
    });
}

export function validateSongs(records) {
    if (!Array.isArray(records)) throw new Error('Song catalog must be an array.');
    const ids = new Set();
    for (const song of records) {
        if (!song.id || ids.has(song.id) || !song.title || !song.artist || !song.sections?.length) {
            throw new Error('Songs need unique IDs, title, artist, and sections.');
        }
        ids.add(song.id);
        for (const section of song.sections) {
            if (!section.name) throw new Error('Song sections need names.');
            buildSongSection(song, section);
        }
    }
    return records;
}

export async function loadSongs() {
    const response = await fetch(new URL('../../data/songs.json', import.meta.url));
    if (!response.ok) throw new Error('Could not load the song catalog.');
    return validateSongs(await response.json());
}
