/* Shared scheduled review; catalog content remains static and loads only when needed. */
'use strict';
let reviewFilter='due',reviewPageToken=0,reviewPending=Promise.resolve();
function recordReview(word,known){
 ReviewEngine.grade(word,known,C.isoToday());const date=C.isoToday(),item=activity[date]||{reviewed:0,correct:0};item.reviewed++;if(known)item.correct++;activity[date]=item;
 accountDataReview(word,known);
 try{setLearningItem(ACTIVITY_STORE,JSON.stringify(activity));}catch{toast('Chưa lưu được thống kê lượt ôn. Hãy kiểm tra bộ nhớ trình duyệt.',null,'',true);}
}
function renderReviewContent({loading=false,error=false}={}){
 const today=C.isoToday(),due=reviewCount(today),unknown=reviewCount(today,'unknown'),list=reviewQueue(today,reviewFilter);
 app.innerHTML=`<section class="page-head"><div class="eyebrow muted">Ôn tập mỗi ngày</div><h1>Ôn tập</h1><p>Từ theo ngày và các từ chủ đề bạn đã học, cùng một lịch ôn.</p></section>
 <div class="view-grid"><section class="feature-card purple"><div class="eyebrow">Đến lịch ôn</div><strong class="feature-number">${due}</strong><p>Từ chưa nhớ hoặc đã đến ngày ôn lại.</p><button class="btn white" data-action="review-start" data-mode="due" ${due?'':'disabled'}>Bắt đầu ôn ${icon('arrow')}</button></section>
 <section class="feature-card yellow"><div class="eyebrow">Chưa nhớ</div><strong class="feature-number">${unknown}</strong><p>Học lại những từ bạn còn vướng.</p><button class="btn dark" data-action="review-start" data-mode="unknown" ${unknown?'':'disabled'}>Ôn từ chưa nhớ</button></section></div>
 <p class="topic-study-caption">Đã nhớ → ôn sau 1, 3, 7, 14 rồi 30 ngày tính từ mỗi lượt đến lịch. Chưa nhớ → ôn lại hôm nay.</p>
 <div class="filter-row" role="group" aria-label="Lọc hàng chờ ôn">${[['due','Đến lịch'],['unknown','Chưa nhớ'],['all','Tất cả']].map(([value,label])=>`<button class="btn outline small ${reviewFilter===value?'is-active':''}" data-action="review-filter" data-mode="${value}" aria-pressed="${reviewFilter===value}">${label}</button>`).join('')}</div>
 <section class="panel queue-panel"><h2>${list.length} từ trong danh sách</h2>${loading?'<p class="hint" role="status">Đang tải các từ chủ đề đã học…</p>':error?'<p class="hint" role="status">Chưa tải được từ chủ đề. Dữ liệu học vẫn được giữ.</p><button class="btn outline small" data-action="review-retry">Thử lại</button>':''}<div class="review-list">${list.length?list.slice(0,100).map(({word,date,topic,topicTitle})=>`<div class="review-row"><div><strong>${esc(word.en)}</strong><p>${esc(word.vi)}</p></div><small>${!word.remembered?'Cần ôn lại':word.nextReview?'Hẹn '+dateLabel(word.nextReview):'Cần đặt lịch ôn'}<br>${topic?'Chủ đề: '+esc(topicTitle):'Bộ ngày '+dateLabel(date)}</small></div>`).join(''):loading||error?'':'<p class="hint">Chưa có từ trong danh sách này. Các từ đã nhớ vẫn ở mục Tất cả và sẽ trở lại khi đến lịch.</p>'}</div>${list.length>100?'<p class="hint">Đang hiện 100 từ đầu. Lượt học vẫn gồm toàn bộ danh sách.</p>':''}</section>`;
}
function renderReview(){
 const token=++reviewPageToken,hash=location.hash,owner=dataOwner,loading=needsReviewCatalog();renderReviewContent({loading});
 reviewPending=loading?(async()=>{try{await loadReviewCatalog();if(token===reviewPageToken&&location.hash===hash&&dataOwner===owner)renderReviewContent();}catch{if(token===reviewPageToken&&location.hash===hash&&dataOwner===owner)renderReviewContent({error:true});}})():Promise.resolve();
 return reviewPending;
}
function startGlobalReview(mode='due'){
 if(needsReviewCatalog()){
  const token=++reviewPageToken,hash=location.hash,owner=dataOwner;
  reviewPending=(async()=>{try{await loadReviewCatalog();if(token===reviewPageToken&&location.hash===hash&&dataOwner===owner)startGlobalReview(mode);}catch{if(token===reviewPageToken&&location.hash===hash&&dataOwner===owner)toast('Chưa tải được từ chủ đề. Hãy thử lại.',null,'',true);}})();return reviewPending;
 }
 if(!reviewQueue(C.isoToday(),mode).length){toast('Chưa có từ phù hợp để ôn.');return;}
 go('#/flip/'+C.isoToday()+'?queue='+mode);
}
function renderGlobalSession(date,mode){
 if(needsReviewCatalog()){
  const token=++reviewPageToken,hash=location.hash,owner=dataOwner;stopSession();if(study.open)study.close();renderReviewContent({loading:true});
  reviewPending=(async()=>{try{await loadReviewCatalog();if(token===reviewPageToken&&location.hash===hash&&dataOwner===owner)renderGlobalSession(date,mode);}catch{if(token===reviewPageToken&&location.hash===hash&&dataOwner===owner)renderReviewContent({error:true});}})();return;
 }
 selected=date;renderReviewContent();
 if(!session||!session.fromReview||session.reviewFilter!==mode){
  stopSession();const list=reviewQueue(C.isoToday(),mode);if(!list.length){go('#/review');toast('Bạn đã ôn xong danh sách này.');return;}
  createSession('flip',date,false);session.words=list.map(({date,word})=>({...word,_date:date}));session.fromReview=true;session.reviewFilter=mode;session.reversed=preferences.reverse;
 }
 renderFlip();updateNav('review');if(!study.open){focusBeforeStudy=document.activeElement;study.showModal();}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
 if(button.dataset.action==='review-start')startGlobalReview(button.dataset.mode);
 if(button.dataset.action==='review-filter'){reviewFilter=button.dataset.mode;renderReview();}
 if(button.dataset.action==='review-retry')route();
});
