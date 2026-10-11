import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFretboard } from '../static/js/core/fretboard.js';

class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.classList = { add() {} }; }
    setAttribute(key, value) { this.attrs[key] = value; }
    appendChild(node) { this.children.push(node); }
    removeChild(node) { this.children.splice(this.children.indexOf(node), 1); }
    get firstChild() { return this.children[0]; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    getScreenCTM() { return { inverse() {} }; }
}

test('multiple fretboards isolate markers and click handlers', () => {
    const previousDocument = globalThis.document;
    const previousPoint = globalThis.DOMPoint;
    globalThis.document = { createElementNS: (_, tag) => new Node(tag) };
    globalThis.DOMPoint = class { matrixTransform() { return { x: 80, y: 50 }; } };
    try {
        const first = new Node('div'), second = new Node('div');
        const a = createFretboard(first, { vertical: false });
        const b = createFretboard(second, { vertical: true, markerScale: 1.35, stringSpacing: 48 });
        a.setMarker(1, 1, { text: '1' }); b.setMarker(2, 2, { text: '3' });
        const layer = host => host.children[0].children.find(node => node.attrs.class === 'marker-layer');
        a.clearMarkers();
        assert.equal(layer(first).children.length, 0);
        assert.equal(layer(second).children.length, 1);
        let callsA = 0, callsB = 0;
        a.onFretClick(() => callsA++); b.onFretClick(() => callsB++);
        const event = { clientX: 80, clientY: 50, stopPropagation() {} };
        first.children[0].listeners.click(event);
        assert.equal(callsA, 1); assert.equal(callsB, 0);
        second.children[0].listeners.click(event);
        assert.equal(callsA, 1); assert.equal(callsB, 1);
    } finally {
        globalThis.document = previousDocument; globalThis.DOMPoint = previousPoint;
    }
});
