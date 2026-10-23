/* Topic sessions share study controls, never personal day membership. */
'use strict';
function topicSessionWord(id,s=session){return s?.topicAll?.find(w=>w.id===id);}
function studyWord(id,date,s=session){return s?.fromTopic?topicSessionWord(id,s):day(date).words.find(w=>w.id===id);}
function gradeStudyWord(word,known){recordReview(word,known);if(session?.fromTopic){session.topicAttempted.add(word.id);saveTopicRemembered(session.fromTopic,word.id,known);}}
function persistStudy(){if(!session?.fromTopic)persist();}
function topicSessionWords(deck){return deck.words.map(w=>({...w,remembered:topicRemembered(deck.id,w.id)}));}
function createTopicSession(deck,mode,words=null){
 const all=words||topicSessionWords(deck);stopSession();
 createSession(mode,C.isoToday(),false,{words:mode==='match'?C.shuffle(all).slice(0,6):all});
 Object.assign(session,{fromTopic:deck.id,topicTitle:deck.title,topicAll:mode==='match'?session.words.concat(all.filter(w=>!session.words.some(x=>x.id===w.id))):session.words,topicAttempted:new Set(),topicOffset:0,topicMatched:0});
}
function nextTopicMatchRound(){
 const previous=session,next=previous.topicOffset+previous.words.length,total=previous.topicMatched+previous.matched.length;
 clearInterval(previous.timer);clearTimeout(previous.timeout);
 createSession('match',previous.date,false,{words:previous.topicAll.slice(next,next+6)});
 Object.assign(session,{fromTopic:previous.fromTopic,topicTitle:previous.topicTitle,topicAll:previous.topicAll,topicAttempted:previous.topicAttempted,topicOffset:next,topicMatched:total,start:previous.start});renderMatch();
}
function restartTopicMatching(){
 const deck=topicData?.topics.find(t=>t.id===session?.fromTopic);if(!deck)return;
 createTopicSession(deck,'match');renderMatch();
}
function finishTopicStudy(){
 const s=session;if(!s||s.type==='result')return;
 if(s.type==='match'&&s.matched.length===s.words.length&&s.topicOffset+s.words.length<s.topicAll.length){nextTopicMatchRound();return;}
 clearInterval(s.timer);clearTimeout(s.timeout);stopPronunciation();
 s.result={kind:s.type,total:s.topicAll.length,correct:s.type==='flip'?s.answers.filter(Boolean).length:s.topicMatched+s.matched.length,elapsed:Date.now()-s.start,completed:s.type==='flip'?s.index===s.words.length:s.topicMatched+s.matched.length===s.topicAll.length};
 s.type='result';go('#/topic/'+s.fromTopic+'?mode=result');
}
function topicMissedWords(s){return s.topicAll.filter(w=>s.topicAttempted.has(w.id)&&!topicRemembered(s.fromTopic,w.id)).map(w=>({...w,remembered:false}));}
function retryTopicMissed(){
 const s=session,deck=topicData?.topics.find(t=>t.id===s?.fromTopic),words=s&&topicMissedWords(s);if(!deck||!words.length)return;
 createTopicSession(deck,'flip',words);go('#/topic/'+deck.id+'?mode=flip');
}
function renderTopicResult(){
 const s=session,r=s.result,missed=topicMissedWords(s);
 study.innerHTML=studyHeader('Kết quả')+`<h2 class="study-heading" id="study-title">${r.completed?'Xong một lượt học.':'Đã dừng lượt học.'}</h2><p class="topic-study-caption">${esc(s.topicTitle)}</p><div class="result-card"><div class="eyebrow">${r.kind==='flip'?'Số từ đã nhớ trong lượt này':'Số cặp đã ghép'}</div><div class="score">${r.correct}/${r.total}</div>${mascot(true)}</div>${missed.length?`<p class="topic-study-caption">${missed.length} từ trong lượt này cần ôn lại.</p><button class="btn purple wfull" data-action="result-review">${icon('repeat')}Lật lại ${missed.length} từ</button>`:''}<button class="btn outline wfull" data-action="topic-return">${icon('back')}Về chủ đề</button>`;
}
function renderTopicRoute(){
 closeSuggestions();$('#shell').classList.remove('mobile-day');
 const hash=location.hash,token=++topicPageToken,match=hash.match(/^#\/topic\/([a-z0-9-]+)(?:\?|$)/),mode=new URLSearchParams(hash.split('?')[1]||'').get('mode')||'flip';
 if(!match||!['flip','match','result'].includes(mode)){stopSession();if(study.open)study.close();go(topicHref());return;}
 const id=match[1];
 if(session?.fromTopic!==id||session?.type!==mode){
  if(mode!=='result'){stopSession();if(study.open)study.close();}
  app.innerHTML=`<div class="notebook-page fixed-topics-page"><a class="fixed-topic-back" href="${topicHref(id)}">${icon('back')}Về chủ đề</a><p id="fixed-topic-session-loading" class="fixed-topic-loading" role="status">Đang mở bộ từ…</p></div>`;
 }
 topicPending=(async()=>{try{
  const data=await topicStore.load();if(token!==topicPageToken||location.hash!==hash)return;topicData=data;const deck=data.topics.find(t=>t.id===id);
  if(!deck||mode==='match'&&deck.words.length<3){stopSession();if(study.open)study.close();go(topicHref(deck?.id));return;}
  if(mode==='result'&&(!session?.result||session.fromTopic!==id)){go(topicHref(id));return;}
  app.innerHTML=`<div class="notebook-page fixed-topics-page"><div id="fixed-topic-content"></div></div>`;topicSearch='';renderFixedTopic(deck);
  if(mode==='result')renderTopicResult();else{if(session?.fromTopic!==id||session.type!==mode)createTopicSession(deck,mode);if(mode==='flip')renderFlip();else renderMatch();}
  if(!study.open){focusBeforeStudy=document.activeElement;study.showModal();}
 }catch(error){if(token!==topicPageToken||location.hash!==hash)return;stopSession();if(study.open)study.close();app.innerHTML=`<div class="notebook-empty"><h1>Chưa mở được bộ từ</h1><p>${esc(error.message)}</p><button class="btn outline" data-action="topics-retry">Thử lại</button><a href="${topicHref()}">Về các chủ đề</a></div>`;}})();
 return topicPending;
}
