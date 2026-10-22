/* Hash routes work under /repository/ and do not require server redirects. */
'use strict';
function updateNav(page='home'){
  document.querySelectorAll('[data-nav]').forEach(link=>{const active=link.dataset.nav===page;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute?.('aria-current');});
  document.body.setAttribute('data-page',page);
  const today=C.isoToday(),due=ReviewEngine.queue(days,today).length,streak=ReviewEngine.streak(activity,today);
  if($('#header-date'))$('#header-date').textContent=fullDate(today);
  if($('#header-streak-count'))$('#header-streak-count').textContent=String(streak);
  $('#header-streak')?.setAttribute('aria-label',`Chuỗi ${streak} ngày ôn liên tiếp`);
  if($('#nav-review-count')){$('#nav-review-count').hidden=!due;$('#nav-review-count').textContent=due>99?'99+':String(due);}
}
function route(){
  closeHomeSuggestions();
  const page=(location.hash||'#/').split('/')[1]?.split('?')[0];
  if(['review','progress','settings','notebook'].includes(page)){
    closeSuggestions();if(study.open)study.close();stopSession();$('#shell').classList.remove('mobile-day');
    if(page==='review')renderReview();if(page==='progress')renderProgress();if(page==='settings')renderSettings();if(page==='notebook')renderNotebook();lastBase=location.hash;updateNav(page);return;
  }
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  if(page==='flip'&&params.has('queue')){
    const date=location.hash.split('/')[2]?.split('?')[0],mode=params.get('queue');
    if(C.validDate(date)&&['due','unknown','all'].includes(mode)){renderGlobalSession(date,mode);updateNav('review');return;}
  }
  routeDay();updateNav(location.hash.startsWith('#/day/')||['flip','match','result'].includes(page)?'notebook':'home');
}
