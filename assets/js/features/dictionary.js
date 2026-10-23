/* Dictionary lookup. Shared compressed data also powers word autocomplete. */
'use strict';
let bankData=null,bankPromise=null,bankToken=0,bankDebounce=null,bankSearchToken=0;
let bankReturnIndex=null,bankPendingFocus=null,bankScrollTop=0;
let bankChanged=false;
const bankState={q:'',kind:'all',mode:'both',page:0,size:30};
const kaikkiStore=KaikkiDictionary.create((...args)=>fetch(...args));
async function loadBank(){
  if(bankData)return bankData;
  if(!bankPromise)bankPromise=kaikkiStore.index().then(data=>bankData=data).catch(error=>{bankPromise=null;throw error;});
  return bankPromise;
}

function bankHeader(){
  return `<div class="dictionary-header"><h2 id="utility-title">${icon('search')}Từ điển</h2><button class="round" data-action="close-utility" aria-label="Đóng từ điển">${icon('close')}</button></div>`;
}
async function bankOpen(){
  bankReturnIndex=null;
  const token=++bankToken;
  utilityOpen(bankHeader()+'<div class="bank-loading" role="status">Đang mở từ điển…</div>');
  utility.classList.add('bank-dialog');
  utility.setAttribute('data-view','bank');
  try{
    await loadBank();
    if(utility.open&&utility.getAttribute('data-view')==='bank'&&token===bankToken)bankRender();
  }catch(error){
    if(utility.open&&token===bankToken)utility.innerHTML=bankHeader()+`<div class="dictionary-empty"><p>${esc(error.message)}</p><button class="btn outline" data-action="bank-open">Thử lại</button></div>`;
  }
}
function bankRender({returnTo=null}={}){
  bankPendingFocus=returnTo;
  bankState.kind='all';bankState.mode='both';
  utility.classList.add('bank-dialog');utility.setAttribute('data-view','bank');
  utility.innerHTML=bankHeader()+`<form id="bank-search-form" class="dictionary-search-form" role="search"><label class="search bank-search" for="bank-search">${icon('search')}<span class="sr-only">Tra từ tiếng Anh hoặc nghĩa tiếng Việt</span><input id="bank-search" type="search" placeholder="Từ tiếng Anh hoặc nghĩa tiếng Việt" value="${esc(bankState.q)}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" aria-controls="bank-list"><button type="button" class="round dictionary-reset" id="bank-reset" data-action="bank-reset" aria-label="Xóa tìm kiếm" ${bankState.q?'':'hidden'}>${icon('close')}</button></label></form><div class="dictionary-status" id="bank-results-count" role="status" aria-live="polite"></div><div class="bank-list dictionary-list" id="bank-list" aria-label="Kết quả tra từ"></div><div class="bank-pager" id="bank-pager" hidden><button class="round" data-action="bank-prev" id="bank-prev" aria-label="Trang kết quả trước">${icon('back')}</button><span id="bank-page-label"></span><button class="round" data-action="bank-next" id="bank-next" aria-label="Trang kết quả tiếp theo">${icon('arrow')}</button></div><button class="bank-info-link" data-action="bank-about">Nguồn & giấy phép</button>`;
  bankRenderResults();
  if(returnTo===null)$('#bank-search')?.focus({preventScroll:true});
}
function bankRenderResults(){
  if(!bankData||!$('#bank-list'))return;
  const token=++bankSearchToken;
  $('#bank-reset').hidden=!bankState.q;
  if(!bankState.q.trim()){
    bankState.page=0;
    $('#bank-results-count').textContent=bankData.count.toLocaleString('vi-VN')+' mục từ';
    $('#bank-list').innerHTML='<div class="dictionary-empty">Nhập từ để tra nghĩa.</div>';
    $('#bank-list').setAttribute('aria-busy','false');$('#bank-pager').hidden=true;return;
  }
  const job=C.bankQuery(bankData.entries,{...bankState,kind:'all',mode:'both'});
  $('#bank-results-count').textContent='Đang tìm…';
  $('#bank-list').setAttribute('aria-busy','true');
  $('#bank-list').innerHTML='<div class="dictionary-empty">Đang tra từ…</div>';
  $('#bank-pager').hidden=true;
  const step=()=>{
    if(token!==bankSearchToken||!utility.open||utility.getAttribute('data-view')!=='bank')return;
    const started=performance.now();let done=false;
    do{done=job.step(1500);}while(!done&&performance.now()-started<8);
    if(done)bankApplyResults(job.result());else requestAnimationFrame(step);
  };
  step();
}
function bankApplyResults(result){
  const list=$('#bank-list');if(!list)return;
  list.setAttribute('aria-busy','false');bankState.page=result.page;
  $('#bank-results-count').textContent=result.total.toLocaleString('vi-VN')+' kết quả';
  $('#bank-pager').hidden=result.pages<=1;
  $('#bank-page-label').textContent=(result.page+1)+' / '+result.pages;
  $('#bank-prev').disabled=result.page===0;$('#bank-next').disabled=result.page>=result.pages-1;
  list.innerHTML=result.indices.length?result.indices.map(i=>{
    const row=bankData.entries[i];
    return `<article class="dictionary-row"><button class="dictionary-result" data-action="bank-detail" data-bank="${i}" aria-label="Tra nghĩa ${esc(row[0])}"><strong class="bank-word">${esc(row[0])}</strong>${row[2]?`<span class="bank-pos">${esc(row[2])}</span>`:''}<span class="bank-meaning">${esc(C.bankSummary(row,bankState.q))}</span></button>${speakerSupported?`<button class="round dictionary-sound" data-action="bank-speak" data-bank="${i}" aria-label="Nghe phát âm ${esc(row[0])}">${icon('sound')}</button>`:''}</article>`;
  }).join(''):'<div class="dictionary-empty">Không tìm thấy từ phù hợp. Thử kiểm tra chính tả hoặc nhập nghĩa tiếng Việt.</div>';
  list.scrollTop=bankPendingFocus===null?0:bankScrollTop;
  if(bankPendingFocus!==null){
    const target=utility.querySelector('[data-action="bank-detail"][data-bank="'+bankPendingFocus+'"]')||$('#bank-search');
    target?.focus({preventScroll:true});bankPendingFocus=null;
  }
}
function bankDetail(i,options={}){return bankWordDetail(i,options);}
function bankSave(i){
  if(bankWordState?.index===i&&bankWordState.loading)return;
  const row=bankData?.entries[i]||(bankWordState?.index===i?bankWordState.row:null);if(!row)return;
  if(day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(row[0])))return;
  const vi=$('#bank-custom-meaning')?.value.trim()||'';
  if(!vi||vi.length>1000){toast('Nhập nghĩa từ 1 đến 1.000 ký tự.',null,'',true);return;}
  if(days.reduce((sum,d)=>sum+d.words.length,0)>=50000){toast('Bộ học đã đạt giới hạn 50.000 từ.',null,'',true);return;}
  const entry=bankWordState?.index===i?bankWordState.entry:null;
  const sense=entry?.senses.find(s=>s.id===bankWordState.selected);
  const snapshot=sense?kaikkiStore.card(entry,sense):{dictionary:{source:'kaikki',word:row[0],language:'vi',meaningLanguage:'vi',sourceUrl:'https://vi.wiktionary.org/wiki/'+encodeURIComponent(row[0])}};
  if(sense&&vi!==snapshot.vi)snapshot.dictionary.meaningLanguage='custom';
  ensureDay(C.isoToday()).words.push({id:C.uid(),en:row[0],...snapshot,vi,remembered:false});persist();bankChanged=true;
  bankDetail(i,{word:row[0],sense:bankWordState?.selected||bankWordState?.focus||''});toast('Đã lưu '+row[0]+' vào hôm nay.');
}
function bankAbout(){
  bankReturnIndex=null;utility.setAttribute('data-view','bank-about');
  utility.innerHTML=bankHeader()+`<h2>Kaikki · Bản thử</h2><p>${bankData.count.toLocaleString('vi-VN')} từ và cụm từ có nghĩa Việt, bổ sung chi tiết từ bản tiếng Anh của Kaikki.</p><p>Mỗi nghĩa giữ ví dụ và quan hệ từ của chính nguồn. Không phải từ nào cũng có IPA, bản ghi âm, ví dụ hoặc đồng nghĩa. Khi thiếu âm thanh, app dùng giọng đọc của thiết bị.</p><p>Các kho FVDP và WordNet đang tạm ngừng sử dụng. Những thẻ đã lưu vẫn được giữ nguyên.</p><p><a href="./data/kaikki/NOTICE.txt" target="_blank" rel="noopener noreferrer">Nguồn dữ liệu và giấy phép</a></p><button class="btn outline" data-action="bank-back">Quay lại tra từ</button>`;
}

