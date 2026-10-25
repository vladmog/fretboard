import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpokenAnswer, resolveSpokenAlternatives } from '../static/js/core/spoken-answer.js';
import { createVoiceInput } from '../static/js/games/voice-input.js';

test('codeword parser handles enharmonics and commands without answer bias',()=>{
    for(const [text,note] of [['Charlie sharp',1],['Delta flat',1],['Bravo',11],['Charlie',0],['Foxtrot sharp',6],['Bravo flat',10],['Echo sharp',5],['Charlie flat',11],['The answer is Alpha.',9]]) assert.deepEqual(parseSpokenAnswer(text),{note});
    for(const text of ['C or D','not C','sharp','I think maybe','C major','']) assert.equal(parseSpokenAnswer(text),null);
    assert.deepEqual(resolveSpokenAlternatives([{transcript:'hey'},{transcript:'Alpha'}]),{confirm:9,label:'A'});
    assert.deepEqual(parseSpokenAnswer('next question'),{command:'next'});
    assert.deepEqual(parseSpokenAnswer('stop listening'),{command:'pause'});
    assert.deepEqual(resolveSpokenAlternatives([{transcript:'Charlie'},{transcript:'Delta'}]),{confirm:0,label:'C'});
    assert.deepEqual(resolveSpokenAlternatives([{transcript:'unclear'},{transcript:'Charlie'}]),{confirm:0,label:'C'});
    assert.deepEqual(resolveSpokenAlternatives([{transcript:'Charlie sharp'},{transcript:'Delta flat'}]),{note:1});
});
function harness(onListening = () => {}) {
    const instances=[], answers=[], commands=[], states=[], speech=[], timers=new Map(); let sequence=0, hidden=false;
    class Recognition {
        constructor(){instances.push(this);}
        start(){this.started=true;}
        abort(){this.aborted=true;}
    }
    const voice=createVoiceInput({Recognition,onListening,speak:(text,done)=>speech.push({text,done}),cancelSpeech(){},
        onAnswer:n=>answers.push(n),onCommand:c=>commands.push(c),onStatus:s=>states.push(s),
        setTimer:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id;},clearTimer:id=>timers.delete(id),isHidden:()=>hidden});
    const tick=ms=>{for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}};
    const final=(r,text)=>{const result=text==='ambiguous'?[{transcript:'Charlie sharp'},{transcript:'Golf'}]:[{transcript:text}];result.isFinal=true;r.onresult?.({resultIndex:0,results:[result]});};
    const done=()=>{tick(250);speech.at(-1).done(true);tick(450);};
    return {voice,instances,answers,commands,states,speech,timers,tick,final,done,setHidden:v=>hidden=v};
}
test('microphone is acquired by start, then released for question, then resumes; interim never scores',()=>{
    const h=harness();h.voice.start('Find the third of C');const first=h.instances[0];assert.ok(first.started);
    first.onstart();assert.ok(first.aborted);h.done();const r=h.instances.at(-1);r.onstart();
    assert.equal(h.states.at(-1).state,'listening');
    r.onresult({resultIndex:0,results:[[{transcript:'Echo'}]]});assert.equal(h.answers.length,0);
    const callback=r.onresult;h.final(r,'Echo');assert.deepEqual(h.answers,[4]);
    const result=[{transcript:'Echo'}];result.isFinal=true;callback({resultIndex:0,results:[result]});assert.deepEqual(h.answers,[4]);
});
test('late events and speech callbacks cannot restart paused or superseded sessions',()=>{
    const h=harness();h.voice.start('question');const r=h.instances[0],start=r.onstart;r.onstart();h.tick(250);const done=h.speech[0].done;
    h.voice.pause();start();done(true);h.tick(450);assert.equal(h.instances.length,1);assert.equal(h.voice.enabled,false);
    assert.equal(h.timers.size,0);
});
test('permissions fail immediately; silent recognizers retry at most three times',()=>{
    const h=harness();h.voice.start('question');h.instances[0].onerror({error:'not-allowed'});
    assert.equal(h.voice.enabled,false);assert.match(h.states.at(-1).message,/permission/);
    const x=harness();x.voice.start();
    for(let i=0;i<4;i++){x.tick(60000);if(i<3)x.done();}
    assert.equal(x.voice.enabled,false);assert.equal(x.instances.length,4);assert.equal(x.timers.size,1); // One terminal spoken error, no recognition restart.
});
test('unknown speech asks again without grading; next remains a command',()=>{
    const h=harness();h.voice.start();h.final(h.instances[0],'C or D');assert.deepEqual(h.answers,[]);h.done();
    h.final(h.instances.at(-1),'next');assert.deepEqual(h.commands,['next']);
});
test('speech failure and backgrounding never open the microphone',()=>{
    const h=harness();h.voice.start('question');h.instances[0].onstart();h.tick(250);h.speech[0].done(false);
    assert.equal(h.voice.enabled,false);assert.equal(h.instances.length,1);
    const x=harness();x.setHidden(true);x.voice.start();assert.equal(x.instances.length,0);assert.equal(x.voice.enabled,false);
});

