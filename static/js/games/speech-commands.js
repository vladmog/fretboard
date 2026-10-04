/**
 * Turn short speech-recognition transcripts into hands-free game commands.
 * Notes use pitch-class indices (C = 0), matching note-keyboard.js and the
 * optional game handleNoteKey() hook.
 */

const NOTE_WORDS = new Map([
    ['a', 9], ['ay', 9], ['hey', 9],
    ['b', 11], ['be', 11], ['bee', 11],
    ['c', 0], ['see', 0], ['sea', 0],
    ['d', 2], ['dee', 2],
    ['e', 4],
    ['f', 5], ['eff', 5],
    ['g', 7], ['gee', 7]
]);

const FILLER_WORDS = new Set(['and', 'then', 'note', 'notes', 'play', 'input', 'the']);

function normalize(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[♯#]/g, ' sharp ')
        .replace(/♭/g, ' flat ')
        .replace(/-/g, ' ')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function commandFor(text) {
    if (/^(repeat|again|repeat (the )?question|say (it|that) again|what was (it|that))$/.test(text)) {
        return { type: 'repeat' };
    }
    if (/^(next|continue|advance|next question|go on)$/.test(text)) {
        return { type: 'advance' };
    }
    return null;
}

/** Parse one final recognition transcript. Returns null when it is unsafe. */
export function parseSpeechCommand(transcript) {
    const text = normalize(transcript);
    if (!text) return null;

    const command = commandFor(text);
    if (command) return command;

    // Some recognizers return a tightly-spelled sequence such as "ceg".
    const expanded = /^[a-g]{2,}$/.test(text) ? text.split('') : text.split(' ');
    const notes = [];

    for (let i = 0; i < expanded.length; i++) {
        const token = expanded[i];
        if (FILLER_WORDS.has(token)) continue;
        const natural = NOTE_WORDS.get(token);
        if (natural === undefined) return null;

        let offset = 0;
        const accidental = expanded[i + 1];
        if (accidental === 'sharp') {
            offset = 1;
            i++;
        } else if (accidental === 'flat') {
            offset = -1;
            i++;
        } else if (accidental === 'natural') {
            i++;
        }
        notes.push((natural + offset + 12) % 12);
    }

    return notes.length ? { type: 'notes', notes } : null;
}
