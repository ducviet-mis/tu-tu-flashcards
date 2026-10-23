/* One detail view for Kaikki. FVDP and WordNet are retained but not loaded. */
'use strict';
let bankRelationsPending=null,bankWordState=null,bankWordHistory=[],kaikkiWordToken=0,kaikkiSpeakToken=0;
const kaikkiPos={noun:'Danh từ',verb:'Động từ',adj:'Tính từ',adv:'Trạng từ',intj:'Thán từ',prep:'Giới từ',pron:'Đại từ',conj:'Liên từ',name:'Tên riêng',det:'Từ hạn định'};
function kaikkiRelations(label,kind,words){
  if(!words?.length)return '';
  return `<div class="dictionary-relation-group" data-relation="${kind}"><h4>${label}</h4><div class="dictionary-chips">${words.slice(0,8).map(word=>`<button class="dictionary-chip" data-action="kaikki-related" data-word="${esc(word)}">${esc(word)}</button>`).join('')}</div></div>`;
}
function kaikkiSenseMarkup(s,number){
  const example=s.examples?.[0],selected=bankWordState?.selected===s.id;
  return `<section class="dictionary-sense" data-sense="${esc(s.id)}"><div class="kaikki-sense-heading"><p class="dictionary-sense-label">${number+1}. ${esc(kaikkiPos[s.pos]||s.pos)}</p><button class="kaikki-select" data-action="kaikki-select" data-sense="${esc(s.id)}" aria-pressed="${selected}">${selected?'Đang chọn':'Chọn nghĩa này'}</button></div><h3 lang="${s.language==='vi'||s.translations?.length?'vi':'en'}">${esc(s.language==='vi'?s.gloss:(s.translations?.join('; ')||s.gloss))}</h3>${s.language==='en'&&s.translations?.length?`<p class="dictionary-definition" lang="en">${esc(s.gloss)}</p>`:''}${example?`<blockquote class="dictionary-example" lang="en">${esc(example.text)}${example.translation?`<small lang="vi">${esc(example.translation)}</small>`:''}${example.ref?`<cite>${esc(example.ref)}</cite>`:''}</blockquote>`:'<p class="kaikki-missing">Chưa có ví dụ cho nghĩa này trong nguồn.</p>'}${s.examples?.length>1?`<details class="kaikki-more-examples"><summary>Thêm ${s.examples.length-1} ví dụ</summary>${s.examples.slice(1).map(e=>`<blockquote class="dictionary-example" lang="en">${esc(e.text)}${e.translation?`<small lang="vi">${esc(e.translation)}</small>`:''}${e.ref?`<cite>${esc(e.ref)}</cite>`:''}</blockquote>`).join('')}</details>`:''}${kaikkiRelations('Đồng nghĩa','synonyms',s.synonyms)}${kaikkiRelations('Trái nghĩa','antonyms',s.antonyms)}</section>`;
}
function bankWordDetail(i,{word='',sense='',push=false,scroll=0}={}){
  const row=bankData?.entries[i];if(!row)return;
  stopPronunciation();kaikkiSpeakToken++;
  rememberLookup(row[0]);
  if($('#bank-list')){bankScrollTop=$('#bank-list').scrollTop||0;bankReturnIndex=i;bankWordHistory=[];}
  if(push&&bankWordState)bankWordHistory.push({...bankWordState,scroll:utility.scrollTop});
  const state=bankWordState={index:i,row,word:row[0],selected:sense,entry:null,meaningEdited:false,loading:true};
  const token=++kaikkiWordToken;bankSearchToken++;clearTimeout(bankDebounce);
  const saved=day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(row[0]));
  utility.setAttribute('data-view','bank-detail');
  utility.innerHTML=`<div class="dictionary-header"><button class="round" data-action="bank-back" aria-label="Quay lại">${icon('back')}</button><span class="kaikki-source">Kaikki · Bản thử</span><button class="round" data-action="close-utility" aria-label="Đóng từ điển">${icon('close')}</button></div><div class="dictionary-word-head"><h2 id="utility-title" tabindex="-1">${esc(row[0])}</h2><div id="kaikki-pronunciation"><button class="btn outline dictionary-pronounce" data-action="bank-speak" data-bank="${i}" ${speakerSupported?'':'disabled'}>${icon('sound')}Nghe bằng giọng thiết bị</button>${speakerSupported?'':'<p class="dictionary-speech-note">Trình duyệt này chưa hỗ trợ phát âm bằng giọng thiết bị.</p>'}</div></div><details class="dictionary-translations"><summary>Nghĩa tiếng Việt</summary><ol class="bank-senses">${row[1].split('\n').filter(Boolean).map(meaning=>`<li>${esc(meaning)}</li>`).join('')}</ol></details><div id="bank-relations" class="dictionary-relations" aria-busy="true"><p role="status" class="dictionary-relation-note">Đang tải chi tiết từ Kaikki…</p></div><div class="dictionary-save"><label class="field-label" for="bank-custom-meaning">Nghĩa muốn lưu vào thẻ</label><textarea id="bank-custom-meaning" maxlength="1000">${esc(C.bankSummary(row,bankState.q))}</textarea><p id="kaikki-selected-note" class="kaikki-missing">Bạn có thể sửa nghĩa trước khi lưu.</p><button class="btn outline wfull" data-action="bank-save" data-bank="${i}" disabled>${icon(saved?'check':'plus')}${saved?'Đã có trong hôm nay':'Lưu vào hôm nay'}</button></div>`;
  $('#bank-custom-meaning').value=C.bankSummary(row,bankState.q);
  $('#utility-title').focus({preventScroll:true});utility.scrollTop=scroll;
  bankRelationsPending=kaikkiLoadWord(state,token);
  return bankRelationsPending;
}
async function kaikkiLoadWord(state,token){
  const active=()=>token===kaikkiWordToken&&bankWordState===state&&utility.open&&utility.getAttribute('data-view')==='bank-detail';
  state.loading=true;const saving=utility.querySelector('[data-action="bank-save"]');if(saving)saving.disabled=true;
  try{
    const entry=await kaikkiStore.entry(state.word);if(!active())return;
    if(!entry)throw Error('Chưa có chi tiết của từ này trong bản Kaikki đang thử.');
    state.entry=entry;state.loading=false;
    const vi=entry.senses.filter(s=>s.language==='vi'),en=entry.senses.filter(s=>s.language==='en'),q=C.bankFold(bankState.q);
    const chosen=entry.senses.find(s=>s.id===state.selected)||vi.find(s=>q&&q!==C.bankFold(state.word)&&C.bankFold(s.gloss).includes(q))||vi[0]||en[0];
    state.selected=chosen?.id||'';
    const target=$('#bank-relations');target.setAttribute('aria-busy','false');
    target.innerHTML=(vi.length?`<h3 class="dictionary-section-title">Nghĩa tiếng Việt</h3>${vi.slice(0,3).map(kaikkiSenseMarkup).join('')}${vi.length>3?`<details class="dictionary-more-senses"><summary>Xem ${vi.length-3} nghĩa Việt khác</summary>${vi.slice(3).map((s,i)=>kaikkiSenseMarkup(s,i+3)).join('')}</details>`:''}`:'<p class="kaikki-missing">Chưa có nghĩa Việt trong nguồn.</p>')+(en.length?`<details class="kaikki-english" ${vi.length?'':'open'}><summary>Giải thích, ví dụ và đồng nghĩa tiếng Anh · ${en.length} nghĩa</summary>${en.map(kaikkiSenseMarkup).join('')}</details>`:'<p class="kaikki-missing">Chưa có phần giải thích tiếng Anh bổ sung.</p>')+
      (entry.forms?.length?`<details class="kaikki-forms"><summary>Các dạng của từ</summary><p>${entry.forms.map(esc).join(' · ')}</p></details>`:'')+
      ((entry.relations?.synonyms?.length||entry.relations?.antonyms?.length)?`<details class="kaikki-entry-relations"><summary>Quan hệ từ chưa phân theo nghĩa</summary><p class="kaikki-missing">Nguồn gắn các từ sau với cả mục từ, chưa chỉ rõ từng nghĩa.</p>${kaikkiRelations('Đồng nghĩa theo mục từ','entry-synonyms',entry.relations.synonyms)}${kaikkiRelations('Trái nghĩa theo mục từ','entry-antonyms',entry.relations.antonyms)}</details>`:'')+
      `<p class="dictionary-source">Nguồn: <a href="https://vi.wiktionary.org/wiki/${encodeURIComponent(entry.word)}" target="_blank" rel="noopener noreferrer">Wiktionary qua Kaikki</a>. Không tự bổ sung thông tin còn thiếu.</p>`;
    const sound=kaikkiStore.pronunciation(entry),hasAudio=!!sound.audio&&typeof Audio!=='undefined';
    $('#kaikki-pronunciation').innerHTML=`${sound.ipa?`<p class="kaikki-ipa" lang="en">${esc(sound.ipa)}</p>`:'<p class="kaikki-missing">Chưa có IPA trong nguồn.</p>'}<button class="btn outline dictionary-pronounce" data-action="bank-speak" data-bank="${state.index}" ${hasAudio||speakerSupported?'':'disabled'}>${icon('sound')}${hasAudio?'Nghe phát âm · '+esc(sound.label):'Nghe bằng giọng thiết bị'}</button>${sound.attribution&&hasAudio?`<a class="kaikki-audio-credit" href="${esc(sound.attribution)}" target="_blank" rel="noopener noreferrer">Nguồn bản ghi âm</a>`:''}${hasAudio||speakerSupported?'':'<p class="dictionary-speech-note">Trình duyệt này chưa hỗ trợ phát âm bằng giọng thiết bị.</p>'}`;
    if(chosen&&!state.meaningEdited)kaikkiSelectSense(chosen.id,false);
    const save=utility.querySelector('[data-action="bank-save"]');if(save)save.disabled=day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(state.word));
  }catch(error){
    if(!active())return;
    state.loading=false;const save=utility.querySelector('[data-action="bank-save"]');if(save)save.disabled=day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(state.word));
    $('#kaikki-selected-note').textContent='Chưa tải được chi tiết. Nếu lưu lúc này, thẻ chỉ có nghĩa bạn nhập, chưa có ví dụ và quan hệ từ.';
    $('#bank-relations').setAttribute('aria-busy','false');$('#bank-relations').innerHTML=`<p class="dictionary-relation-note">${esc(error.message)}</p><button class="btn outline small" data-action="kaikki-retry">Tải lại chi tiết</button>`;
  }
}
function kaikkiSelectSense(id,explicit=true){
  const state=bankWordState,s=state?.entry?.senses.find(s=>s.id===id);if(!s)return;
  state.selected=id;
  if(explicit||!state.meaningEdited){$('#bank-custom-meaning').value=kaikkiStore.card(state.entry,s).vi;state.meaningEdited=false;}
  $('#kaikki-selected-note').textContent=s.language==='en'&&!s.translations?.length?'Nghĩa này được lưu bằng tiếng Anh; bạn có thể viết lại bằng tiếng Việt.':'Sẽ lưu nghĩa đang chọn cùng ví dụ có trong nguồn.';
  utility.querySelectorAll('[data-action="kaikki-select"]').forEach(b=>{const active=b.dataset.sense===id;b.setAttribute('aria-pressed',String(active));b.textContent=active?'Đang chọn':'Chọn nghĩa này';});
}
function bankWordBack(){
  kaikkiWordToken++;kaikkiSpeakToken++;stopPronunciation();
  if(bankWordHistory.length){const previous=bankWordHistory.pop();bankWordDetail(previous.index,{sense:previous.selected,scroll:previous.scroll||0});return;}
  bankWordState=null;bankRender({returnTo:bankReturnIndex});bankReturnIndex=null;
}
async function bankSpeak(i){
  const row=bankData?.entries[i];if(!row)return;
  const token=++kaikkiSpeakToken,view=utility.getAttribute('data-view'),wordState=bankWordState;
  stopPronunciation();
  const active=()=>token===kaikkiSpeakToken&&utility.open&&utility.getAttribute('data-view')===view&&(view!=='bank-detail'||bankWordState===wordState);
  try{const entry=bankWordState?.index===i&&bankWordState.entry?bankWordState.entry:await kaikkiStore.entry(row[0]);if(active())speakWord({en:row[0],dictionary:kaikkiStore.pronunciation(entry)});}
  catch{if(active())speak(row[0]);}
}
utility.addEventListener('input',event=>{if(event.target.id==='bank-custom-meaning'&&bankWordState)bankWordState.meaningEdited=true;});
utility.addEventListener('close',()=>{kaikkiWordToken++;kaikkiSpeakToken++;stopPronunciation();});
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
  if(b.dataset.action==='kaikki-select')kaikkiSelectSense(b.dataset.sense);
  if(b.dataset.action==='kaikki-retry'&&bankWordState)bankRelationsPending=kaikkiLoadWord(bankWordState,++kaikkiWordToken);
  if(b.dataset.action==='kaikki-related'){
    const index=bankData?.entries.findIndex(r=>C.wordKey(r[0])===C.wordKey(b.dataset.word));
    if(index>=0)bankWordDetail(index,{push:true});else toast('Từ này chưa có trong bản Kaikki đang thử.');
  }
});
