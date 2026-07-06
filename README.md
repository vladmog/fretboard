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
git clone https://github.com/yourusername/fretboard.git
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
