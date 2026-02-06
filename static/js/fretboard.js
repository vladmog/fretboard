/**
 * Fretboard SVG Rendering Module
 * Renders an interactive guitar fretboard using raw SVG
 * Brutalist black-on-white aesthetic
 */

// Style objects (styled-components-like) - Brutalist theme
const styles = {
    fretboard: { fill: '#e8e8e8', rx: 0 },
    string: { stroke: '#000', strokeWidth: 1.5 },
    fret: { stroke: '#000', strokeWidth: 1 },
    nut: { stroke: '#000', strokeWidth: 4 },
    inlay: { fill: '#888', r: 5 },
    fretNumber: { fill: '#000', fontSize: 13, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: '400' },
    marker: { fill: '#000', r: 15 },
    markerText: { fill: '#fff', fontSize: 13, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: '400' }
};

// Frets with inlay markers
const INLAY_FRETS = [3, 5, 7, 9, 12, 15];
const DOUBLE_INLAY_FRETS = [12];

// SVG namespace
const SVG_NS = 'http://www.w3.org/2000/svg';

// Current markers storage
let currentMarkers = [];

/**
 * Apply style object to SVG element
 * @param {SVGElement} element - SVG element to style
 * @param {Object} styleObj - Style object with camelCase properties
 */
function applyStyles(element, styleObj) {
    for (const [key, value] of Object.entries(styleObj)) {
        // Convert camelCase to kebab-case for SVG attributes
        const attrName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        element.setAttribute(attrName, value);
    }
}

/**
 * Create an SVG element with optional styles
 * @param {string} tag - SVG element tag name
 * @param {Object} attrs - Attributes to set
 * @param {Object} styleObj - Optional style object
 * @returns {SVGElement}
 */
function createSVGElement(tag, attrs = {}, styleObj = null) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
        element.setAttribute(key, value);
    }
    if (styleObj) {
        applyStyles(element, styleObj);
    }
    return element;
}

/**
 * Determine if we should use vertical orientation
 * @returns {boolean}
 */
function isVerticalOrientation() {
    return window.innerWidth <= 768;
}

/**
 * Create the fretboard SVG
 * @param {HTMLElement} container - Container element
 * @param {Object} config - Configuration object
 * @returns {Object} - Fretboard API
 */
