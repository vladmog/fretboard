# Fretboard Visualizer

A music theory tool for visualizing scales and chords on a guitar fretboard with interval notation.

**[Try it live](https://vladmog.github.io/fretboard/)**

## Features

- **Interactive Fretboard**: SVG-based fretboard with responsive design
- **Scale Visualization**: Display any scale (major, minor, modes, pentatonics, blues) with degree notation
- **Chord Visualization**: Display any chord with interval notation (1, 3, 5, 7, etc.)
- **Interval-Based Coloring**: 3-color system - root (black), thirds (dark gray), others (light gray)
- **Scale Chord Builder**: Generate diatonic triads and 7th chords from major/minor scales
- **Chord List**: Build and save chord progressions with localStorage persistence
- **Enharmonic Spelling**: Context-aware flat/sharp notation based on key
- **Brutalist Design**: Clean black/white/gray aesthetic

## Tech Stack

- **Backend**: Python Flask
- **Frontend**: Vanilla JavaScript, SVG
- **Styling**: CSS (Brutalist aesthetic)

## Installation

```bash
# Clone the repository
git clone https://github.com/vladmog/fretboard.git
cd fretboard

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install flask

# Run the app
python app.py
```

To preview the static GitHub Pages build locally, serve the repo root over
HTTP (`python3 -m http.server`) and open `/index.html`. Opening it directly
via `file://` won't work — the app uses native ES modules, which require an
HTTP origin.

## Usage

1. Select **Scale** or **Chord** mode
2. Choose a root note and type
3. View all positions on the fretboard with interval labels
4. Use scale chord builder to generate progressions
5. Save chords to your list for reference

### Harmony and triad inversions

In **Scale** mode, major, natural minor, and harmonic minor chords show **T**
(tonic), **PD** (predominant), and **D** (dominant) badges. Expand **Harmonic
functions** for degree names, family meanings, and the differences between
natural minor and raised-leading-tone harmony. These labels describe common
roles; a chord's function also depends on its musical context.

In **Chord** mode, choose Major, Minor, or Diminished and enable **Triad
inversions**. Filter by adjacent string set and inversion, then use Previous
and Next to explore compact three-note voicings in frets 0–15. The diagram
and main fretboard use red for the root, green for the third, and blue for
the fifth. Inversions are determined by the lowest sounding note. Guitar
and bass are supported; the normal chord view remains available by turning
the checkbox off.

Run the voicing checks with `node --test tests/triads.test.mjs`.

## File Structure

```
fretboard/
├── app.py                # Flask server
├── index.html            # Static entry point (GitHub Pages)
├── templates/
│   └── index.html        # Flask template (kept in sync with index.html)
└── static/
    ├── css/              # base / controls / find / games / dev-panel
    ├── data/
    │   └── progressions.json  # Chord progression library
    └── js/
        ├── main.js       # ES module entry point
        ├── core/         # Pure modules: music theory, SVG fretboard, sound
        ├── app/          # Visualizer UI: state, renderers, events
        └── games/        # Training games: framework + game modules
```

## License

MIT
