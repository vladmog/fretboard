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

## Usage

1. Select **Scale** or **Chord** mode
2. Choose a root note and type
3. View all positions on the fretboard with interval labels
4. Use scale chord builder to generate progressions
5. Save chords to your list for reference

## File Structure

```
fretboard/
├── app.py                 # Flask server
├── templates/
│   └── index.html        # Main app template
└── static/
    ├── css/
    │   └── style.css     # Brutalist styling
    └── js/
        ├── fretboard.js  # SVG rendering
        ├── music-theory.js # Core theory logic
        └── app.js        # UI state management
```

## License

MIT
