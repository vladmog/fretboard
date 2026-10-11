import { test } from 'node:test';
import assert from 'node:assert/strict';

test('audio unlock plays only the newest pending selection, including across playback types', async () => {
    const played = [];
    const pending = [];
    let unlocked = false;
    class Node {
        constructor() { this.volume = { value: 0 }; }
        connect() { return this; }
        toDestination() { return this; }
        triggerAttackRelease(...args) { played.push(args); }
    }
    globalThis.Tone = {
        start: () => unlocked ? Promise.resolve() : new Promise(resolve => pending.push(resolve)),
        now: () => 10, Filter: Node, Reverb: Node, Limiter: Node, PolySynth: Node, Synth: Node
    };
    try {
        const sound = await import('../static/js/core/sound.js?startup-test');
        const olderChord = sound.playChord(['F3','A3','C4']);
        const olderNote = sound.playNote('F');
        const currentChord = sound.playChord(['E2','G2','B2']);
        assert.equal(played.length, 0);
        unlocked = true;
        // Resolve newest first to also cover out-of-order startup completion.
        pending.reverse().forEach(resolve => resolve());
        await Promise.all([olderChord, olderNote, currentChord]);
        assert.deepEqual(played.map(call => call[0]), ['E2','G2','B2']);
        played.length = 0;
        await sound.playChord(['C2','E2','G2']);
        assert.deepEqual(played.map(call => call[0]), ['C2','E2','G2']);
    } finally {
        delete globalThis.Tone;
    }
});
