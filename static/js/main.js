/**
 * Application entry point — the only script tag in the HTML (type="module").
 * Side-effect imports pull in the full module graph; each module wires its
 * own DOMContentLoaded init.
 */

import './app.js';
import './games/framework.js';
import './rotation-toggle.js';
import './dev-panel.js';
