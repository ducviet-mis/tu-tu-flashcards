// speech.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
const speakerSupported='speechSynthesis' in window&&'SpeechSynthesisUtterance'in window;
function speak(en){
  if(!speakerSupported)return;
  try{
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(en);
    utterance.lang='en-US';
    utterance.rate=preferences.rate;
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
