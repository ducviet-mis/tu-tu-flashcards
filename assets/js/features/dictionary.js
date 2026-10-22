// features/dictionary.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
let bankData=null,bankPromise=null,bankToken=0,bankDebounce=null,bankSearchToken=0,bankReturnIndex=null,bankPendingFocus=null;
const bankState={
  q:'',kind:'common',mode:'en',page:0,size:30
}
,bankSelected=new Set(),bankMeanings=new Map();
let bankVisible=[];
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
async function bankOpen(){
  bankReturnIndex=null;
  const token=++bankToken;
  utilityOpen(utilityHeader('Kho từ có sẵn.','371.705 mục từ & cụm từ')+'<div class="bank-loading"><div>Đang mở kho từ...<br><span class="tiny">Lần đầu cần mạng để tải; các lần sau dùng bản đã lưu.</span></div></div>');
  utility.classList.add('bank-dialog');
  utility.setAttribute('data-view','bank');
  try{
    await loadBank();
    if(utility.open&&utility.getAttribute('data-view')==='bank'&&token===bankToken)bankRender();
  }
  catch(e){
    if(utility.open&&token===bankToken)utility.innerHTML=utilityHeader('Chưa mở được kho.')+'<p class="hint">'+esc(e.message)+'</p>';
    toast(e.message,null,'',true);
  }
}
function bankRender({
  returnTo=null
}
={
}
){
  bankPendingFocus=returnTo;
  utility.classList.add('bank-dialog');
  utility.setAttribute('data-view','bank');
  utility.innerHTML=utilityHeader('Tìm từ mới.<br>Chọn từ muốn nhớ.',bankData.count.toLocaleString('vi-VN')+' Mục từ & cụm từ')+`<p class="hint">Chọn từ để học trong hôm nay. Mỗi lượt tối đa 200 từ. Bấm <strong>Xem nghĩa</strong> để đọc các nghĩa và chọn nội dung phù hợp cho thẻ.</p><label class="search bank-search"><span class="sr-only">Tìm trong kho từ</span>${icon('search')}<input id="bank-search" type="search" placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt..." value="${esc(bankState.q)}" autocomplete="off"></label><div class="bank-tools"><div><label class="field-label" for="bank-kind">Bộ lọc</label><select id="bank-kind"><option value="all" ${bankState.kind==='all'?'selected':''}>Tất cả ${bankData.count.toLocaleString('vi-VN')} mục từ</option><option value="common" ${bankState.kind==='common'?'selected':''}>Từ phổ biến (${bankData.commonCount})</option><option value="single" ${bankState.kind==='single'?'selected':''}>Từ đơn</option><option value="phrase" ${bankState.kind==='phrase'?'selected':''}>Cụm từ</option></select></div><div><label class="field-label" for="bank-mode">Tìm theo</label><select id="bank-mode"><option value="en" ${bankState.mode==='en'?'selected':''}>Tiếng Anh</option><option value="vi" ${bankState.mode==='vi'?'selected':''}>Nghĩa tiếng Việt</option></select></div></div><div class="bank-toolbar"><span class="eyebrow muted" id="bank-results-count" role="status"></span><div class="row" style="gap:7px"><button class="btn outline small" data-action="bank-pick-page">Chọn trang này</button><button class="btn outline small" data-action="bank-suggest">Gợi ý 10 từ</button></div></div><div class="bank-list" id="bank-list"></div><div class="bank-pager"><button class="round" data-action="bank-prev" id="bank-prev" aria-label="Trang từ trước">${icon('back')}</button><span class="eyebrow muted" id="bank-page-label"></span><button class="round" data-action="bank-next" id="bank-next" aria-label="Trang từ tiếp theo">${icon('arrow')}</button></div><div class="bank-bottom"><button class="btn outline" data-action="bank-clear">Bỏ chọn</button><button class="btn purple" data-action="bank-add" id="bank-add" disabled>Thêm 0 từ vào hôm nay</button></div><button class="bank-info-link" data-action="bank-about">Nguồn từ điển, giấy phép & lưu ý về nghĩa</button>`;
  bankRenderResults();
  if(returnTo===null||!$('#bank-list')?.querySelector('[data-action="bank-detail"]'))$('#bank-search')?.focus({
    preventScroll:true
  }
  );
}
function bankRenderResults(){
  if(!bankData||!$('#bank-list'))return;
  const token=++bankSearchToken;
  if(bankState.q.trim()&&bankState.kind!=='common'){
    const job=C.bankQuery(bankData.entries,{
      ...bankState
    }
    );
    $('#bank-results-count').textContent='Đang tìm trong toàn kho...';
    $('#bank-list').innerHTML='<div class="empty-list">Đang tìm từ phù hợp...</div>';
    $('#bank-list').setAttribute('aria-busy','true');
    bankVisible=[];
    $('#bank-prev').disabled=true;
    $('#bank-next').disabled=true;
    const step=()=>{
      if(token!==bankSearchToken||!utility.open||utility.getAttribute('data-view')!=='bank')return;
      const started=performance.now();
      let done=false;
      do{
        done=job.step(2000);
      }
      while(!done&&performance.now()-started<8);
      if(done)bankApplyResults(job.result());
      else requestAnimationFrame(step);
    }
    ;
    step();
  }
  else bankApplyResults(C.bankSearch(bankData.entries,bankState));
}
function bankApplyResults(result){
  if(!$('#bank-list'))return;
  $('#bank-list').setAttribute('aria-busy','false');
  bankState.page=result.page;
  bankVisible=result.indices;
  const existing=new Set(day(C.isoToday()).words.map(w=>C.wordKey(w.en)));
  $('#bank-results-count').textContent=result.total.toLocaleString('vi-VN')+' Kết quả';
  $('#bank-page-label').textContent=(result.page+1)+' / '+result.pages;
  $('#bank-prev').disabled=result.page===0;
  $('#bank-next').disabled=result.page>=result.pages-1;
  $('#bank-list').innerHTML=result.indices.length?result.indices.map(i=>{
    const r=bankData.entries[i],known=existing.has(C.wordKey(r[0])),meaning=bankMeanings.get(i)||C.bankSummary(r);
    if(known)bankSelected.delete(i);
    return `<div class="bank-row"><div><label class="bank-pick"><input type="checkbox" data-bank="${i}" ${bankSelected.has(i)?'checked':''} ${known?'disabled':''} aria-label="Chọn từ ${esc(r[0])}"><span><span class="bank-word">${esc(r[0])}</span><span class="bank-pos">${esc(r[2]||'Từ / cụm từ')}${r[3]?' · phổ biến':''}</span></span></label><p class="bank-meaning">${esc(meaning)}</p>${known?'<span class="bank-known">Đã có trong hôm nay</span>':''}</div><button class="btn outline small" data-action="bank-detail" data-bank="${i}">Xem nghĩa</button></div>`;
  }
  ).join(''):'<div class="empty-list">Chưa có kết quả. Thử đổi bộ lọc sang Tất cả hoặc đổi cách tìm Anh / Việt.</div>';
  $('#bank-list').scrollTop=0;
  bankUpdateSelection();
  if(bankPendingFocus!==null){
    utility.querySelector('[data-action="bank-detail"][data-bank="'+bankPendingFocus+'"]')?.focus({
      preventScroll:true
    }
    );
    bankPendingFocus=null;
  }
}
function bankUpdateSelection(){
  const b=$('#bank-add');
  if(b){
    b.disabled=!bankSelected.size;
    b.textContent='Thêm '+bankSelected.size+' Từ vào hôm nay';
  }
}
function bankSelect(i,checked=true){
  if(!bankData?.entries[i])return;
  if(checked){
    if(bankSelected.size>=200&&!bankSelected.has(i)){
      toast('Mỗi lượt chọn tối đa 200 từ.');
      return;
    }
    if(day(C.isoToday()).words.some(w=>C.wordKey(w.en)===C.wordKey(bankData.entries[i][0])))return;
    bankSelected.add(i);
  }
  else bankSelected.delete(i);
  bankUpdateSelection();
}
function bankDetail(i){
  bankReturnIndex=i;
  const r=bankData?.entries[i];
  if(!r)return;
  utility.innerHTML=`<div class="dialog-head"><button class="round white" data-action="bank-back" aria-label="Quay lại kho từ">${icon('back')}</button><span class="eyebrow muted">Các nghĩa trong từ điển</span>${speakerSupported?`<button class="round" data-action="bank-speak" data-bank="${i}" aria-label="Nghe phát âm ${esc(r[0])}">${icon('sound')}</button>`:''}</div><h2 id="utility-title" style="overflow-wrap:anywhere">${esc(r[0])}</h2><p class="hint">${esc(r[2]||'Từ / cụm từ')} · Chọn nghĩa theo ngữ cảnh bạn muốn học. Dòng ghi “cụm” thuộc ngữ cảnh của cụm tương ứng.</p><ol class="bank-senses">${r[1].split('\n').map(t=>'<li>'+esc(t)+'</li>').join('')}</ol><label class="field-label" for="bank-custom-meaning">Nghĩa sẽ đưa lên flashcard (có thể sửa)</label><textarea id="bank-custom-meaning" maxlength="1000" style="min-height:110px">${esc(bankMeanings.get(i)||C.bankSummary(r))}</textarea><button class="btn purple wfull" style="margin-top:18px" data-action="bank-use-meaning" data-bank="${i}">Chọn từ với nghĩa này</button>`;
  utility.setAttribute('data-view','bank-detail');
  $('#utility-title').setAttribute('tabindex','-1');
  $('#utility-title').focus({
    preventScroll:true
  }
  );
}
function bankAdd(){
  if(!bankSelected.size)return;
  const target=C.isoToday(),d=day(target),keys=new Set(d.words.map(w=>C.wordKey(w.en))),newWords=[];
  let skipped=0;
  for(const i of bankSelected){
    const row=bankData.entries[i],en=row[0],key=C.wordKey(en);
    if(keys.has(key)){
      skipped++;
      continue;
    }
    const vi=(bankMeanings.get(i)||C.bankSummary(row)).trim();
    if(!vi||vi.length>1000)continue;
    newWords.push({
      id:C.uid(),en,vi,remembered:false
    }
    );
    keys.add(key);
  }
  const total=days.reduce((n,d)=>n+d.words.length,0);
  if(total+newWords.length>50000){
    toast('Bộ thẻ cá nhân hỗ trợ tối đa 50.000 từ. Hãy sao lưu và giảm số từ trước khi thêm.',null,'',true);
    return;
  }
  if(newWords.length)ensureDay(target).words.push(...newWords);
  persist();
  bankSelected.clear();
  utility.close();
  selected=target;
  go('#/day/'+target);
  toast('Đã thêm '+newWords.length+' từ vào hôm nay.'+(skipped?' Bỏ qua '+skipped+' từ trùng.':''));
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
utility.addEventListener('input',e=>{
  if(e.target.id==='bank-search'){
    bankState.q=e.target.value;
    bankState.page=0;
    bankSearchToken++;
    clearTimeout(bankDebounce);
    bankDebounce=setTimeout(()=>{
      if(utility.open&&utility.getAttribute('data-view')==='bank')bankRenderResults();
    }
    ,180);
  }
}
);
utility.addEventListener('change',e=>{
  if(e.target.dataset.bank!==undefined){
    const i=Number(e.target.dataset.bank);
    bankSelect(i,e.target.checked);
    e.target.checked=bankSelected.has(i);
  }
  else if(e.target.id==='bank-kind'||e.target.id==='bank-mode'){
    bankState[e.target.id==='bank-kind'?'kind':'mode']=e.target.value;
    bankState.page=0;
    bankRenderResults();
  }
}
);
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');
  if(!b||b.disabled)return;
  const action=b.dataset.action,i=Number(b.dataset.bank);
  if(action==='bank-open')bankOpen();
  else if(action==='bank-prev'||action==='bank-next'){
    bankState.page+=action==='bank-prev'?-1:1;
    bankRenderResults();
  }
  else if(action==='bank-back'){
    bankRender({
      returnTo:bankReturnIndex
    }
    );
    bankReturnIndex=null;
  }
  else if(action==='bank-detail')bankDetail(i);
  else if(action==='bank-speak')speak(bankData.entries[i][0]);
  else if(action==='bank-use-meaning'){
    const meaning=$('#bank-custom-meaning').value.trim();
    if(!meaning||meaning.length>1000){
      toast('Nhập nghĩa từ 1 đến 1.000 ký tự.',null,'',true);
      return;
    }
    bankMeanings.set(i,meaning);
    bankSelect(i);
    bankRender({
      returnTo:i
    }
    );
  }
  else if(action==='bank-add')bankAdd();
  else if(action==='bank-clear'){
    bankSelected.clear();
    bankRenderResults();
  }
  else if(action==='bank-pick-page'){
    bankVisible.forEach(i=>bankSelect(i));
    bankRenderResults();
  }
  else if(action==='bank-suggest'){
    const existing=new Set(day(C.isoToday()).words.map(w=>C.wordKey(w.en)));
    const available=bankData.entries.flatMap((r,i)=>r[3]&&!existing.has(C.wordKey(r[0]))?[i]:[]);
    C.shuffle(available).slice(0,10).forEach(i=>bankSelect(i));
    bankRenderResults();
    toast('Đã chọn gợi ý. Bạn có thể xem lại hoặc thêm vào hôm nay.');
  }
  else if(action==='bank-about')bankAbout();
}
);
