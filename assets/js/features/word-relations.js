/* Lazy, offline-capable word relations. Relations and navigation always retain sense IDs. */
'use strict';
const L=globalThis.DictionaryLexicon;
let bankRelationsPending=null,bankRelationToken=0,bankLexiconPromise=null;
let bankWordState=null,bankWordHistory=[],bankWordIndex=null,bankFamiliarWords=null;
const bankLexiconShards=new Map();
async function bankReadJSON(url,compressed=false){
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Chưa tải được dữ liệu từ liên quan.');
  if(!compressed)return response.json();
  const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).json();
}
function bankLoadLexicon(){
  if(!bankLexiconPromise)bankLexiconPromise=Promise.all([
    bankReadJSON('./data/wordnet/index.json.gz',true),bankReadJSON('./data/wordnet-vi.json')
  ]).then(([index,translations])=>{
    if(index.version!==1||!index.forms||!index.lemmas||!Array.isArray(index.buckets))throw Error('Dữ liệu từ liên quan không hợp lệ.');
    return{index,translations};
  }).catch(error=>{bankLexiconPromise=null;throw error;});
  return bankLexiconPromise;
}
function bankLoadShard(bucket){
  if(bankLexiconShards.has(bucket)){
    const promise=bankLexiconShards.get(bucket);bankLexiconShards.delete(bucket);bankLexiconShards.set(bucket,promise);return promise;
  }
  const promise=bankReadJSON('./data/wordnet/'+bucket+'.json.gz',true).then(data=>{
    if(data.version!==1||!data.entries)throw Error('Dữ liệu từ liên quan không hợp lệ.');return data;
  }).catch(error=>{if(bankLexiconShards.get(bucket)===promise)bankLexiconShards.delete(bucket);throw error;});
  bankLexiconShards.set(bucket,promise);
  if(bankLexiconShards.size>3)bankLexiconShards.delete(bankLexiconShards.keys().next().value);
  return promise;
}
async function bankLexiconEntry(word,index){
  const bucket=L.bucket(word);if(!index.buckets.includes(bucket))return null;
  const data=await bankLoadShard(bucket),key=L.key(word);
  return L.selectEntry(word,data.entries[word]||data.entries[key]||data.entries[index.aliases?.[key]])||null;
}
function bankFindWord(word){
  if(!bankWordIndex){bankWordIndex=new Map();bankData.entries.forEach((row,i)=>{const key=C.wordKey(row[0]);if(!bankWordIndex.has(key))bankWordIndex.set(key,i);});}
  return bankWordIndex.get(C.wordKey(word))??-1;
}
function bankRelationLink(ref){
  return `<button type="button" class="dictionary-chip" data-action="bank-related" data-word="${esc(ref.word)}" data-sense="${esc(ref.sense||'')}">${esc(ref.word)}</button>`;
}
function bankRelationGroup(label,kind,refs,word,preferred=[]){
  if(!bankFamiliarWords)bankFamiliarWords=new Set(bankData.entries.filter(r=>r[3]).map(r=>r[0]));
  const items=L.relations(refs.filter(ref=>L.key(ref.word)!==L.key(word)),preferred,bankFamiliarWords);
  if(!items.length)return'';
  return `<div class="dictionary-relation-group" data-relation="${kind}"><h4>${label}</h4><div class="dictionary-chips">${items.slice(0,3).map(bankRelationLink).join('')}</div>${items.length>3?`<details class="dictionary-more-links"><summary>Thêm ${items.length-3} từ</summary><div class="dictionary-chips">${items.slice(3).map(bankRelationLink).join('')}</div></details>`:''}</div>`;
}
const bankPartOfSpeech={n:'Danh từ',v:'Động từ',a:'Tính từ',s:'Tính từ',r:'Trạng từ'};
function bankSenseCard(sense,word,number){
  const near=bankRelationGroup('Gần nghĩa','synonyms',[...sense.synonyms,...sense.similar],word,sense.nearOrder||[]);
  const opposite=bankRelationGroup('Trái nghĩa','antonyms',sense.antonyms,word);
  const related=bankRelationGroup('Từ liên quan','related',sense.related,word);
  return `<section class="dictionary-sense" data-sense="${esc(sense.id)}" tabindex="-1"><p class="dictionary-sense-label">${number}. ${bankPartOfSpeech[sense.pos]||'Từ vựng'}</p><h3 ${sense.vi?'':'lang="en"'}>${esc(sense.vi||sense.definition)}</h3>${sense.vi?`<details class="dictionary-english"><summary>Giải thích tiếng Anh</summary><p class="dictionary-definition" lang="en">${esc(sense.definition)}</p></details>`:''}${sense.examples.length?`<blockquote class="dictionary-example" lang="en">${esc(sense.examples[0])}</blockquote>`:''}${near}${opposite}${related}${!near&&!opposite&&!related?'<p class="dictionary-relation-note">Chưa có từ gần nghĩa hoặc trái nghĩa cho nghĩa này trong nguồn.</p>':''}</section>`;
}
function bankWordDetail(i,{word='',sense='',push=false,scroll=0,returnSense=''}={}){
  const row=bankData?.entries[i]||(word?[word,'','',0]:null);if(!row)return;
  rememberLookup(row[0]);
  if($('#bank-list')){bankScrollTop=$('#bank-list').scrollTop||0;bankReturnIndex=i;bankWordHistory=[];}
  if(push&&bankWordState){bankWordHistory.push({...bankWordState,scroll:utility.scrollTop});if(bankWordHistory.length>30)bankWordHistory.shift();}
  const token=++bankRelationToken;
  bankWordState={index:i,row,word:row[0],focus:sense,scroll,returnSense};
  bankSearchToken++;clearTimeout(bankDebounce);
  const saved=day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(row[0]));
  utility.setAttribute('data-view','bank-detail');
  utility.innerHTML=`<div class="dictionary-header"><button class="round" data-action="bank-back" aria-label="Quay lại">${icon('back')}</button><span class="tiny muted">Từ điển</span><button class="round" data-action="close-utility" aria-label="Đóng từ điển">${icon('close')}</button></div><div class="dictionary-word-head"><h2 id="utility-title" tabindex="-1">${esc(row[0])}</h2>${row[2]?`<p class="bank-pos">${esc(row[2])}</p>`:''}<button class="btn outline dictionary-pronounce" data-action="bank-speak" data-bank="${i}" ${speakerSupported?'':'disabled'}>${icon('sound')}Nghe phát âm</button>${speakerSupported?'':'<p class="dictionary-speech-note">Trình duyệt này chưa hỗ trợ phát âm.</p>'}</div>${row[1]?`<p class="dictionary-translation-preview">${esc(C.bankSummary(row,bankState.q))}</p>`:''}<div id="bank-relations" class="dictionary-relations" aria-busy="true"><p class="dictionary-relation-note" role="status">Đang tìm từ liên quan…</p></div>${row[1]?`<details class="dictionary-translations" open><summary>Nghĩa tiếng Việt đầy đủ</summary><ol class="bank-senses">${row[1].split('\n').filter(Boolean).map(meaning=>`<li>${esc(meaning)}</li>`).join('')}</ol></details>`:''}<div class="dictionary-save"><details ${saved?'hidden':''}><summary>Sửa nghĩa để lưu vào bộ học</summary><label class="sr-only" for="bank-custom-meaning">Nghĩa lưu vào bộ học</label><textarea id="bank-custom-meaning" maxlength="1000" placeholder="Nhập nghĩa bạn muốn lưu">${esc(C.bankSummary(row,bankState.q))}</textarea></details><button class="btn outline wfull" data-action="bank-save" data-bank="${i}" ${saved||!row[1]?'disabled':''}>${icon(saved?'check':'plus')}${saved?'Đã có trong hôm nay':'Lưu vào hôm nay'}</button></div>`;
  $('#utility-title').focus({preventScroll:true});utility.scrollTop=scroll;
  if(sense){$('#bank-custom-meaning').value='';$('[data-action="bank-save"]').disabled=true;}
  bankRelationsPending=bankRenderRelations(token,bankWordState);
  return bankRelationsPending;
}
async function bankRenderRelations(token,state){
  const active=()=>token===bankRelationToken&&utility.open&&utility.getAttribute('data-view')==='bank-detail';
  try{
    const{index,translations}=await bankLoadLexicon();
    let entry=await bankLexiconEntry(state.word,index);
    const roots=L.roots(index,state.word);
    if(!entry)for(const root of roots){entry=await bankLexiconEntry(root,index);if(entry)break;}
    if(!active())return;
    const target=$('#bank-relations');target.setAttribute('aria-busy','false');
    if(!entry){target.innerHTML='<p class="dictionary-relation-note">Chưa có dữ liệu gần nghĩa hoặc trái nghĩa cho mục từ này.</p>';return;}
    let senses=L.senses(entry,translations,state.focus);
    const q=C.bankFold(bankState.q);
    if(!state.focus&&q&&q!==C.bankFold(state.word)){
      const match=senses.find(s=>s.vi&&C.bankFold(s.vi).includes(q));if(match)senses=L.senses(entry,translations,match.id);
    }
    const rootLinks=roots.map(word=>({word}));
    const forms=[...new Set(Object.values(entry.forms).flat())].map(word=>({word}));
    target.innerHTML=(roots.length?`<div class="dictionary-root"><span>Dạng của</span><div class="dictionary-chips">${rootLinks.map(bankRelationLink).join('')}</div></div>`:'')+(forms.length?`<div class="dictionary-word-forms"><span>Các dạng của ${esc(entry.word)}</span><div class="dictionary-chips">${forms.map(bankRelationLink).join('')}</div></div>`:'')+`<h3 class="dictionary-section-title">${L.key(entry.word)===L.key(state.word)?'Theo từng nghĩa':'Nghĩa của '+esc(entry.word)}</h3>`+senses.slice(0,3).map((s,i)=>bankSenseCard(s,entry.word,i+1)).join('')+(senses.length>3?`<details class="dictionary-more-senses"><summary>Xem ${senses.length-3} nghĩa khác</summary>${senses.slice(3).map((s,i)=>bankSenseCard(s,entry.word,i+4)).join('')}</details>`:'')+'<p class="dictionary-source">Quan hệ từ: <a href="https://en-word.net/" target="_blank" rel="noopener noreferrer">Open English WordNet</a>. <a href="./data/WORDNET-NOTICE.txt" target="_blank" rel="noopener noreferrer">Nguồn & giấy phép</a></p>';
    const full=$('.dictionary-translations');if(full)full.open=false;
    // No headword-based translation guesses: only an explicitly translated sense can fill a new card.
    if(!state.meaningEdited){
      const selected=senses.find(s=>s.id===state.focus)||senses[0],field=$('#bank-custom-meaning');
      if(selected?.vi){
        if(!state.row[1])state.row[1]=selected.vi;
        if(field)field.value=selected.vi;
        const save=$('[data-action="bank-save"]');if(save)save.disabled=day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(state.word));
      }else if(state.focus&&field){
        field.placeholder='Nhập nghĩa tiếng Việt cho nghĩa đang xem';
        $('.dictionary-save').querySelector('details').open=true;
      }
    }
    utility.scrollTop=state.scroll||0;
    if(state.returnSense)[...utility.querySelectorAll('.dictionary-sense')].find(card=>card.dataset.sense===state.returnSense)?.focus({preventScroll:true});
  }catch{
    if(active()){
      const target=$('#bank-relations');target.setAttribute('aria-busy','false');
      target.innerHTML='<p class="dictionary-relation-note" role="status">Chưa tải được từ liên quan. Bạn vẫn có thể xem nghĩa và nghe phát âm.</p><button class="btn outline small" data-action="bank-relations-retry">Thử lại</button>';
    }
  }
}
function bankWordBack(){
  bankRelationToken++;
  if(bankWordHistory.length){const state=bankWordHistory.pop();return bankWordDetail(state.index,{word:state.word,sense:state.focus,scroll:state.scroll,returnSense:state.returnSense});}
  bankWordState=null;bankRender({returnTo:bankReturnIndex});bankReturnIndex=null;
}
utility.addEventListener('close',()=>{bankRelationToken++;bankWordHistory=[];bankWordState=null;});
utility.addEventListener('input',event=>{
  if(event.target.id!=='bank-custom-meaning'||!bankWordState)return;
  bankWordState.meaningEdited=true;
  const saved=day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(bankWordState.word));
  $('[data-action="bank-save"]').disabled=saved||!event.target.value.trim();
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  if(button.dataset.action==='bank-related'){
    if(bankWordState){const card=button.closest('.dictionary-sense');if(card)bankWordState.returnSense=card.dataset.sense;}
    bankWordDetail(bankFindWord(button.dataset.word),{word:button.dataset.word,sense:button.dataset.sense||'',push:true});
  }else if(button.dataset.action==='bank-relations-retry'&&bankWordState){
    $('#bank-relations').innerHTML='<p class="dictionary-relation-note" role="status">Đang tìm từ liên quan…</p>';
    $('#bank-relations').setAttribute('aria-busy','true');bankRelationsPending=bankRenderRelations(++bankRelationToken,bankWordState);
  }
});
