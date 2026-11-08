import { CHORD_TYPES } from '../core/music-theory.js';
/** Shared generator controls for the start page and game settings. */
export function generatorSettings(container, settings, onChange) {
    const label=document.createElement('label');
    label.className='settings-note-label';
    const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=settings.generated;
    label.append(toggle,document.createTextNode(' Generate an endless progression'));
    const types=document.createElement('fieldset');types.className='voice-leading-generated-types';
    const legend=document.createElement('legend');legend.textContent='Chord types';types.append(legend);
    types.hidden=!settings.generated;
    for(const [id,definition] of Object.entries(CHORD_TYPES)){
        const row=document.createElement('label'),input=document.createElement('input');
        input.type='checkbox';input.checked=settings.generatedTypes.includes(id);
        row.append(input,document.createTextNode(` ${definition.name}`));types.append(row);
        input.addEventListener('change',()=>{
            const selected=[...types.querySelectorAll('input')].filter(el=>el.checked);
            if(!selected.length){input.checked=true;return;}
            settings.generatedTypes=input.checked?[...settings.generatedTypes,id]:settings.generatedTypes.filter(type=>type!==id);
            onChange();
        });
    }
    toggle.addEventListener('change',()=>{settings.generated=toggle.checked;types.hidden=!toggle.checked;onChange();});
    container.append(label,types);
}
