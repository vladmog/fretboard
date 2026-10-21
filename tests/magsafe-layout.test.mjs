import test from 'node:test';
import assert from 'node:assert/strict';
import { magsafeProfile, magsafeCircleSize } from '../static/js/core/magsafe-layout.js';
const phone = {width:402, height:874, dpr:3, standalone:true, iphone:true};
test('portrait PWA uses the physical ring center, independent of safe-area padding', () => {
    const p = magsafeProfile(phone);
    assert.equal(p.centerX,201);
    assert.ok(Math.abs(p.centerY - 438.4790026246719) < 0.01);
});
test('both circle renderers place marker centers on the 46 mm inner diameter', () => {
    const p=magsafeProfile(phone), pxPerMm=460/25.4/3;
    for(const radius of [.38,78/200]) {
        assert.ok(Math.abs(magsafeCircleSize(p,radius)*radius/pxPerMm-23)<1e-9);
    }
});
test('does not apply device calibration to browser tabs or other viewports', () => {
    for(const patch of [{standalone:false},{iphone:false},{width:874,height:402},{width:390},{dpr:2}]) {
        assert.equal(magsafeProfile({...phone,...patch}),null);
    }
});
