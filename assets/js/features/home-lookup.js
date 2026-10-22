/* Live home lookup shares the dictionary data and opens the same word detail view. */
'use strict';
let homeLookupTimer=null,homeLookupToken=0,homeLookupRows=[],homeLookupActive=-1;
function homeLookupMarkup(){
  return `<div class="home-lookup-wrap"><form id="home-lookup-form" class="home-lookup" role="search"><label class="sr-only" for="home-lookup">Tra từ tiếng Anh hoặc nghĩa tiếng Việt</label>${icon('search')}<input id="home-lookup" name="lookup" type="search" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="home-lookup-options" aria-expanded="false" placeholder="Gặp từ lạ? Tra ở đây" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" maxlength="200"><button type="submit" aria-label="Tra từ">${icon('arrow')}</button></form><div id="home-lookup-suggestions" class="home-lookup-suggestions" hidden><p id="home-lookup-status" class="home-lookup-status" role="status" aria-live="polite"></p><div id="home-lookup-options" role="listbox" aria-label="Gợi ý tra từ"></div><button type="button" class="home-lookup-all" data-action="home-lookup-all">Xem tất cả kết quả ${icon('arrow')}</button></div></div>`;
}
function closeHomeSuggestions(){
  clearTimeout(homeLookupTimer);homeLookupToken++;homeLookupRows=[];homeLookupActive=-1;
  const panel=$('#home-lookup-suggestions'),input=$('#home-lookup');
  if(panel)panel.hidden=true;
  if(input){input.setAttribute('aria-expanded','false');input.setAttribute('aria-activedescendant','');}
}
function homeLookupStatus(message,busy=false){
  const panel=$('#home-lookup-suggestions'),input=$('#home-lookup');if(!panel||!input)return;
  panel.hidden=false;input.setAttribute('aria-expanded','true');
  $('#home-lookup-status').textContent=message;$('#home-lookup-options').setAttribute('aria-busy',String(busy));
}
function renderHomeSuggestions(indices,query){
  const selected=homeLookupRows[homeLookupActive];
  homeLookupRows=indices;homeLookupActive=indices.indexOf(selected);
  $('#home-lookup').setAttribute('aria-activedescendant',homeLookupActive<0?'':'home-lookup-option-'+homeLookupActive);
  $('#home-lookup-options').innerHTML=indices.map((idx,i)=>{
    const row=bankData.entries[idx];
    return `<button type="button" class="home-lookup-option" id="home-lookup-option-${i}" role="option" aria-selected="${i===homeLookupActive}" data-action="home-lookup-suggest" data-position="${i}"><strong>${esc(row[0])}</strong><span>${esc(C.bankSummary(row,query))}</span></button>`;
  }).join('');
  homeLookupStatus(indices.length?'Gợi ý từ kho':'Chưa tìm thấy từ phù hợp. Thử cách viết khác.');
}
async function updateHomeSuggestions(){
  const input=$('#home-lookup'),query=input?.value.trim();
  if(!query||document.activeElement!==input||utility.open)return;
  const token=++homeLookupToken;
  const active=()=>token===homeLookupToken&&input===$('#home-lookup')&&input.value.trim()===query&&document.activeElement===input&&!utility.open;
  homeLookupStatus(bankData?'Đang tìm…':'Đang mở kho từ…',true);
  try{
    const data=await loadBank();if(!active())return;
    suggestionIndex ||= C.bankSuggestionIndex(data.entries);
    const prefixes=C.bankSuggestions(data.entries,suggestionIndex,query,6);
    if(prefixes.length)renderHomeSuggestions(prefixes,query);
    if(prefixes.length===6)return;
    // Prefixes appear immediately; scan Vietnamese meanings in short, cancellable batches.
    const job=C.bankQuery(data.entries,{q:query,kind:'all',mode:'both',size:6});
    const step=()=>{
      if(!active())return;
      const started=performance.now();let done=false;
      do{done=job.step(1500);}while(!done&&performance.now()-started<8);
      if(done)renderHomeSuggestions([...new Set([...prefixes,...job.result().indices])].slice(0,6),query);
      else requestAnimationFrame(step);
    };
    step();
  }catch{
    if(active())homeLookupStatus('Chưa tải được gợi ý. Bấm Tra từ để thử lại.');
  }
}
function scheduleHomeSuggestions(event){
  if(event.target.id!=='home-lookup')return;
  closeHomeSuggestions();$('#home-lookup-options').innerHTML='';
  if(event.target.value.trim()&&!event.isComposing)homeLookupTimer=setTimeout(updateHomeSuggestions,150);
}
async function openHomeLookup(query){
  query=query.trim();closeHomeSuggestions();if(!query){$('#home-lookup')?.focus();return;}
  bankState.q=query;bankState.page=0;await bankOpen();
}
async function chooseHomeSuggestion(position){
  const index=homeLookupRows[position],row=bankData?.entries[index];if(!row)return;
  $('#home-lookup').value=row[0];await openHomeLookup(row[0]);
  if(utility.open&&utility.getAttribute('data-view')==='bank'&&bankState.q===row[0])bankDetail(index);
}
app.addEventListener('input',scheduleHomeSuggestions);
app.addEventListener('compositionend',scheduleHomeSuggestions);
app.addEventListener('focusin',event=>{
  if(event.target.id==='home-lookup'&&event.target.value.trim()){
    clearTimeout(homeLookupTimer);homeLookupTimer=setTimeout(updateHomeSuggestions,150);
  }
});
app.addEventListener('focusout',event=>{
  if(!event.target.closest?.('.home-lookup-wrap'))return;
  setTimeout(()=>{if(!document.activeElement?.closest?.('.home-lookup-wrap'))closeHomeSuggestions();},150);
});
app.addEventListener('keydown',event=>{
  if(event.target.id!=='home-lookup'||event.isComposing)return;
  const key=event.key||event.code;
  if(key==='Escape'){event.preventDefault();closeHomeSuggestions();return;}
  if(!homeLookupRows.length||$('#home-lookup-suggestions')?.hidden)return;
  if(key==='ArrowDown'||key==='ArrowUp'){
    event.preventDefault();
    homeLookupActive=homeLookupActive<0?(key==='ArrowDown'?0:homeLookupRows.length-1):(homeLookupActive+(key==='ArrowDown'?1:-1)+homeLookupRows.length)%homeLookupRows.length;
    event.target.setAttribute('aria-activedescendant','home-lookup-option-'+homeLookupActive);
    $('#home-lookup-options').querySelectorAll('[role="option"]').forEach((option,i)=>{
      option.setAttribute('aria-selected',String(i===homeLookupActive));if(i===homeLookupActive)option.scrollIntoView?.({block:'nearest'});
    });
  }else if(key==='Enter'&&homeLookupActive>=0){event.preventDefault();chooseHomeSuggestion(homeLookupActive);}
});
app.addEventListener('submit',event=>{
  if(event.target.id!=='home-lookup-form')return;event.preventDefault();openHomeLookup($('#home-lookup').value);
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(button?.dataset.action==='home-lookup-suggest')chooseHomeSuggestion(Number(button.dataset.position));
  else if(button?.dataset.action==='home-lookup-all')openHomeLookup($('#home-lookup').value);
  else if(button?.dataset.action==='home-lookup-recent')openHomeLookup(button.dataset.lookup);
  if(!event.target.closest?.('.home-lookup-wrap'))closeHomeSuggestions();
});
