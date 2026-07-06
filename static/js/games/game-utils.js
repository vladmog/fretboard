/**
 * Shared Game Utilities
 * Pure helpers used by every game module: shuffling, stat colors, time
 * formatting, and the reaction-time chart. Previously copy-pasted into each
 * game file — add new shared game helpers here, never inline in a game.
 */

export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 0% = red #FF4444, 50% = yellow #FFD700, 100% = green #32CD32
export function accuracyToColor(ratio) {
    let r, g, b;
    if (ratio <= 0.5) {
        const t = ratio / 0.5;
        r = 255;
        g = Math.round(68 + (215 - 68) * t);
        b = Math.round(68 + (0 - 68) * t);
    } else {
        const t = (ratio - 0.5) / 0.5;
        r = Math.round(255 + (50 - 255) * t);
        g = Math.round(215 + (205 - 215) * t);
        b = Math.round(0 + (50 - 0) * t);
    }
    return `rgb(${r},${g},${b})`;
}

// fastest = green, middle = yellow, slowest = red
export function reactionTimeToColor(timeMs, minTime, maxTime) {
    if (maxTime === minTime) return '#32CD32';
    const ratio = (timeMs - minTime) / (maxTime - minTime);
    let r, g, b;
    if (ratio <= 0.5) {
        const t = ratio / 0.5;
        r = Math.round(50 + (255 - 50) * t);
        g = Math.round(205 + (215 - 205) * t);
        b = Math.round(50 - 50 * t);
    } else {
        const t = (ratio - 0.5) / 0.5;
        r = 255;
        g = Math.round(215 * (1 - t));
        b = 0;
    }
    return `rgb(${r},${g},${b})`;
}

export function formatTime(ms) {
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
}

// Black text on light backgrounds, white on dark
export function contrastColor(rgbString) {
    const rgb = rgbString.match(/\d+/g).map(Number);
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    return brightness > 140 ? '#000' : '#fff';
}

/**
 * Render a single-row reaction-time table.
 * @param {HTMLElement} container
 * @param {Array<{label: string, timeMs: number}>} items - measured entries
 * @param {string} heading
 * @param {string[]} columnKeys - full ordered column set (item labels are a subset)
 * @param {string[]} [displayLabels] - shown in the header; defaults to columnKeys
 */
export function renderReactionTimeChart(container, items, heading, columnKeys, displayLabels) {
    if (items.length === 0) return;
    const labels = displayLabels || columnKeys;

    const h = document.createElement('div');
    h.className = 'rt-chart-heading';
    h.textContent = heading;
    container.appendChild(h);

    const timeMap = {};
    items.forEach(q => { timeMap[q.label] = q.timeMs; });

    const maxTime = Math.max(...items.map(q => q.timeMs));
    const minTime = Math.min(...items.map(q => q.timeMs));

    const table = document.createElement('div');
    table.className = 'stats-table';

    const headerRow = document.createElement('div');
    headerRow.className = 'stats-row';
    columnKeys.forEach((key, i) => {
        const cell = document.createElement('div');
        cell.className = 'stats-cell stats-cell-header';
        cell.textContent = labels[i];
        headerRow.appendChild(cell);
    });
    table.appendChild(headerRow);

    const dataRow = document.createElement('div');
    dataRow.className = 'stats-row';
    columnKeys.forEach((key, i) => {
        const cell = document.createElement('div');
        cell.className = 'stats-cell';
        if (timeMap[key] !== undefined) {
            const t = timeMap[key];
            const bg = reactionTimeToColor(t, minTime, maxTime);
            cell.style.backgroundColor = bg;
            cell.textContent = formatTime(t);
            cell.title = `${labels[i]}: ${formatTime(t)}`;
            cell.style.color = contrastColor(bg);
        } else {
            cell.style.backgroundColor = '#f0f0f0';
        }
        dataRow.appendChild(cell);
    });
    table.appendChild(dataRow);

    container.appendChild(table);
}
