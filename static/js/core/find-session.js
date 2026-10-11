/** Preserve independent Find workspaces for each mode and instrument. */
export function saveFindSession(state) {
    state.findSessions ||= {};
    state.findSessions[`${state.mode}:${state.instrument}`] = structuredClone({
        markers: state.findMarkers, results: state.findResults, selected: state.findSelectedIndex
    });
}
export function restoreFindSession(state) {
    const saved = state.findSessions?.[`${state.mode}:${state.instrument}`];
    state.findMarkers = saved ? structuredClone(saved.markers) : {};
    state.findResults = saved ? structuredClone(saved.results) : [];
    state.findSelectedIndex = saved?.selected ?? -1;
}
