/**
 * Weighted Question Selection
 * Probabilistic sampling that prioritizes weak areas (low accuracy, slow reaction time, untested).
 * Used by game modules to replace uniform shuffle-bag with weighted sampling without replacement.
 */

window.WeightedSelection = (function() {
    'use strict';

    /**
     * Build a weighted question queue from a pool of items.
     * Higher-weight items are drawn earlier, but the full pool is exhausted before refilling.
     *
     * @param {Array} pool - Array of question objects (each must have a `root` property)
     * @param {Object} statsData - Stats for the current mode: statsData[root][column] = {tested, correct, totalTimeMs, timedCount}
     * @param {Function} getColumn - Maps a pool item to its stats column key
     * @param {*} lastDrawnItem - The last drawn item (to prevent consecutive repeats)
     * @param {Function} itemsEqual - Equality check for two pool items
     * @returns {Array} Ordered queue (highest-priority first)
     */
    function buildWeightedQueue(pool, statsData, getColumn, lastDrawnItem, itemsEqual) {
        if (pool.length === 0) return [];

        // Compute weights
        var weights = computeWeights(pool, statsData, getColumn);

        // Weighted sampling without replacement
        var queue = weightedSample(pool, weights);

        // Prevent consecutive repeat
        if (queue.length > 1 && lastDrawnItem && itemsEqual(queue[0], lastDrawnItem)) {
            var swapIdx = 1 + Math.floor(Math.random() * (queue.length - 1));
            var tmp = queue[0];
            queue[0] = queue[swapIdx];
            queue[swapIdx] = tmp;
        }

        return queue;
    }

    function computeWeights(pool, statsData, getColumn) {
        // First pass: compute raw avg reaction times to find the max
        var avgRTs = [];
        var maxAvgRT = 0;

        for (var i = 0; i < pool.length; i++) {
            var item = pool[i];
            var entry = lookupEntry(statsData, item.root, getColumn(item));
            var avgRT = 0;
            if (entry && entry.timedCount > 0) {
                avgRT = entry.totalTimeMs / entry.timedCount;
            }
            avgRTs.push(avgRT);
            if (avgRT > maxAvgRT) maxAvgRT = avgRT;
        }

        // Second pass: compute final weights
        var weights = [];
        for (var i = 0; i < pool.length; i++) {
            var item = pool[i];
            var entry = lookupEntry(statsData, item.root, getColumn(item));

            // Untested boost
            var untestedBoost = (!entry || entry.tested === 0) ? 3.0 : 1.0;

            // Accuracy factor: 0% accuracy → 3×, 100% → 1×
            var accuracyFactor = 1.0;
            if (entry && entry.tested > 0) {
                accuracyFactor = 1 + 2.0 * (1 - entry.correct / entry.tested);
            }

            // Reaction time factor: slowest → 2.5×, fastest → ~1×
            var reactionTimeFactor = 1.0;
            if (maxAvgRT > 0 && avgRTs[i] > 0) {
                reactionTimeFactor = 1 + 1.5 * (avgRTs[i] / maxAvgRT);
            }

            var weight = untestedBoost * accuracyFactor * reactionTimeFactor;
            weights.push(Math.max(1.0, weight));
        }

        return weights;
    }

    function lookupEntry(statsData, root, column) {
        if (!statsData || !statsData[root]) return null;
        return statsData[root][column] || null;
    }

    function weightedSample(pool, weights) {
        var remaining = [];
        for (var i = 0; i < pool.length; i++) {
            remaining.push({ item: pool[i], weight: weights[i] });
        }

        var result = [];
        while (remaining.length > 0) {
            var totalWeight = 0;
            for (var i = 0; i < remaining.length; i++) {
                totalWeight += remaining[i].weight;
            }

            var r = Math.random() * totalWeight;
            var cumulative = 0;
            var picked = remaining.length - 1;
            for (var i = 0; i < remaining.length; i++) {
                cumulative += remaining[i].weight;
                if (r < cumulative) {
                    picked = i;
                    break;
                }
            }

            result.push(remaining[picked].item);
            remaining.splice(picked, 1);
        }

        return result;
    }

    return {
        buildWeightedQueue: buildWeightedQueue
    };
})();
