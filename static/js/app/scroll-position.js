/** Keep a panel in place while its contents are synchronously rebuilt. */
export function preserveScrollPosition(element, render) {
    const positions = [];
    for (let node = element; node; node = node.parentElement) {
        if (node.scrollTop || node.scrollLeft) {
            positions.push([node, node.scrollTop, node.scrollLeft]);
        }
    }
    try {
        return render();
    } finally {
        // Restore after the final content exists, before the browser paints.
        // If content really shrank, the browser clamps to the new scroll range.
        for (const [node, top, left] of positions) {
            node.scrollTop = top;
            node.scrollLeft = left;
        }
    }
}
