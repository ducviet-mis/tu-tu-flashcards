/* V3 home and notebook use the same saved words, dictionary and review queue. */
'use strict';
const LOOKUP_HISTORY_STORE='tutu.recent-lookups.v1';
let recentLookups=[];
try{
  const saved=JSON.parse(getLearningItem(LOOKUP_HISTORY_STORE)||'[]');
  if(Array.isArray(saved))recentLookups=[...new Set(saved.filter(word=>typeof word==='string'&&word.trim()&&word.length<=200).map(word=>word.trim().normalize('NFC')))].slice(0,8);
}catch{/* Lookup history is optional; personal vocabulary remains independent. */}
function renderLookupHistory(){
  const list=$('#recent-lookups');if(!list)return;
  list.innerHTML=recentLookups.map(word=>`<button class="lookup-chip" data-action="home-lookup-recent" data-lookup="${esc(word)}">${esc(word)}</button>`).join('');
  $('#home-history').hidden=!recentLookups.length;
}
function rememberLookup(word){
  if(!word||word.length>200)return;
  recentLookups=[word,...recentLookups.filter(item=>C.wordKey(item)!==C.wordKey(word))].slice(0,8);
  try{setLearningItem(LOOKUP_HISTORY_STORE,JSON.stringify(recentLookups));}catch{}
  renderLookupHistory();
}
function notebookDayTile(d,index=0,compact=false){
  const today=d.date===C.isoToday(),n=remembered(d),total=d.words.length,pct=total?Math.round(n/total*100):0;
  const color=today?'purple':['orange','blue','yellow','mint'][index%4];
  return `<a href="#/day/${d.date}" class="notebook-day ${color} ${compact?'home-day-row':''}" aria-label="Sổ từ ngày ${esc(fullDate(d.date))}: ${total} từ, đã nhớ ${n}"><div class="notebook-day-top"><span class="notebook-day-date">${dateLabel(d.date)}</span><span class="notebook-day-count">${total} từ</span></div><div class="notebook-day-bottom"><span class="notebook-known"><span class="notebook-known-label">Đã nhớ </span>${n}/${total}</span>${icon('arrow')}</div>${compact?'':`<div class="notebook-day-progress" role="progressbar" aria-label="Tiến độ ngày ${dateLabel(d.date)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`}</a>`;
}
function renderHome(){
  closeHomeSuggestions();closeSuggestions();suggestionAutoMeaning=null;$('#shell').classList.remove('mobile-day');
  const date=C.isoToday(),today=day(date),known=remembered(today),due=reviewCount(date);
  const recent=C.sortDays(days.filter(d=>d.date!==date)).slice(0,3),total=days.reduce((n,d)=>n+d.words.length,0);
  const pct=today.words.length?Math.round(known/today.words.length*100):0;
  app.innerHTML=`<div class="home-layout"><section class="home-lookup-panel" aria-labelledby="home-title"><div class="home-intro"><div class="eyebrow muted">${esc(fullDate(date))}</div><h1 id="home-title">Trang chủ</h1></div>${homeLookupMarkup()}<section id="home-history" class="home-history" aria-label="Các từ vừa tra" hidden><h2>Tra gần đây</h2><div id="recent-lookups" class="lookup-chips"></div></section><div class="home-desktop-note">${mascot()}<p>Tra nghĩa, nghe phát âm.<br>Lưu lại từ bạn muốn nhớ.</p></div></section><section class="home-summary" aria-label="Việc học hôm nay"><a href="#/review" class="home-due"><span class="home-card-label">Ôn hôm nay</span><div><strong data-home-count="due">${due}</strong><span class="home-card-unit"> từ</span></div><span class="home-card-arrow" aria-hidden="true">${icon('arrow')}</span>${mascot()}<span class="home-due-caption">${due?'Đến lịch gặp lại những từ đã lưu.':'Chưa có từ đến lịch ôn.'}</span></a><a href="#/day/${date}" class="home-today"><div><span class="home-card-label">Hôm nay</span><strong>${dateLabel(date)}</strong></div><div class="home-today-progress"><span>${today.words.length} từ · Đã nhớ ${known}</span><div class="notebook-day-progress" role="progressbar" aria-label="Tiến độ hôm nay" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div></div></a></section><section class="home-recent-section" aria-labelledby="home-recent-title"><div class="home-section-heading"><h2 id="home-recent-title">Sổ từ gần đây</h2><a href="#/notebook">Xem tất cả ${icon('arrow')}</a></div>${recent.length?`<div class="home-recent-days">${recent.map((d,i)=>notebookDayTile(d,i,true)).join('')}</div>`:`<div class="home-first-note"><div><h3>${total?'Mỗi ngày, một trang sổ.':'Từ nhỏ hôm nay. Tiến bộ ngày mai.'}</h3><p>${total?'Những sổ từ của các ngày trước sẽ hiện ở đây.':'Lưu từ đầu tiên để bắt đầu sổ từ của bạn.'}</p></div><button class="btn white small" data-action="add-today">${icon('plus')}Thêm từ mới</button>${total?'':'<button class="text-btn" data-action="sample">Thử với từ mẫu</button>'}</div>`}</section></div>`;
  renderLookupHistory();
}
function renderBase(){
  const page=(location.hash||'#/').split('/')[1]?.split('?')[0];
  if(page==='topic'){renderTopicRoute();return;}
  if(['day','flip','match','result'].includes(page))renderDayBase();
  else if(page==='notebook')renderNotebook();
  else if(page==='review')renderReview();
  else if(page==='progress')renderProgress();
  else if(page==='settings')renderSettings();
  else if(page==='account')renderAccount();
  else if(accountPages.includes(page))renderAuth(page);
  else renderHome();
  updateNav(['day','flip','match','result'].includes(page)?'notebook':['notebook','review','progress','settings'].includes(page)?page:'home');
}