function createFretboard(container, config = {}) {
    const {
        tuning = ['E', 'A', 'D', 'G', 'B', 'E'],
        frets = 15
    } = config;

    const numStrings = tuning.length;
    const isVertical = isVerticalOrientation();

    // Dimensions
    const stringSpacing = 35;
    const fretSpacing = 70;
    const padding = 50;
    const nutWidth = 8;
    const fretNumberOffset = 30;

    // Calculate SVG dimensions based on orientation
    let svgWidth, svgHeight, fretboardWidth, fretboardHeight;

    if (isVertical) {
        // Vertical: strings go left-right, frets go top-bottom
        fretboardWidth = (numStrings - 1) * stringSpacing;
        fretboardHeight = frets * fretSpacing;
        svgWidth = fretboardWidth + padding * 2;
        svgHeight = fretboardHeight + padding * 2 + fretNumberOffset;
    } else {
        // Horizontal: strings go top-bottom, frets go left-right
        fretboardWidth = frets * fretSpacing;
        fretboardHeight = (numStrings - 1) * stringSpacing;
        svgWidth = fretboardWidth + padding * 2 + fretNumberOffset;
        svgHeight = fretboardHeight + padding * 2;
    }

    // Create SVG element - use viewBox for scaling, CSS controls actual size
    const svg = createSVGElement('svg', {
        viewBox: `0 0 ${svgWidth} ${svgHeight}`,
        preserveAspectRatio: 'xMidYMid meet'
    });

    // Create groups for layering
    const bgGroup = createSVGElement('g', { class: 'bg-layer' });
    const inlayGroup = createSVGElement('g', { class: 'inlay-layer' });
    const fretGroup = createSVGElement('g', { class: 'fret-layer' });
    const stringGroup = createSVGElement('g', { class: 'string-layer' });
    const markerGroup = createSVGElement('g', { class: 'marker-layer' });
    const labelGroup = createSVGElement('g', { class: 'label-layer' });

    // Draw fretboard background
    if (isVertical) {
        const bg = createSVGElement('rect', {
            x: padding - 10,
            y: padding,
            width: fretboardWidth + 20,
            height: fretboardHeight + nutWidth
        }, styles.fretboard);
        bgGroup.appendChild(bg);
    } else {
        const bg = createSVGElement('rect', {
            x: padding,
            y: padding - 10,
            width: fretboardWidth + nutWidth,
            height: fretboardHeight + 20
        }, styles.fretboard);
        bgGroup.appendChild(bg);
    }

    // Draw nut
    if (isVertical) {
        const nut = createSVGElement('line', {
            x1: padding - 10,
            y1: padding,
            x2: padding + fretboardWidth + 10,
            y2: padding
        }, styles.nut);
        fretGroup.appendChild(nut);
    } else {
        const nut = createSVGElement('line', {
            x1: padding,
            y1: padding - 10,
            x2: padding,
            y2: padding + fretboardHeight + 10
        }, styles.nut);
        fretGroup.appendChild(nut);
    }

    // Draw frets
    for (let f = 1; f <= frets; f++) {
        if (isVertical) {
            const y = padding + f * fretSpacing;
            const fret = createSVGElement('line', {
                x1: padding - 10,
                y1: y,
                x2: padding + fretboardWidth + 10,
                y2: y
            }, styles.fret);
            fretGroup.appendChild(fret);
        } else {
            const x = padding + f * fretSpacing;
            const fret = createSVGElement('line', {
                x1: x,
                y1: padding - 10,
                x2: x,
                y2: padding + fretboardHeight + 10
            }, styles.fret);
            fretGroup.appendChild(fret);
        }
    }

    // Draw inlays
    for (let f = 1; f <= frets; f++) {
        if (!INLAY_FRETS.includes(f)) continue;

        const isDouble = DOUBLE_INLAY_FRETS.includes(f);

        if (isVertical) {
            const y = padding + (f - 0.5) * fretSpacing;
            const centerX = padding + fretboardWidth / 2;

            if (isDouble) {
                // Double inlay for 12th fret
                const inlay1 = createSVGElement('circle', {
                    cx: centerX - stringSpacing,
                    cy: y
                }, styles.inlay);
                const inlay2 = createSVGElement('circle', {
                    cx: centerX + stringSpacing,
                    cy: y
                }, styles.inlay);
                inlayGroup.appendChild(inlay1);
                inlayGroup.appendChild(inlay2);
            } else {
                const inlay = createSVGElement('circle', {
                    cx: centerX,
                    cy: y
                }, styles.inlay);
                inlayGroup.appendChild(inlay);
            }
        } else {
            const x = padding + (f - 0.5) * fretSpacing;
            const centerY = padding + fretboardHeight / 2;

            if (isDouble) {
                const inlay1 = createSVGElement('circle', {
                    cx: x,
                    cy: centerY - stringSpacing
                }, styles.inlay);
                const inlay2 = createSVGElement('circle', {
                    cx: x,
                    cy: centerY + stringSpacing
                }, styles.inlay);
                inlayGroup.appendChild(inlay1);
                inlayGroup.appendChild(inlay2);
            } else {
                const inlay = createSVGElement('circle', {
                    cx: x,
                    cy: centerY
                }, styles.inlay);
                inlayGroup.appendChild(inlay);
            }
        }
    }

    // Draw strings
    for (let s = 0; s < numStrings; s++) {
        // String thickness varies (thicker for bass strings)
        const thickness = 0.75 + (numStrings - 1 - s) * 0.25;
        const stringStyle = { ...styles.string, strokeWidth: thickness };

        if (isVertical) {
            const x = padding + s * stringSpacing;
            const string = createSVGElement('line', {
                x1: x,
                y1: padding,
                x2: x,
                y2: padding + fretboardHeight
            }, stringStyle);
            stringGroup.appendChild(string);
        } else {
            // Horizontal: reverse order so high E (thin) is at top, low E (thick) at bottom
            // This matches standard tab/fretboard diagram convention
            const y = padding + (numStrings - 1 - s) * stringSpacing;
            const string = createSVGElement('line', {
                x1: padding,
                y1: y,
                x2: padding + fretboardWidth,
                y2: y
            }, stringStyle);
            stringGroup.appendChild(string);
        }
    }

    // Draw fret numbers
    for (let f = 1; f <= frets; f++) {
        if (!INLAY_FRETS.includes(f)) continue;

        if (isVertical) {
            const y = padding + (f - 0.5) * fretSpacing;
            const x = padding + fretboardWidth + 18;
            const label = createSVGElement('text', {
                x: x,
                y: y,
                'text-anchor': 'start',
                'dominant-baseline': 'middle'
            }, styles.fretNumber);
            label.textContent = f;
            labelGroup.appendChild(label);
        } else {
            const x = padding + (f - 0.5) * fretSpacing;
            const y = padding + fretboardHeight + 22;
            const label = createSVGElement('text', {
                x: x,
                y: y,
                'text-anchor': 'middle',
                'dominant-baseline': 'hanging'
            }, styles.fretNumber);
            label.textContent = f;
            labelGroup.appendChild(label);
        }
    }

    // Assemble SVG
    svg.appendChild(bgGroup);
    svg.appendChild(inlayGroup);
    svg.appendChild(fretGroup);
    svg.appendChild(stringGroup);
    svg.appendChild(markerGroup);
    svg.appendChild(labelGroup);

    container.appendChild(svg);

    // Store configuration for marker calculations
    const fretboardConfig = {
        svg,
        markerGroup,
        numStrings,
        frets,
        padding,
        stringSpacing,
        fretSpacing,
        isVertical,
        tuning
    };

    // Return API
    return {
        setMarker: (string, fret, options) => setMarker(fretboardConfig, string, fret, options),
        clearMarkers: () => clearMarkers(fretboardConfig),
        addShape: (points, options) => addShape(fretboardConfig, points, options)
    };
}

