// Keep the board attached to the portrait-left half of the physical device.
export function regionBoardFrame(width, height, angle = 0, safe = {}) {
    const short = Math.min(width, height), long = Math.max(width, height);
    const landscape = width > height;
    const turn = landscape ? (((angle % 360) + 360) % 360 === 270 ? 90 : -90) : 0;
    const boardWidth = short / 2 - 13;
    const boardHeight = long;
    const offset = 8 + boardWidth / 2 - short / 2;
    const cx=width / 2 + (landscape ? 0 : offset);
    const cy=height / 2 + (landscape ? (turn === -90 ? -offset : offset) : 0);
    const screenWidth=landscape?boardHeight:boardWidth;
    const screenHeight=landscape?boardWidth:boardHeight;
    const left=Math.max(cx-screenWidth/2,safe.left||0);
    const right=Math.min(cx+screenWidth/2,width-(safe.right||0));
    const top=Math.max(cy-screenHeight/2,safe.top||0);
    const bottom=Math.min(cy+screenHeight/2,height-(safe.bottom||0));
    return {
        width: Math.max(1,landscape?bottom-top:right-left),
        height: Math.max(1,landscape?right-left:bottom-top), turn,
        x:(left+right)/2,
        y:(top+bottom)/2,
        controls: landscape ? (turn === -90 ? 'top' : 'bottom') : 'right'
    };
}

export function attachRegionLayout(root, host, redraw) {
    const safeProbe=document.createElement('div');
    safeProbe.className='note-region-safe-probe';
    safeProbe.setAttribute('aria-hidden','true');
    document.body.append(safeProbe);
    const mobile = matchMedia('(any-pointer: coarse)');
    function update() {
        const enabled = mobile.matches;
        root.classList.toggle('note-region-mobile', enabled);
        if (!enabled) { host.removeAttribute('style'); delete root.dataset.controls; redraw(false); return; }
        const angle = screen.orientation?.angle ?? window.orientation ?? 0;
        const insets=getComputedStyle(safeProbe);
        const safe={top:parseFloat(insets.paddingTop)||0,bottom:parseFloat(insets.paddingBottom)||0,left:parseFloat(insets.paddingLeft)||0,right:parseFloat(insets.paddingRight)||0};
        const frame = regionBoardFrame(innerWidth, innerHeight, angle, safe);
        root.dataset.controls = frame.controls;
        Object.assign(host.style, {
            width: `${frame.width}px`, height: `${frame.height}px`,
            left: `${frame.x}px`, top: `${frame.y}px`,
            transform: `translate(-50%, -50%) rotate(${frame.turn}deg)`
        });
        host.style.setProperty('--note-label-turn', `${-frame.turn}deg`);
        redraw(true);
    }
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    screen.orientation?.addEventListener('change', update);
    mobile.addEventListener('change', update);
    update();
    return () => {
        safeProbe.remove();
        window.visualViewport?.removeEventListener('resize', update);
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
        screen.orientation?.removeEventListener('change', update);
        mobile.removeEventListener('change', update);
    };
}