test('automatic continuation waits for feedback and is cancelled by pause',()=>{
    const h=harness();let advances=0;h.voice.start();h.voice.say('Correct.',()=>advances++);
    h.tick(250);assert.equal(advances,0);h.speech.at(-1).done(true);assert.equal(advances,0);h.tick(450);assert.equal(advances,1);
    h.voice.say('Correct.',()=>advances++);h.tick(250);h.speech.at(-1).done(true);h.voice.pause();h.tick(450);assert.equal(advances,1);
});

test('error sound completes before speech and cannot resume a paused microphone',async()=>{
    const h=harness();let finish;h.voice.start();const mic=h.instances[0];
    h.voice.say('Incorrect.',undefined,()=>new Promise(resolve=>{finish=resolve;}));
    assert.ok(mic.aborted);h.tick(250);assert.equal(h.speech.length,0);
    finish();await Promise.resolve();assert.equal(h.speech.length,1);
    h.voice.say('Incorrect.',undefined,()=>new Promise(resolve=>{finish=resolve;}));h.tick(250);
    h.voice.pause();finish();await Promise.resolve();assert.equal(h.speech.length,1);assert.equal(h.voice.enabled,false);
});

test('sound-only correct feedback advances without invoking speech synthesis',async()=>{
    const h=harness();let advance=0, finish;
    h.voice.start();h.voice.say('',()=>advance++,()=>new Promise(resolve=>{finish=resolve;}));
    h.tick(250);assert.equal(h.speech.length,0);assert.equal(advance,0);
    finish();await Promise.resolve();h.tick(450);
    assert.equal(h.speech.length,0);assert.equal(advance,1);
});


test('codewords replace bare letters and reject unrelated or multi-note speech',()=>{
    for(const text of ['hello there','C or D','not Charlie','play something','yes','sea shark','hey','correct']) assert.equal(resolveSpokenAlternatives([{transcript:text}]),null);
    for(const [text,note] of [['Beta',11],['Beta flat',10],['Alfa sharp',10],['fox flat',4]]) assert.deepEqual(parseSpokenAnswer(text),{note});
});
test('confirmation scores only after yes; no retries, and an explicit correction replaces the guess',()=>{
    const h=harness(); h.voice.start(); h.final(h.instances.at(-1),'ambiguous');
    assert.deepEqual(h.answers,[]); h.done(); assert.match(h.speech.at(-1).text,/Did you say C sharp/);
    h.final(h.instances.at(-1),'yes'); assert.deepEqual(h.answers,[1]);
    const n=harness(); n.voice.start(); n.final(n.instances.at(-1),'ambiguous'); n.done();
    n.final(n.instances.at(-1),'no'); assert.deepEqual(n.answers,[]); n.done();
    n.final(n.instances.at(-1),'Delta'); assert.deepEqual(n.answers,[2]);
    const c=harness(); c.voice.start(); c.final(c.instances.at(-1),'ambiguous'); c.done();
    c.final(c.instances.at(-1),'Foxtrot sharp'); assert.deepEqual(c.answers,[6]);
});
test('a new question or paused session cannot confirm an old guess',()=>{
    for(const transition of ['question','pause']) {
        const h=harness(); h.voice.start(); h.final(h.instances.at(-1),'ambiguous'); h.done();
        if(transition==='pause'){h.voice.pause();h.voice.start();}
        else {h.voice.say('New question');h.done();}
        h.final(h.instances.at(-1),'yes'); assert.deepEqual(h.answers,[]);
    }
});
test('all literal notes and enharmonic spellings resolve independently of game state',()=>{
    for(const [letter,root] of [['Alpha',9],['Bravo',11],['Charlie',0],['Delta',2],['Echo',4],['Foxtrot',5],['Golf',7]])
        for(const [suffix,delta] of [['',0],[' sharp',1],[' flat',-1],[' natural',0]])
            assert.deepEqual(resolveSpokenAlternatives([{transcript:letter+suffix}]),{note:(root+delta+12)%12});
});

