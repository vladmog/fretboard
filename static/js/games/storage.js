/**
 * Game Settings & Stats Persistence
 * Every game persists settings under its own key ('fretboard-<game-id>-settings')
 * and stats as a sub-key of a shared stats blob (usually 'fretboard-games-stats').
 * These keys are a public contract with existing users — never rename them.
 * New games must use these stores instead of hand-rolling localStorage access.
 */

/**
 * Settings store with a stable object reference: load() merges saved values
 * into the same `settings` object, so games can hold onto it and mutate
 * properties directly before calling save().
 *
 * @param {string} storageKey - e.g. 'fretboard-note-id-settings'
 * @param {Object} defaults
 * @param {Function} [sanitize] - receives the settings object after a load,
 *   mutates it in place to clamp/repair persisted values
 */
export function createSettingsStore(storageKey, defaults, sanitize) {
    const settings = { ...defaults };

    function load() {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                Object.assign(settings, JSON.parse(saved));
                if (sanitize) sanitize(settings);
            }
        } catch (e) {
            console.error(`Failed to load settings (${storageKey}):`, e);
        }
        return settings;
    }

    function save() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(settings));
        } catch (e) {
            console.error(`Failed to save settings (${storageKey}):`, e);
        }
    }

    return { settings, load, save };
}

/**
 * Stats store over a shared localStorage blob. The blob maps a game key to
 * that game's stats. Leaf entries always have the shape
 * { tested, correct, totalTimeMs, timedCount }.
 *
 * @param {string} [storageKey='fretboard-games-stats']
 */
export function createStatsStore(storageKey = 'fretboard-games-stats') {
    function load() {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error(`Failed to load game stats (${storageKey}):`, e);
        }
        return {};
    }

    function save(stats) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(stats));
        } catch (e) {
            console.error(`Failed to save game stats (${storageKey}):`, e);
        }
    }

    /**
     * Merge one finished session into persisted stats.
     * @param {string} gameKey - sub-key inside the blob (e.g. 'note-id')
     * @param {Array<{path: string[], timeMs: number, correct: boolean}>} entries -
     *   path addresses the leaf, e.g. ['C'] (flat) or ['C', 'maj7'] (nested)
     */
    function commitSession(gameKey, entries) {
        const stats = load();
        if (!stats[gameKey]) stats[gameKey] = {};
        for (const e of entries) {
            let node = stats[gameKey];
            for (let i = 0; i < e.path.length - 1; i++) {
                if (!node[e.path[i]]) node[e.path[i]] = {};
                node = node[e.path[i]];
            }
            const leaf = e.path[e.path.length - 1];
            if (!node[leaf]) {
                node[leaf] = { tested: 0, correct: 0, totalTimeMs: 0, timedCount: 0 };
            }
            const entry = node[leaf];
            entry.tested++;
            if (e.correct) entry.correct++;
            entry.totalTimeMs = (entry.totalTimeMs || 0) + e.timeMs;
            entry.timedCount = (entry.timedCount || 0) + 1;
        }
        save(stats);
        return stats;
    }

    function clearGame(gameKey) {
        const stats = load();
        delete stats[gameKey];
        save(stats);
        return stats;
    }

    return { load, save, commitSession, clearGame };
}
