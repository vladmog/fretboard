# Fretboard project instructions

Follow the architecture and working conventions in CLAUDE.md.

## Version every app change

For every user-requested app change or fix, increment `APP_VERSION` in
`static/js/app/version.js`, including changes delivered only in the local preview.
Use a patch increment by default; one increment per cohesive change set is enough.
Include the version bump in the same commit as the change. Before committing or
pushing, verify the displayed version was updated. Both app and game settings
must continue to use this shared version source.
