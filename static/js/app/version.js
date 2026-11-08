// Bump this for every app change, including local previews. Shared by app and game settings.
export const APP_VERSION = '1.1.6';
export function versionLabel() {
    const label = document.createElement('p');
    label.className = 'settings-hint app-version';
    label.textContent = `Version ${APP_VERSION}`;
    return label;
}
