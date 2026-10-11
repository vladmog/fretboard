import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindFretboardGestures } from '../static/js/app/fretboard-gestures.js';

function setup(vertical, isEnabled) {
    const events = {}, steps = [];
    const host = { style: {}, setAttribute() {}, setPointerCapture() {}, addEventListener: (name, fn) => { events[name] = fn; } };
    bindFretboardGestures(host, vertical, step => steps.push(step), isEnabled);
    const fire = (name, data = {}) => {
        const event = { isPrimary: true, pointerId: 1, button: 0, timeStamp: 100, clientX: 0, clientY: 0,
            deltaX: 0, deltaY: 0, deltaMode: 0, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...data };
        events[name](event); return event;
    };
    return { host, steps, fire };
}
for (const vertical of [false, true]) test(`parallel gestures navigate; perpendicular scroll and taps remain intact (${vertical})`, () => {
    const { host, steps, fire } = setup(vertical);
    assert.equal(host.style.touchAction, vertical ? 'pan-x pinch-zoom' : 'pan-y pinch-zoom');
    const drag = (x, y) => { fire('pointerdown'); fire('pointerup', { clientX: x, clientY: y }); };
    drag(vertical ? 0 : 80, vertical ? 80 : 0);
    assert.deepEqual(steps, [1]);
    assert.equal(fire('click').stopped, true, 'swipe must not rotate labels');
    drag(vertical ? 0 : -80, vertical ? -80 : 0);
    assert.deepEqual(steps, [1, -1]);
    drag(vertical ? 80 : 0, vertical ? 0 : 80);
    drag(20, 20);
    assert.equal(steps.length, 2);
    fire('pointerdown'); fire('pointercancel'); fire('pointerup', { clientX: -80, clientY: -80 });
    assert.equal(steps.length, 2);
    fire('pointerdown', { timeStamp: 110 }); fire('pointerup', { timeStamp: 120 });
    assert.equal(fire('click', { timeStamp: 120 }).stopped, undefined);
});

test('trackpad momentum advances once; perpendicular scrolling and zoom remain native', () => {
    const { steps, fire } = setup(false);
    for (const timeStamp of [100, 120, 140, 200]) fire('wheel', { deltaX: 40, timeStamp });
    assert.deepEqual(steps, [1]);
    assert.equal(fire('wheel', { deltaY: 60, timeStamp: 250 }).prevented, undefined);
    assert.equal(fire('wheel', { deltaX: 60, ctrlKey: true, timeStamp: 260 }).prevented, undefined);
    fire('wheel', { deltaX: -40, timeStamp: 300 });
    fire('wheel', { deltaX: -40, timeStamp: 600 });
    assert.deepEqual(steps, [1, -1, -1]);
});

test('disabled main-view gestures leave normal input intact', () => {
    let enabled = false;
    const {steps,fire}=setup(true, () => enabled);
    fire('pointerdown');fire('pointerup',{clientY:80});
    assert.equal(fire('wheel',{deltaY:80}).prevented,undefined);
    assert.equal(fire('keydown',{key:'ArrowDown'}).prevented,undefined);
    assert.deepEqual(steps,[]);
    enabled=true;
    fire('pointerdown');fire('pointerup',{clientY:80});
    assert.deepEqual(steps,[1]);
    assert.equal(fire('touchend').stopped,true);
    fire('pointerdown');fire('pointerup',{timeStamp:120});
    assert.equal(fire('touchend',{timeStamp:120}).stopped,undefined);
});

for (const vertical of [false, true]) test(`short diagonal swipes commit once before release (${vertical})`, () => {
    const {steps, fire} = setup(vertical);
    const point = (parallel, perpendicular) => vertical
        ? {clientX:perpendicular,clientY:parallel} : {clientX:parallel,clientY:perpendicular};
    fire('pointerdown');
    fire('pointermove',point(24,21));
    assert.deepEqual(steps,[1]);
    fire('pointermove',point(60,24));
    fire('pointerup',point(12,8));
    assert.deepEqual(steps,[1], 'returning toward the start neither loses nor duplicates a swipe');
    assert.equal(fire('click').stopped,true);
    fire('pointerdown');
    fire('pointermove',point(-24,20));
    fire('pointerup',point(-40,22));
    assert.deepEqual(steps,[1,-1]);
    fire('pointerdown');
    fire('pointermove',point(15,35));
    fire('pointercancel');
    fire('pointerup',point(60,40));
    assert.deepEqual(steps,[1,-1], 'native perpendicular scrolling does not navigate');
});
