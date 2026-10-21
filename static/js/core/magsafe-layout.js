/** Physical profile for iPhone 16 Pro, standard zoom, portrait Home Screen app.
 * Apple drawing: https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16-pro.pdf
 * Ring center: 75.05 mm below body top. Body 149.61 mm; display 2622 px @460 ppi.
 * Standard MagSafe accessory magnet ID: 46.00 mm; marker centers sit on it.
 * CSS mm are NOT physical millimeters on a phone: convert via native pixels/DPR.
 */
export function magsafeProfile({ width, height, dpr, standalone, iphone }) {
    if (!standalone || !iphone || dpr !== 3 || width !== 402 || height !== 874) return null;
    const pxPerMm = 460 / 25.4 / 3;
    const displayHeightMm = 2622 / 460 * 25.4;
    return {
        centerX: width / 2,
        centerY: (75.05 - (149.61 - displayHeightMm) / 2) * pxPerMm,
        markerCenterRadius: 46 / 2 * pxPerMm,
    };
}
export function currentMagsafeProfile() {
    return magsafeProfile({ width: window.innerWidth, height: window.innerHeight,
        dpr: window.devicePixelRatio,
        standalone: navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
        iphone: /iPhone/.test(navigator.userAgent) });
}
// Convert the renderer's marker-center radius fraction to a physical SVG size.
export function magsafeCircleSize(profile, radiusFraction) {
    return profile.markerCenterRadius / radiusFraction;
}
export function alignMagsafeCircle(container, radiusFraction) {
    container.dataset.magsafeRadiusFraction = radiusFraction;
    const profile = currentMagsafeProfile();
    container.classList.toggle('magsafe-circle', Boolean(profile));
    if (!profile) return;
    container.style.setProperty('--magsafe-x', `${profile.centerX}px`);
    container.style.setProperty('--magsafe-y', `${profile.centerY}px`);
    container.style.setProperty('--magsafe-size', `${magsafeCircleSize(profile, radiusFraction)}px`);
}
// Fifths stays mounted between visits; recompute after orientation/viewport changes.
if (typeof window !== 'undefined') window.addEventListener('resize', () => {
    document.querySelectorAll('[data-magsafe-radius-fraction]').forEach(container => {
        alignMagsafeCircle(container, Number(container.dataset.magsafeRadiusFraction));
    });
});
