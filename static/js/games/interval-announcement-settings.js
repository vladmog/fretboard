/** Announcement order only; the visual question and scoring stay unchanged. */
export function renderAnnouncementOrder(container, settings, save) {
    const group = document.createElement('div');
    group.className = 'game-setting-group';
    const label = document.createElement('label');
    label.className = 'game-setting-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settings.sayRootFirst === true;
    checkbox.addEventListener('change', () => {
        settings.sayRootFirst = checkbox.checked;
        save();
    });
    label.append(checkbox, ' Say root first');
    group.appendChild(label);
    container.appendChild(group);
}
