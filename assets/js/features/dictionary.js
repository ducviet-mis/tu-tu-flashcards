/* Dictionary lookup. Shared compressed data also powers word autocomplete. */
'use strict';
let bankData=null,bankPromise=null,bankToken=0,bankDebounce=null,bankSearchToken=0;
let bankReturnIndex=null,bankPendingFocus=null,bankScrollTop=0;
let bankChanged=false;
const bankState={q:'',kind:'all',mode:'both',page:0,size:30};
async function loadBank(){
  if(bankData)return bankData;
  if(bankPromise)return bankPromise;
  bankPromise=(async()=>{
    if(!('DecompressionStream' in window))throw Error('Hãy cập nhật trình duyệt để mở kho từ.');
    const response=await fetch('./data/dictionary.json.gz');
    if(!response.ok)throw Error('Chưa tải được kho từ. Kết nối mạng để tải lần đầu.');
    const bytes=await response.arrayBuffer();
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data=await new Response(stream).json();
    if(data.version!==1||!Array.isArray(data.entries)||data.entries.length!==data.count)throw Error('Kho từ không hợp lệ.');
    bankData=data;
    return data;
  }
  )();
  try{
    return await bankPromise;
  }
  catch(error){
    bankPromise=null;
    throw error;
  }
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
    return `<article class="dictionary-row"><button class="dictionary-result" data-action="bank-detail" data-bank="${i}" aria-label="Tra nghĩa ${esc(row[0])}"><strong class="bank-word">${esc(row[0])}</strong>${row[2]?`<span class="bank-pos">${esc(row[2])}</span>`:''}<span class="bank-meaning">${esc(C.bankSummary(row))}</span></button>${speakerSupported?`<button class="round dictionary-sound" data-action="bank-speak" data-bank="${i}" aria-label="Nghe phát âm ${esc(row[0])}">${icon('sound')}</button>`:''}</article>`;
  }).join(''):'<div class="dictionary-empty">Không tìm thấy từ phù hợp. Thử kiểm tra chính tả hoặc nhập nghĩa tiếng Việt.</div>';
  list.scrollTop=bankPendingFocus===null?0:bankScrollTop;
  if(bankPendingFocus!==null){
    const target=utility.querySelector('[data-action="bank-detail"][data-bank="'+bankPendingFocus+'"]')||$('#bank-search');
    target?.focus({preventScroll:true});bankPendingFocus=null;
  }
}
function bankDetail(i){
  const row=bankData?.entries[i];if(!row)return;
  if($('#bank-list'))bankScrollTop=$('#bank-list').scrollTop||0;
  bankReturnIndex=i;
  bankSearchToken++;clearTimeout(bankDebounce);
  const saved=day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(row[0]));
  utility.setAttribute('data-view','bank-detail');
  utility.innerHTML=`<div class="dictionary-header"><button class="round" data-action="bank-back" aria-label="Quay lại kết quả">${icon('back')}</button><span class="tiny muted">Từ điển</span><button class="round" data-action="close-utility" aria-label="Đóng từ điển">${icon('close')}</button></div><div class="dictionary-word-head"><h2 id="utility-title" tabindex="-1">${esc(row[0])}</h2>${row[2]?`<p class="bank-pos">${esc(row[2])}</p>`:''}<button class="btn outline dictionary-pronounce" data-action="bank-speak" data-bank="${i}" ${speakerSupported?'':'disabled'}>${icon('sound')}Nghe phát âm</button>${speakerSupported?'':'<p class="dictionary-speech-note">Trình duyệt này chưa hỗ trợ phát âm.</p>'}</div><ol class="bank-senses">${row[1].split('\n').filter(Boolean).map(meaning=>`<li>${esc(meaning)}</li>`).join('')}</ol><div class="dictionary-save"><details ${saved?'hidden':''}><summary>Sửa nghĩa để lưu vào bộ học</summary><label class="sr-only" for="bank-custom-meaning">Nghĩa lưu vào bộ học</label><textarea id="bank-custom-meaning" maxlength="1000">${esc(C.bankSummary(row))}</textarea></details><button class="btn outline wfull" data-action="bank-save" data-bank="${i}" ${saved?'disabled':''}>${icon(saved?'check':'plus')}${saved?'Đã có trong hôm nay':'Lưu vào hôm nay'}</button></div>`;
  $('#utility-title').focus({preventScroll:true});utility.scrollTop=0;
}
function bankSave(i){
  const row=bankData?.entries[i];if(!row)return;
  if(day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(row[0])))return;
  const vi=$('#bank-custom-meaning')?.value.trim()||'';
  if(!vi||vi.length>1000){toast('Nhập nghĩa từ 1 đến 1.000 ký tự.',null,'',true);return;}
  if(days.reduce((sum,d)=>sum+d.words.length,0)>=50000){toast('Bộ học đã đạt giới hạn 50.000 từ.',null,'',true);return;}
  ensureDay(C.isoToday()).words.push({id:C.uid(),en:row[0],vi,remembered:false});persist();bankChanged=true;
  bankDetail(i);toast('Đã lưu '+row[0]+' vào hôm nay.');
}
function bankAbout(){
  bankReturnIndex=null;
  utility.setAttribute('data-view','bank-about');
  utility.innerHTML=`<div class="dialog-head"><button class="round white" data-action="bank-back" aria-label="Quay lại kho từ">${icon('back')}</button><span class="eyebrow muted">Nguồn dữ liệu</span></div><h2 id="utility-title">Một kho từ.<br>Nhiều cách dùng.</h2><p class="hint">Kho có ${bankData.count.toLocaleString('vi-VN')} mục từ và cụm từ. Độ bao phủ gồm cả thuật ngữ, cách dùng cũ và từ hiếm. Mỗi từ có thể có nhiều nghĩa; hãy xem nghĩa và sửa nội dung thẻ theo ngữ cảnh.</p><div class="note bank-source-links"><strong>Free Vietnamese Dictionary Project — Hồ Ngọc Đức và các cộng tác viên.</strong><br>Copyright (C) 1997–2003 The Free Vietnamese Dictionary Project. Bản đóng gói SQLite: tecxmate/vnme-data v1.0.0, GPL-3.0.<br><a href="https://github.com/tecxmate/vnme-data" target="_blank" rel="noopener noreferrer">Xem nguồn và bản dữ liệu gốc</a><br><br>Bản tích hợp đã trích nghĩa dạng chữ, gộp nghĩa trùng, bỏ mục siêu dữ liệu; chỉ lấy phần gắn nhãn FVDP (GPL), bỏ nguồn AI_Generated_EN.<br><br>Nhãn “Phổ biến” lấy từ danh sách Common Words của Darius Kazemi / Corpora (CC0), có ${bankData.commonCount} mục khớp trong kho. Nhãn này không phải cấp độ CEFR hay danh sách TOEIC chính thức.<br><a href="https://github.com/dariusk/corpora/blob/master/data/words/common.json" target="_blank" rel="noopener noreferrer">Nguồn danh sách từ phổ biến</a><br><br>Dữ liệu phái sinh và bản app kèm kho được phát hành theo GPL-3.0; mã HTML/JS/CSS nằm sẵn trong file. Không có bảo đảm từ điển đầy đủ mọi từ hoặc mọi nghĩa và không có bảo hành.</div><details style="margin-top:20px"><summary style="cursor:pointer;min-height:44px">Xem toàn bộ giấy phép GPL-3.0</summary><pre class="bank-license">${esc(bankData.licenseText||'https://www.gnu.org/licenses/gpl-3.0.html')}</pre></details>`;
  $('#utility-title').setAttribute('tabindex','-1');
  $('#utility-title').focus({
    preventScroll:true
  }
  );
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
  else if(action==='bank-speak'){const row=bankData?.entries[index];if(row)speak(row[0]);}
  else if(action==='bank-save')bankSave(index);
  else if(action==='bank-back'){bankRender({returnTo:bankReturnIndex});bankReturnIndex=null;}
  else if(action==='bank-prev'||action==='bank-next'){bankState.page+=action==='bank-prev'?-1:1;bankRenderResults();}
  else if(action==='bank-reset'){clearTimeout(bankDebounce);bankState.q='';bankState.page=0;bankPendingFocus=null;$('#bank-search').value='';bankRenderResults();$('#bank-search').focus();}
  else if(action==='bank-about'){bankSearchToken++;clearTimeout(bankDebounce);bankAbout();}
});
