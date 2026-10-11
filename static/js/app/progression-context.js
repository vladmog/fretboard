/** Explicit scale metadata for the selected catalog or custom progression. */
import * as Progressions from '../core/progressions.js';
import { state } from './state.js';
export function getActiveProgression() {
    if (state.progSubMode !== 'play') return { referenceScale: state.builderReferenceScale };
    if (state._selectedUserProgId) return state.userProgressions.find(p => p.id === state._selectedUserProgId);
    const { categoryIndex, progressionIndex } = Progressions.flatIndexToCategory(state.progressionIndex);
    return Progressions.PROGRESSION_CATEGORIES[categoryIndex]?.progressions[progressionIndex];
}
export function getProgressionScale() { return getActiveProgression()?.referenceScale || null; }
