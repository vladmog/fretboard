import { BOX_MODES, BOX_INTERVALS } from '../core/note-box-question.js';
export function renderBoxModeSettings(body,settings,onChange){
    const label=document.createElement('label');label.className='game-setting-label';label.textContent='Question mode';
    const select=document.createElement('select');select.className='game-setting-select';select.setAttribute('aria-label','Question mode');
    for(const mode of BOX_MODES){const option=document.createElement('option');option.value=mode.id;option.textContent=mode.name;select.append(option);}
    select.value=settings.mode;label.append(select);body.append(label);
    select.addEventListener('change',()=>{settings.mode=select.value;onChange();});
    if(settings.mode==='note')return;
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=settings.mode==='interval-to-interval'?'Target intervals':'Intervals';details.append(summary);
    for(const interval of BOX_INTERVALS){
        const row=document.createElement('label');row.className='note-region-limit-toggle';
        const input=document.createElement('input');input.type='checkbox';input.checked=settings.intervals.includes(interval.semitones);
        row.append(input,document.createTextNode(interval.name));details.append(row);
        input.addEventListener('change',()=>{
            if(!input.checked&&settings.intervals.length===1){input.checked=true;return;}
            settings.intervals=input.checked?[...settings.intervals,interval.semitones]:settings.intervals.filter(n=>n!==interval.semitones);onChange();
        });
    }
    body.append(details);
}
