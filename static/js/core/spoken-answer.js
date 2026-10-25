// Fixed answer vocabulary, independent of the question and its expected answer.
const roots = {a:9,b:11,c:0,d:2,e:4,f:5,g:7};
const normalize = text => String(text ?? '').toLowerCase().trim().replace(/[.,!?]/g,'').replace(/♯|#/g,' sharp').replace(/♭/g,' flat').replace(/\s+/g,' ');
// Bounded spelling approximation for ASR's accidental word, never the note or expected answer.
function editDistance(a,b) {
    let row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=0;i<a.length;i++) {
        const next=[i+1];
        for(let j=0;j<b.length;j++) next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]===b[j]?0:1)));
        row=next;
    }
    return row[b.length];
}
function accidental(word) {
    if (!word || ['sharp','flat','natural'].includes(word)) return word || '';
    const value=word.replace(/s$/,'');
    const sharp=editDistance(value,'sharp');
    const flat=editDistance(value,'flat');
    // Preserve recognizable beginnings; don't turn arbitrary second words into accidentals.
    const sharpMatch=value.startsWith('sh') && sharp<=2;
    const flatMatch=(value.startsWith('fl') && flat<=2) || (value.startsWith('f') && flat<=1);
    if(sharpMatch && !flatMatch) return 'sharp';
    if(flatMatch && !sharpMatch) return 'flat';
    return null;
}
function candidates(text) {
    const value=normalize(text).replace(/^(?:my answer is|the answer is|answer|note|it's|it is) /,'');
    // Confirmation words must never accidentally grade as notes (e.g. "correct" as C).
    if (parseConfirmation(value) !== null || command(value)) return [];
    const match=/^([a-g][a-z]*)(?: ([a-z]+))?$/.exec(value);
    if (!match) return [];
    const letter=match[1][0], modifier=accidental(match[2]);
    if (modifier === null) return [];
    const offset=modifier==='sharp'?1:modifier==='flat'?-1:0;
    return [{note:(roots[letter]+offset+12)%12,label:`${letter.toUpperCase()} ${modifier}`.trim(),score:0}];
}
function command(text) {
    const value=normalize(text);
    if(/^(next|next question|continue)$/.test(value)) return {command:'next'};
    if(/^(repeat|repeat question|say again)$/.test(value)) return {command:'repeat'};
    if(/^(pause|stop|stop listening)$/.test(value)) return {command:'pause'};
    return null;
}
export function parseSpokenAnswer(text) {
    const cmd=command(text); if(cmd) return cmd;
    const matches=candidates(text), best=matches[0];
    return best?.score===0 ? {note:best.note} : null;
}
export function resolveSpokenAlternatives(alternatives) {
    const first=alternatives[0]?.transcript, cmd=command(first);
    if(cmd) return cmd;
    const ranked=alternatives.map(a=>candidates(a.transcript));
    const top=ranked[0]?.[0];
    if(!top) {
        const lower=ranked.slice(1).flat().filter(c=>c.score===0);
        return lower.length && lower.every(c=>c.note===lower[0].note) ? {confirm:lower[0].note,label:lower[0].label} : null;
    }
    // Equal phonetic matches cannot be resolved safely, even with only one transcript.
    if(ranked[0].some(c=>c.note!==top.note && c.score===top.score)) return null;
    const conflict=ranked.slice(1).some(list=>list[0] && list[0].note!==top.note && list[0].score<=top.score);
    return top.score===0 && !conflict ? {note:top.note} : {confirm:top.note,label:top.label};
}
export function parseConfirmation(text) {
    const value=normalize(text);
    if(/^(yes|yeah|yep|correct|that's right)$/.test(value)) return true;
    if(/^(no|nope|incorrect|that's wrong)$/.test(value)) return false;
    return null;
}
