// features/autocomplete.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
let suggestionIndex=null,suggestionRows=[],suggestionActive=-1,suggestionTimer=null,suggestionToken=0,suggestionAutoMeaning=null;
function closeSuggestions(){
  clearTimeout(suggestionTimer);
  suggestionToken++;
  suggestionRows=[];
  suggestionActive=-1;
  const list=$('#word-suggestions'),input=$('#english');
  if(list)list.hidden=true;
  if(input){
    input.setAttribute('aria-expanded','false');
    input.removeAttribute?.('aria-activedescendant');
  }
}
function showSuggestionStatus(message){
  const panel=$('#word-suggestions'),input=$('#english');
  if(!panel||!input)return;
  panel.hidden=false;
  input.setAttribute('aria-expanded','true');
  $('#suggestion-status').textContent=message;
  $('#suggestion-list').innerHTML='';
}
async function updateSuggestions(){
  const input=$('#english'),query=input?.value.trim();
  if(!query||document.activeElement!==input){
    closeSuggestions();
    return;
  }
  const token=++suggestionToken;
  if(!bankData)showSuggestionStatus('Đang mở kho từ để gợi ý…');
  try{
    const data=await loadBank();
    if(token!==suggestionToken||input!==$('#english')||document.activeElement!==input||input.value.trim()!==query)return;
    if(!suggestionIndex)suggestionIndex=C.bankSuggestionIndex(data.entries);
    suggestionRows=C.bankSuggestions(data.entries,suggestionIndex,query,12);
    suggestionActive=-1;
    if(!suggestionRows.length){
      closeSuggestions();
      return;
    }
    showSuggestionStatus('Gợi ý từ kho · '+suggestionRows.length+' Từ');
    $('#suggestion-list').innerHTML=suggestionRows.map((idx,i)=>{
      const row=data.entries[idx];
      return`<button type="button" class="suggestion-option" id="suggestion-${i}" role="option" aria-selected="false" data-suggest="${i}"><strong>${esc(row[0])}</strong><span>${esc(C.bankSummary(row))}</span></button>`;
    }
    ).join('');
  }
  catch(e){
    if(token!==suggestionToken)return;
    showSuggestionStatus('Chưa mở được gợi ý. Bạn vẫn có thể nhập từ và nghĩa thủ công.');
  }
}
function chooseSuggestion(position){
  const idx=suggestionRows[position],row=bankData?.entries[idx];
  if(!row)return;
  const input=$('#english'),meaning=$('#vietnamese');
  if(!input||!meaning)return;
  input.value=row[0];
  meaning.value=C.bankSummary(row);
  suggestionAutoMeaning=meaning.value;
  closeSuggestions();
  meaning.focus();
}
app.addEventListener('input',e=>{
  if(e.target.id!=='english')return;
  const meaning=$('#vietnamese');
  if(suggestionAutoMeaning!==null&&meaning?.value===suggestionAutoMeaning)meaning.value='';
  suggestionAutoMeaning=null;
  closeSuggestions();
  if(e.target.value.trim())suggestionTimer=setTimeout(updateSuggestions,120);
}
);
app.addEventListener('focusin',e=>{
  if(e.target.id==='english'&&e.target.value.trim())suggestionTimer=setTimeout(updateSuggestions,120);
}
);
app.addEventListener('focusout',e=>{
  if(e.target.id==='english'||e.target.closest?.('#word-suggestions'))setTimeout(()=>{
    const active=document.activeElement;
    if(active?.id!=='english'&&!active?.closest?.('#word-suggestions'))closeSuggestions();
  }
  ,150);
}
);
app.addEventListener('click',e=>{
  const button=e.target.closest?.('[data-suggest]');
  if(button){
    e.preventDefault();
    chooseSuggestion(Number(button.dataset.suggest));
  }
}
);
app.addEventListener('keydown',e=>{
  if(e.target.id!=='english'||e.isComposing)return;
  const key=e.key||e.code;
  if(key==='Escape'){
    closeSuggestions();
    return;
  }
  if(!suggestionRows.length||$('#word-suggestions')?.hidden)return;
  if(key==='ArrowDown'||key==='ArrowUp'){
    e.preventDefault();
    suggestionActive=(suggestionActive+(key==='ArrowDown'?1:-1)+suggestionRows.length)%suggestionRows.length;
    $('#english').setAttribute('aria-activedescendant','suggestion-'+suggestionActive);
    $('#suggestion-list').querySelectorAll('[data-suggest]').forEach((b,i)=>{
      b.setAttribute('aria-selected',String(i===suggestionActive));
      if(i===suggestionActive)b.scrollIntoView?.({
        block:'nearest'
      }
      );
    }
    );
  }
  else if(key==='Enter'){
    e.preventDefault();
    chooseSuggestion(suggestionActive<0?0:suggestionActive);
  }
}
);
document.addEventListener('click',e=>{
  if(!e.target.closest?.('.autocomplete-field'))closeSuggestions();
}
);
