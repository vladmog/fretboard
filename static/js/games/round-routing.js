let route = null;
export function setRoundRoute(next) { route = next; }
export function routeNextRound() {
    if (!route) return false;
    route();
    return true;
}
