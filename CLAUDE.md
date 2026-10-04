# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Flask dev server (localhost:5000, debug mode)
python app.py
```

To test the static GitHub Pages entry point, serve the repo root over HTTP:
`python3 -m http.server` and open `/index.html`. Opening it via `file://`
does NOT work — ES modules require an HTTP origin.

There is no build step, test framework, or linter configured, and there never
should be a build step: the app must run as-is on both Flask and GitHub Pages.

## Deployment

Two HTML entry points exist:
- `templates/index.html` — Flask template (uses `url_for()` for asset paths)
- `index.html` — Static copy for GitHub Pages (hardcoded relative paths)

**Both must be kept in sync** when changing HTML structure. They differ only
in asset-path syntax. No inline scripts or inline event handlers — ever.

## Architecture

Interactive guitar fretboard visualizer for scales, chords, intervals, and
training games. Native ES modules with no bundler; a minimal Flask backend
only serves the template. All music/game logic is client-side.

The HTML loads exactly two scripts: Tone.js (classic, CDN) and
`static/js/main.js` (the only `type="module"` tag — the entry point that
imports everything else and runs `init()`).

### Module layout (`static/js/`)

Three layers; imports flow downward only (app → games is allowed via the
framework; nothing imports upward into `main.js`):

```
main.js                  Entry point: init(), resize handler, side-effect imports
core/                    Pure/reusable — no app-UI state, no knowledge of app/ or games/
  music-theory.js        All theory data + pure functions (source of truth for notes/scales/chords)
  fretboard.js           SVG fretboard renderer; createFretboard() factory
  sound.js               Tone.js wrapper (lazy audio-node construction)
  progressions.js        Roman-numeral parsing + progression data (fetched from static/data/progressions.json)
  weighted-selection.js  Weighted random question sampling
app/                     Main visualizer UI
  state.js               THE single mutable state object + localStorage persistence; imports nothing from app/
  display.js             The six mode renderers + updateDisplay() hub (full re-render on state change)
  chord-list.js          Chord list panel + scale-chords strip
  progressions-ui.js     Prog sub-modes: builder CRUD, favorites, chord strip
  find-mode.js           f.chord / f.scale tap input and results
  controls.js            setMode(), updateTypeDropdown(), relocateAddButton()
  events.js              All DOM event wiring; top of the app graph
  rotation-toggle.js     Marker-text rotation on mobile tap
games/                   Training games (plugin architecture)
  framework.js           Registry + activate/deactivate + settings modal + tap-to-advance
  session.js             Shared framework state (gameState, markReady); imports nothing
  storage.js             createSettingsStore / createStatsStore — ALL game persistence
  game-utils.js          shuffleArray, stat colors, formatTime, reaction-time chart, round-count helpers
  note-keyboard.js       Keyboard note input (a–g; uppercase or hold ↑ = sharp, hold ↓ = flat; Enter next-or-repeat, Space next)
  voice.js               Global voice announcements (speechSynthesis) + its settings section
  speech-input.js        Voice note/repeat/next input (SpeechRecognition) + settings
  speech-commands.js     Pure parser for spoken notes and navigation commands
  blackout.js            AMOLED blackout: long-press whitespace in keyboard-capable games → black screen, tap restores
  matrix-game.js         createMatrixGame(config) factory for the matrix-drill family
  note-id.js, interval-id.js, note-locator.js, interval-locator.js   ~15-line matrix configs
  interval-training.js   createIntervalTrainingGame(config) factory (2 instances)
  ear-training.js, chromatic-circle-drills.js, fretboard-drills.js   bespoke games
```

### Styling (`static/css/`)

Brutalist black/white/gray design. Five files, one concern each, linked in
this order (the cascade depends on it): `base.css` (reset, layout shell,
responsive breakpoints), `controls.css`, `find.css`, `games.css`,
`dev-panel.css`. New game styles go in `games.css` under a banner comment.

Breakpoints: mobile (<768px) side-by-side layout with vertical fretboard;
tablet (768–1024px) adaptive grid; desktop (>1024px) 3fr/2fr grid with
horizontal fretboard.

## Anti-Monolith Rules

