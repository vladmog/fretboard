/**
 * Chord Progressions Module
 * Data and parsing for Roman numeral chord progressions
 *
 * Data source: chord_progressions.md → static/data/progressions.json
 */

// Progression data: 16 categories, ~162 progressions
// Each category: { name, progressions: [{ numerals, description, chords }] }
const PROGRESSION_CATEGORIES = [
    {
        "name": "Joyful / Uplifting / Triumphant",
        "progressions": [
            {
                "numerals": "I – IV – V – I",
                "description": "The foundational major cadence. Pure resolution and satisfaction.",
                "chords": [
                    "I",
                    "IV",
                    "V",
                    "I"
                ]
            },
            {
                "numerals": "I – V – vi – IV",
                "description": "The most widely used pop progression. Bright with a touch of depth.",
                "chords": [
                    "I",
                    "V",
                    "vi",
                    "IV"
                ]
            },
            {
                "numerals": "I – IV – I – V",
                "description": "Simple, open, hymn-like joy.",
                "chords": [
                    "I",
                    "IV",
                    "I",
                    "V"
                ]
            },
            {
                "numerals": "I – ii – IV – V",
                "description": "Warm buildup to a strong resolution.",
                "chords": [
                    "I",
                    "ii",
                    "IV",
                    "V"
                ]
            },
            {
                "numerals": "I – IV – V – IV",
                "description": "Rock anthem energy, driving and celebratory.",
                "chords": [
                    "I",
                    "IV",
                    "V",
                    "IV"
                ]
            },
            {
                "numerals": "I – V – IV – V",
                "description": "Forward-moving, confident optimism.",
                "chords": [
                    "I",
                    "V",
                    "IV",
                    "V"
                ]
            },
            {
                "numerals": "I – iii – IV – V",
                "description": "Gentle lift with a brief minor color before resolving bright.",
                "chords": [
                    "I",
                    "iii",
                    "IV",
                    "V"
                ]
            },
            {
                "numerals": "I – Imaj7 – IV – IV",
                "description": "Lush, contented happiness with jazzy warmth.",
                "chords": [
                    "I",
                    "Imaj7",
                    "IV",
                    "IV"
                ]
            },
            {
                "numerals": "I – IV – ii – V",
                "description": "Classic and cheerful with smooth voice leading.",
                "chords": [
                    "I",
                    "IV",
                    "ii",
                    "V"
                ]
            },
            {
                "numerals": "I – V/vi – vi – IV",
                "description": "Anthemic with a secondary dominant adding intensity.",
                "chords": [
                    "I",
                    "V/vi",
                    "vi",
                    "IV"
                ]
            },
            {
                "numerals": "I – I+ – IV – iv",
                "description": "Ascending chromatic line creates a swelling, cinematic joy.",
                "chords": [
                    "I",
                    "I+",
                    "IV",
                    "iv"
                ]
            }
        ]
    },
    {
        "name": "Sad / Melancholy / Sorrowful",
        "progressions": [
            {
                "numerals": "vi – IV – I – V",
                "description": "The \"tragic\" reframing of I–V–vi–IV. Starts from a place of loss.",
                "chords": [
                    "vi",
                    "IV",
                    "I",
                    "V"
                ]
            },
            {
                "numerals": "i – iv – v – i",
                "description": "Pure natural minor. Heavy, unresolved grief.",
                "chords": [
                    "i",
                    "iv",
                    "v",
                    "i"
                ]
            },
            {
                "numerals": "i – VI – III – VII",
                "description": "Andalusian-adjacent. Drifting sadness without resolution.",
                "chords": [
                    "i",
                    "VI",
                    "III",
                    "VII"
                ]
            },
            {
                "numerals": "i – iv – VI – V",
                "description": "Minor with a brief major lift that makes the return to minor more painful.",
                "chords": [
                    "i",
                    "iv",
                    "VI",
                    "V"
                ]
            },
            {
                "numerals": "i – V – i – iv",
                "description": "The dominant V in minor creates desperate longing.",
                "chords": [
                    "i",
                    "V",
                    "i",
                    "iv"
                ]
            },
            {
                "numerals": "i – VII – VI – V",
                "description": "Descending Andalusian cadence. Fatalistic, dramatic sorrow.",
                "chords": [
                    "i",
                    "VII",
                    "VI",
                    "V"
                ]
            },
            {
                "numerals": "i – iv – VII – III",
                "description": "Wandering minor progression with no firm resolution.",
                "chords": [
                    "i",
                    "iv",
                    "VII",
                    "III"
                ]
            },
            {
                "numerals": "vi – V – IV – iii",
                "description": "Descending stepwise motion in a major key. Resignation.",
                "chords": [
                    "vi",
                    "V",
                    "IV",
                    "iii"
                ]
            },
            {
                "numerals": "i – °7 – iv – V",
                "description": "The diminished chord adds a stab of sharp anguish.",
                "chords": [
                    "i",
                    "°7",
                    "iv",
                    "V"
                ]
            },
            {
                "numerals": "i – iv – i – V7",
                "description": "Classical minor lament with dominant pull.",
                "chords": [
                    "i",
                    "iv",
                    "i",
                    "V7"
                ]
            },
            {
                "numerals": "i – vm7 – VI – iv",
                "description": "Deepened minor mood; the minor v avoids the dramatic dominant.",
                "chords": [
                    "i",
                    "vm7",
                    "VI",
                    "iv"
                ]
            },
            {
                "numerals": "i – ivm7 – VImaj7 – Vm7",
                "description": "Jazz ballad sadness. Smoky, introspective grief.",
                "chords": [
                    "i",
                    "ivm7",
                    "VImaj7",
                    "Vm7"
                ]
            }
        ]
    },
    {
        "name": "Nostalgic / Bittersweet / Wistful",
        "progressions": [
            {
                "numerals": "I – vi – IV – V",
                "description": "The classic '50s progression. Warm memory and gentle longing.",
                "chords": [
                    "I",
                    "vi",
                    "IV",
                    "V"
                ]
            },
            {
                "numerals": "Imaj7 – iii7 – IVmaj7 – iv",
                "description": "Major to minor IV shift creates the ache of a fading memory.",
                "chords": [
                    "Imaj7",
                    "iii7",
                    "IVmaj7",
                    "iv"
                ]
            },
            {
                "numerals": "I – iii – vi – IV",
                "description": "Moves through gentle minor shading before returning to warmth.",
                "chords": [
                    "I",
                    "iii",
                    "vi",
                    "IV"
                ]
            },
            {
                "numerals": "I – V – vi – iii – IV – I – IV – V",
                "description": "Pachelbel's Canon. Cyclical, timeless nostalgia.",
                "chords": [
                    "I",
                    "V",
                    "vi",
                    "iii",
                    "IV",
                    "I",
                    "IV",
                    "V"
                ]
            },
            {
                "numerals": "I – vi – ii – V",
                "description": "Jazz standard turnaround. Sophisticated, reminiscent warmth.",
                "chords": [
                    "I",
                    "vi",
                    "ii",
                    "V"
                ]
            },
            {
                "numerals": "IVmaj7 – V7 – iii7 – vi",
                "description": "The royal road progression (common in J-pop). Yearning beauty.",
                "chords": [
                    "IVmaj7",
                    "V7",
                    "iii7",
                    "vi"
                ]
            },
            {
                "numerals": "I – I7 – IV – iv",
                "description": "The major-to-minor IV is the definitive bittersweet sound.",
                "chords": [
                    "I",
                    "I7",
                    "IV",
                    "iv"
                ]
            },
            {
                "numerals": "ii – V – I – vi",
                "description": "Jazz turnaround starting from ii. Reflective, circular.",
                "chords": [
                    "ii",
                    "V",
                    "I",
                    "vi"
                ]
            },
            {
                "numerals": "I – V – vi – IV – I – V – iii – IV",
                "description": "Extended cycle that delays resolution. Lingering emotion.",
                "chords": [
                    "I",
                    "V",
                    "vi",
                    "IV",
                    "I",
                    "V",
                    "iii",
                    "IV"
                ]
            },
            {
                "numerals": "I – III7 – vi – iv",
                "description": "The secondary dominant to vi followed by minor iv creates a deep ache.",
                "chords": [
                    "I",
                    "III7",
                    "vi",
                    "iv"
                ]
            }
        ]
    },
    {
        "name": "Tense / Anxious / Uneasy",
        "progressions": [
            {
                "numerals": "i – ii° – V – i",
                "description": "The diminished ii° adds instability before the dominant.",
                "chords": [
                    "i",
                    "ii°",
                    "V",
                    "i"
                ]
            },
            {
                "numerals": "i – °7 – i – °7",
                "description": "Oscillation with diminished chords. Creeping dread.",
                "chords": [
                    "i",
                    "°7",
                    "i",
                    "°7"
                ]
            },
            {
                "numerals": "V – iv – I (repeated)",
                "description": "Backdoor approach with unresolved tension.",
                "chords": [
                    "V",
                    "iv",
                    "I"
                ]
            },
            {
                "numerals": "i – II – i – VII",
                "description": "The major II (Neapolitan area) creates jarring displacement.",
                "chords": [
                    "i",
                    "II",
                    "i",
                    "VII"
                ]
            },
            {
                "numerals": "♭II – I – ♭II – I",
                "description": "Phrygian oscillation. Unstable, confrontational.",
                "chords": [
                    "♭II",
                    "I",
                    "♭II",
                    "I"
                ]
            },
            {
                "numerals": "i – ♭II – V – i",
                "description": "Neapolitan sixth usage. Dark, operatic tension.",
                "chords": [
                    "i",
                    "♭II",
                    "V",
                    "i"
                ]
            },
            {
                "numerals": "i – iv – ♭VII – ♭III – ♭VI – ♭II – V",
                "description": "Circle of fifths in minor. Relentless harmonic pull.",
                "chords": [
                    "i",
                    "iv",
                    "♭VII",
                    "♭III",
                    "♭VI",
                    "♭II",
                    "V"
                ]
            },
            {
                "numerals": "i – v – ♭VI – iv",
                "description": "Avoiding the dominant V keeps things murky and anxious.",
                "chords": [
                    "i",
                    "v",
                    "♭VI",
                    "iv"
                ]
            },
            {
                "numerals": "i – ♭II7 – i – V7",
                "description": "Tritone substitution proximity. Chromatic unease.",
                "chords": [
                    "i",
                    "♭II7",
                    "i",
                    "V7"
                ]
            },
            {
                "numerals": "°7 – °7 – °7 (moving in minor 3rds)",
                "description": "Symmetrical diminished movement. Vertigo and panic.",
                "chords": [
                    "°7",
                    "°7",
                    "°7"
                ]
            }
        ]
    },
    {
        "name": "Dark / Ominous / Sinister",
        "progressions": [
            {
                "numerals": "i – ♭II – ♭VII – i",
                "description": "Phrygian coloring. Ancient, foreboding darkness.",
                "chords": [
                    "i",
                    "♭II",
                    "♭VII",
                    "i"
                ]
            },
            {
                "numerals": "i – iv – ♭VI – ♭VII",
                "description": "Power chord staple. Heavy, brooding metal/film darkness.",
                "chords": [
                    "i",
                    "iv",
                    "♭VI",
                    "♭VII"
                ]
            },
            {
                "numerals": "i – ♭VI – ♭III – ♭VII",
                "description": "All natural minor chords. Cold, bleak landscape.",
                "chords": [
                    "i",
                    "♭VI",
                    "♭III",
                    "♭VII"
                ]
            },
            {
                "numerals": "i – V+ – i – iv",
                "description": "The augmented V is eerie and unsettling.",
                "chords": [
                    "i",
                    "V+",
                    "i",
                    "iv"
                ]
            },
            {
                "numerals": "i – ♭VII – ♭VI – V",
                "description": "Andalusian cadence. Dramatic, villainous resolve.",
                "chords": [
                    "i",
                    "♭VII",
                    "♭VI",
                    "V"
                ]
            },
            {
                "numerals": "i – i – iv – iv – ♭VI – ♭VII – i – i",
                "description": "Slow minor plateau. Cinematic, oppressive weight.",
                "chords": [
                    "i",
                    "i",
                    "iv",
                    "iv",
                    "♭VI",
                    "♭VII",
                    "i",
                    "i"
                ]
            },
            {
                "numerals": "°7 – i (half-step above)",
                "description": "Diminished approach. Jump-scare tension release.",
                "chords": [
                    "°7",
                    "i"
                ]
            },
            {
                "numerals": "i – ♭II – V – V+",
                "description": "Neapolitan to augmented dominant. Distorted menace.",
                "chords": [
                    "i",
                    "♭II",
                    "V",
                    "V+"
                ]
            },
            {
                "numerals": "i – iv°7 – ♭VI+ – ♭II",
                "description": "Layered altered chords. Nightmarish disorientation.",
                "chords": [
                    "i",
                    "iv°7",
                    "♭VI+",
                    "♭II"
                ]
            },
            {
                "numerals": "i – ♭vi – ♭III – ♭VII",
                "description": "Lowered sixth degree adds occult coloring.",
                "chords": [
                    "i",
                    "♭vi",
                    "♭III",
                    "♭VII"
                ]
            }
        ]
    },
    {
        "name": "Dreamy / Ethereal / Floating",
        "progressions": [
            {
                "numerals": "Imaj7 – IVmaj7 – Imaj7 – IVmaj7",
                "description": "Two-chord shimmer. Ambient, weightless.",
                "chords": [
                    "Imaj7",
                    "IVmaj7",
                    "Imaj7",
                    "IVmaj7"
                ]
            },
            {
                "numerals": "Imaj7 – ♭VIImaj7 – IVmaj7 – Imaj7",
                "description": "The ♭VII adds an unexpected lift, like breaking through clouds.",
                "chords": [
                    "Imaj7",
                    "♭VIImaj7",
                    "IVmaj7",
                    "Imaj7"
                ]
            },
            {
                "numerals": "Imaj7 – iii7 – IVmaj7 – ♭VImaj7",
                "description": "Chromatic median shift into a foreign key center. Surreal.",
                "chords": [
                    "Imaj7",
                    "iii7",
                    "IVmaj7",
                    "♭VImaj7"
                ]
            },
            {
                "numerals": "I – III – IV – iv",
                "description": "Major III is borrowed and exotic; minor iv dissolves the brightness.",
                "chords": [
                    "I",
                    "III",
                    "IV",
                    "iv"
                ]
            },
            {
                "numerals": "IVmaj7 – iii7 – ii7 – Imaj7",
                "description": "Descending stepwise with 7ths. Drifting, slow-motion feel.",
                "chords": [
                    "IVmaj7",
                    "iii7",
                    "ii7",
                    "Imaj7"
                ]
            },
            {
                "numerals": "i – ♭III+ – ♭VI – iv",
                "description": "Augmented chord as gateway to another tonal world.",
                "chords": [
                    "i",
                    "♭III+",
                    "♭VI",
                    "iv"
                ]
            },
            {
                "numerals": "Iadd9 – IVadd9 – vadd9 – Iadd9",
                "description": "Added 9ths on everything. Shimmering, impressionistic.",
                "chords": [
                    "Iadd9",
                    "IVadd9",
                    "vadd9",
                    "Iadd9"
                ]
            },
            {
                "numerals": "Imaj7 – ♭IIImaj7 – ♭VImaj7 – IVmaj7",
                "description": "Giant-steps-style major third movement. Kaleidoscopic.",
                "chords": [
                    "Imaj7",
                    "♭IIImaj7",
                    "♭VImaj7",
                    "IVmaj7"
                ]
            },
            {
                "numerals": "ii7 – ♭II7 – Imaj7",
                "description": "Tritone substitution resolution. Floating landing.",
                "chords": [
                    "ii7",
                    "♭II7",
                    "Imaj7"
                ]
            },
            {
                "numerals": "Imaj9 – ♭VImaj9 – IVmaj9 – ♭IImaj9",
                "description": "Chromatic mediants with extended chords. Pure atmosphere.",
                "chords": [
                    "Imaj9",
                    "♭VImaj9",
                    "IVmaj9",
                    "♭IImaj9"
                ]
            }
        ]
    },
    {
        "name": "Romantic / Sensual / Intimate",
        "progressions": [
            {
                "numerals": "Imaj7 – vi7 – ii7 – V7",
                "description": "Jazz ballad standard. Warm, candlelit sophistication.",
                "chords": [
                    "Imaj7",
                    "vi7",
                    "ii7",
                    "V7"
                ]
            },
            {
                "numerals": "ii7 – V7 – Imaj7 – vi7",
                "description": "Turnaround cycle. Swaying, dance-like romance.",
                "chords": [
                    "ii7",
                    "V7",
                    "Imaj7",
                    "vi7"
                ]
            },
            {
                "numerals": "Imaj7 – IV – iii7 – vi",
                "description": "Gentle descent into the relative minor. Tender vulnerability.",
                "chords": [
                    "Imaj7",
                    "IV",
                    "iii7",
                    "vi"
                ]
            },
            {
                "numerals": "I – V/vi – vi – IV – V",
                "description": "The secondary dominant to vi intensifies emotional arrival.",
                "chords": [
                    "I",
                    "V/vi",
                    "vi",
                    "IV",
                    "V"
                ]
            },
            {
                "numerals": "IVmaj7 – iii7 – vi7 – ii7 – V7",
                "description": "Extended chain of falling fifths. Lush and enveloping.",
                "chords": [
                    "IVmaj7",
                    "iii7",
                    "vi7",
                    "ii7",
                    "V7"
                ]
            },
            {
                "numerals": "Imaj7 – ♭VImaj7 – Imaj7 – ♭VImaj7",
                "description": "Chromatic mediant oscillation. Mysterious allure.",
                "chords": [
                    "Imaj7",
                    "♭VImaj7",
                    "Imaj7",
                    "♭VImaj7"
                ]
            },
            {
                "numerals": "I – I+ – vi – IV",
                "description": "The augmented I chord adds a sighing, reaching quality.",
                "chords": [
                    "I",
                    "I+",
                    "vi",
                    "IV"
                ]
            },
            {
                "numerals": "ii9 – V13 – Imaj9",
                "description": "Extended jazz voicings. Velvet, late-night intimacy.",
                "chords": [
                    "ii9",
                    "V13",
                    "Imaj9"
                ]
            },
            {
                "numerals": "i – iv7 – ♭VImaj7 – V7",
                "description": "Minor key romance. Passionate, almost painful beauty.",
                "chords": [
                    "i",
                    "iv7",
                    "♭VImaj7",
                    "V7"
                ]
            },
            {
                "numerals": "Imaj7 – II7 – IVmaj7 – ♭VII7",
                "description": "Secondary dominants and borrowed chords. Smoldering heat.",
                "chords": [
                    "Imaj7",
                    "II7",
                    "IVmaj7",
                    "♭VII7"
                ]
            }
        ]
    },
    {
        "name": "Heroic / Epic / Powerful",
        "progressions": [
            {
                "numerals": "I – V – vi – iii – IV – I – IV – V",
                "description": "Full Canon-style cycle. Grand, sweeping narrative.",
                "chords": [
                    "I",
                    "V",
                    "vi",
                    "iii",
                    "IV",
                    "I",
                    "IV",
                    "V"
                ]
            },
            {
                "numerals": "I – ♭III – IV – I",
                "description": "Borrowed ♭III adds a modal, mythic weight.",
                "chords": [
                    "I",
                    "♭III",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "I – ♭VI – ♭VII – I",
                "description": "Double plagal cadence. Cinematic, triumphant arrival.",
                "chords": [
                    "I",
                    "♭VI",
                    "♭VII",
                    "I"
                ]
            },
            {
                "numerals": "i – ♭VII – ♭VI – ♭VII – i",
                "description": "Aeolian vamp. Battle march, defiant strength.",
                "chords": [
                    "i",
                    "♭VII",
                    "♭VI",
                    "♭VII",
                    "i"
                ]
            },
            {
                "numerals": "I – V – ♭VII – IV",
                "description": "Mixolydian borrowing. Rugged, adventurous heroism.",
                "chords": [
                    "I",
                    "V",
                    "♭VII",
                    "IV"
                ]
            },
            {
                "numerals": "i – ♭III – ♭VII – IV",
                "description": "Major IV in a minor context. Light breaking through darkness.",
                "chords": [
                    "i",
                    "♭III",
                    "♭VII",
                    "IV"
                ]
            },
            {
                "numerals": "I – IV – ♭VI – ♭VII – I",
                "description": "Double borrowed chords create a massive, cinematic lift.",
                "chords": [
                    "I",
                    "IV",
                    "♭VI",
                    "♭VII",
                    "I"
                ]
            },
            {
                "numerals": "I – ♭VII – IV – I",
                "description": "Mixolydian rock cadence. Swagger and confidence.",
                "chords": [
                    "I",
                    "♭VII",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "vi – ♭VI – ♭VII – I",
                "description": "Rising from minor depths to a major arrival. Rebirth moment.",
                "chords": [
                    "vi",
                    "♭VI",
                    "♭VII",
                    "I"
                ]
            },
            {
                "numerals": "i – iv – V – ♭VI – ♭VII – I",
                "description": "Minor to parallel major key change. The hero's transformation.",
                "chords": [
                    "i",
                    "iv",
                    "V",
                    "♭VI",
                    "♭VII",
                    "I"
                ]
            }
        ]
    },
    {
        "name": "Mysterious / Suspenseful / Curious",
        "progressions": [
            {
                "numerals": "i – ♭II – i – ♭II",
                "description": "Phrygian oscillation. Sphinx-like, riddle energy.",
                "chords": [
                    "i",
                    "♭II",
                    "i",
                    "♭II"
                ]
            },
            {
                "numerals": "Imaj7 – ♭IImaj7 – Imaj7 – ♭IImaj7",
                "description": "Half-step shimmer in major. Uncanny elegance.",
                "chords": [
                    "Imaj7",
                    "♭IImaj7",
                    "Imaj7",
                    "♭IImaj7"
                ]
            },
            {
                "numerals": "i – III+ – ♭VI – iv",
                "description": "The augmented III pulls the ear toward unexpected territory.",
                "chords": [
                    "i",
                    "III+",
                    "♭VI",
                    "iv"
                ]
            },
            {
                "numerals": "i – ♭VII – ♭VI – ♭V(♯IV)",
                "description": "Chromatic descent. Spiraling deeper into the unknown.",
                "chords": [
                    "i",
                    "♭VII",
                    "♭VI",
                    "♭V"
                ]
            },
            {
                "numerals": "ii° – V – i – ♭VI",
                "description": "Resolution undermined by the deceptive ♭VI. Twist ending.",
                "chords": [
                    "ii°",
                    "V",
                    "i",
                    "♭VI"
                ]
            },
            {
                "numerals": "i – v – ♭VI – IV",
                "description": "Minor v keeps the dominant ambiguous. Fog and shadows.",
                "chords": [
                    "i",
                    "v",
                    "♭VI",
                    "IV"
                ]
            },
            {
                "numerals": "ø7 – maj7 (half-step up)",
                "description": "Half-diminished resolving up a half step. Puzzle-box harmony.",
                "chords": [
                    "ø7",
                    "maj7"
                ]
            },
            {
                "numerals": "Isus4 – I – Isus2 – I",
                "description": "Suspended chords orbiting the tonic. Something is about to happen.",
                "chords": [
                    "Isus4",
                    "I",
                    "Isus2",
                    "I"
                ]
            },
            {
                "numerals": "i – ♭III+ – V – i",
                "description": "Augmented mediant disrupts the path to the dominant.",
                "chords": [
                    "i",
                    "♭III+",
                    "V",
                    "i"
                ]
            },
            {
                "numerals": "Imaj7 – ♭VImaj7 – ♭IImaj7 – V7",
                "description": "Giant chromatic drops. Noir detective atmosphere.",
                "chords": [
                    "Imaj7",
                    "♭VImaj7",
                    "♭IImaj7",
                    "V7"
                ]
            }
        ]
    },
    {
        "name": "Peaceful / Calm / Pastoral",
        "progressions": [
            {
                "numerals": "I – IV – I – IV",
                "description": "Two-chord major pendulum. Hymn-like serenity.",
                "chords": [
                    "I",
                    "IV",
                    "I",
                    "IV"
                ]
            },
            {
                "numerals": "I – V – IV – I",
                "description": "Plagal motion provides a gentle, \"amen\" quality.",
                "chords": [
                    "I",
                    "V",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "Imaj7 – IVmaj7 – ii7 – V7",
                "description": "Soft jazz voicings over a simple progression. Sunday morning.",
                "chords": [
                    "Imaj7",
                    "IVmaj7",
                    "ii7",
                    "V7"
                ]
            },
            {
                "numerals": "I – iii – IV – I",
                "description": "Brief minor color adds depth without disturbing the calm.",
                "chords": [
                    "I",
                    "iii",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "I – Iadd9 – IV – IVadd9",
                "description": "Added 9ths create an open, pastoral ring.",
                "chords": [
                    "I",
                    "Iadd9",
                    "IV",
                    "IVadd9"
                ]
            },
            {
                "numerals": "I – vi – IV – I",
                "description": "The vi adds a touch of warmth before the gentle plagal return.",
                "chords": [
                    "I",
                    "vi",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "Imaj7 – ii7 – iii7 – IVmaj7",
                "description": "Stepwise ascending with 7ths. Gradual, sunrise feeling.",
                "chords": [
                    "Imaj7",
                    "ii7",
                    "iii7",
                    "IVmaj7"
                ]
            },
            {
                "numerals": "I – V – vi – IV (slow tempo)",
                "description": "The ubiquitous four chords played slowly become meditative.",
                "chords": [
                    "I",
                    "V",
                    "vi",
                    "IV"
                ]
            },
            {
                "numerals": "Isus2 – IV – V – Isus2",
                "description": "Suspended tonics feel open, like a wide landscape.",
                "chords": [
                    "Isus2",
                    "IV",
                    "V",
                    "Isus2"
                ]
            },
            {
                "numerals": "I – IV – vi – V",
                "description": "Gentle rearrangement. Soft resolution.",
                "chords": [
                    "I",
                    "IV",
                    "vi",
                    "V"
                ]
            }
        ]
    },
    {
        "name": "Playful / Quirky / Whimsical",
        "progressions": [
            {
                "numerals": "I – III – IV – iv",
                "description": "The unexpected major III and minor iv create a wink.",
                "chords": [
                    "I",
                    "III",
                    "IV",
                    "iv"
                ]
            },
            {
                "numerals": "I – ♯I° – ii – V",
                "description": "Chromatic passing diminished. Tip-toeing, cartoonish.",
                "chords": [
                    "I",
                    "♯I°",
                    "ii",
                    "V"
                ]
            },
            {
                "numerals": "I – II7 – IV – iv",
                "description": "Secondary dominant to IV with a minor turn. Cheeky surprise.",
                "chords": [
                    "I",
                    "II7",
                    "IV",
                    "iv"
                ]
            },
            {
                "numerals": "I – ♭VII – IV – I",
                "description": "Mixolydian shuffle. Carefree, tongue-in-cheek.",
                "chords": [
                    "I",
                    "♭VII",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "I – ♭III – IV – ♭VI",
                "description": "All borrowed chords. Off-kilter, fairytale logic.",
                "chords": [
                    "I",
                    "♭III",
                    "IV",
                    "♭VI"
                ]
            },
            {
                "numerals": "I+ – IV – ii° – V",
                "description": "Augmented tonic and diminished ii. Stumbling and silly.",
                "chords": [
                    "I+",
                    "IV",
                    "ii°",
                    "V"
                ]
            },
            {
                "numerals": "I – vi – ♯IV° – V",
                "description": "The chromatic diminished is a brief hiccup of mischief.",
                "chords": [
                    "I",
                    "vi",
                    "♯IV°",
                    "V"
                ]
            },
            {
                "numerals": "Imaj7 – ♭IIImaj7 – Imaj7 – ♭IIImaj7",
                "description": "Major third oscillation. Tilted, kaleidoscope whimsy.",
                "chords": [
                    "Imaj7",
                    "♭IIImaj7",
                    "Imaj7",
                    "♭IIImaj7"
                ]
            },
            {
                "numerals": "I – V – ♭VII – IV – ♭VI – ♭III – ♭V(♯IV) – I",
                "description": "Descending chromatic mediants. Wonderland spiral.",
                "chords": [
                    "I",
                    "V",
                    "♭VII",
                    "IV",
                    "♭VI",
                    "♭III",
                    "♭V",
                    "I"
                ]
            }
        ]
    },
    {
        "name": "Aggressive / Angry / Intense",
        "progressions": [
            {
                "numerals": "i – ♭II – i – ♭II",
                "description": "Phrygian hammer. Confrontational, rhythmic attack.",
                "chords": [
                    "i",
                    "♭II",
                    "i",
                    "♭II"
                ]
            },
            {
                "numerals": "i – iv – i – V",
                "description": "Bare minor with hard dominant pull. Clenched-fist energy.",
                "chords": [
                    "i",
                    "iv",
                    "i",
                    "V"
                ]
            },
            {
                "numerals": "I5 – ♭III5 – IV5 – I5",
                "description": "Power chords (no thirds). Raw, distorted aggression.",
                "chords": [
                    "I5",
                    "♭III5",
                    "IV5",
                    "I5"
                ]
            },
            {
                "numerals": "i – ♭VII – ♭VI – V",
                "description": "Andalusian with attitude. Driven, relentless fury.",
                "chords": [
                    "i",
                    "♭VII",
                    "♭VI",
                    "V"
                ]
            },
            {
                "numerals": "i – ♭V(♯IV) – i – ♭V(♯IV)",
                "description": "Tritone oscillation. Maximum dissonance and confrontation.",
                "chords": [
                    "i",
                    "♭V",
                    "i",
                    "♭V"
                ]
            },
            {
                "numerals": "i – ♭II – ♭VII – i",
                "description": "Phrygian dominant cluster. Thrash and fury.",
                "chords": [
                    "i",
                    "♭II",
                    "♭VII",
                    "i"
                ]
            },
            {
                "numerals": "i – iv – ♭II – V",
                "description": "Neapolitan substitution mid-phrase. Sucker-punch harmonic shift.",
                "chords": [
                    "i",
                    "iv",
                    "♭II",
                    "V"
                ]
            },
            {
                "numerals": "I – ♭VII – ♭VI – ♭V",
                "description": "Chromatic descent in power chords. Crushing, mechanical weight.",
                "chords": [
                    "I",
                    "♭VII",
                    "♭VI",
                    "♭V"
                ]
            },
            {
                "numerals": "i – ii° – ♭II – V",
                "description": "Diminished and Neapolitan back to back. Relentless dissonance.",
                "chords": [
                    "i",
                    "ii°",
                    "♭II",
                    "V"
                ]
            },
            {
                "numerals": "°7 – °7 – i (all half-step approaches)",
                "description": "Diminished stacking. Chaotic, explosive arrival.",
                "chords": [
                    "°7",
                    "°7",
                    "i"
                ]
            }
        ]
    },
    {
        "name": "Hopeful / Inspirational / Upward",
        "progressions": [
            {
                "numerals": "vi – VII – I",
                "description": "Simple minor-to-major lift. Dawn breaking.",
                "chords": [
                    "vi",
                    "VII",
                    "I"
                ]
            },
            {
                "numerals": "vi – IV – I – V",
                "description": "Starts in shadow, resolves into light.",
                "chords": [
                    "vi",
                    "IV",
                    "I",
                    "V"
                ]
            },
            {
                "numerals": "I – V – vi – IV – I – V – I",
                "description": "The standard pop cycle that ends resolved. Journey completed.",
                "chords": [
                    "I",
                    "V",
                    "vi",
                    "IV",
                    "I",
                    "V",
                    "I"
                ]
            },
            {
                "numerals": "i – ♭III – ♭VII – I",
                "description": "Minor to parallel major. Clouds parting.",
                "chords": [
                    "i",
                    "♭III",
                    "♭VII",
                    "I"
                ]
            },
            {
                "numerals": "IV – V – vi – IV – V – I",
                "description": "Deceptive cadence first, then true resolution. Earned hope.",
                "chords": [
                    "IV",
                    "V",
                    "vi",
                    "IV",
                    "V",
                    "I"
                ]
            },
            {
                "numerals": "ii – V – I – Imaj7",
                "description": "Jazz resolution with the maj7 adding a sparkle of possibility.",
                "chords": [
                    "ii",
                    "V",
                    "I",
                    "Imaj7"
                ]
            },
            {
                "numerals": "i – iv – ♭VI – ♭VII – I",
                "description": "Picardy-style resolution. Light at the end of the tunnel.",
                "chords": [
                    "i",
                    "iv",
                    "♭VI",
                    "♭VII",
                    "I"
                ]
            },
            {
                "numerals": "vi – V – IV – V – I",
                "description": "Descending then rising. The valley before the summit.",
                "chords": [
                    "vi",
                    "V",
                    "IV",
                    "V",
                    "I"
                ]
            },
            {
                "numerals": "I – IV – vi – V – I – IV – I",
                "description": "Extended plagal ending. Benediction, blessing.",
                "chords": [
                    "I",
                    "IV",
                    "vi",
                    "V",
                    "I",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "i – ♭VI – ♭III – ♭VII – I",
                "description": "Long minor journey resolving to the parallel major. Redemption arc.",
                "chords": [
                    "i",
                    "♭VI",
                    "♭III",
                    "♭VII",
                    "I"
                ]
            }
        ]
    },
    {
        "name": "Exotic / Modal / World-Influenced",
        "progressions": [
            {
                "numerals": "i – ♭II – i – ♭II",
                "description": "Phrygian. Spanish, Middle Eastern, Flamenco.",
                "chords": [
                    "i",
                    "♭II",
                    "i",
                    "♭II"
                ]
            },
            {
                "numerals": "I – II – IV – I",
                "description": "Lydian hint via major II chord. Bright, otherworldly.",
                "chords": [
                    "I",
                    "II",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "i – IV – ♭VII – i",
                "description": "Dorian mode (major IV in minor). Celtic, folk, medieval.",
                "chords": [
                    "i",
                    "IV",
                    "♭VII",
                    "i"
                ]
            },
            {
                "numerals": "I – ♭VII – IV – I",
                "description": "Mixolydian. Blues-rock, folk, Appalachian.",
                "chords": [
                    "I",
                    "♭VII",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "i – ♭II – V – i",
                "description": "Phrygian dominant / Hijaz. Middle Eastern, Klezmer.",
                "chords": [
                    "i",
                    "♭II",
                    "V",
                    "i"
                ]
            },
            {
                "numerals": "I – ♭II – ♭III – IV",
                "description": "Ascending Phrygian in a major context. North African, Andalusian.",
                "chords": [
                    "I",
                    "♭II",
                    "♭III",
                    "IV"
                ]
            },
            {
                "numerals": "i – III – iv – ♭VII",
                "description": "Mixed modal. Eastern European, Romani.",
                "chords": [
                    "i",
                    "III",
                    "iv",
                    "♭VII"
                ]
            },
            {
                "numerals": "I – ♭VII – ♭III – IV",
                "description": "Modal mixture. Celtic, Nordic.",
                "chords": [
                    "I",
                    "♭VII",
                    "♭III",
                    "IV"
                ]
            },
            {
                "numerals": "i – ♭II – ♭III – iv – V",
                "description": "Full Phrygian dominant scale harmonization. Flamenco.",
                "chords": [
                    "i",
                    "♭II",
                    "♭III",
                    "iv",
                    "V"
                ]
            },
            {
                "numerals": "I – II – ♭VII – I",
                "description": "Lydian-Mixolydian blend. Indian raga-influenced, Gamelan.",
                "chords": [
                    "I",
                    "II",
                    "♭VII",
                    "I"
                ]
            }
        ]
    },
    {
        "name": "Funky / Groovy / Cool",
        "progressions": [
            {
                "numerals": "i7 – IV7",
                "description": "Two-chord minor funk vamp. Head-nodding pocket.",
                "chords": [
                    "i7",
                    "IV7"
                ]
            },
            {
                "numerals": "I7 – IV7 – I7 – V7",
                "description": "Dominant 7ths throughout. Blues-funk swagger.",
                "chords": [
                    "I7",
                    "IV7",
                    "I7",
                    "V7"
                ]
            },
            {
                "numerals": "i9 – iv9",
                "description": "Extended minor 9th vamp. Neo-soul smoothness.",
                "chords": [
                    "i9",
                    "iv9"
                ]
            },
            {
                "numerals": "I7 – ♭VII7 – IV7 – I7",
                "description": "Mixolydian funk. Slippery, confident groove.",
                "chords": [
                    "I7",
                    "♭VII7",
                    "IV7",
                    "I7"
                ]
            },
            {
                "numerals": "ii7 – V7 – ii7 – V7",
                "description": "Unresolved turnaround. Perpetual motion funk-jazz.",
                "chords": [
                    "ii7",
                    "V7",
                    "ii7",
                    "V7"
                ]
            },
            {
                "numerals": "I7 – II7 – IV7 – I7",
                "description": "Chromatic dominant approach. James Brown territory.",
                "chords": [
                    "I7",
                    "II7",
                    "IV7",
                    "I7"
                ]
            },
            {
                "numerals": "i7 – ♭III7 – IV7 – i7",
                "description": "Minor funk with major color. Parliament/Funkadelic energy.",
                "chords": [
                    "i7",
                    "♭III7",
                    "IV7",
                    "i7"
                ]
            },
            {
                "numerals": "I9 – ♭VII9 – I9 – ♭VII9",
                "description": "Extended dominant oscillation. Modern R&B bounce.",
                "chords": [
                    "I9",
                    "♭VII9",
                    "I9",
                    "♭VII9"
                ]
            },
            {
                "numerals": "i – iv – ♭VI7 – V7",
                "description": "Minor groove with dominant tension. Motown-meets-hip-hop.",
                "chords": [
                    "i",
                    "iv",
                    "♭VI7",
                    "V7"
                ]
            },
            {
                "numerals": "Im7 – IVm7 – ♭VImaj7 – V7sus4",
                "description": "Suspended dominant landing. Smooth, unresolved cool.",
                "chords": [
                    "Im7",
                    "IVm7",
                    "♭VImaj7",
                    "V7sus4"
                ]
            }
        ]
    },
    {
        "name": "Spiritual / Transcendent / Sacred",
        "progressions": [
            {
                "numerals": "I – IV – I – IV – V – I",
                "description": "Hymn cadence. Simple, reverent devotion.",
                "chords": [
                    "I",
                    "IV",
                    "I",
                    "IV",
                    "V",
                    "I"
                ]
            },
            {
                "numerals": "Imaj7 – IVmaj7 (sustained)",
                "description": "Two-chord meditation. Mantra-like stillness.",
                "chords": [
                    "Imaj7",
                    "IVmaj7"
                ]
            },
            {
                "numerals": "i – ♭VII – ♭VI – ♭VII – i",
                "description": "Aeolian chant. Monastic, ancient gravity.",
                "chords": [
                    "i",
                    "♭VII",
                    "♭VI",
                    "♭VII",
                    "i"
                ]
            },
            {
                "numerals": "I – ♭VI – ♭III – ♭VII – I",
                "description": "Chromatic mediants resolving home. Cathedral-scale grandeur.",
                "chords": [
                    "I",
                    "♭VI",
                    "♭III",
                    "♭VII",
                    "I"
                ]
            },
            {
                "numerals": "Isus2 – Isus4 – I",
                "description": "Suspended resolution cycle. Bell-like, crystalline purity.",
                "chords": [
                    "Isus2",
                    "Isus4",
                    "I"
                ]
            },
            {
                "numerals": "I – vi – IV – V – I (with plagal tag IV – I)",
                "description": "Gospel close. Communal, affirming warmth.",
                "chords": [
                    "I",
                    "vi",
                    "IV",
                    "V",
                    "I",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "IV – I – IV – I",
                "description": "Plagal \"amen\" cadence. Ecclesiastical resolution.",
                "chords": [
                    "IV",
                    "I",
                    "IV",
                    "I"
                ]
            },
            {
                "numerals": "i – ♭III – ♭VI – iv – V – I",
                "description": "Minor pilgrimage to major resolution. Picardy transcendence.",
                "chords": [
                    "i",
                    "♭III",
                    "♭VI",
                    "iv",
                    "V",
                    "I"
                ]
            },
            {
                "numerals": "I – iii – vi – ii – V – I",
                "description": "Full diatonic circle. Ordered, cosmic harmony.",
                "chords": [
                    "I",
                    "iii",
                    "vi",
                    "ii",
                    "V",
                    "I"
                ]
            },
            {
                "numerals": "Imaj7 – ♭VImaj7 – IVmaj7 – Imaj7",
                "description": "Chromatic mediant cycle. Otherworldly radiance.",
                "chords": [
                    "Imaj7",
                    "♭VImaj7",
                    "IVmaj7",
                    "Imaj7"
                ]
            }
        ]
    }
];

// Major scale degree semitone offsets (1-indexed: degree 1=0, 2=2, 3=4, etc.)
const DEGREE_SEMITONES = [0, 0, 2, 4, 5, 7, 9, 11];

// Roman numeral patterns (longest first to avoid partial matches)
const UPPER_NUMERALS = [
    ['VII', 7], ['VI', 6], ['IV', 4], ['III', 3], ['II', 2], ['V', 5], ['I', 1]
];
const LOWER_NUMERALS = [
    ['vii', 7], ['vi', 6], ['iv', 4], ['iii', 3], ['ii', 2], ['v', 5], ['i', 1]
];

// Quality suffix → CHORD_TYPES key (order matters: longest match first)
const SUFFIX_MAP = [
    ['maj9', 'maj9'],
    ['maj7', 'maj7'],
    ['m7b5', 'min7b5'],
    ['add9', 'add9'],
    ['madd9', 'madd9'],
    ['7sus4', '7sus4'],
    ['sus2', 'sus2'],
    ['sus4', 'sus4'],
    ['m7', 'min7'],
    ['m9', 'min9'],
    ['\u00f87', 'min7b5'],  // ø7
    ['\u00b07', 'dim7'],     // °7
    ['\u00b0', 'dim'],       // °
    ['+', 'aug'],
    ['13', '13'],
    ['9', null],   // null = context-dependent (dominant vs minor)
    ['7', null],   // null = context-dependent
    ['5', '5'],
    ['6', '6'],
];

/**
 * Parse a Roman numeral chord token into root, type, and display numeral
 * @param {string} token - Roman numeral token (e.g., 'I', '\u266dVImaj7', 'V/vi', '\u00b07')
 * @param {string} key - Key root note (e.g., 'C', 'F#', 'Bb')
 * @returns {Object|null} { root, type, numeral } or null if unparseable
 */
function parseRomanNumeral(token, key) {
    // Handle secondary dominants (V/vi)
    if (token.includes('/')) {
        const parts = token.split('/');
        const secondary = parseRomanNumeral(parts[1], key);
        if (!secondary) return null;
        // Build V of the secondary chord's root
        const secScale = MusicTheory.buildScale(secondary.root, 'major');
        return { root: secScale.notes[4], type: 'maj', numeral: token };
    }

    let pos = 0;

    // 1. Extract accidental prefix
    let accidental = 0;
    if (token[pos] === '\u266d') { accidental = -1; pos++; }  // ♭
    else if (token[pos] === '\u266f') { accidental = 1; pos++; } // ♯

    const rest = token.substring(pos);

    // 2. Handle standalone symbols (no Roman numeral)
    if (rest === '\u00b07') {  // °7
        return buildChordFromDegree(key, 7, accidental, 'dim7', token);
    }
    if (rest === '\u00f87') {  // ø7
        return buildChordFromDegree(key, 7, accidental, 'min7b5', token);
    }
    if (rest === 'maj7') {
        return buildChordFromDegree(key, 1, accidental, 'maj7', token);
    }

    // 3. Match Roman numeral
    let degree = 0;
    let isUpper = true;
    let numeralLen = 0;

    for (const [numStr, deg] of UPPER_NUMERALS) {
        if (rest.startsWith(numStr)) {
            degree = deg;
            isUpper = true;
            numeralLen = numStr.length;
            break;
        }
    }
    if (degree === 0) {
        for (const [numStr, deg] of LOWER_NUMERALS) {
            if (rest.startsWith(numStr)) {
                degree = deg;
                isUpper = false;
                numeralLen = numStr.length;
                break;
            }
        }
    }
    if (degree === 0) return null;

    // 4. Parse quality suffix
    const suffix = rest.substring(numeralLen);
    let chordType = null;

    if (suffix === '') {
        chordType = isUpper ? 'maj' : 'min';
    } else {
        for (const [pat, type] of SUFFIX_MAP) {
            if (suffix === pat) {
                if (type === null) {
                    // Context-dependent: uppercase = dominant, lowercase = minor variant
                    if (pat === '7') chordType = isUpper ? '7' : 'min7';
                    else if (pat === '9') chordType = isUpper ? '9' : 'min9';
                }  else {
                    chordType = type;
                }
                break;
            }
        }
        // Fallback if suffix not matched
        if (chordType === null) {
            chordType = isUpper ? 'maj' : 'min';
        }
    }

    return buildChordFromDegree(key, degree, accidental, chordType, token);
}

/**
 * Build a chord result from a scale degree
 * @param {string} key - Key root note
 * @param {number} degree - Scale degree (1-7)
 * @param {number} accidental - Semitone shift (-1, 0, or 1)
 * @param {string} chordType - CHORD_TYPES key
 * @param {string} numeral - Original Roman numeral string for display
 * @returns {Object} { root, type, numeral }
 */
function buildChordFromDegree(key, degree, accidental, chordType, numeral) {
    const scale = MusicTheory.buildScale(key, 'major');
    const scaleNote = scale.notes[degree - 1];
    let rootIndex = (MusicTheory.getNoteIndex(scaleNote) + accidental + 12) % 12;

    const useFlats = MusicTheory.shouldUseFlats(key) || accidental < 0;
    const root = MusicTheory.getNoteName(rootIndex, useFlats);

    return { root, type: chordType, numeral };
}

/**
 * Build chord objects for a progression
 * @param {number} categoryIndex - Index into PROGRESSION_CATEGORIES
 * @param {number} progressionIndex - Index into category's progressions array
 * @param {string} key - Key root note (e.g., 'C')
 * @returns {Array} Array of { root, type, symbol, numeral }
 */
function buildProgressionChords(categoryIndex, progressionIndex, key) {
    const category = PROGRESSION_CATEGORIES[categoryIndex];
    if (!category) return [];
    const progression = category.progressions[progressionIndex];
    if (!progression) return [];

    const results = [];
    for (const token of progression.chords) {
        const parsed = parseRomanNumeral(token, key);
        if (parsed) {
            const chordDef = MusicTheory.CHORD_TYPES[parsed.type];
            const symbol = parsed.root + (chordDef ? chordDef.symbol : '');
            results.push({
                root: parsed.root,
                type: parsed.type,
                symbol: symbol,
                numeral: parsed.numeral
            });
        }
    }
    return results;
}

/**
 * Get the total number of progressions across all categories
 * @returns {number}
 */
function getTotalProgressionCount() {
    let count = 0;
    for (const cat of PROGRESSION_CATEGORIES) {
        count += cat.progressions.length;
    }
    return count;
}

/**
 * Convert a flat index (0..total-1) to { categoryIndex, progressionIndex }
 * @param {number} flatIndex
 * @returns {Object} { categoryIndex, progressionIndex }
 */
function flatIndexToCategory(flatIndex) {
    let remaining = flatIndex;
    for (let i = 0; i < PROGRESSION_CATEGORIES.length; i++) {
        const cat = PROGRESSION_CATEGORIES[i];
        if (remaining < cat.progressions.length) {
            return { categoryIndex: i, progressionIndex: remaining };
        }
        remaining -= cat.progressions.length;
    }
    return { categoryIndex: 0, progressionIndex: 0 };
}

/**
 * Convert { categoryIndex, progressionIndex } to a flat index
 * @param {number} categoryIndex
 * @param {number} progressionIndex
 * @returns {number}
 */
function categoryToFlatIndex(categoryIndex, progressionIndex) {
    let flat = 0;
    for (let i = 0; i < categoryIndex && i < PROGRESSION_CATEGORIES.length; i++) {
        flat += PROGRESSION_CATEGORIES[i].progressions.length;
    }
    return flat + progressionIndex;
}

/**
 * Build chord objects from raw token array (for user progressions)
 * @param {Array} chords - Array of Roman numeral tokens (e.g., ['I', 'IVmaj7', 'V7', 'vi'])
 * @param {string} key - Key root note (e.g., 'C')
 * @returns {Array} Array of { root, type, symbol, numeral }
 */
function buildProgressionChordsFromTokens(chords, key) {
    const results = [];
    for (const token of chords) {
        const parsed = parseRomanNumeral(token, key);
        if (parsed) {
            const chordDef = MusicTheory.CHORD_TYPES[parsed.type];
            const symbol = parsed.root + (chordDef ? chordDef.symbol : '');
            results.push({
                root: parsed.root,
                type: parsed.type,
                symbol: symbol,
                numeral: parsed.numeral
            });
        }
    }
    return results;
}

// Export
window.ChordProgressions = {
    PROGRESSION_CATEGORIES,
    parseRomanNumeral,
    buildProgressionChords,
    buildProgressionChordsFromTokens,
    getTotalProgressionCount,
    flatIndexToCategory,
    categoryToFlatIndex
};
