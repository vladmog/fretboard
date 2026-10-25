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
