# Scale-bound progression catalog

`static/data/progressions.json` contains 48 authored practice progressions in eight mood groups. Mood descriptions are suggestions, not historical or psychological claims. Each entry declares a stable `id`, `referenceScale` (a `MusicTheory.SCALES` key), and `numeralBasis: "major"`.

Roman numerals retain the app's existing major-relative convention: in A natural minor, `♭VI` is F and `♭VII` is G. The reference scale determines context notes, not a second transposition of Roman numerals. Chord quality comes from case and suffix. Changing the key transposes the entire progression.

These are deliberately scale-contained exercises: all chord tones belong to the declared reference scale. A reference scale is a chosen pitch collection, not a claim that a progression has only one possible tonal interpretation. Natural and harmonic minor are recorded separately so the background notes are unambiguous. The catalog includes major, natural minor, harmonic minor, Dorian, Mixolydian, Lydian, and Phrygian.

Theory references:
- [Open Music Theory: minor scales](https://viva.pressbooks.pub/openmusictheory/chapter/minor-scales/)
- [Music Theory for the 21st-Century Classroom: diatonic chords in minor](https://musictheory.pugetsound.edu/mt21c/DiatonicChordsInMinor.html)

Validation: `node --test tests/*.test.mjs`. The catalog test uses independently specified pitch-class formulas, checks every chord in all twelve keys, and verifies concrete A natural/harmonic minor examples.

Persistence:
- Saved chords and custom progressions carry `referenceKey` and `referenceScale`.
- Missing legacy scale metadata stays null. It is never inferred from a description.
- New custom saves require choosing a reference scale; custom progressions may intentionally include chromatic chords.
- Favorites for new entries use stable catalog ids. The old catalog is archived in `progressions-legacy.json`. Old favorites are copied once into My Progressions with exact original tokens and unknown scale, leaving the original favorite keys intact.
