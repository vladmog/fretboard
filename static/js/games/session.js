/**
 * Games Session State
 * Owns the framework-level state shared between games/framework.js and the
 * individual game modules. Imports nothing, so it breaks what would otherwise
 * be an import cycle (framework -> game -> framework).
 */

export const gameState = {
    active: false,
    currentGame: 'interval-training',
    soundEnabled: true,
    previousMode: 'scale'
};

// When true, a tap anywhere in the game content (outside designated controls)
// advances to the next round. Set by the active game via markReady() once a
// question has been answered; cleared on advance and on state transitions.
let awaitingAdvance = false;

export function isAwaitingAdvance() {
    return awaitingAdvance;
}

export function setAwaitingAdvance(value) {
    awaitingAdvance = value;
}

/** Arm immediately; the framework checks readiness in click capture phase,
 * before the answer handler runs, so the answer click never advances itself. */
export function markReady() {
    awaitingAdvance = true;
}

export function getState() {
    return { ...gameState };
}
