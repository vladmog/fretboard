/**
 * Tap-to-Rotate Marker Text
 * Toggles marker text rotation by 90° clockwise on fretboard tap
 */

(function() {
    'use strict';

    let currentRotation = 0; // 0 or 90

    /**
     * Rotate all marker text elements
     * @param {number} angle - Rotation angle in degrees
     */
    function rotateMarkerText(angle) {
        const textElements = document.querySelectorAll('.marker-layer text');

        textElements.forEach(text => {
            const x = parseFloat(text.getAttribute('x')) || 0;
            const y = parseFloat(text.getAttribute('y')) || 0;
            text.setAttribute('transform', `rotate(${angle}, ${x}, ${y})`);
        });
    }

    /**
     * Toggle rotation between 0 and 90 degrees
     */
    function toggleRotation() {
        if (window.FretboardApp && ['f.chord', 'f.scale'].includes(window.FretboardApp.getState().mode)) return;
        currentRotation = currentRotation === 0 ? 90 : 0;
        rotateMarkerText(currentRotation);
    }

    /**
     * Apply current rotation to newly created markers
     */
    function applyCurrentRotation() {
        rotateMarkerText(currentRotation);
    }

    /**
     * Initialize click listener on fretboard
     */
    function init() {
        const fretboard = document.getElementById('fretboard-panel');
        if (fretboard) {
            fretboard.addEventListener('touchend', toggleRotation);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export public API
    window.RotationToggle = {
        applyCurrentRotation
    };
})();
