/**
 * Dev Panel — Sound parameter tuning UI
 * Set DEV_MODE to false to disable completely (zero overhead).
 */

(function() {
    'use strict';

    const DEV_MODE = false;
    if (!DEV_MODE) return;

    const SLIDER_DEFS = [
        { key: 'attack',              label: 'Attack',          min: 0.001, max: 1,    step: 0.001 },
        { key: 'decay',               label: 'Decay',           min: 0.01,  max: 2,    step: 0.01  },
        { key: 'sustain',             label: 'Sustain',         min: 0,     max: 1,    step: 0.01  },
        { key: 'release',             label: 'Release',         min: 0.01,  max: 3,    step: 0.01  },
        { key: 'volume',              label: 'Volume (dB)',     min: -30,   max: 0,    step: 1     },
        { key: 'limiterThreshold',    label: 'Limiter (dB)',    min: -20,   max: 0,    step: 1     },
        { key: 'strumDelay',          label: 'Strum Delay',     min: 0.01,  max: 0.3,  step: 0.01  },
        { key: 'arpeggioDelay',       label: 'Arpeggio Delay',  min: 0.02,  max: 0.5,  step: 0.01  },
        { key: 'noteDuration',        label: 'Note Duration',   min: 0.1,   max: 3,    step: 0.1   },
        { key: 'arpeggioNoteDuration', label: 'Arp Note Dur.',  min: 0.1,   max: 2,    step: 0.1   }
    ];

    const EFFECT_SLIDER_DEFS = [
        { key: 'filterFrequency', label: 'Filter Freq (Hz)', min: 20,  max: 20000, step: 10   },
        { key: 'filterQ',        label: 'Filter Q',          min: 0.1, max: 20,    step: 0.1  },
        { key: 'reverbDecay',    label: 'Reverb Decay (s)',  min: 0.1, max: 10,    step: 0.1  },
        { key: 'reverbWet',      label: 'Reverb Wet',        min: 0,   max: 1,     step: 0.01 }
    ];

    document.addEventListener('DOMContentLoaded', function() {
        // --- Toggle button ---
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'dev-toggle-btn';
        toggleBtn.textContent = 'DEV';
        document.body.appendChild(toggleBtn);

        // --- Panel ---
        const panel = document.createElement('div');
        panel.id = 'dev-panel';
        document.body.appendChild(panel);

        const heading = document.createElement('h3');
        heading.textContent = 'SOUND PARAMS';
        heading.className = 'dev-panel-heading';
        panel.appendChild(heading);

        const currentParams = Sound.getParams();

        // --- Oscillator select ---
        const oscGroup = document.createElement('div');
        oscGroup.className = 'dev-param-group';
        const oscLabel = document.createElement('label');
        oscLabel.className = 'dev-param-label';
        oscLabel.textContent = 'Oscillator';
        oscGroup.appendChild(oscLabel);

        const oscSelect = document.createElement('select');
        oscSelect.className = 'dev-select';
        ['sine', 'triangle', 'square', 'sawtooth'].forEach(function(type) {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            if (type === currentParams.oscillatorType) opt.selected = true;
            oscSelect.appendChild(opt);
        });
        oscSelect.addEventListener('change', function() {
            Sound.setParam('oscillatorType', oscSelect.value);
            updateTextarea();
        });
        oscGroup.appendChild(oscSelect);
        panel.appendChild(oscGroup);

        // --- Sliders ---
        const sliderInputs = {};

        SLIDER_DEFS.forEach(function(def) {
            const group = document.createElement('div');
            group.className = 'dev-param-group';

            const label = document.createElement('label');
            label.className = 'dev-param-label';
            const valueSpan = document.createElement('span');
            valueSpan.className = 'dev-param-value';
            valueSpan.textContent = currentParams[def.key];
            label.textContent = def.label + ' ';
            label.appendChild(valueSpan);
            group.appendChild(label);

            const input = document.createElement('input');
            input.type = 'range';
            input.className = 'dev-slider';
            input.min = def.min;
            input.max = def.max;
            input.step = def.step;
            input.value = currentParams[def.key];
            input.addEventListener('input', function() {
                const val = parseFloat(input.value);
                Sound.setParam(def.key, val);
                valueSpan.textContent = val;
                updateTextarea();
            });
            group.appendChild(input);
            panel.appendChild(group);

            sliderInputs[def.key] = { input: input, valueSpan: valueSpan };
        });

        // --- Effects section ---
        const effectsHeading = document.createElement('h3');
        effectsHeading.textContent = 'EFFECTS';
        effectsHeading.className = 'dev-panel-heading';
        panel.appendChild(effectsHeading);

        // Filter type select
        const filterGroup = document.createElement('div');
        filterGroup.className = 'dev-param-group';
        const filterLabel = document.createElement('label');
        filterLabel.className = 'dev-param-label';
        filterLabel.textContent = 'Filter Type';
        filterGroup.appendChild(filterLabel);

        const filterSelect = document.createElement('select');
        filterSelect.className = 'dev-select';
        ['lowpass', 'highpass', 'bandpass'].forEach(function(type) {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type;
            if (type === currentParams.filterType) opt.selected = true;
            filterSelect.appendChild(opt);
        });
        filterSelect.addEventListener('change', function() {
            Sound.setParam('filterType', filterSelect.value);
            updateTextarea();
        });
        filterGroup.appendChild(filterSelect);
        panel.appendChild(filterGroup);

        // Effect sliders
        EFFECT_SLIDER_DEFS.forEach(function(def) {
            const group = document.createElement('div');
            group.className = 'dev-param-group';

            const label = document.createElement('label');
            label.className = 'dev-param-label';
            const valueSpan = document.createElement('span');
            valueSpan.className = 'dev-param-value';
            valueSpan.textContent = currentParams[def.key];
            label.textContent = def.label + ' ';
            label.appendChild(valueSpan);
            group.appendChild(label);

            const input = document.createElement('input');
            input.type = 'range';
            input.className = 'dev-slider';
            input.min = def.min;
            input.max = def.max;
            input.step = def.step;
            input.value = currentParams[def.key];
            input.addEventListener('input', function() {
                const val = parseFloat(input.value);
                Sound.setParam(def.key, val);
                valueSpan.textContent = val;
                updateTextarea();
            });
            group.appendChild(input);
            panel.appendChild(group);

            sliderInputs[def.key] = { input: input, valueSpan: valueSpan };
        });

        // --- Test buttons ---
        const btnRow = document.createElement('div');
        btnRow.className = 'dev-btn-row';

        const noteBtn = document.createElement('button');
        noteBtn.className = 'dev-btn';
        noteBtn.textContent = 'Play Note';
        noteBtn.addEventListener('click', function() { Sound.playNote('C', 4); });
        btnRow.appendChild(noteBtn);

        const chordBtn = document.createElement('button');
        chordBtn.className = 'dev-btn';
        chordBtn.textContent = 'Play Chord';
        chordBtn.addEventListener('click', function() { Sound.playChord(['C', 'E', 'G']); });
        btnRow.appendChild(chordBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'dev-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', function() {
            var defs = Sound.getDefaults();
            Object.keys(defs).forEach(function(key) {
                Sound.setParam(key, defs[key]);
            });
            // Update selects
            oscSelect.value = defs.oscillatorType;
            filterSelect.value = defs.filterType;
            // Update sliders
            SLIDER_DEFS.concat(EFFECT_SLIDER_DEFS).forEach(function(def) {
                var si = sliderInputs[def.key];
                si.input.value = defs[def.key];
                si.valueSpan.textContent = defs[def.key];
            });
            updateTextarea();
        });
        btnRow.appendChild(resetBtn);

        panel.appendChild(btnRow);

        // --- Textarea ---
        const textarea = document.createElement('textarea');
        textarea.className = 'dev-textarea';
        textarea.readOnly = true;
        textarea.rows = 17;
        panel.appendChild(textarea);

        function updateTextarea() {
            var p = Sound.getParams();
            var lines = Object.keys(p).map(function(k) {
                return k + ' = ' + p[k];
            });
            textarea.value = lines.join('\n');
        }
        updateTextarea();

        // --- Toggle behavior ---
        let open = false;
        toggleBtn.addEventListener('click', function() {
            open = !open;
            panel.classList.toggle('open', open);
            toggleBtn.classList.toggle('active', open);
        });
    });
})();
