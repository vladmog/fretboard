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

/**
 * Called by the active game once a question has been answered. Defers arming
 * the flag to the next macrotask so that the click which produced the answer
 * finishes bubbling without immediately advancing — the NEXT tap advances.
 * The identity guard prevents a deferred arm from leaking into a different
 * game if the user switches games during the reveal.
 */
export function markReady() {
    const g = gameState.currentGame;
    setTimeout(() => {
        if (gameState.currentGame === g) awaitingAdvance = true;
    }, 0);
}

export function getState() {
    return { ...gameState };
}
