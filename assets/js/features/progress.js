/* Statistics are generated from saved reviews, never from sample/fake chart values. */
'use strict';
function renderProgress() {
  const today=C.isoToday(),todayStats=activity[today]||{reviewed:0,correct:0};
  const total=days.reduce((n,d)=>n+d.words.length,0),known=days.reduce((n,d)=>n+remembered(d),0);
  const week=Array.from({length:7},(_,i)=>ReviewEngine.addDays(today,i-6));
  const max=Math.max(1,...week.map(date=>activity[date]?.reviewed||0));
  const month=Array.from({length:28},(_,i)=>ReviewEngine.addDays(today,i-27));
  const pct=Math.min(100,Math.round(todayStats.reviewed/preferences.goal*100));
  app.innerHTML=`<section class="page-head"><div class="eyebrow muted">Nhìn lại những gì đã học</div><h1>Tiến độ</h1><p>Thống kê lượt ôn được ghi từ phiên bản này trên thiết bị hiện tại.</p></section>
  <div class="stats-grid"><div class="feature-card blue"><span class="eyebrow">Vốn từ đã lưu</span><strong>${total}</strong></div><div class="feature-card mint"><span class="eyebrow">Đã nhớ</span><strong>${known}</strong></div><div class="feature-card yellow"><span class="eyebrow">Chuỗi ngày ôn</span><strong>${ReviewEngine.streak(activity,today)}</strong></div><div class="feature-card orange"><span class="eyebrow">Lượt ôn hôm nay</span><strong>${todayStats.reviewed}</strong></div></div>
  <div class="view-grid"><section class="panel progress-panel"><h2>Mục tiêu hôm nay</h2><p class="goal-value">${todayStats.reviewed} / ${preferences.goal} lượt ôn</p><div class="progress" role="progressbar" aria-label="Mục tiêu lượt ôn hôm nay" aria-valuenow="${Math.min(todayStats.reviewed,preferences.goal)}" aria-valuemin="0" aria-valuemax="${preferences.goal}"><span style="width:${pct}%"></span></div><p>${todayStats.reviewed?Math.round(todayStats.correct/todayStats.reviewed*100)+'% lượt đánh dấu đã nhớ':'Chưa có lượt ôn hôm nay.'}</p><a href="#/review" class="btn purple">Đến mục ôn tập</a></section>
  <section class="panel progress-panel"><h2>7 ngày gần đây</h2><div class="weekly-bars" role="img" aria-label="Lượt ôn 7 ngày: ${week.map(date=>dateLabel(date)+': '+(activity[date]?.reviewed||0)).join('; ')}">${week.map(date=>{const n=activity[date]?.reviewed||0;return`<div><span>${n}</span><i style="height:${n?Math.max(4,n/max*110):3}px"></i><small>${date.slice(8)}</small></div>`;}).join('')}</div></section></div>
  <section class="panel progress-panel"><h2>28 ngày gần đây</h2><div class="activity-grid">${month.map(date=>{const n=activity[date]?.reviewed||0;return`<div class="activity-day ${n?'has-activity':''}" title="${dateLabel(date)}: ${n} lượt ôn" aria-label="${dateLabel(date)}: ${n} lượt ôn"><span>${date.slice(8)}</span><small>${n}</small></div>`;}).join('')}</div></section>`;
}
