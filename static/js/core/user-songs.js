import { validateSongs } from './songs.js';
const KEY = 'fretboard-user-songs';
export function readUserSongs(storage = localStorage) {
    const raw = storage.getItem(KEY);
    return raw ? validateSongs(JSON.parse(raw)) : [];
}
export function saveUserSong(song, storage = localStorage) {
    validateSongs([song]);
    const songs = readUserSongs(storage);
    const index = songs.findIndex(item => item.id === song.id);
    if (index < 0) songs.push(song); else songs[index] = song;
    storage.setItem(KEY, JSON.stringify(songs));
}
export function deleteUserSong(id, storage = localStorage) {
    storage.setItem(KEY, JSON.stringify(readUserSongs(storage).filter(song => song.id !== id)));
}

/** Import harmonic identity in order; the destination section supplies key context. */
export function chordsForSongSection(chords) {
    return chords.map(chord => ({root: chord.root, type: chord.type,
        ...(chord.savedShape ? {savedShape: structuredClone(chord.savedShape), useShape:true} : {}),
        ...(chord.filters ? {filters:structuredClone(chord.filters)} : {})
    }));
}
