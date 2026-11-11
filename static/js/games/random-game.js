import { createSettingsStore } from './storage.js';
import { setRoundRoute } from './round-routing.js';
import { setAwaitingAdvance } from './session.js';
import * as Voice from './voice.js';

export function createRandomGame(games, getNames, random = Math.random) {
    const ids = Object.keys(games);
    const store = createSettingsStore('fretboard-random-settings', { included: [...ids] }, settings => {
        settings.included = Array.isArray(settings.included)
            ? settings.included.filter(id => ids.includes(id)) : [...ids];
    });
    store.load();
    let current = null, previous = null;
    const startedGames = new Set();
    const element = (tag, text) => {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        return node;
    };
    function cleanup() {
        setRoundRoute(null);
        current?.cleanup?.();
        current = null;
        setAwaitingAdvance(false);
        Voice.cancel();
    }
    function next() {
        cleanup();
        const included = store.settings.included;
        if (!included.length) { renderTitlePage(); return; }
        const alternatives = included.filter(id => id !== previous);
        const pool = alternatives.length ? alternatives : included;
        const id = pool[Math.floor(random() * pool.length)];
        previous = id;
        current = games[id];
        // No route while entering the first round; all later advance paths,
        // including voice and game-owned buttons, return here.
        const started = startedGames.has(id) && current.continueRound
            ? current.continueRound() : current.startRound();
        if (started === false) { renderTitlePage(); return; }
        startedGames.add(id);
        setRoundRoute(next);
    }
    function renderTitlePage() {
        cleanup();
        const root = element('div');
        root.className = 'game-title-page';
        root.append(element('h1', 'Random'), element('p', 'A different game each round, using its own saved settings.'));
        const start = element('button', 'Start');
        start.className = 'game-start-btn';
        start.disabled = !store.settings.included.length;
        start.addEventListener('click', () => { previous = null; startedGames.clear(); next(); });
        root.append(start);
        if (start.disabled) root.append(element('p', 'Choose at least one game in settings.'));
        document.getElementById('game-content').replaceChildren(root);
    }
    function renderSettings(body) {
        body.replaceChildren(element('p', 'Included games. Each uses its own saved settings; changes apply next round.'));
        for (const id of ids) {
            const group = element('div');
            group.className = 'game-setting-group';
            const label = element('label');
            label.className = 'game-setting-label';
            const input = element('input');
            input.type = 'checkbox';
            input.checked = store.settings.included.includes(id);
            input.addEventListener('change', () => {
                store.settings.included = input.checked
                    ? [...new Set([...store.settings.included, id])]
                    : store.settings.included.filter(value => value !== id);
                store.save();
                if (!current) renderTitlePage();
            });
            label.append(input, ` ${getNames()[id]}`);
            group.append(label);
            body.append(group);
        }
    }
    return { renderTitlePage, renderSettings, cleanup, advance: next,
        handleNoteKey: (...args) => current?.handleNoteKey?.(...args),
        repeatQuestion: () => current?.repeatQuestion?.(),
        pauseVoice: () => current?.pauseVoice?.() };
}
