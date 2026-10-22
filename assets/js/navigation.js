/* Hash routes work under /repository/ and do not require server redirects. */
'use strict';
function updateNav(page='days'){document.querySelectorAll('[data-nav]').forEach(link=>{const active=link.dataset.nav===page;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute?.('aria-current');});}
function route(){
  const page=(location.hash||'#/').split('/')[1]?.split('?')[0];
  if(['review','progress','settings'].includes(page)){
    closeSuggestions();if(study.open)study.close();stopSession();$('#shell').classList.remove('mobile-day');
    if(page==='review')renderReview();if(page==='progress')renderProgress();if(page==='settings')renderSettings();updateNav(page);return;
  }
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  if(page==='flip'&&params.has('queue')){
    const date=location.hash.split('/')[2]?.split('?')[0],mode=params.get('queue');
    if(C.validDate(date)&&['due','unknown','all'].includes(mode)){renderGlobalSession(date,mode);updateNav('review');return;}
  }
  routeDay();updateNav('days');
}
