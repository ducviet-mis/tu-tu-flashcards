// features/study.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
function startStudy(mode,review=false){
  const d=day();
  if(!d.words.length){
    toast('Thêm từ mới để bắt đầu học nhé.');
    return;
  }
  if(mode==='match'&&d.words.length<3){
    toast('Cần ít nhất 3 từ để mở chế độ Ghép cặp.');
    return;
  }
  if(review&&!d.words.some(w=>!w.remembered)){
    toast('Bạn đã nhớ hết các từ trong ngày này.');
    return;
  }
  go('#/'+mode+'/'+selected+(review?'?review=1':''));
}
function createSession(type,date,review){
  const words=day(date).words;
  const chosen=type==='match'?C.matchWords(words):(review?words.filter(w=>!w.remembered):words);
  session={
    type,date,review,words:chosen.map(w=>({
      ...w
    }
    )),index:0,flipped:false,reversed:preferences.reverse,answers:[],selected:null,matched:[],wrong:[],busy:false,start:Date.now(),timer:null,timeout:null,hadMistake:new Set(),cells:[]
  }
  ;
  if(type==='match'){
    session.cells=C.shuffle(session.words.flatMap(w=>[{
      pair:w.id,lang:'en',text:w.en
    }
    ,{
      pair:w.id,lang:'vi',text:w.vi
    }
    ]));
    session.timer=setInterval(()=>{
      const el=$('#match-timer');
      if(el&&session?.type==='match')el.textContent=timeLabel(Date.now()-session.start);
    }
    ,250);
  }
}
function timeLabel(ms){
  const secs=Math.floor(ms/1000);
  return String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
}
function studyHeader(label){
  return `<div class="dialog-head"><button class="round white" data-action="close-study" aria-label="Đóng chế độ học, quay lại ngày">${icon('back')}</button><span class="eyebrow">${label} · ${dateLabel(session.date)}</span>${(speakerSupported||session.words[session.index]?.dictionary?.audio)&&session.type==='flip'?`<button class="round" data-action="session-speak" aria-label="Nghe phát âm từ đang học">${icon('sound')}</button>`:''}</div>`;
}
function renderFlip(){
  const s=session,w=s.words[s.index];
  if(!w){
    finishStudy();
    return;
  }
  const nextReview=ReviewEngine.setRemembered({...w},true,C.isoToday()).nextReview;
  study.innerHTML=studyHeader('Lật thẻ')+`<h2 class="study-heading" id="study-title">Mỗi lần lật,<br>Một lần nhớ.</h2><div class="segments" aria-hidden="true">${s.words.map((_,i)=>`<span class="${i<s.index?s.answers[i]?'done':'miss':i===s.index?'current':''}"></span>`).join('')}</div><div class="session-progress"><span>${s.review?'Ôn từ chưa nhớ':'Bộ thẻ của bạn'}</span><span>${s.index+1} / ${s.words.length}</span></div><div class="deck"><button class="flip-card ${s.flipped?'flipped':''}" data-action="flip-card" aria-label="${esc(C.cardLabel(w,s.reversed,s.flipped))}" aria-pressed="${s.flipped}"><span class="flip-inner"><span class="face front" aria-hidden="${s.flipped}"><span class="eyebrow">${s.reversed?(w.dictionary?.meaningLanguage==='en'?'Nghĩa tiếng Anh':w.dictionary?.meaningLanguage==='custom'?'Nghĩa của bạn':'Tiếng Việt'):'Tiếng Anh'}</span><span class="word">${esc(s.reversed?w.vi:w.en)}</span>${w.dictionary?.ipa?`<span class="card-pronunciation">${esc(w.dictionary.ipa)}</span>`:''}${w.example?`<span class="card-example">${esc(w.example)}</span>`:''}<span class="flip-hint">Bấm vào thẻ để lật</span></span><span class="face back" aria-hidden="${!s.flipped}"><span class="eyebrow">${s.reversed?'Tiếng Anh':(w.dictionary?.meaningLanguage==='en'?'Nghĩa tiếng Anh':w.dictionary?.meaningLanguage==='custom'?'Nghĩa của bạn':'Nghĩa tiếng Việt')}</span><span class="word">${esc(s.reversed?w.en:w.vi)}</span><span class="translation-small">${esc(s.reversed?w.vi:w.en)}</span>${w.synonyms?.length?`<span class="card-relations">Đồng nghĩa: ${esc(w.synonyms.slice(0,3).join(', '))}</span>`:''}${w.antonyms?.length?`<span class="card-relations">Trái nghĩa: ${esc(w.antonyms.slice(0,3).join(', '))}</span>`:''}${w.exampleVi?`<span class="card-example">${esc(w.exampleVi)}</span>`:''}${w.exampleRef?`<span class="card-reference">${esc(w.exampleRef)}</span>`:''}</span></span></button></div><div class="answer-buttons" id="answer-buttons">${s.flipped?answerButtons():'<div class="answer-prompt">Lật thẻ rồi tự đánh giá trí nhớ của bạn.</div>'}</div><div class="review-schedule">Đã nhớ → ôn ngày ${dateLabel(nextReview)} · Chưa nhớ → ôn lại hôm nay</div><div class="session-tools"><button class="btn outline small" data-action="shuffle">${icon('shuffle')}Xáo trộn</button><button class="btn outline small ${s.reversed?'selected':''}" data-action="reverse" aria-pressed="${s.reversed}">${icon('reverse')}Đảo chiều</button></div><div class="shortcut" style="margin:18px 0 0">Phím cách: lật · ← chưa nhớ · đã nhớ →</div>`;
  if(preferences.autoSpeak&&s.spokenId!==w.id){
    s.spokenId=w.id;
    speakWord(w);
  }
}
const answerButtons=()=>`<button class="btn orange" data-action="answer-no">Chưa nhớ</button><button class="btn blue" data-action="answer-yes">${icon('check')}Đã nhớ</button>`;
function flipCard(){
  if(session?.type!=='flip')return;
  session.flipped=!session.flipped;
  const b=study.querySelector('.flip-card');
  b.classList.toggle('flipped',session.flipped);
  b.setAttribute('aria-pressed',session.flipped);
  b.setAttribute('aria-label',C.cardLabel(session.words[session.index],session.reversed,session.flipped));
  b.querySelector('.front').setAttribute('aria-hidden',session.flipped);
  b.querySelector('.back').setAttribute('aria-hidden',!session.flipped);
  $('#answer-buttons').innerHTML=session.flipped?answerButtons():'<div class="answer-prompt">Lật thẻ rồi tự đánh giá trí nhớ của bạn.</div>';
}
function answer(known){
  const s=session;
  if(s?.type!=='flip'||!s.flipped||s.busy)return;
  s.busy=true;
  const w=day(s.words[s.index]._date||s.date).words.find(w=>w.id===s.words[s.index].id);
  if(w)recordReview(w,known);
  s.words[s.index].remembered=known;
  s.answers.push(known);
  persist();
  s.index++;
  s.flipped=false;
  s.busy=false;
  if(s.index>=s.words.length)finishStudy();
  else{
    renderFlip();
    study.querySelector('.flip-card')?.focus({
      preventScroll:true
    }
    );
  }
}
function renderMatch(){
  const previous=document.activeElement;
  const focusCell=previous?.matches?.('.match-cell')?Number(previous.dataset.cell):null;
  const s=session;
  study.innerHTML=studyHeader('Ghép cặp')+`<h2 class="study-heading" id="study-title">Tìm đúng bạn.<br>Nhớ đúng từ.</h2><p class="study-caption">Ghép một từ tiếng Anh với nghĩa tiếng Việt.</p><div class="match-top"><div class="match-meter"><strong id="match-score">Đã ghép ${s.matched.length}/${s.words.length}</strong><div class="match-dots" id="match-dots" aria-hidden="true">${s.words.map((_,i)=>`<i class="${i<s.matched.length?'filled':''}"></i>`).join('')}</div></div><div><span class="eyebrow muted" style="font-size:13px">Thời gian</span><div id="match-timer" class="timer" role="timer">${timeLabel(Date.now()-s.start)}</div></div></div><div class="match-grid">${s.cells.map((cell,i)=>`<button class="match-cell ${s.matched.includes(cell.pair)?'matched':s.selected===i?'selected':s.wrong.includes(i)?'wrong':''}" data-action="match-cell" data-cell="${i}" ${s.matched.includes(cell.pair)?'disabled':''} aria-label="${cell.lang==='en'?'Tiếng Anh':'Tiếng Việt'}: ${esc(cell.text)}${s.matched.includes(cell.pair)?' — đã ghép':''}" aria-pressed="${s.selected===i}">${esc(cell.text)}${s.matched.includes(cell.pair)?icon('check'):''}</button>`).join('')}</div><div class="dialog-actions"><button class="btn outline" data-action="restart-match">${icon('repeat')}Làm lại</button><button class="btn white" data-action="finish-match">Kết thúc</button></div>`;
  if(focusCell!==null){
    const cells=[...study.querySelectorAll('.match-cell')];
    const next=cells[focusCell]&&!cells[focusCell].disabled?cells[focusCell]:cells.find(b=>!b.disabled);
    next?.focus({
      preventScroll:true
    }
    );
  }
}
function selectCell(i){
  const s=session;
  if(s?.type!=='match'||s.busy||!s.cells[i]||s.matched.includes(s.cells[i].pair))return;
  if(s.selected===i){
    s.selected=null;
    renderMatch();
    return;
  }
  if(s.selected===null){
    s.selected=i;
    renderMatch();
    return;
  }
  const first=s.selected,a=s.cells[first],b=s.cells[i];
  s.selected=null;
  const english=a.lang==='en'?a:b,meaning=a.lang==='vi'?a:b;
  const expected=s.words.find(w=>w.id===english.pair);
  if(a.lang!==b.lang&&expected&&C.wordKey(expected.vi)===C.wordKey(meaning.text)){
    const pair=english.pair;
    if(meaning.pair!==pair){
      const counterpart=s.cells.find(c=>c.lang==='vi'&&c.pair===pair);
      counterpart.pair=meaning.pair;
      meaning.pair=pair;
    }
    s.matched.push(pair);
    const w=day(s.date).words.find(w=>w.id===pair);
    if(w)recordReview(w,!s.hadMistake.has(pair));
    persist();
    renderMatch();
    if(s.matched.length===s.words.length){
      s.busy=true;
      s.timeout=setTimeout(()=>{
        if(session===s)finishStudy();
      }
      ,500);
    }
  }
  else{
    s.wrong=[first,i];
    s.busy=true;
    s.hadMistake.add(a.pair);
    s.hadMistake.add(b.pair);
    for(const id of[a.pair,b.pair]){
      const w=day(s.date).words.find(w=>w.id===id);
      if(w){
        ReviewEngine.setRemembered(w,false,C.isoToday());
      }
    }
    persist();
    renderMatch();
    s.timeout=setTimeout(()=>{
      if(session!==s)return;
      s.wrong=[];
      s.busy=false;
      renderMatch();
    }
    ,600);
  }
}
function finishStudy(){
  const s=session;
  if(!s||s.type==='result')return;
  clearInterval(s.timer);
  clearTimeout(s.timeout);
  s.result={
    kind:s.type,total:s.words.length,correct:s.type==='flip'?s.answers.filter(Boolean).length:s.matched.length,elapsed:Date.now()-s.start,completed:s.type==='flip'?s.index===s.words.length:s.matched.length===s.words.length
  }
  ;
  s.type='result';
  go('#/result/'+s.date);
}
function sessionReviewWords(s){
  return s.words.flatMap(item=>{
    const date=item._date||s.date,word=day(date).words.find(w=>w.id===item.id);
    return word&&!word.remembered?[{...word,_date:date}]:[];
  });
}
function retryMissedWords(){
  const previous=session;if(previous?.type!=='result')return;
  const words=sessionReviewWords(previous);if(!words.length)return;
  stopSession();createSession('flip',previous.date,true);
  session.words=words;session.fromReview=!!previous.fromReview;
  if(previous.fromReview)session.reviewFilter='unknown';
  go('#/flip/'+previous.date+(previous.fromReview?'?queue=unknown':'?review=1'));
}
function renderResult(){
  const s=session,r=s.result,review=sessionReviewWords(s);
  study.innerHTML=studyHeader('Kết quả')+`<h2 class="sr-only" id="study-title">Kết quả học từ vựng</h2><div class="result-card"><div class="eyebrow">${r.completed?'Thêm một bước tiến!':'Một lượt ôn đã kết thúc'}</div><div class="score">${r.kind==='flip'?r.correct+'/'+r.total:timeLabel(r.elapsed)}</div><div class="eyebrow">${r.kind==='flip'?'Từ đã nhớ trong lượt này':(r.completed?'Thời gian hoàn thành':'Thời gian đã học')+' · ghép '+r.correct+'/'+r.total}</div>${mascot(true)}</div>${review.length?`<div class="review-title">Cần ôn lại · ${review.length} từ cần ôn</div><div class="result-tags">${review.map(w=>`<span class="pill">${esc(w.en)}</span>`).join('')}</div><button class="btn purple wfull" data-action="result-review">Ôn ${review.length} từ chưa nhớ ${icon('arrow')}</button>`:`<p class="success-note">${r.completed?'Bạn đã nhớ hết các từ trong lượt này. Hẹn gặp ở lượt ôn tiếp theo!':'Lượt học đã dừng. Bạn có thể quay lại mục Ôn tập để học tiếp.'}</p>`}<button class="btn white wfull" style="margin-top:12px" data-action="home">Về trang chủ ${icon('arrow')}</button>`;
}
function stopSession(){
  if(session){
    clearInterval(session.timer);
    clearTimeout(session.timeout);
  }
  session=null;
  stopPronunciation();
}
function closeStudy(){
  const fromReview=session?.fromReview,date=session?.date||selected;
  stopSession();
  if(study.open)study.close();
  history.replaceState(null,'',fromReview?'#/review':'#/day/'+date);
  route();
  requestAnimationFrame(()=>{
    if(focusBeforeStudy?.isConnected)focusBeforeStudy.focus();
    else app.querySelector('[data-action="start-flip"]')?.focus({
      preventScroll:true
    }
    );
  }
  );
}
function routeDay(){
  let parts;
  try{
    parts=decodeURIComponent(location.hash.slice(1)||'/').split('?')[0].split('/');
  }
  catch(e){
    parts=['',''];
  }
  let type=parts[1]||'',date=parts[2];
  if(!['','day','flip','match','result'].includes(type)||(type&& !C.validDate(date))){
    history.replaceState(null,'','#/');
    type='';
    date=null;
    toast('Đường dẫn không hợp lệ. Đã về trang chủ.');
  }
  if(type==='day')selected=date;
  else if(type==='')selected=days[0]?.date||C.isoToday();
  else selected=date;
  renderBase();
  if(!['flip','match','result'].includes(type)){
    lastBase=location.hash||'#/';
    if(study.open)study.close();
    stopSession();
    return;
  }
  if(type==='result'){
    if(!session?.result||session.date!==date){
      history.replaceState(null,'','#/day/'+date);
      route();
      return;
    }
    renderResult();
  }
  else{
    if(!session||session.date!==date||session.type!==type){
      stopSession();
      const words=day(date).words,review=new URLSearchParams(location.hash.split('?')[1]||'').get('review')==='1';
      if(!words.length||(type==='match'&&words.length<3)||(review&&!words.some(w=>!w.remembered))){
        history.replaceState(null,'','#/day/'+date);
        route();
        toast(type==='match'?'Cần ít nhất 3 từ để ghép cặp.':'Không có từ phù hợp để học.');
        return;
      }
      createSession(type,date,review);
    }
    if(type==='flip')renderFlip();
    else renderMatch();
  }
  if(!study.open){
    focusBeforeStudy=document.activeElement;
    study.showModal();
  }
}
