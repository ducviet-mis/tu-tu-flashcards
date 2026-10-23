/* Read-only everyday decks, using the same visual language as the notebook. */
'use strict';
const topicStore=TopicDecks.create((...args)=>fetch(...args)),TOPIC_PROGRESS_STORE='tutu.topics.progress.v1';
let topicData=null,topicPending=null,topicPageToken=0,topicSearch='',topicProgress={};
try{const saved=JSON.parse(localStorage.getItem(TOPIC_PROGRESS_STORE)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const [id,value] of Object.entries(saved))if(/^[a-z0-9-]+:tw-[a-z0-9-]+$/.test(id)&&typeof value==='boolean')topicProgress[id]=value;}catch{/* Keep the catalog usable if local storage is unavailable. */}
const topicHref=id=>'#/notebook?view=topics'+(id?'&topic='+encodeURIComponent(id):'');
const topicRemembered=(deck,id)=>topicProgress[deck+':'+id]===true;
function saveTopicRemembered(deck,id,known){
 topicProgress[deck+':'+id]=!!known;
 try{localStorage.setItem(TOPIC_PROGRESS_STORE,JSON.stringify(topicProgress));}catch{toast('Chưa lưu được tiến trình chủ đề trên thiết bị này.',null,'',true);}
}
function topicTabs(){return '<nav class="notebook-tabs" aria-label="Cách xem sổ từ"><a href="#/notebook?view=days">Theo ngày</a><a href="#/notebook?view=topics" aria-current="page">Chủ đề</a></nav>';}
function renderFixedTopics(){
 closeSuggestions();suggestionAutoMeaning=null;$('#shell').classList.remove('mobile-day');
 const hash=location.hash,token=++topicPageToken,id=new URLSearchParams(hash.split('?')[1]||'').get('topic');topicSearch='';
 app.innerHTML=`<div class="notebook-page fixed-topics-page"><section class="notebook-heading"><div><div class="eyebrow muted">Tiếng Anh hằng ngày</div><h1>Chủ đề</h1><p>Các bộ từ có sẵn, mở ra và học.</p></div>${icon('book')}</section><div class="notebook-toolbar">${topicTabs()}</div><div id="fixed-topic-content"><div class="fixed-topic-loading" role="status">Đang mở các chủ đề…</div></div></div>`;
 topicPending=(async()=>{try{
  const data=await topicStore.load();if(token!==topicPageToken||location.hash!==hash)return;topicData=data;
  if(id!==null){const deck=data.topics.find(t=>t.id===id);if(!deck){$('#fixed-topic-content').innerHTML=`<div class="notebook-empty fixed-topic-missing"><h2>Không tìm thấy chủ đề</h2><a class="btn outline small" href="${topicHref()}">Về các chủ đề</a></div>`;return;}renderFixedTopic(deck);}
  else renderFixedTopicCatalog();
 }catch(error){if(token!==topicPageToken||location.hash!==hash)return;$('#fixed-topic-content').innerHTML=`<div class="notebook-empty"><h2>Chưa mở được chủ đề</h2><p>${esc(error.message)}</p><button class="btn outline small" data-action="topics-retry">Thử lại</button></div>`;}})();
 return topicPending;
}
function topicSearchMarkup(placeholder){return `<label class="search fixed-topic-search">${icon('search')}<span class="sr-only">${placeholder}</span><input id="fixed-topic-search" type="search" placeholder="${placeholder}" autocomplete="off" maxlength="200"></label>`;}
function renderFixedTopicCatalog(){
 const total=topicData.topics.reduce((n,t)=>n+t.words.length,0);
 $('#fixed-topic-content').innerHTML=`<div class="fixed-topic-intro"><div><h2>Hôm nay bạn muốn học gì?</h2><p>${topicData.topics.length} chủ đề · ${total.toLocaleString('vi-VN')} thẻ từ</p></div>${topicSearchMarkup('Tìm chủ đề hoặc từ vựng')}</div><div id="fixed-topic-grid" class="fixed-topic-grid"></div><p class="fixed-topic-credit">Bộ từ theo chủ đề: Linguabase · Nội dung từ: Kaikki. <a href="./data/topics/NOTICE.txt" target="_blank" rel="noopener noreferrer">Nguồn dữ liệu</a></p>`;
 renderFixedTopicTiles();
}
function renderFixedTopicTiles(){
 const q=C.bankFold(topicSearch),topics=topicData.topics.filter(t=>!q||C.bankFold(t.title+' '+t.sourceLabel+' '+t.group+' '+t.words.map(w=>w.en).join(' ')).includes(q));
 let group='';$('#fixed-topic-grid').innerHTML=topics.length?topics.map(t=>{
  const heading=t.group!==group?`<h2 class="fixed-topic-group">${esc(t.group)}</h2>`:'';group=t.group;
  const index=topicData.topics.indexOf(t),known=t.words.filter(w=>topicRemembered(t.id,w.id)).length;
  return heading+`<a class="fixed-topic-tile ${['orange','blue','yellow','mint'][index%4]}" href="${topicHref(t.id)}"><div class="fixed-topic-tile-top"><span class="fixed-topic-count">${t.words.length} từ</span>${icon('arrow')}</div><h3>${esc(t.title)}</h3><p class="fixed-topic-english">${esc(t.sourceLabel)}</p><p class="fixed-topic-preview" lang="en">${esc(t.words.slice(0,3).map(w=>w.en).join(' · '))}</p><div class="fixed-topic-tile-bottom"><span>Đã nhớ ${known}/${t.words.length}</span><span class="fixed-topic-track" aria-hidden="true"><i style="width:${Math.round(known/t.words.length*100)}%"></i></span></div></a>`;
 }).join(''):'<div class="notebook-empty"><h2>Chưa tìm thấy chủ đề</h2><p>Thử một tên chủ đề hoặc từ tiếng Anh khác.</p></div>';
}
function renderFixedTopic(deck){
 const known=deck.words.filter(w=>topicRemembered(deck.id,w.id)).length;
 $('#fixed-topic-content').innerHTML=`<a class="fixed-topic-back" href="${topicHref()}">${icon('back')}Tất cả chủ đề</a><section class="fixed-topic-hero"><div><span class="eyebrow muted">${esc(deck.group)}</span><h2>${esc(deck.title)}</h2><p class="fixed-topic-english">${esc(deck.sourceLabel)}</p><p id="fixed-topic-known">Đã nhớ ${known}/${deck.words.length} từ</p></div><div class="fixed-topic-study-actions"><button class="btn purple" data-action="topic-flip" data-topic="${deck.id}">${icon('flip')}Lật thẻ</button><button class="btn yellow" data-action="topic-match" data-topic="${deck.id}" ${deck.words.length<3?'disabled':''}>${icon('grid')}Ghép từ</button></div></section><div class="fixed-topic-list-heading"><h3>Toàn bộ từ vựng <span>${deck.words.length}</span></h3>${topicSearchMarkup('Tìm từ hoặc nghĩa trong chủ đề')}</div><div id="fixed-topic-words" class="fixed-topic-words"></div>`;
 app.dataset.topic=deck.id;renderFixedTopicWords(deck);
}
function renderFixedTopicWords(deck){
 const q=C.bankFold(topicSearch),words=deck.words.filter(w=>!q||C.bankFold(w.en+' '+w.vi).includes(q));
 $('#fixed-topic-words').innerHTML=words.length?words.map(w=>`<article class="fixed-topic-word"><span class="fixed-topic-word-index">${String(deck.words.indexOf(w)+1).padStart(2,'0')}</span><div class="fixed-topic-word-copy"><div><strong lang="en">${esc(w.en)}</strong>${topicRemembered(deck.id,w.id)?`<span class="fixed-topic-word-known" aria-label="Đã nhớ">${icon('check')}</span>`:''}</div>${w.dictionary?.ipa?`<span class="fixed-topic-ipa" lang="en">${esc(w.dictionary.ipa)}</span>`:''}<p>${esc(w.vi)}</p></div>${speakerSupported||(typeof Audio!=='undefined'&&w.dictionary?.audio)?`<div class="fixed-topic-audio"><button class="round" data-action="topic-speak" data-topic="${deck.id}" data-id="${w.id}" aria-label="Nghe phát âm ${esc(w.en)}">${icon('sound')}</button>${w.dictionary?.audioAttribution?.startsWith('https://commons.wikimedia.org/')?`<a href="${esc(w.dictionary.audioAttribution)}" target="_blank" rel="noopener noreferrer" aria-label="Nguồn bản ghi âm ${esc(w.en)}">Nguồn</a>`:''}</div>`:''}</article>`).join(''):'<div class="notebook-empty"><h3>Không tìm thấy từ phù hợp</h3><p>Thử một từ tiếng Anh hoặc nghĩa tiếng Việt khác.</p></div>';
}
app.addEventListener('input',event=>{if(event.target.id!=='fixed-topic-search'||!topicData)return;topicSearch=event.target.value;const id=new URLSearchParams(location.hash.split('?')[1]||'').get('topic'),deck=topicData.topics.find(t=>t.id===id);if(deck)renderFixedTopicWords(deck);else renderFixedTopicTiles();});
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
 if(b.dataset.action==='topics-retry'){if(location.hash.startsWith('#/topic/'))renderTopicRoute();else renderFixedTopics();}
 if(b.dataset.action==='topic-flip'||b.dataset.action==='topic-match')go('#/topic/'+b.dataset.topic+'?mode='+(b.dataset.action==='topic-flip'?'flip':'match'));
 if(b.dataset.action==='topic-speak'){const deck=topicData?.topics.find(t=>t.id===b.dataset.topic),word=deck?.words.find(w=>w.id===b.dataset.id);if(word)speakWord(word);}
 if(b.dataset.action==='topic-return'){const id=session?.fromTopic;stopSession();if(study.open)study.close();go(topicHref(id));}
});
