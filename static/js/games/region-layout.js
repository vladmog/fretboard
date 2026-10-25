// Keep the board attached to the portrait-left half of the physical device.
export function regionBoardFrame(width, height, angle = 0) {
    const short = Math.min(width, height), long = Math.max(width, height);
    const landscape = width > height;
    const turn = landscape ? (((angle % 360) + 360) % 360 === 270 ? 90 : -90) : 0;
    const boardWidth = short / 2 - 13;
    const boardHeight = long;
    const offset = 8 + boardWidth / 2 - short / 2;
    return {
        width: boardWidth, height: boardHeight, turn,
        x: width / 2 + (landscape ? 0 : offset),
        y: height / 2 + (landscape ? (turn === -90 ? -offset : offset) : 0),
        controls: landscape ? (turn === -90 ? 'top' : 'bottom') : 'right'
    };
}

export function attachRegionLayout(root, host, redraw) {
    const mobile = matchMedia('(any-pointer: coarse)');
    function update() {
        const enabled = mobile.matches;
        root.classList.toggle('note-region-mobile', enabled);
        if (!enabled) { host.removeAttribute('style'); delete root.dataset.controls; redraw(false); return; }
        const angle = screen.orientation?.angle ?? window.orientation ?? 0;
        const frame = regionBoardFrame(innerWidth, innerHeight, angle);
        root.dataset.controls = frame.controls;
        Object.assign(host.style, {
            width: `${frame.width}px`, height: `${frame.height}px`,
            left: `${frame.x}px`, top: `${frame.y}px`,
            transform: `translate(-50%, -50%) rotate(${frame.turn}deg)`
        });
        host.style.setProperty('--note-label-turn', `${-frame.turn}deg`);
        redraw(true);
    }
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    screen.orientation?.addEventListener('change', update);
    mobile.addEventListener('change', update);
    update();
    return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
        screen.orientation?.removeEventListener('change', update);
        mobile.removeEventListener('change', update);
    };
}