test('any A-G word maps by its first letter, with optional accidental',()=>{
    for(const [word,root] of [['apple',9],['banana',11],['cat',0],['dog',2],['elephant',4],['fish',5],['grape',7],['C',0],['Golf',7]])
        for(const [suffix,offset] of [['',0],[' sharp',1],[' flat',-1],[' natural',0]])
            assert.deepEqual(resolveSpokenAlternatives([{transcript:word+suffix}]),{note:(root+offset+12)%12});
    assert.deepEqual(resolveSpokenAlternatives([{transcript:'continue'}]),{command:'next'});
    assert.equal(resolveSpokenAlternatives([{transcript:'correct'}]),null);
    assert.equal(resolveSpokenAlternatives([{transcript:'apple banana'}]),null);
});


test('accidental ASR approximations retain sharp and flat pitch differences',()=>{
    for(const suffix of ['sharp','shark','shank','sharps','sharks','shart'])
        assert.deepEqual(resolveSpokenAlternatives([{transcript:`Charlie ${suffix}`}]),{note:1});
    for(const suffix of ['flat','flats','flap','flag','flack','fat'])
        assert.deepEqual(resolveSpokenAlternatives([{transcript:`Charlie ${suffix}`}]),{note:11});
    assert.deepEqual(resolveSpokenAlternatives([{transcript:'Charlie'}]),{note:0});
    for(const suffix of ['banana','wrong','please','sharp flat'])
        assert.equal(resolveSpokenAlternatives([{transcript:`Charlie ${suffix}`}]),null);
    assert.deepEqual(resolveSpokenAlternatives([{transcript:'Charlie shark'},{transcript:'Charlie flat'}]),{confirm:1,label:'C sharp'});
});

test('listening cue runs on initial microphone start and after silent-mic reconnect',()=>{
    let cues=0;
    const h=harness(()=>{cues++;return true;});
    h.voice.start();h.instances.at(-1).onstart();assert.equal(cues,1);
    h.tick(60000);h.tick(1000);h.instances.at(-1).onstart();assert.equal(cues,2);
    const staleStart=h.instances.at(-1).onstart;
    h.voice.pause();staleStart();assert.equal(cues,2);
});

test('repeat requests the question even while an answer confirmation is pending',()=>{
    const h=harness();h.voice.start();h.final(h.instances.at(-1),'ambiguous');h.done();
    h.final(h.instances.at(-1),'repeat');
    assert.deepEqual(h.commands,['repeat']);assert.deepEqual(h.answers,[]);
});

test('silence reconnects without spoken warnings or exhausting retries',()=>{
    const h=harness();h.voice.start();
    for(let i=0;i<6;i++) {
        h.instances.at(-1).onstart();
        h.instances.at(-1).onerror({error:'no-speech'});
        assert.equal(h.speech.length,0);h.tick(1000);
    }
    assert.equal(h.voice.enabled,true);assert.deepEqual(h.answers,[]);
    h.instances.at(-1).onerror({error:'no-speech'});h.voice.pause();h.tick(1000);
    assert.equal(h.voice.enabled,false);
});

test('single-result recognition ignores duplicate or extra final results',()=>{
    const h=harness();h.voice.start();const r=h.instances.at(-1);
    assert.equal(r.continuous,false);r.onstart();
    const callback=r.onresult;
    const first=[{transcript:'Charlie sharp'}],second=[{transcript:'Golf'}];
    first.isFinal=true;second.isFinal=true;
    callback({resultIndex:0,results:[first,second]});
    callback({resultIndex:1,results:[first,second]});
    assert.deepEqual(h.answers,[1]);assert.equal(r.aborted,true);
});