This codebase was refactored out of 2,000–3,000-line monoliths once. Do not
let them grow back:

1. **ES modules only. Never add anything to `window.*`.** Share code via
   `import`/`export`. House style: namespace imports for core libraries
   (`import * as MusicTheory from '../core/music-theory.js'`).
2. **One responsibility per module. Soft cap ~500 lines, hard cap ~800.**
   If a change would push a module past the cap, split the module first,
   then add the feature.
3. **Never duplicate a helper.** If it exists in `core/`, `games/game-utils.js`,
   or `games/storage.js`, import it. If you're about to copy-paste a function
   between two modules, move it to the appropriate shared module instead.
4. **Data lives in JSON under `static/data/`, never in JS literals.** Load it
   with `fetch(new URL('../../data/<file>.json', import.meta.url))` + top-level
   await (see `core/progressions.js`). This path form works on Flask and
   GitHub Pages alike.
5. **`core/` stays pure**: no DOM-UI state, no imports from `app/` or `games/`.
   `app/state.js` and `games/session.js` import nothing from their own layer —
   they anchor the graph and prevent import cycles.
6. **Top-level await caveat**: module evaluation can finish after
   `DOMContentLoaded`, so init hooks must use the
   `document.readyState === 'loading'` guard pattern (see `main.js`).

## Adding a Game

1. Create `games/<game-id>.js` that default-exports the plugin object:
   `{ renderTitlePage, renderSettings(modalBody), cleanup, advance }`.
2. Matrix-style games MUST use `createMatrixGame(config)` — a new variant is
   a config (or a new `domain`/`input` strategy inside the factory), not a new
   file of gameplay code. Chromatic-circle quiz variants should extend
   `createIntervalTrainingGame`.
3. Register it in `games/framework.js` (`GAMES` + `GAME_NAMES`) and add a
   `<select>` option in both HTML files.
4. Persistence: use `games/storage.js` only. Settings key
   `fretboard-<game-id>-settings`; stats go under your game id inside the
   shared `fretboard-games-stats` blob. Never hand-roll localStorage access.
5. Optional hooks: `handleNoteKey(noteIndex)` (0–11, C = 0) receives
   keyboard note input from `games/note-keyboard.js` via the framework, and
   `repeatQuestion()` runs on Enter while unanswered (re-announce / replay);
   announce questions with `Voice.speak(text, onDone)` from `games/voice.js`
   (a no-op that calls `onDone` immediately when voice is off).
6. Rounds: use `ROUND_OPTIONS`/`snapRoundCount`/`totalRoundsFor`/
   `roundCounterText` from `game-utils.js` (roundCount `0` = infinite), and
   record each answer with `logQuestionTime(gameState, entry,
   commitSessionStats)` — in infinite mode it commits stats per answer.
7. Call `GameSession.markReady()` (from `games/session.js`) after a question
   is answered so tap-anywhere-to-advance works.
8. Game styles go in `static/css/games.css` under a banner comment, using
   `<game-id>-`prefixed class names.

## localStorage Keys Are a Public Contract

Existing users have data under these keys. Never rename them; never change
their persisted shape without a migration:

- `fretboard-chord-list`
- `fretboard-prog-favorites`
- `fretboard-user-progressions`
- `fretboard-games-stats` (shared blob, sub-keyed by game id)
- `fretboard-drills-stats` (fretboard-drills only, legacy separate key)
- `fretboard-<game-id>-settings` (one per game)
- `fretboard-voice-settings` (global voice announcements, `games/voice.js`)
- `fretboard-speech-input-settings` (global voice input, `games/speech-input.js`)

## Git Workflow

- Never push to a remote unless explicitly asked to.

### Key Design Decisions

- All music theory computation is client-side (no API endpoints)
- Functional style throughout: pure functions and factory functions, no classes
- Single mutable state object in `app/state.js`; full re-render on state
  change via `updateDisplay()` in `app/display.js`
- Radio buttons and toggles use JS class management (not CSS `:has()`) for
  cross-browser mobile support
- Interval colors are defined in `core/music-theory.js` (`getIntervalColor`),
  not CSS
