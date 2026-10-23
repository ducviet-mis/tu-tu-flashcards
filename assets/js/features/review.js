/* Global queue and spaced review. The queue spans all saved days. */
'use strict';
let reviewFilter = 'due';
function recordReview(word, known) {
  ReviewEngine.grade(word, known, C.isoToday());
  const date = C.isoToday();
  const item = activity[date] || { reviewed: 0, correct: 0 };
  item.reviewed++; if (known) item.correct++;
  activity[date] = item;
  accountDataReview(word,known);
  try { setLearningItem(ACTIVITY_STORE, JSON.stringify(activity)); }
  catch { toast('Chưa lưu được thống kê lượt ôn. Hãy kiểm tra bộ nhớ trình duyệt.', null, '', true); }
}
function renderReview() {
  const today = C.isoToday(), due = ReviewEngine.queue(days, today), unknown = ReviewEngine.queue(days, today, 'unknown');
  const list = ReviewEngine.queue(days, today, reviewFilter);
  app.innerHTML = `<section class="page-head"><div class="eyebrow muted">Ôn tập mỗi ngày</div><h1>Ôn tập</h1><p>Các từ của tất cả các ngày được gom về một chỗ.</p></section>
  <div class="view-grid"><section class="feature-card purple"><div class="eyebrow">Đến lịch ôn</div><strong class="feature-number">${due.length}</strong><p>Từ mới, từ chưa nhớ hoặc đã đến ngày ôn lại.</p><button class="btn white" data-action="review-start" data-mode="due" ${due.length ? '' : 'disabled'}>Bắt đầu ôn ${icon('arrow')}</button></section>
  <section class="feature-card yellow"><div class="eyebrow">Chưa nhớ</div><strong class="feature-number">${unknown.length}</strong><p>Dành thêm một lượt cho những từ còn vướng.</p><button class="btn dark" data-action="review-start" data-mode="unknown" ${unknown.length ? '' : 'disabled'}>Ôn từ chưa nhớ</button></section></div>
  <div class="filter-row" role="group" aria-label="Lọc hàng chờ ôn">${[['due','Đến lịch'],['unknown','Chưa nhớ'],['all','Tất cả']].map(([value,label])=>`<button class="btn outline small ${reviewFilter===value?'is-active':''}" data-action="review-filter" data-mode="${value}" aria-pressed="${reviewFilter===value}">${label}</button>`).join('')}</div>
  <section class="panel queue-panel"><h2>${list.length} từ trong danh sách</h2><div class="review-list">${list.length ? list.slice(0,100).map(({word,date})=>`<div class="review-row"><div><strong>${esc(word.en)}</strong><p>${esc(word.vi)}</p></div><small>${!word.remembered?'Cần ôn lại':word.nextReview?'Hẹn '+dateLabel(word.nextReview):'Chưa có lịch'}<br>Bộ ngày ${dateLabel(date)}</small></div>`).join('') : '<p class="hint">Chưa có từ trong danh sách này. Thêm từ mới hoặc quay lại sau.</p>'}</div>${list.length>100?'<p class="hint">Đang hiện 100 từ đầu. Lượt học vẫn gồm toàn bộ danh sách.</p>':''}</section>`;
}
function startGlobalReview(mode = 'due') {
  if (!ReviewEngine.queue(days, C.isoToday(), mode).length) { toast('Chưa có từ phù hợp để ôn.'); return; }
  go('#/flip/' + C.isoToday() + '?queue=' + mode);
}
function renderGlobalSession(date, mode) {
  selected = date;
  renderBase();
  if (!session || !session.fromReview || session.reviewFilter !== mode) {
    stopSession();
    const list = ReviewEngine.queue(days, C.isoToday(), mode);
    if (!list.length) { go('#/review'); toast('Bạn đã ôn xong danh sách này.'); return; }
    createSession('flip', date, false);
    session.words = list.map(({date,word})=>({...word,_date:date}));
    session.fromReview = true; session.reviewFilter = mode;
    session.reversed = preferences.reverse;
  }
  renderFlip();
  if (!study.open) { focusBeforeStudy = document.activeElement; study.showModal(); }
}
document.addEventListener('click', event => {
  const button=event.target.closest('[data-action]'); if(!button||button.disabled)return;
  if(button.dataset.action==='review-start')startGlobalReview(button.dataset.mode);
  if(button.dataset.action==='review-filter'){reviewFilter=button.dataset.mode;renderReview();}
});
