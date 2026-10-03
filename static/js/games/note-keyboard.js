/**
 * Keyboard note input for chromatic-circle games.
 * Letters A–G pick a natural; holding ArrowUp while pressing a letter makes
 * it sharp, holding ArrowDown makes it flat. Enter/Space advance to the next
 * question. Attached by games/framework.js while games mode is active; the
 * framework routes notes to the current game's optional handleNoteKey(index).
 */

const NATURAL_INDEX = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

let handlers = null;
const held = { up: false, down: false };

// Elements whose own keyboard behavior must win (text entry, dropdowns).
// Checkboxes/radios/buttons don't count, so a focused hint toggle doesn't
// swallow note keys.
function isTypingTarget(el) {
    if (!el || !el.closest) return false;
    const field = el.closest('input, select, textarea, [contenteditable="true"]');
    if (!field) return false;
    return !(field.tagName === 'INPUT' && /^(checkbox|radio|button|submit|range)$/.test(field.type));
}

function isModalOpen() {
    const modal = document.getElementById('game-settings-modal');
    return !!(modal && getComputedStyle(modal).display !== 'none');
}

/** Pitch-class index (C = 0) for a letter plus held accidental arrows. */
export function noteIndexFor(letter, up, down) {
    const natural = NATURAL_INDEX[letter.toLowerCase()];
    if (natural === undefined) return null;
    return (natural + (up ? 1 : 0) - (down ? 1 : 0) + 12) % 12;
}

function onKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (isTypingTarget(e.target) || isModalOpen()) return;
        held[e.key === 'ArrowUp' ? 'up' : 'down'] = true;
        e.preventDefault();
        return;
    }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(e.target) || isModalOpen()) return;

    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlers.onAdvance();
        return;
    }

    if (e.key.length !== 1) return;
    const index = noteIndexFor(e.key, held.up, held.down);
    if (index === null) return;
    e.preventDefault();
    handlers.onNote(index);
}

function onKeyUp(e) {
    if (e.key === 'ArrowUp') held.up = false;
    else if (e.key === 'ArrowDown') held.down = false;
}

function clearHeld() {
    held.up = false;
    held.down = false;
}

/**
 * @param {Function} onNote - called with a pitch-class index 0–11
 * @param {Function} onAdvance - called on Enter/Space
 */
export function attach(onNote, onAdvance) {
    if (handlers) detach();
    handlers = { onNote, onAdvance };
    clearHeld();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
}

export function detach() {
    if (!handlers) return;
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clearHeld);
    handlers = null;
    clearHeld();
}
