const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const players=[],spoken=[],messages=[];
 class Audio{constructor(url){this.url=url;players.push(this);}pause(){this.paused=true;}play(){return this.playback=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}}
 const box={Audio,preferences:{rate:1},toast:msg=>messages.push(msg),setTimeout,clearTimeout,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},speechSynthesis:{cancel(){},getVoices:()=>[],speak:u=>spoken.push(u.text)}};
 box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('assets/js/speech.js','utf8'),box);return{box,players,spoken,messages};
}
test('Source pronunciation plays trusted audio and failed playback falls back to device speech once',async()=>{
 const e=setup();e.box.speakWord({en:'hello',dictionary:{audio:'https://upload.wikimedia.org/hello.ogg'}});
 assert.equal(e.players.length,1);assert.deepEqual(e.spoken,[]);e.players[0].reject(Error('offline'));await new Promise(setImmediate);
 assert.deepEqual(e.spoken,['hello']);e.players[0].onerror();assert.equal(e.spoken.length,1);
});
test('Stopping playback or starting another word prevents late audio failures from speaking an old word',async()=>{
 const e=setup();e.box.speakWord({en:'hello',dictionary:{audio:'https://upload.wikimedia.org/hello.ogg'}});e.box.speakWord({en:'new word'});
 e.players[0].reject(Error('late'));await new Promise(setImmediate);assert.deepEqual(e.spoken,['new word']);assert.ok(e.players[0].paused);
 e.box.speakWord({en:'unsafe',dictionary:{audio:'https://example.com/file.ogg'}});assert.equal(e.players.length,1);assert.equal(e.spoken.at(-1),'unsafe');
});