utility.addEventListener('input',event=>{
  if(event.target.id!=='bank-search')return;
  bankState.q=event.target.value;bankState.page=0;bankPendingFocus=null;bankSearchToken++;
  $('#bank-reset').hidden=!bankState.q;clearTimeout(bankDebounce);
  bankDebounce=setTimeout(()=>{if(utility.open&&utility.getAttribute('data-view')==='bank')bankRenderResults();},180);
});
utility.addEventListener('submit',event=>{
  if(event.target.id!=='bank-search-form')return;event.preventDefault();clearTimeout(bankDebounce);
  bankState.q=$('#bank-search').value;bankState.page=0;bankRenderResults();
});
utility.addEventListener('close',()=>{
  bankToken++;bankSearchToken++;clearTimeout(bankDebounce);
  if(bankChanged){bankChanged=false;if(!location.hash.startsWith('#/settings'))route();}
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action,index=Number(button.dataset.bank);
  if(action==='bank-open')bankOpen();
  else if(action==='bank-detail')bankDetail(index);
  else if(action==='bank-speak')bankSpeak(index);
  else if(action==='bank-save')bankSave(index);
  else if(action==='bank-back'){if(utility.getAttribute('data-view')==='bank-detail')bankWordBack();else{bankRender({returnTo:bankReturnIndex});bankReturnIndex=null;}}
  else if(action==='bank-prev'||action==='bank-next'){bankState.page+=action==='bank-prev'?-1:1;bankRenderResults();}
  else if(action==='bank-reset'){clearTimeout(bankDebounce);bankState.q='';bankState.page=0;bankPendingFocus=null;$('#bank-search').value='';bankRenderResults();$('#bank-search').focus();}
  else if(action==='bank-about'){bankSearchToken++;clearTimeout(bankDebounce);bankAbout();}
});
