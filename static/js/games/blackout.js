/**
 * AMOLED blackout for endless keyboard/voice play.
 * Long-press on empty space in the games panel covers the whole screen with
 * pure black (no visible elements, so nothing burns in on an always-on OLED
 * screen); a tap restores it. Keyboard input keeps reaching the game while
 * blacked out. Enabled by games/framework.js only for games that take
 * keyboard input. Installed iOS apps use black-translucent status-bar mode,
 * so the page background also paints behind the system status bar.
 */

const HOLD_MS = 600;
const MOVE_TOLERANCE_PX = 10;
// Ignore the click iOS may fire when the triggering press is released
const RELEASE_GRACE_MS = 400;

let isEligible = () => false;
let overlay = null;
let holdTimer = null;
let pressStart = null;
let releasedAt = 0;
let triggerHeld = false;

// Status bar follows the page, not the overlay: blacken both
function setPageBlack(on) {
    document.documentElement.classList.toggle('amoled-on', on);
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute('content', on ? '#000000' : '#ffffff');
    });
}

// Real controls and the SVG answer surfaces keep their own press behavior
function isWhitespace(target) {
    return !target.closest('button, select, input, textarea, label, a, svg, #game-settings-modal');
}

function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
    pressStart = null;
}

function onPointerDown(e) {
    if (!e.isPrimary || isActive() || !isEligible() || !isWhitespace(e.target)) return;
    pressStart = { x: e.clientX, y: e.clientY };
    holdTimer = setTimeout(() => {
        holdTimer = null;
        pressStart = null;
        triggerHeld = true;
        show();
    }, HOLD_MS);
}

function onPointerMove(e) {
    if (!pressStart) return;
    if (Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > MOVE_TOLERANCE_PX) {
        cancelHold();
    }
}

function onPointerEnd() {
    cancelHold();
    if (triggerHeld) {
        triggerHeld = false;
        releasedAt = Date.now();
    }
}

function onOverlayClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (triggerHeld || Date.now() - releasedAt < RELEASE_GRACE_MS) return;
    hide();
}

function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'amoled-blackout';
    overlay.addEventListener('click', onOverlayClick);
    overlay.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(overlay);
    return overlay;
}

function show() {
    const sel = window.getSelection && window.getSelection();
    if (sel) sel.removeAllRanges();
    ensureOverlay().style.display = 'block';
    setPageBlack(true);
}

export function hide() {
    if (overlay) overlay.style.display = 'none';
    setPageBlack(false);
}

export function isActive() {
    return !!(overlay && overlay.style.display === 'block');
}

/** Start listening on the games panel; eligible() is checked per press. */
export function attach(eligible) {
    isEligible = eligible;
    const panel = document.getElementById('games-panel');
    if (!panel) return;
    panel.addEventListener('pointerdown', onPointerDown);
    panel.addEventListener('pointermove', onPointerMove);
    panel.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerup', onPointerEnd);
    document.addEventListener('pointercancel', onPointerEnd);
}

export function detach() {
    cancelHold();
    triggerHeld = false;
    hide();
    isEligible = () => false;
    const panel = document.getElementById('games-panel');
    if (panel) {
        panel.removeEventListener('pointerdown', onPointerDown);
        panel.removeEventListener('pointermove', onPointerMove);
        panel.removeEventListener('contextmenu', onContextMenu);
    }
    document.removeEventListener('pointerup', onPointerEnd);
    document.removeEventListener('pointercancel', onPointerEnd);
}

// Suppress the long-press menu (desktop right-click hold, Android) mid-hold
function onContextMenu(e) {
    if (holdTimer || triggerHeld) e.preventDefault();
}
