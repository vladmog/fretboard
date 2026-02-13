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

There is no build step, test framework, or linter configured. The frontend is vanilla JS with no bundler.

## Deployment

Two HTML entry points exist:
- `templates/index.html` — Flask template (uses `url_for()` for asset paths)
- `index.html` — Static copy for GitHub Pages (hardcoded relative paths)

**Both must be kept in sync** when changing HTML structure.

## Architecture

Interactive guitar fretboard visualizer for scales, chords, and intervals. Three-layer frontend architecture with a minimal Flask backend that only serves the template.

### JavaScript Modules (loaded in this order, all in `static/js/`)

1. **`fretboard.js`** — SVG rendering engine. Creates and manages the fretboard graphic with 6 layers (background, inlays, frets, strings, markers, labels). Handles responsive orientation (vertical on mobile, horizontal on desktop). Public API: `createFretboard()`, `fretboard.setMarker()`, `fretboard.clearMarkers()`.

2. **`music-theory.js`** — Pure computation engine with no DOM access. Contains all music theory data (`CHROMATIC_NOTES`, `SCALES`, `CHORD_TYPES`, `INTERVALS`) and functions (`buildScale`, `buildChord`, `buildScaleChords`, `getNotesOnFretboard`, `getIntervalColor`, `shouldUseFlats`). 12 scale types, 13 chord types.

3. **`app.js`** — UI state management (IIFE pattern). Owns application state object (mode, root, scaleType, chordType, chordList, etc.). Orchestrates updates: user event → state change → music-theory computation → fretboard rendering. Persists chord list to localStorage under key `'fretboard-chord-list'`.

### Styling (`static/css/style.css`)

Brutalist black/white/gray design. Three responsive breakpoints:
- Mobile (<768px): side-by-side layout, vertical fretboard
- Tablet (768–1024px): adaptive grid
- Desktop (>1024px): 3fr/2fr grid, horizontal fretboard

Interval colors are defined in `music-theory.js` (`getIntervalColor`), not CSS.

### Key Design Decisions

- All music theory computation is client-side (no API endpoints)
- Functional style: music-theory.js uses pure functions, no classes
- Full re-render on state change via `updateDisplay()`
- Radio buttons and toggles use JS class management (not CSS `:has()`) for cross-browser mobile support
