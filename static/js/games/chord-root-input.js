import {NATURAL_PITCHES,angularDelta,dragAccidental,spelledNatural} from '../core/note-drag.js';
const CHROMATIC=['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'];
export function chordRootInput(strict,onAnswer){
 const host=document.createElement('div');host.className='chord-root-input';
 const hint=document.createElement('p');hint.textContent=strict?'Tap a natural note. Drag clockwise to sharpen, counterclockwise to flatten. Each 30° step is one accidental; two steps makes a double.':'Choose the chord root, or play it on your instrument.';
 const circle=document.createElement('div');circle.className='chord-root-circle';circle.setAttribute('aria-label','Chord root');
 const preview=document.createElement('output');preview.className='chord-root-preview';preview.textContent='?';preview.setAttribute('aria-live','polite');circle.append(preview);
 let disposed=false;
 const add=(pitch,label,letter)=>{
  const b=document.createElement('button');b.type='button';b.className='chord-root-note';b.textContent=label;b.setAttribute('aria-label',label);b.dataset.pitch=pitch;
  const place=p=>{const a=(p*30-90)*Math.PI/180;b.style.left=`${50+39*Math.cos(a)}%`;b.style.top=`${50+39*Math.sin(a)}%`;};place(pitch);
  if(!strict)b.addEventListener('click',()=>{if(!disposed)onAnswer(pitch);});
  else{
   let gesture=null;
   const angle=e=>{const r=circle.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI;};
   const display=steps=>{const spelling=spelledNatural(letter,steps);preview.textContent=spelling.replaceAll('#','♯').replaceAll('b','♭');b.textContent=preview.textContent;place(pitch+steps);};
   b.addEventListener('pointerdown',e=>{if(disposed||e.button!==0||gesture)return;e.preventDefault();gesture={id:e.pointerId,last:angle(e),total:0,steps:0};b.setPointerCapture(e.pointerId);display(0);});
   b.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const a=angle(e);gesture.total+=angularDelta(gesture.last,a);gesture.last=a;gesture.steps=dragAccidental(gesture.total);display(gesture.steps);});
   const cancel=()=>{gesture=null;b.textContent=label;place(pitch);};
   b.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const steps=gesture.steps;cancel();if(!disposed)onAnswer((pitch+steps+12)%12,spelledNatural(letter,steps));});
   b.addEventListener('pointercancel',cancel);b.addEventListener('lostpointercapture',cancel);
   // Keyboard alternative: arrows change spelling, Enter submits it.
   let keyboardSteps=0;
   b.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();keyboardSteps=Math.max(-2,Math.min(2,keyboardSteps+(e.key==='ArrowRight'?1:-1)));display(keyboardSteps);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!disposed)onAnswer((pitch+keyboardSteps+12)%12,spelledNatural(letter,keyboardSteps));}});
   b.addEventListener('blur',()=>{keyboardSteps=0;if(!gesture){b.textContent=label;place(pitch);}});
  }
  circle.append(b);
 };
 if(strict)for(const [letter,pitch]of Object.entries(NATURAL_PITCHES))add(pitch,letter,letter);
 else CHROMATIC.forEach((label,pitch)=>add(pitch,label));
 host.append(hint,circle);
 return {element:host,destroy(){disposed=true;host.remove();}};
}
