import { showAnswerFeedback, clearAnswerFeedback } from './answer-feedback.js';
/** Phone-first chord-to-chord practice using the shared progression catalog. */
import * as Theory from '../core/music-theory.js';
import * as Progressions from '../core/progressions.js';
import * as Sound from '../core/sound.js';
import { createFretboard } from '../core/fretboard.js';
import { voicingNotes } from '../core/voicing-audio.js';
import { exerciseChord, nearestShapes, checkAnswer, instrumentConfig, chooseLapStart } from '../core/voice-leading.js';
import { gameState } from './session.js';
import { createSettingsStore } from './storage.js';

const store=createSettingsStore('fretboard-voice-leading-settings',{key:'C',progression:'',shell:false});
let context={instrument:'guitar',userProgressions:[]};
let choices=[],sequence=[],step=0,current=[],selected=[],board,status,nextButton,active=false;
let lapStarts=new Set(),lapNotice='';
let playbackGeneration=0,heardTimer=null,resizeObserver=null,assisted=false,completed=0,smoothCount=0;
const el=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
const content=()=>document.getElementById('game-content');
function configure(value){context={...context,...value};}
function catalog(){
    choices=Progressions.PROGRESSION_CATEGORIES.flatMap((group,categoryIndex)=>group.progressions.map((p,progressionIndex)=>({
        id:p.id,label:`${group.name} · ${p.numerals}`,tokens:p.chords,referenceScale:p.referenceScale,categoryIndex,progressionIndex
    })));
    choices.push(...context.userProgressions.map(p=>({id:`user-${p.id}`,label:`My progressions · ${p.name||p.chords.join(' – ')}`,tokens:p.chords,referenceScale:p.referenceScale})));
}
function renderTitlePage(){
    cleanup();store.load();catalog();
    const root=el('div','','voice-leading');content().replaceChildren(root);
    document.getElementById('games-panel').scrollTop=0;
    root.append(el('h2','Voice leading'),el('p','Build the next chord close to the one you hear. Several answers can be equally smooth.'));
    const fields=el('div','','voice-leading-fields');
    const prog=el('select');prog.setAttribute('aria-label','Practice progression');
    for(const c of choices){const o=el('option',c.label);o.value=c.id;prog.append(o);}
    prog.value=choices.some(c=>c.id===store.settings.progression)?store.settings.progression:choices[0]?.id||'';
    const key=el('select');key.setAttribute('aria-label','Progression key');
    for(const n of ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']){const o=el('option',n);o.value=n;key.append(o);}
    key.value=Theory.getNoteIndex(store.settings.key)>=0?store.settings.key:'C';
    const label=el('label','Prefer shell voicings '),shell=el('input');shell.type='checkbox';shell.checked=store.settings.shell;label.append(shell);
    const pLabel=el('label','Progression');pLabel.append(prog);const kLabel=el('label','Key');kLabel.append(key);
    fields.append(pLabel,kLabel,label);root.append(fields);
    root.append(el('p',`${context.instrument==='bass'?'Bass':'Guitar'} · Four-fret shapes · Full chords, with shells when a full shape is unavailable.`));
    root.append(button('Start practice',()=>{
        store.settings.progression=prog.value;store.settings.key=key.value;store.settings.shell=shell.checked;store.save();
        const choice=choices.find(c=>c.id===prog.value);if(!choice)return;
        sequence=Progressions.buildProgressionChordsFromTokens(choice.tokens,key.value).map(c=>exerciseChord(c,context.instrument,shell.checked));
        if(sequence.length<2||sequence.some(c=>!c.shapes.length)){root.append(el('p','This progression has no supported shapes for this instrument. Choose another progression.'));return;}
        step=0;completed=0;smoothCount=0;
        const seed=chooseLapStart(sequence[0].shapes,context.instrument);
        lapStarts=seed.used;lapNotice='';current=seed.shape.positions;
        active=true;renderRound();
    }));
    if(!choices.length)root.append(el('p','No progressions loaded. Reload the app to try again.'));
    root.append(el('p','Equal pitches score equally, wherever they are fingered. Ties and answers within 2 points of the best suggestion count as smooth.'));
}
function play(positions){
    if(!gameState.soundEnabled){if(status)status.textContent='Turn on Sound in Game controls to hear the chord.';return Promise.resolve();}
    return Sound.playChord(voicingNotes({positions},context.instrument),3);
}
function cancelPlayback(){playbackGeneration++;clearTimeout(heardTimer);heardTimer=null;}
async function transition(positions){
    cancelPlayback();
    if(!gameState.soundEnabled){await play(current);return;}
    const roundStep=step, generation=playbackGeneration;
    await play(current);
    if(!active||roundStep!==step||generation!==playbackGeneration)return;
    heardTimer=setTimeout(()=>{if(active&&roundStep===step&&generation===playbackGeneration)play(positions);},Math.max(900,current.length*Sound.getParams().strumDelay*1000+400));
}
function paint(){
    if(!board)return;board.clearMarkers();
    for(const p of current)board.setMarker(p.string,p.fret,{color:'#eee',borderColor:'#888',text:Theory.getNoteName(p.noteIndex??Theory.getNoteAt(instrumentConfig(context.instrument).tuning.length-p.string,p.fret,instrumentConfig(context.instrument).tuning)),textColor:'#666'});
    const target=sequence[(step+1)%sequence.length];const {tuning}=instrumentConfig(context.instrument);
    for(const p of selected){const pc=Theory.getNoteAt(tuning.length-p.string,p.fret,tuning),degree=target.chord.noteToInterval[pc];const colors=Theory.getIntervalColor(degree||'?');
        board.setMarker(p.string,p.fret,{color:degree?colors.fill:'#fff',borderColor:degree?colors.border:'#000',text:degree||Theory.getNoteName(pc),textColor:'#000',borderWidth:3});}
}
function renderRound(){
    cancelPlayback();resizeObserver?.disconnect();selected=[];assisted=false;
    const root=el('div','','voice-leading voice-leading-round');content().replaceChildren(root);
    document.getElementById('games-panel').scrollTop=0;
    const target=sequence[(step+1)%sequence.length],source=sequence[step%sequence.length];
    const rules={requireChange:Theory.getNoteIndex(source.root)===Theory.getNoteIndex(target.root) && source.type===target.type};
    root.append(el('h2',`${source.symbol} → ${target.symbol}`),el('p',`${source.numeral} → ${target.numeral} · ${store.settings.key} · Lap ${Math.floor(step/sequence.length)+1} · ${completed} transitions · ${smoothCount} smooth unassisted`));
    root.append(el('p',`Build ${target.symbol}${target.voicing==='shell'?' (shell)':''}: ${target.intervals.join(' · ')}. Gray = current shape. ${rules.requireChange?'Same chord: choose a different inversion or register. ':''}Tap positions to add or remove notes.`));
    const actions=el('div','','voice-leading-actions');
    actions.append(button('Hear current',()=>{cancelPlayback();play(current);}),button('Hear transition',()=>{if(selected.length)transition(selected);else status.textContent='Place notes first.';}),button('Clear',()=>{selected=[];nextButton.disabled=true;clearAnswerFeedback(status);status.textContent='';paint();}));
    root.append(actions);
    const host=el('div','','voice-leading-board');host.setAttribute('aria-label','Tap fret positions to build the next chord');root.append(host);
    function draw(){host.replaceChildren();const mobilePortrait=matchMedia('(max-width:768px) and (orientation:portrait)').matches;
        board=createFretboard(host,{tuning:instrumentConfig(context.instrument).tuning,frets:15,vertical:host.clientWidth<600,
            ...(mobilePortrait?{}:{fretSpacing:37,stringSpacing:40})});
        board.onFretClick((string,fret)=>{const i=selected.findIndex(p=>p.string===string&&p.fret===fret);if(i>=0)selected.splice(i,1);else selected.push({string,fret});nextButton.disabled=true;clearAnswerFeedback(status);status.textContent=`${selected.length} / ${target.intervals.length} notes selected`;paint();});paint();}
    status=el('p','','voice-leading-feedback');status.setAttribute('role','status');status.textContent=lapNotice;root.append(status);
    const controls=el('div','','voice-leading-actions');
    controls.append(button('Check',()=>{const result=checkAnswer(current,selected,target,context.instrument,rules);showAnswerFeedback(status,result.valid,result.message);nextButton.disabled=!result.valid;}));
    controls.append(button('Show suggestion',()=>{clearAnswerFeedback(status);assisted=true;const suggestion=nearestShapes(current,target,context.instrument,rules)[0];if(!suggestion){status.textContent='No different suggested voicing is available. Try your own inversion or register.';return;}selected=suggestion.shape.positions.map(p=>({...p}));paint();const result=checkAnswer(current,selected,target,context.instrument,rules);status.textContent=`Suggested shape. ${result.message}`;nextButton.disabled=false;transition(selected);}));
    nextButton=button('Next chord →',()=>{const result=checkAnswer(current,selected,target,context.instrument,rules);if(!result.valid)return;if(result.smooth&&!assisted)smoothCount++;completed++;current=selected.map(p=>({...p}));step++;
        lapNotice='';
        if(step%sequence.length===0){
            const seed=chooseLapStart(sequence[0].shapes,context.instrument,lapStarts,current);
            lapStarts=seed.used;current=seed.shape.positions;
            lapNotice=seed.changed?'New lap: a different starting voicing. Hear current before answering.':'New lap: no different starting voicing is available.';
            if(seed.exhausted&&seed.uniqueCount>1)lapNotice+=' All starting voicings explored; beginning another cycle.';
        }
        renderRound();play(current);});nextButton.disabled=true;
    nextButton.classList.add('practice-next');
    controls.append(nextButton,button('Choose progression',renderTitlePage));root.append(controls);
    const explanation=el('details');explanation.append(el('summary','How scoring works'),el('p','Motion adds the semitone distances between matched voices. An entering or leaving voice costs 12 points. Common tones keep their pitch. The benchmark is the best generated shape within four fret positions; your valid answer may improve it. More distant valid chords can still advance. Suggestions do not earn unassisted credit.'));root.append(explanation);
    draw();let previousWidth=host.clientWidth;resizeObserver=new ResizeObserver(()=>{if(host.clientWidth!==previousWidth){previousWidth=host.clientWidth;draw();}});resizeObserver.observe(host);
}
function cleanup(){active=false;cancelPlayback();resizeObserver?.disconnect();resizeObserver=null;board=null;}
function renderSettings(body){body.replaceChildren(el('p','Choose the progression, key, and shell preference on the Voice leading start screen. Guitar/Bass follows the app’s instrument setting.'));}
export default {configure,renderTitlePage,renderSettings,cleanup,advance(){},repeatQuestion(){if(active)play(current);}};
