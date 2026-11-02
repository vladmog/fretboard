import test from 'node:test';
import assert from 'node:assert/strict';

test('recognition prompts do not change the existing announcement preference', async()=>{
    const spoken=[];let writes=0;
    globalThis.localStorage={getItem:()=>null,setItem:()=>writes++};
    globalThis.window={speechSynthesis:{getVoices:()=>[],addEventListener(){},speak:u=>spoken.push(u),cancel(){}}};
    globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
    const Voice=await import('../static/js/games/voice.js');
    assert.equal(Voice.isEnabled(),false);
    const saved=globalThis.setTimeout;
    try {
        globalThis.setTimeout=()=>0;
        Voice.speak('Prompt',()=>{}, {force:true});
        spoken[0].onend();
        assert.equal(Voice.isEnabled(),false);assert.equal(writes,0);
        Voice.speak('Ordinary game question');assert.equal(spoken.length,1);
    } finally {globalThis.setTimeout=saved;}
});

test('explicit phrase pause waits after the first phrase and completes only after the second', async()=>{
    const spoken=[], timers=[];let done=0;
    globalThis.localStorage={getItem:()=>null,setItem(){}};
    globalThis.window={speechSynthesis:{getVoices:()=>[],addEventListener(){},speak:u=>spoken.push(u),cancel(){}}};
    globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
    const Voice=await import('../static/js/games/voice.js?phrase-pause');
    const saved=globalThis.setTimeout;
    try {
        globalThis.setTimeout=(fn,ms)=>{timers.push({fn,ms});return timers.length;};
        Voice.speak('F sharp\nmajor second',()=>done++,{force:true});
        assert.equal(spoken.length,1);spoken[0].onend();
        assert.equal(done,0);assert.equal(spoken.length,1);
        timers.find(t=>t.ms===350).fn();
        assert.equal(spoken[1].text,'major second');assert.equal(done,0);
        spoken[1].onend();assert.equal(done,1);
        Voice.speak('D\nminor third',()=>done++,{force:true});
        spoken[2].onend();Voice.cancel();
        timers.filter(t=>t.ms===350).at(-1).fn();
        assert.equal(spoken.length,3);assert.equal(done,1);
    } finally {globalThis.setTimeout=saved;}
});
