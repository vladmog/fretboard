import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMarkerColor } from '../static/js/app/marker-colors.js';
import { getIntervalColor } from '../static/js/core/music-theory.js';
test('app root has black fill, red ring, white text without changing game palette', () => {
    assert.deepEqual(getMarkerColor('1'), {fill:'#000',border:'#FF0000',text:'#fff'});
    assert.notEqual(getIntervalColor('1').fill, '#000');
    assert.equal(getIntervalColor('1').text, '#000');
    for (const interval of ['b3','3','5','b7','7']) assert.deepEqual(getMarkerColor(interval), getIntervalColor(interval));
});
