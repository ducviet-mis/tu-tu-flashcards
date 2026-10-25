/* Reference-based typing/listening screens. Progress uses the shared review pipeline. */
'use strict';
const typingModes=['type','listen'];
function isTypingSession(s=session){return !!s&&(typingModes.includes(s.type)||s.type==='result'&&typingModes.includes(s.result?.kind));}
function showStudy(){
 const game=isTypingSession(),surface=game?'game':'study';
 if(study.open&&study.getAttribute('data-surface')!==surface)study.close();
 study.setAttribute('data-surface',surface);study.classList.toggle('game-dialog',game);document.body.classList.toggle('game-active',game);
 if(!study.open){focusBeforeStudy=document.activeElement;if(game)study.show();else study.showModal();}
}
function typingCurrentWord(s=session){const item=s?.words[s.index];return item&&studyWord(item.id,item._date||s.date,s,item._topic);}
function typingHeader(s){return `<header class="game-header"><button type="button" class="game-close" data-action="close-study" aria-label="Thoát trò chơi">${icon('close')}</button><div class="game-progress" role="progressbar" aria-label="Tiến độ lượt học" aria-valuemin="0" aria-valuemax="${s.words.length}" aria-valuenow="${s.index+1}"><span style="width:${(s.index+1)/s.words.length*100}%"></span></div><span class="game-counter">${s.index+1}/${s.words.length}</span></header>`;}
function typingStats(s){const right=s.answers.filter(Boolean).length;return `<div class="game-stats"><span class="game-right">${icon('check')} ${right} ĐÚNG</span><span class="game-wrong">${s.answers.length-right} SAI</span></div>`;}
function typingDots(s){return `<div class="game-rounds"><p>${s.words.length} TỪ TRONG LƯỢT NÀY</p><div aria-hidden="true">${s.words.map((_,i)=>`<span class="${i<s.answers.length?s.answers[i]?'right':'wrong':i===s.index?'current':''}"></span>`).join('')}</div></div>`;}
function typingLetters(value,expected,{feedback=false,correct=false,hint=false}={}){
 const chars=Array.from(TuTuTyping.normalize(value)),answer=Array.from(TuTuTyping.normalize(expected)),size=feedback?Math.max(chars.length,answer.length):answer.length;
 return `<div class="game-letters" aria-hidden="true">${Array.from({length:size},(_,i)=>{const c=chars[i]||'',state=feedback?correct||c&&c===answer[i]?'right':'wrong':i===0&&hint?'hint':c?'filled':i===chars.length?'current':'';return `<span class="game-letter ${state} ${answer[i]===' '?'space':''}">${esc(i===0&&hint?answer[0]:c===' '?'·':c)}</span>`;}).join('')}</div>`;
}
function typingLetterPanel(s,w){return `<div class="game-letter-panel" id="typing-letters">${typingLetters(s.input||'',w.en,{hint:s.hint&&s.type==='type'})}<p>${Array.from(w.en).length} CHỮ CÁI · ${s.type==='listen'?'NGHE KỸ RỒI GÕ':s.hint?'ĐÃ GỢI Ý CHỮ ĐẦU':'GỢI Ý CHỮ ĐẦU'}</p></div>`;}
function typingWave(heights){return `<span class="game-wave" aria-hidden="true">${heights.map((h,i)=>`<i style="height:${h}px;opacity:${[.5,.7,.9,.7,1,.9][i]}"></i>`).join('')}</span>`;}
function typingPrompt(s,w){
 if(s.type==='listen')return `<section class="game-prompt game-listen"><h2 class="sr-only" id="study-title">Nghe và gõ từ tiếng Anh</h2><span class="game-badge">NGHE &amp; GÕ</span><div class="game-sound-row">${typingWave([14,26,40,22,48,30])}<button type="button" class="game-speaker" data-action="typing-speak" aria-label="Phát âm thanh">${icon('sound')}</button>${typingWave([52,24,42,18,34,16])}</div><div class="game-sound-tools"><button type="button" data-action="typing-speak">${icon('repeat')}NGHE LẠI</button><button type="button" data-action="typing-slow" class="game-slow ${s.slow?'selected':''}" aria-pressed="${!!s.slow}">CHẬM</button></div>${s.hint?`<p class="game-meaning-hint">${esc(w.vi)}</p>`:''}<p class="game-audio-status" id="typing-audio-status" role="status" ${speakerSupported||w.dictionary?.audio?'hidden':''}>Thiết bị chưa hỗ trợ phát âm. Bạn có thể xem nghĩa hoặc bỏ qua từ.</p></section>`;
 const lang=w.dictionary?.meaningLanguage==='en'?'NGHĨA TIẾNG ANH':'NGHĨA TIẾNG VIỆT';
 return `<section class="game-prompt game-type"><h2 class="sr-only" id="study-title">Gõ từ theo nghĩa</h2><div class="game-badges"><span class="game-badge">GÕ TỪ THEO NGHĨA</span>${w.pos?`<span class="game-badge game-pos">${esc(w.pos)}</span>`:''}</div><p class="game-prompt-label">${lang}</p><div class="game-meaning">${esc(w.vi)}</div></section>`;
}
function typingControls(s){return `<form class="game-controls" id="typing-form"><label><span class="sr-only">Gõ từ tiếng Anh</span><input id="typing-answer" type="text" placeholder="${s.type==='listen'?'Gõ những gì bạn nghe được…':'Gõ từ tiếng Anh…'}" value="${esc(s.input||'')}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="200" enterkeyhint="done"></label><div class="game-actions"><button type="button" class="game-hint" data-action="typing-hint">${typingBulb()}${s.type==='listen'?'Xem nghĩa':'Gợi ý'}</button><button type="submit" class="game-primary">Kiểm tra</button></div><button type="button" class="game-skip" data-action="typing-skip">${s.type==='listen'?'KHÔNG NGHE RA':'KHÔNG NHỚ'} · XEM ĐÁP ÁN</button></form>`;}
function typingBulb(){return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>';}
function typingSchedule(w){return !w?.remembered||w.nextReview===C.isoToday()?'ÔN LẠI HÔM NAY':w.nextReview===ReviewEngine.addDays(C.isoToday(),1)?'SẼ ÔN LẠI NGÀY MAI':'ÔN LẠI NGÀY '+dateLabel(w.nextReview);}
function typingExample(w){if(!w.example)return '';const start=w.example.toLowerCase().indexOf(w.en.toLowerCase()),text=start<0?esc(w.example):esc(w.example.slice(0,start))+'<mark>'+esc(w.example.slice(start,start+w.en.length))+'</mark>'+esc(w.example.slice(start+w.en.length));return `<section class="game-example"><p>VÍ DỤ</p><strong>${text}</strong>${w.exampleVi?`<div>${esc(w.exampleVi)}</div>`:''}</section>`;}
function typingFeedback(s,w){
 const known=s.answers[s.index];return `<div class="game-feedback-card ${known?'is-right':''}" role="status"><h2 class="sr-only" id="study-title">${known?'Đáp án chính xác':'Đáp án chưa đúng'}</h2><span class="game-badge">${icon(known?'check':'close')}${known?'CHÍNH XÁC':'CHƯA ĐÚNG'}</span><div class="game-feedback-meaning">${esc(w.vi)}</div><div class="game-feedback-word">${esc(w.en)}</div><div class="game-pronunciation">${w.dictionary?.ipa?`<span>${esc(w.dictionary.ipa)}</span>`:''}<button type="button" data-action="typing-speak" aria-label="Nghe phát âm">${icon('sound')}</button></div></div>`;
}
function renderTypingGame({focus=false}={}){
 const s=session;if(!typingModes.includes(s?.type))return;
 const w=s.words[s.index];if(!w){finishTypingStudy();return;}
 const feedback=!!s.feedback;
 study.innerHTML=`<div class="game-page ${feedback?'game-feedback':''}">${typingHeader(s)}<div class="game-layout">${typingStats(s)}<div class="game-question">${feedback?typingFeedback(s,w):typingPrompt(s,w)}${feedback?`<section class="game-comparison"><p>BẠN GÕ: ${esc(s.input||'—')}</p>${typingLetters(s.input||'',w.en,{feedback:true})}<p>ĐÚNG LÀ</p>${typingLetters(w.en,w.en,{feedback:true,correct:true})}</section>`:typingLetterPanel(s,w)}</div>${typingDots(s)}${feedback?`<div class="game-feedback-details">${typingExample(w)}<div class="game-feedback-bottom"><p class="game-schedule">${icon('repeat')}${typingSchedule(w)}</p><button type="button" class="game-primary" data-action="typing-next">Tiếp</button></div></div>`:typingControls(s)}</div></div>`;
 showStudy();
 if(focus){if(feedback){const next=study.querySelector('[data-action="typing-next"]');next?.focus({preventScroll:true});next?.scrollIntoView?.({block:'nearest'});}else $('#typing-answer')?.focus({preventScroll:true});}
}
function submitTypingAnswer(skip=false){
 const s=session;if(!typingModes.includes(s?.type)||s.feedback||s.busy||s.composing)return;
 s.input=$('#typing-answer')?.value??s.input??'';
 if(!skip&&!s.input.trim()){$('#typing-answer')?.focus();return;}
 const w=typingCurrentWord(s);if(!w){closeStudy();return;}
 s.busy=true;stopPronunciation();const known=!skip&&TuTuTyping.correct(s.input,w.en);
 gradeStudyWord(w,known);s.words[s.index]={...s.words[s.index],...w};s.answers.push(known);persistStudy();
 s.feedback=true;s.busy=false;renderTypingGame({focus:true});
}
function nextTypingWord(){
 const s=session;if(!typingModes.includes(s?.type)||!s.feedback)return;
 stopPronunciation();s.index++;s.feedback=false;s.input='';s.hint=false;
 if(s.index>=s.words.length){finishTypingStudy();return;}
 renderTypingGame({focus:true});
}
function playTypingWord(){
 const s=session;if(!isTypingSession(s)||s.type==='result')return;
 const w=s.words[s.index],rate=s.slow?Math.min(preferences.rate,.65):preferences.rate;
 speakWord(w,{rate});
}
function finishTypingStudy(){
 const s=session;if(!typingModes.includes(s?.type))return;
 stopPronunciation();s.result={kind:s.type,total:s.words.length,correct:s.answers.filter(Boolean).length,elapsed:Date.now()-s.start,completed:s.index===s.words.length};s.type='result';
 go(s.fromTopic?'#/topic/'+s.fromTopic+'?mode=result':'#/result/'+s.date);
}
function renderTypingResult(){
 const s=session,r=s.result,missed=s.words.filter((_,i)=>s.answers[i]===false),percent=r.total?r.correct/r.total:0,streak=ReviewEngine.streak(activity,C.isoToday());
 study.innerHTML=`<div class="game-page game-result"><div class="game-result-hero"><h2 id="study-title">Xong rồi!</h2><div class="game-ring"><svg viewBox="0 0 120 120" role="img" aria-label="${r.correct} trên ${r.total} từ đúng"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="14"/><circle cx="60" cy="60" r="50" fill="none" stroke="#F7C948" stroke-width="14" stroke-linecap="round" stroke-dasharray="${percent*314.159} 314.159" transform="rotate(-90 60 60)"/></svg><div><strong>${r.correct}/${r.total}</strong><span>TỪ ĐÚNG</span></div></div><span class="game-streak">${icon('streak')}CHUỖI ${streak} NGÀY</span></div><div class="game-result-stats"><div><span>ĐÚNG</span><strong>${r.correct}</strong></div><div><span>SAI</span><strong>${s.answers.length-r.correct}</strong></div><div><span>THỜI GIAN</span><strong>${timeLabel(r.elapsed)}</strong></div></div>${missed.length?`<section class="game-missed"><header><span>TỪ CẦN ÔN LẠI</span><span>HÔM NAY</span></header><div>${missed.map(w=>`<article><i></i><div><div><strong>${esc(w.en)}</strong>${w.dictionary?.ipa?`<span>${esc(w.dictionary.ipa)}</span>`:''}</div><p>${esc(w.vi)}</p></div></article>`).join('')}</div></section>`:''}<div class="game-result-actions"><button type="button" class="game-replay" data-action="typing-replay">Chơi lại</button><button type="button" class="game-primary" data-action="typing-review">Về ôn tập</button></div></div>`;
 showStudy();
}
function replayTypingStudy(){
 const previous=session;if(!isTypingSession(previous)||previous.type!=='result')return;
 const kind=previous.result.kind,date=previous.date,words=previous.words.map(item=>{const w=studyWord(item.id,item._date||date,previous,item._topic);return {...item,...w};}),topic=previous.fromTopic;
 stopSession();
 if(topic){const deck=topicData?.topics.find(t=>t.id===topic);if(!deck)return;createTopicSession(deck,kind,words);go('#/topic/'+topic+'?mode='+kind);}
 else{createSession(kind,date,false,{words});session.fromReview=!!previous.fromReview;session.reviewFilter=previous.reviewFilter;go('#/'+kind+'/'+date+(previous.fromReview?'?queue='+previous.reviewFilter:''));}
}
study.addEventListener('input',event=>{
 if(event.target.id!=='typing-answer'||!typingModes.includes(session?.type)||session.feedback)return;
 session.input=event.target.value;const panel=$('#typing-letters');if(panel)panel.innerHTML=typingLetterPanel(session,session.words[session.index]).replace(/^<div[^>]*>|<\/div>$/g,'');
});
study.addEventListener('compositionstart',event=>{if(event.target.id==='typing-answer'&&session)session.composing=true;});
study.addEventListener('compositionend',event=>{if(event.target.id==='typing-answer'&&session)session.composing=false;});
study.addEventListener('submit',event=>{if(event.target.id==='typing-form'){event.preventDefault();if(!event.isComposing)submitTypingAnswer();}});
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
 switch(b.dataset.action){
  case 'start-type':startStudy('type');break;
  case 'start-listen':startStudy('listen');break;
  case 'typing-skip':submitTypingAnswer(true);break;
  case 'typing-next':nextTypingWord();break;
  case 'typing-speak':playTypingWord();break;
  case 'typing-slow':if(session?.type==='listen'){session.slow=!session.slow;b.setAttribute('aria-pressed',String(session.slow));b.classList.toggle('selected',session.slow);playTypingWord();}break;
  case 'typing-hint':if(typingModes.includes(session?.type)&&!session.feedback){session.input=$('#typing-answer')?.value||'';session.hint=true;renderTypingGame({focus:true});}break;
  case 'typing-replay':replayTypingStudy();break;
  case 'typing-review':stopSession();if(study.open)study.close();go('#/review');break;
 }
});
document.addEventListener('keydown',event=>{if(!study.open||!isTypingSession()||utility.open||event.repeat||event.isComposing)return;if(event.key==='Escape'){event.preventDefault();closeStudy();}});
