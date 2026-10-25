// speech.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
const speakerSupported='speechSynthesis' in window&&'SpeechSynthesisUtterance'in window;
let pronunciationAudio=null,pronunciationToken=0;
function stopPronunciation(){
  pronunciationToken++;if(pronunciationAudio){pronunciationAudio.pause();pronunciationAudio=null;}
  if(speakerSupported)speechSynthesis.cancel();
}
function speakWord(word,{rate=preferences.rate}={}){
  stopPronunciation();
  const token=pronunciationToken,audio=word?.dictionary?.audio;
  if(!audio||typeof Audio==='undefined'||!/^https:\/\/(upload|commons)\.wikimedia\.org\//.test(audio)){speak(word?.en||'',rate);return;}
  const player=pronunciationAudio=new Audio(audio);player.playbackRate=rate;
  let failed=false;
  const fallback=()=>{if(failed||token!==pronunciationToken)return;failed=true;player.pause();pronunciationAudio=null;toast('Chưa tải được bản ghi âm. Dùng giọng đọc của thiết bị.');speak(word.en,rate);};
  player.onerror=fallback;
  try{const playback=player.play();playback?.catch(fallback);}catch{fallback();}
}
function speak(en,rate=preferences.rate){
  stopPronunciation();
  if(!speakerSupported)return;
  try{
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(en);
    utterance.lang='en-US';
    utterance.rate=rate;
    const voices=speechSynthesis.getVoices();
    utterance.voice=voices.find(v=>v.lang.toLowerCase()==='en-us')||null;
    utterance.onerror=e=>{
      if(!['interrupted','canceled'].includes(e.error))toast('Chưa phát âm được. Hãy kiểm tra giọng tiếng Anh của trình duyệt.',null,'',true);
    }
    ;
    speechSynthesis.speak(utterance);
  }
  catch(e){
    toast('Chưa thể phát âm trên trình duyệt này.',null,'',true);
  }
}