/**
 * Calculate marker position
 * @param {Object} config - Fretboard configuration
 * @param {number} string - String number (1-6, 1 is high E)
 * @param {number} fret - Fret number (0 for open, 1+ for fretted)
 * @returns {Object} - {x, y} coordinates
 */
function getMarkerPosition(config, string, fret) {
    const { padding, stringSpacing, fretSpacing, isVertical, numStrings } = config;

    // Convert string number (1 = high E) to index
    const stringIndex = numStrings - string;

    if (isVertical) {
        const x = padding + stringIndex * stringSpacing;
        const y = fret === 0 ? padding - 15 : padding + (fret - 0.5) * fretSpacing;
        return { x, y };
    } else {
        // Horizontal: match reversed string order (high E at top, low E at bottom)
        const y = padding + (numStrings - 1 - stringIndex) * stringSpacing;
        const x = fret === 0 ? padding - 15 : padding + (fret - 0.5) * fretSpacing;
        return { x, y };
    }
}

/**
 * Add or update a marker on the fretboard
 * @param {Object} config - Fretboard configuration
 * @param {number} string - String number (1-6)
 * @param {number} fret - Fret number (0 for open)
 * @param {Object} options - Marker options
 */
function setMarker(config, string, fret, options = {}) {
    const {
        color = styles.marker.fill,
        borderColor = null,
        text = '',
        textColor = styles.markerText.fill
    } = options;

    const { markerGroup } = config;
    const { x, y } = getMarkerPosition(config, string, fret);

    // Create marker group
    const group = createSVGElement('g', { class: 'marker' });

    // Create circle with border
    const circleStyle = { ...styles.marker, fill: color };
    if (borderColor) {
        circleStyle.stroke = borderColor;
        circleStyle.strokeWidth = 2;
    }
    const circle = createSVGElement('circle', {
        cx: x,
        cy: y
    }, circleStyle);
    group.appendChild(circle);

    // Create text label if provided
    if (text) {
        const label = createSVGElement('text', {
            x: x,
            y: y,
            'text-anchor': 'middle',
            'dominant-baseline': 'central'
        }, { ...styles.markerText, fill: textColor });
        label.textContent = text;
        group.appendChild(label);
    }

    markerGroup.appendChild(group);
    currentMarkers.push({ string, fret, element: group });
}

/**
 * Clear all markers from the fretboard
 * @param {Object} config - Fretboard configuration
 */
function clearMarkers(config) {
    const { markerGroup } = config;
    while (markerGroup.firstChild) {
        markerGroup.removeChild(markerGroup.firstChild);
    }
    currentMarkers = [];
}

/**
 * Add a shape overlay connecting multiple points
 * @param {Object} config - Fretboard configuration
 * @param {Array} points - Array of {string, fret} objects
 * @param {Object} options - Shape options
 */
function addShape(config, points, options = {}) {
    const {
        stroke = '#000',
        strokeWidth = 1,
        fill = 'none',
        opacity = 0.3
    } = options;

    if (points.length < 2) return;

    const { markerGroup } = config;

    // Calculate path coordinates
    const pathPoints = points.map(p => getMarkerPosition(config, p.string, p.fret));

    // Create path
    const pathData = pathPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ') + ' Z';

    const path = createSVGElement('path', {
        d: pathData,
        stroke,
        'stroke-width': strokeWidth,
        fill,
        opacity
    });

    markerGroup.appendChild(path);
}
