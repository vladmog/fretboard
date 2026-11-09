import {createSettingsStore} from './storage.js';
import {DEGREE_LETTERS,degreeQuestions} from '../core/degree-counting.js';
import {getIntervalColor} from '../core/music-theory.js';
import {beginPracticeQuestion} from './practice-log.js';
import {gameState,setAwaitingAdvance} from './session.js';
import * as Sound from '../core/sound.js';
const el=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const natural={0:'C',2:'D',4:'E',5:'F',7:'G',9:'A',11:'B'};
const store=createSettingsStore('fretboard-degree-counting-settings',{showColors:false,showLabels:true,showDegrees:false});
let circle,answerCell,feedback=null;
let active=false,solved=false,question,last='',count=0,status,counter,log;
function cleanup(){active=false;setAwaitingAdvance(false);}
function answer(pitch,spelling){
    if(!active||solved)return;
    const correct=natural[pitch]===question.answer&&(!spelling||spelling.toUpperCase()===question.answer);
    log(correct);feedback={pitch,correct};status.textContent=correct?'Correct':'Try again';paintCircle();
    if(correct){solved=true;answerCell.textContent=question.answer;count++;counter.textContent=`${count} answered`;setAwaitingAdvance(true);}
    if(gameState.soundEnabled){if(correct)Sound.playNote(question.answer+'4');else Sound.playError();}
}
function round(){
    cleanup();active=true;solved=false;feedback=null;
    const pool=degreeQuestions().filter(q=>q.root+q.degree!==last);question=pool[Math.floor(Math.random()*pool.length)];last=question.root+question.degree;
    log=beginPracticeQuestion('scale-degree-counting',[question.root,String(question.degree)]);
    const root=el('div','','game-play-area degree-counting-round');
    const prompt=el('div','','degree-counting-prompt');prompt.setAttribute('aria-label',`Root ${question.root}, degree ${question.degree}`);
    answerCell=el('span','?','degree-counting-answer');
    prompt.append(el('span','1','degree-counting-degree'),el('span',String(question.degree),'degree-counting-degree'),el('span',question.root,'degree-counting-root'),answerCell);
    circle=el('div','','fret-identify-circle degree-counting-circle');circle.setAttribute('aria-label','Choose the natural note letter');paintCircle();
    status=el('p','','degree-counting-announcement');status.setAttribute('role','status');counter=el('p',`${count} answered`,'game-round-counter');
    circle.append(prompt);root.append(counter,circle,status);document.getElementById('game-content').replaceChildren(root);
}
function paintCircle(){
    if(!circle||!active)return;const prompt=circle.querySelector('.degree-counting-prompt');circle.replaceChildren();if(prompt)circle.append(prompt);
    for(let pitch=0;pitch<12;pitch++){
        const letter=natural[pitch];
        const degree=letter?(DEGREE_LETTERS.indexOf(letter)-DEGREE_LETTERS.indexOf(question.root)+7)%7+1:null;
        const label=[store.settings.showLabels?letter:'',store.settings.showDegrees&&degree?String(degree):''].filter(Boolean).join(' · ');
        const node=el(letter?'button':'span',label,'fret-identify-note');
        if(store.settings.showColors&&degree){const colors=getIntervalColor(String(degree));node.style.background=degree===1?'#000':colors.fill;node.style.borderColor=colors.border;node.style.color=degree===1?'#fff':colors.text;}
        if(feedback?.pitch===pitch){node.style.background=feedback.correct?'#32CD32':'#ed5353';node.style.borderColor=feedback.correct?'#167326':'#a31515';node.style.color='#111';}
        const angle=(pitch*30-90)*Math.PI/180;node.style.left=`${50+39*Math.cos(angle)}%`;node.style.top=`${50+39*Math.sin(angle)}%`;
        if(natural[pitch]){node.type='button';node.setAttribute('aria-label',natural[pitch]);node.addEventListener('click',()=>{if(solved)advance();else answer(pitch);});}
        else node.setAttribute('aria-hidden','true');
        circle.append(node);
    }
}
function advance(){if(active&&solved)round();}
function renderTitlePage(){cleanup();store.load();const root=el('div','','voice-leading');const start=el('button','Start practice');start.addEventListener('click',()=>{count=0;round();});root.append(el('h2','Scale Degree Counting'),el('p','Find the letter for degree 2–7 of the given root. No accidentals.'),start);document.getElementById('game-content').replaceChildren(root);}
export default {renderTitlePage,cleanup,advance,handleNoteKey:answer,renderSettings(body){
    body.replaceChildren();
    for(const [key,title] of [['showColors','Show colors'],['showLabels','Show note labels'],['showDegrees','Show degree labels']]){
        const label=el('label','','note-region-limit-toggle'),input=el('input');input.type='checkbox';input.checked=store.settings[key];
        label.append(input,el('span',title));body.append(label);
        input.addEventListener('change',()=>{store.settings[key]=input.checked;store.save();paintCircle();});
    }
}};
