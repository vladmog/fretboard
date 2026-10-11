/** Preserve old favorites as custom entries without inventing scale metadata. */
import { state, saveUserProgressions } from './state.js';
export async function preserveLegacyFavorites() {
    const migrationKey = 'fretboard-catalog-migrated-favorites';
    let migrated = [];
    try { migrated = JSON.parse(localStorage.getItem(migrationKey) || '[]'); } catch { /* retry intact legacy data */ }
    const keys = state.favoriteProgressions.filter(key => key.includes('|') && !migrated.includes(key));
    if (!keys.length) return;
    try {
        const response = await fetch(new URL('../../data/progressions-legacy.json', import.meta.url));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const categories = await response.json();
        let changed = false;
        let id = Math.max(Date.now(), ...state.userProgressions.map(p => Number(p.id) || 0));
        for (const category of categories) for (const progression of category.progressions) {
            const legacyFavoriteKey = `${category.name}|${progression.numerals}`;
            if (!keys.includes(legacyFavoriteKey) || state.userProgressions.some(p => p.legacyFavoriteKey === legacyFavoriteKey)) continue;
            state.userProgressions.push({ ...progression, id: ++id, legacyFavoriteKey, referenceKey: null, referenceScale: null });
            changed = true;
        }
        if (changed) saveUserProgressions();
        // Record completion so deleting an imported custom entry does not resurrect it.
        localStorage.setItem(migrationKey, JSON.stringify([...new Set([...migrated, ...keys])]));
    } catch (error) { console.error('Could not preserve legacy favorites; original favorites remain saved.', error); }
}
