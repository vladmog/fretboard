import { getMarkerColor } from './marker-colors.js';
import { buildChord, buildScale, buildScaleChords, getNoteIndex } from '../core/music-theory.js';
import * as Sound from './instrument-sound.js';
import { state } from './state.js';
import { circlePoint } from './circle-order.js';

const notes = ['C','G','D','A','E','B','F#','Db','Ab','Eb','Bb','F'];
const minors = ['A','E','B','F#','C#','G#','D#','Bb','F','C','G','D'];
const signatures = [
    'No sharps or flats', '1 sharp: F♯', '2 sharps: F♯, C♯',
    '3 sharps: F♯, C♯, G♯', '4 sharps: F♯, C♯, G♯, D♯',
    '5 sharps: F♯, C♯, G♯, D♯, A♯', '6 sharps: F♯, C♯, G♯, D♯, A♯, E♯',
    '5 flats: B♭, E♭, A♭, D♭, G♭', '4 flats: B♭, E♭, A♭, D♭',
    '3 flats: B♭, E♭, A♭', '2 flats: B♭, E♭', '1 flat: B♭'
];
let panel;
let chords = false;
export function showFifthsMode(onBack) {
    if (!panel) {
        panel = document.createElement('section');
        panel.id = 'fifths-mode';
        panel.innerHTML = '<header><button type="button" class="btn fifths-back">← Back</button><h1>Circle of fifths</h1><button type="button" class="btn fifths-playback" aria-pressed="false">Notes</button><label><input type="checkbox" class="fifths-sound"> Sound</label></header><div class="fifths-stage"><svg viewBox="0 0 200 200" aria-label="Circle of fifths"></svg></div><footer class="fifths-summary" aria-live="polite"></footer>';
        document.body.appendChild(panel);
        const svg = panel.querySelector('svg');
        const ns = 'http://www.w3.org/2000/svg';
        const link = document.createElementNS(ns,'line');
        link.classList.add('fifths-root-link');
        svg.appendChild(link);
        const linkTitle = document.createElementNS(ns,'title');
        link.appendChild(linkTitle);
        const markers = [];
        const summary = (index,minor) => {
            panel.querySelector('.fifths-summary').textContent = minor
                ? `${minors[index]} minor · Relative major: ${notes[index]} major · ${signatures[index]}`
                : `${notes[index]} major · Relative minor: ${minors[index]} minor · ${signatures[index]}`;
        };
        panel.querySelector('.fifths-playback').addEventListener('click',event=>{
            chords=!chords;
            event.currentTarget.textContent=chords?'Chords':'Notes';
            event.currentTarget.setAttribute('aria-pressed',String(chords));
        });
        const colorScale = (root,minor) => {
            const scale = buildScale(root,minor?'natural_minor':'major');
            const diatonic = buildScaleChords(root,minor?'natural_minor':'major');
            const diminished = diatonic.find(chord=>chord.type==='dim');
            const center = markers.find(item=>item.type==='dim');
            if(center && diminished) {
                center.note=diminished.root;
                center.text.textContent=diminished.root+'°';
                const rootSlot = notes.findIndex(note=>getNoteIndex(note)===getNoteIndex(diminished.root));
                const [x1,y1] = circlePoint(rootSlot,15,false);
                const [x2,y2] = circlePoint(rootSlot,63,false);
                for(const [attr,value] of Object.entries({x1,y1,x2,y2})) link.setAttribute(attr,value);
                link.style.stroke=getMarkerColor(scale.noteToDegree[getNoteIndex(diminished.root)]).border;
                linkTitle.textContent=`${diminished.root}° shares its root with ${notes[rootSlot]}`;
            }
            for(const item of markers) {
                const match = diatonic.find(chord=>getNoteIndex(chord.root)===getNoteIndex(item.note) && chord.type===item.type);
                const degree = match ? scale.noteToDegree[getNoteIndex(match.root)] : null;
                const color = degree ? getMarkerColor(degree) : {fill:'#ecebe6',border:'#bbb',text:'#999'};
                item.marker.style.fill=color.fill;
                item.marker.style.stroke=color.border;
                item.text.style.fill=color.text;
                item.group.setAttribute('aria-label',`Play ${item.note} ${item.type==='dim'?'diminished':item.type==='min'?'minor':'major'}${match?', degree '+match.numeral:''}`);
            }
        };
        const addNote = (note,index,minor,diminished=false) => {
            const [x,y] = diminished ? [100,100] : circlePoint(index,minor?45:78,false);
            const group = document.createElementNS(ns,'g');
            group.setAttribute('role','button');
            group.setAttribute('tabindex','0');
            group.setAttribute('aria-label',`Play ${note} ${minor?'minor':'major'}`);
            const marker = document.createElementNS(ns,'circle');
            for(const [key,value] of Object.entries({cx:x,cy:y,r:minor?10:13})) marker.setAttribute(key,value);
            const text = document.createElementNS(ns,'text');
            text.setAttribute('x',x);text.setAttribute('y',y);
            text.textContent=note+(minor?'m':'');
            if(minor) group.classList.add('relative-minor');
            group.append(marker,text);
            const item={note,type:diminished?'dim':minor?'min':'maj',group,marker,text};
            markers.push(item);
            const play = ()=>{
                svg.querySelectorAll('g').forEach(n=>n.classList.remove('active'));
                group.classList.add('active');
                if(!diminished) {summary(index,minor);colorScale(note,minor);}
                if(state.soundEnabled) {
                    if(chords) Sound.playChord(buildChord(item.note,item.type).notes);
                    else Sound.playNote(item.note,state.instrument==='bass'?2:3);
                }
            };
            group.addEventListener('click',play);
            group.addEventListener('keydown',event=>{
                if(event.key==='Enter'||event.key===' ') {event.preventDefault();play();}
            });
            svg.appendChild(group);
        };
        notes.forEach((note,index)=>addNote(note,index,false));
        minors.forEach((note,index)=>addNote(note,index,true));
        addNote('B',0,false,true);
        summary(0,false);
        colorScale('C',false);
        panel.querySelector('.fifths-sound').addEventListener('change',event=>{
            state.soundEnabled=event.target.checked;
            const main=document.getElementById('sound-toggle');
            if(main) main.checked=state.soundEnabled;
        });
    }
    panel.querySelector('.fifths-back').onclick=onBack;
    panel.querySelector('.fifths-sound').checked=state.soundEnabled;
    document.querySelector('.app-container').hidden=true;
    panel.hidden=false;
    panel.querySelector('.fifths-back').focus();
}
export function hideFifthsMode() {
    if(panel) panel.hidden=true;
    document.querySelector('.app-container').hidden=false;
}
