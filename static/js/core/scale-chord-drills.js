import {SCALES,buildScale,getNoteIndex} from './music-theory.js';
const TRIAD_SCALES = Object.keys(SCALES).filter(key=>SCALES[key].intervals.length===7);
const dataURL = new URL('../../data/scale-chord-drills.json', import.meta.url);
const data = dataURL.protocol === 'file:'
 ? JSON.parse(await (await import('node:fs/promises')).readFile(dataURL, 'utf8'))
 : await (await fetch(dataURL)).json();
export const CHORD_SIZES = data.sizes;
const {triads,sevenths} = data;
export function drillChord(root,scaleType,degree,size){
 if(!TRIAD_SCALES.includes(scaleType)||!CHORD_SIZES[size]||!Number.isInteger(degree)||degree<1||degree>7)throw new Error('Invalid scale chord question');
 const scale=buildScale(root,scaleType);
 const notes=Array.from({length:Number(size)},(_,i)=>scale.notes[(degree-1+i*2)%7]);
 const pitches=notes.map(getNoteIndex),intervals=pitches.map(n=>(n-pitches[0]+12)%12);
 const base=Number(size)===3?triads[intervals.slice(1).join(',')]:sevenths[intervals.slice(1,4).join(',')];
 if(!base)throw new Error('Unsupported stacked-third quality');
 const extensions=intervals.slice(4).map((n,i)=>{
  const natural=[2,5,9][i],degree=[9,11,13][i];
  const delta=((n-natural+18)%12)-6;
  return (delta<0?'♭'.repeat(-delta):'♯'.repeat(delta))+degree;
 });
 let label=base;
 if(extensions.length){
  const natural=extensions.every((v,i)=>v===String([9,11,13][i]));
  label=natural&&['Major 7th','Minor 7th','Dominant 7th','Minor-major 7th','Augmented major 7th'].includes(base)
   ? base.replace('7th',`${[0,0,0,0,0,9,11,13][size]}th`)
   : base+' + '+extensions.join(', ');
 }
 return {scaleRoot:root,scaleType,degree,size:Number(size),notes,intervals,quality:intervals.join(','),label};
}
export function chordQualityOptions(size,scales=TRIAD_SCALES){
 const unique=new Map(),counts=new Map();
 for(const scale of TRIAD_SCALES.filter(key=>scales.includes(key)))for(let degree=1;degree<=7;degree++){
  const q=drillChord('C',scale,degree,size);
  unique.set(q.quality,{quality:q.quality,label:q.label});
  counts.set(q.quality,(counts.get(q.quality)||0)+1);
 }
 const order=data.commonQualityOrder[Number(size)===3?'triads':'sevenths'];
 const rank=option=>{
  const family=option.quality.split(',').slice(1,Number(size)===3?3:4).join(',');
  const major=Number(size)===3?'4,7':'4,7,11';
  const minor=Number(size)===3?'3,7':'3,7,10';
  return [family===major?0:family===minor?1:2,order.indexOf(family)];
 };
 return [...unique.values()].sort((a,b)=>{
  const ar=rank(a),br=rank(b);
  return ar[0]-br[0]||counts.get(b.quality)-counts.get(a.quality)||ar[1]-br[1]||a.label.localeCompare(b.label);
 });
}

function intervalLabel(pitch, degree) {
 const natural = [0,2,4,5,7,9,11][(degree-1)%7];
 const delta = ((pitch-natural+18)%12)-6;
 return (delta<0?'♭'.repeat(-delta):'♯'.repeat(delta))+degree;
}
export function optionIntervals(option, question) {
 const pitches = option.quality.split(',').map(Number);
 const rootOffset = (getNoteIndex(question.notes[0])-getNoteIndex(question.scaleRoot)+12)%12;
 return {
  thirds: pitches.slice(1).map((pitch,i)=>(pitch-pitches[i]+12)%12),
  chord: pitches.map((pitch,i)=>intervalLabel(pitch,1+i*2)),
  scale: pitches.map((pitch,i)=>intervalLabel((pitch+rootOffset)%12,(question.degree-1+i*2)%7+1))
 };
}
