// Test harness mô phỏng DOM tối thiểu. Không thay cho QA trình duyệt hay đo bố cục.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const html=require('./load-app.cjs')();
const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&#10;/g,'\n');
class El{
 constructor(tag,doc,attrs={}){this.tagName=tag.toUpperCase();this.doc=doc;this.attrs=attrs;this.children=[];this.parentElement=null;this.events={};this._text='';this.value=attrs.value||'';this.disabled='disabled'in attrs;this.hidden='hidden'in attrs;this.checked='checked'in attrs;this.open=false;this.type=attrs.type||'';this.files=[];}
 get dataset(){return Object.fromEntries(Object.entries(this.attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,a)=>a.toUpperCase()),v]));}
 get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
 get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
 get classList(){return{contains:x=>this.className.split(' ').includes(x),toggle:(x,value)=>{const set=new Set(this.className.split(' ').filter(Boolean));if(value===undefined)value=!set.has(x);value?set.add(x):set.delete(x);this.className=[...set].join(' ');},add:x=>{this.className+=' '+x;},remove:x=>{this.className=this.className.split(' ').filter(s=>s!==x).join(' ');}};}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 get isConnected(){let el=this;while(el){if(el===this.doc.body)return true;el=el.parentElement;}return false;}
 append(...nodes){for(const node of nodes){if(typeof node==='string'){this._text+=node;continue;}node.parentElement=this;this.children.push(node);}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
 set innerHTML(value){this.children.forEach(c=>c.parentElement=null);this.children=[];this._text='';this._html=value;parse(value,this);}
 get innerHTML(){return this._html||'';}set textContent(t){this.children=[];this._text=String(t);}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 matches(selector){return selector.split(',').some(part=>{const s=part.trim();if(s.includes(' ')&&!s.includes('['))return false;const tag=s.match(/^[a-z]+/i)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;const id=s.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;const cls=[...s.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);if(cls.some(c=>!this.classList.contains(c)))return false;for(const m of s.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){if(!(m[1]in this.attrs)||m[2]!==undefined&&this.attrs[m[1]]!==m[2])return false;}if(s.includes(':checked')&&!this.checked)return false;if(s.includes(':disabled')&&!this.disabled)return false;return true;});}
 querySelectorAll(s){const out=[];const walk=n=>{for(const c of n.children){if(c.matches(s))out.push(c);walk(c);}};walk(this);return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(s){let n=this;while(n){if(n.matches(s))return n;n=n.parentElement;}return null;}
 focus(){this.doc.activeElement=this;}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
 dispatchEvent(e){e.target??=this;e.preventDefault??=()=>{e.defaultPrevented=true;};for(const fn of this.events[e.type]||[])fn(e);if(e.bubbles!==false){if(this.parentElement)this.parentElement.dispatchEvent(e);else if(this!==this.doc.body)this.doc.body.dispatchEvent(e);}}
 click(){if(this.disabled)return;this.focus();this.onclick?.();this.dispatchEvent({type:'click',target:this});if(this.tagName==='A'&&this.href?.startsWith('blob:'))this.doc.downloads.push({name:this.download,blob:this.doc.blobs.get(this.href)});}
 showModal(){this.open=true;(this.querySelector('button')||this).focus();}close(){this.open=false;this.dispatchEvent({type:'close',bubbles:false});}
}
function parse(markup,parent){const stack=[parent];let skipping=false;for(const m of markup.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/g)){const token=m[0];if(token.startsWith('<!--')||token.startsWith('<!'))continue;if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)[1],attrs={};for(const a of token.slice(tag.length+1,-1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[a[1]]=decode(a[2]??a[3]??a[4]??'');const el=new El(tag,parent.doc,attrs);stack.at(-1).append(el);if(!/^(input|link|meta|br|hr|img|source|path)$/i.test(tag)&&!token.endsWith('/>'))stack.push(el);}else stack.at(-1)._text+=decode(token);}}
function environment({map=new Map(),blocked=false,hash='#/',bankRows=null,speech=false}={}){
 const doc={activeElement:null,downloads:[],blobs:new Map()};doc.body=new El('body',doc);doc.documentElement=new El('html',doc);doc.querySelector=s=>doc.body.querySelector(s);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);doc.createElement=s=>new El(s,doc);doc.addEventListener=(...args)=>doc.body.addEventListener(...args);
 parse(html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''),doc.body);
 if(bankRows){const node=new El('script',doc,{id:'dictionary-data'});node.textContent=require('node:zlib').gzipSync(JSON.stringify({version:1,count:bankRows.length,commonCount:bankRows.filter(r=>r[3]).length,entries:bankRows})).toString('base64');doc.body.append(node);}
 const events={},timers=[];let currentHash=hash;
 const location={get hash(){return currentHash;},set hash(v){currentHash=v;for(const fn of events.hashchange||[])fn();}};
 const storage={getItem:k=>{if(blocked)throw Error('blocked');return map.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');map.set(k,v);}};
 const box={document:doc,location,history:{replaceState:(s,t,v)=>{currentHash=v;}},localStorage:storage,crypto:require('node:crypto').webcrypto,URL:class extends URL{static createObjectURL(b){const u='blob:'+doc.blobs.size;doc.blobs.set(u,b);return u;}static revokeObjectURL(){}},URLSearchParams,AbortSignal,Blob,Date,Set,Map,console,Uint8Array,atob,navigator:{},setTimeout:(fn,ms)=>{const id={fn,ms};timers.push(id);return id;},clearTimeout:id=>{if(id)id.cancelled=true;},setInterval:(fn,ms)=>({fn,ms}),clearInterval:()=>{},requestAnimationFrame:fn=>fn(),addEventListener:(n,fn)=>(events[n]??=[]).push(fn),fetch:async(url)=>{if(bankRows&&String(url).includes('data/dictionary.json.gz'))return new Response(require('node:zlib').gzipSync(JSON.stringify({version:1,count:bankRows.length,commonCount:bankRows.filter(r=>r[3]).length,entries:bankRows})));throw Error('No real network in harness');}};
 const spoken=[];if(speech){box.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};box.speechSynthesis={cancel(){},getVoices:()=>[{lang:'en-US'}],speak:utterance=>spoken.push(utterance)};}box.performance=performance;box.Response=Response;box.DecompressionStream=DecompressionStream;box.window=box;vm.createContext(box);const scripts=[...html.matchAll(/<script id="(?:core|application)">([\s\S]*?)<\/script>/g)].map(m=>m[1]);vm.runInContext(scripts[0],box);
 const src=scripts[1].replace('/* QA_EXPORT_POINT */',`globalThis.QA={get days(){return days;},get session(){return session;},get cloud(){return cloud;},getCloudForm,cloudAction,readImport,applyImport,route,renderBase,startStudy,selectCell,answer,flipCard,closeStudy,exportFile,configureCloud,bankOpen,loadBank,get bankData(){return bankData;},bankState,bankSave,renderReview,renderProgress,renderSettings,quickAddOpen,startGlobalReview,get activity(){return activity;},get preferences(){return preferences;}};`);vm.runInContext(src,box);
 return{box,doc,spoken,q:s=>doc.querySelector(s),qa:box.QA,map,click:s=>{const e=doc.querySelector(s);assert.ok(e,'Missing element '+s);e.click();},flush:ms=>{for(const t of timers.splice(0))if(!t.cancelled&&t.ms<=ms)t.fn();},key:code=>doc.body.dispatchEvent({type:'keydown',code,target:doc.activeElement||doc.body})};
}
function demo(){const e=environment();e.click('[data-action="sample"]');return e;}
test('Typing he suggests hello; clicking fills both fields; keyboard selection and manual meanings work',async()=>{
 const e=environment({hash:'#/day/2026-10-22',bankRows:[['hello','xin chào','',1],['help','giúp đỡ','',1],['hero','anh hùng','',0]]});
 await e.qa.loadBank();
 const input=()=>e.q('#english');
 input().focus();input().value='he';input().dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);
 assert.equal(e.q('#word-suggestions').hidden,false);
 assert.match(e.q('#word-suggestions').textContent,/hello/);
 e.click('[data-suggest="0"]');
 assert.equal(input().value,'hello');assert.equal(e.q('#vietnamese').value,'xin chào');
 e.q('#add-form').dispatchEvent({type:'submit'});
 assert.equal(e.qa.days[0].words[0].en,'hello');assert.equal(e.qa.days[0].words[0].vi,'xin chào');
 input().focus();input().value='hel';input().dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);
 input().dispatchEvent({type:'keydown',key:'ArrowDown',code:'ArrowDown'});
 input().dispatchEvent({type:'keydown',key:'Enter',code:'Enter'});
 assert.equal(input().value,'hello');assert.equal(e.q('#vietnamese').value,'xin chào');
 e.q('#vietnamese').value='nghĩa tự sửa';input().focus();input().value='unknownword';input().dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);
 assert.equal(e.q('#vietnamese').value,'nghĩa tự sửa');assert.equal(e.q('#word-suggestions').hidden,true);
});
test('App mở trống, nạp mẫu, thêm qua submit, chặn từ trùng, sửa, tìm kiếm, xóa/hoàn tác',()=>{
 const e=environment();assert.match(e.q('#app').textContent,/Từ nhỏ hôm nay/);e.click('[data-action="sample"]');e.click('[data-action="add-today"]');e.q('#english').value='Testword';e.q('#vietnamese').value='từ kiểm tra';const submit=()=>e.q('#add-form').dispatchEvent({type:'submit'});submit();assert.equal(e.qa.days[0].words.length,9);assert.equal(e.doc.activeElement.id,'english');e.q('#english').value=' testWORD ';e.q('#vietnamese').value='trùng';submit();assert.equal(e.qa.days[0].words.length,9);
 const w=e.qa.days[0].words.at(-1);e.click('[data-action="edit"][data-id="'+w.id+'"]');e.q('#edit-vi').value='đã sửa';e.q('#edit-form').dispatchEvent({type:'submit'});assert.equal(w.vi,'đã sửa');e.q('#word-search').value='testword';e.q('#word-search').dispatchEvent({type:'input'});assert.equal(e.q('#word-list').querySelectorAll('.word-row').length,1);e.click('[data-action="delete"][data-id="'+w.id+'"]');assert.equal(e.qa.days[0].words.length,8);e.doc.querySelectorAll('.toast').at(-1).querySelector('button').click();assert.equal(e.qa.days[0].words.length,9);
});
test('Dán 10 dòng, preview và thêm đủ 10 từ vào ngày',()=>{const e=demo();e.click('[data-action="bulk"]');e.q('#bulk-text').value=['one - một','two – hai','three : ba','four = bốn','five\tnăm','six - sáu','seven – bảy','eight : tám','nine = chín','ten\tmười','sai dòng'].join('\n');e.q('#bulk-text').dispatchEvent({type:'input'});assert.match(e.q('#bulk-count').textContent,/10 Từ/);e.click('[data-action="bulk-add"]');assert.equal(e.qa.days[0].words.length,18);});
test('Lật thẻ bằng click và phím, tự chuyển, đảo chiều, Esc và hash Back',()=>{const e=demo();e.click('[data-action="start-flip"]');e.click('[data-action="flip-card"]');assert.equal(e.qa.session.flipped,true);assert.match(e.q('.flip-card').getAttribute('aria-label'),/lắp ráp/);e.key('ArrowRight');assert.equal(e.qa.session.index,1);e.key('Space');assert.equal(e.qa.session.flipped,true);e.key('ArrowLeft');assert.equal(e.qa.session.index,2);e.click('[data-action="reverse"]');assert.equal(e.qa.session.reversed,true);e.click('[data-action="close-study"]');assert.equal(e.q('#study-dialog').open,false);e.click('[data-action="start-flip"]');e.box.location.hash='#/day/'+e.qa.days[0].date;assert.equal(e.qa.session,null);});
test('Ghép sai nháy viền, ghép đúng có tích, giữ focus và kết quả thời gian',()=>{const e=demo();e.click('[data-action="start-match"]');let s=e.qa.session;let first=0,wrong=s.cells.findIndex((c,i)=>i!==0&&c.pair!==s.cells[0].pair),correct=s.cells.findIndex((c,i)=>i!==0&&c.pair===s.cells[0].pair);const click=i=>e.click('[data-cell="'+i+'"]');click(first);assert.equal(Number(e.doc.activeElement.dataset.cell),first);click(wrong);assert.equal(e.q('#study-dialog').querySelectorAll('.wrong').length,2);e.flush(600);assert.equal(s.busy,false);click(first);click(correct);assert.equal(s.matched.length,1);assert.equal(e.q('#study-dialog').querySelectorAll('.matched').length,2);assert.ok(e.doc.activeElement.matches('.match-cell'));for(const w of s.words){if(s.matched.includes(w.id))continue;const ix=s.cells.flatMap((c,i)=>c.pair===w.id?[i]:[]);click(ix[0]);click(ix[1]);}e.flush(500);assert.equal(e.qa.session.type,'result');assert.match(e.q('.result-card').textContent,/Thời gian hoàn thành/);});
test('Xuất Blob JSON, nhập thay thế/gộp và tải lại mô phỏng cùng localStorage',async()=>{const e=demo();e.qa.exportFile();const out=e.doc.downloads.at(-1);assert.match(out.name,/sao-luu-\d{4}-\d{2}-\d{2}\.json/);const text=await out.blob.text();const before=JSON.stringify(e.qa.days);e.click('[data-action="backup"]');await e.qa.readImport({size:text.length,text:async()=>text});e.q('input[value="replace"]').checked=true;e.q('input[value="merge"]').checked=false;e.qa.applyImport();assert.equal(JSON.stringify(e.qa.days),before);const second=environment({map:e.map});assert.equal(JSON.stringify(second.qa.days),before);});
test('JSON lỗi không làm thay dữ liệu; localStorage bị chặn có cảnh báo',async()=>{const e=demo(),before=JSON.stringify(e.qa.days);e.click('[data-action="backup"]');await e.qa.readImport({size:10,text:async()=>'{bad json'});assert.equal(e.q('#import-btn').disabled,true);assert.equal(JSON.stringify(e.qa.days),before);const blocked=environment({blocked:true});blocked.click('[data-action="sample"]');assert.equal(blocked.q('#storage-warning').hidden,false);assert.match(blocked.q('#storage-warning').textContent,/Chưa lưu được/);});
test('Ngày dưới 3 từ không cho ghép; hoàn thành flip hiện kết quả',()=>{const e=demo();e.qa.days[0].words.splice(2);e.qa.renderBase();e.click('[data-action="start-match"]');assert.equal(e.qa.session,null);e.click('[data-action="start-flip"]');for(let i=0;i<2;i++){e.qa.flipCard();e.qa.answer(i===0);}assert.equal(e.qa.session.type,'result');assert.match(e.q('.score').textContent,/1\/2/);});
test('Undo nhập bị chặn nếu người dùng vừa thêm từ sau lần nhập',async()=>{const e=demo();e.click('[data-action="backup"]');await e.qa.readImport({size:30,text:async()=>JSON.stringify({version:1,days:[]})});e.q('input[value="replace"]').checked=true;e.q('input[value="merge"]').checked=false;e.qa.applyImport();const undo=e.doc.querySelectorAll('.toast').at(-1).querySelector('button');e.click('[data-action="add-today"]');e.q('#english').value='new';e.q('#vietnamese').value='mới';e.q('#add-form').dispatchEvent({type:'submit'});undo.click();assert.equal(e.qa.days[0].words.length,1);assert.equal(e.qa.days[0].words[0].en,'new');});
test('Cấu hình cloud từ chối service_role; RPC push/load mô phỏng đúng và lỗi mạng',async()=>{const e=demo();e.click('[data-action="cloud"]');e.q('#cloud-url').value='https://example.supabase.co';e.q('#cloud-api').value='sb_secret_no';e.q('#cloud-key').value='a'.repeat(64);assert.throws(()=>e.qa.getCloudForm());e.q('#cloud-api').value='sb_publishable_test';let calls=[];e.box.fetch=async(url,req)=>{calls.push({url,req});return{ok:true,json:async()=>({revision:1})};};await e.qa.cloudAction('push');assert.equal(e.qa.cloud.revision,1);assert.match(calls[0].url,/flashcard_save$/);assert.equal(JSON.parse(calls[0].req.body).p_expected_revision,0);e.box.fetch=async()=>({ok:true,json:async()=>({days:JSON.parse(JSON.stringify(e.qa.days)),revision:1})});await e.qa.cloudAction('pull');assert.ok(e.q('#cloud-merge'));e.q('#cloud-merge').click();assert.equal(e.q('#utility-dialog').open,false);});
test('Esc phát cancel đóng học; mã secret JWT và phản hồi cũ bị từ chối',async()=>{const e=demo();e.click('[data-action="start-flip"]');e.q('#study-dialog').dispatchEvent({type:'cancel',bubbles:false});assert.equal(e.q('#study-dialog').open,false);e.click('[data-action="cloud"]');e.q('#cloud-url').value='https://example.supabase.co';e.q('#cloud-key').value='a'.repeat(64);e.q('#cloud-api').value=Buffer.from('{"alg":"HS256"}').toString('base64url')+'.'+Buffer.from('{"role":"service_role"}').toString('base64url')+'.sig';assert.throws(()=>e.qa.getCloudForm());e.q('#cloud-api').value='sb_publishable_test';let resolve;e.box.fetch=()=>new Promise(r=>resolve=r);const pending=e.qa.cloudAction('push');assert.equal(e.q('#cloud-url').disabled,true);e.qa.cloud.key='b'.repeat(64);resolve({ok:true,json:async()=>({revision:99})});await pending;assert.equal(e.qa.cloud.revision,null);assert.equal(e.q('#cloud-url').disabled,false);});
test('Lỗi mạng đồng bộ và xung đột phiên bản giữ nguyên từ trên máy',async()=>{const e=demo();e.click('[data-action="cloud"]');e.q('#cloud-url').value='https://example.supabase.co';e.q('#cloud-key').value='a'.repeat(64);e.q('#cloud-api').value='sb_publishable_test';const before=JSON.stringify(e.qa.days);await e.qa.cloudAction('push');assert.match(e.q('#cloud-status').textContent,/Không kết nối được/);assert.equal(JSON.stringify(e.qa.days),before);e.box.fetch=async()=>({ok:false,status:400,json:async()=>({message:'REVISION_CONFLICT'})});await e.qa.cloudAction('push');assert.match(e.q('#cloud-status').textContent,/Thiết bị khác đã cập nhật/);assert.equal(JSON.stringify(e.qa.days),before);});
test('Hai từ chung nghĩa Việt được ghép bằng bất kỳ ô nghĩa tương đương nào',()=>{const e=demo();for(const w of e.qa.days[0].words)w.vi='cùng nghĩa';e.click('[data-action="start-match"]');const s=e.qa.session,a=s.cells.findIndex(c=>c.lang==='en'),b=s.cells.findIndex(c=>c.lang==='vi'&&c.pair!==s.cells[a].pair);e.click('[data-cell="'+a+'"]');e.click('[data-cell="'+b+'"]');assert.equal(s.matched.length,1);for(const w of s.words){if(s.matched.includes(w.id))continue;const cells=s.cells.flatMap((c,i)=>c.pair===w.id?[i]:[]);e.click('[data-cell="'+cells[0]+'"]');e.click('[data-cell="'+cells[1]+'"]');}assert.equal(s.matched.length,6);});
test('Dictionary searches all words, opens full meanings and plays English pronunciation',async()=>{
 const rows=[['apple','quả táo\ncây táo','danh từ',1],['dock','khấu đuôi\nbến tàu','danh từ',1],['zoo','vườn thú','danh từ',0]];
 const e=environment({bankRows:rows,speech:true});await e.qa.bankOpen();
 assert.equal(e.qa.bankState.kind,'all');assert.equal(e.doc.activeElement.id,'bank-search');
 for(const selector of ['#bank-kind','#bank-mode','[data-action="bank-pick-page"]','[data-action="bank-suggest"]','.bank-bottom','input[type="checkbox"]'])assert.equal(e.q('#utility-dialog').querySelector(selector),null,selector);
 assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,0);
 e.q('#bank-search').value='zoo';e.q('#bank-search').dispatchEvent({type:'input'});e.flush(180);
 assert.match(e.q('#bank-list').textContent,/zoo/);e.click('[data-action="bank-detail"][data-bank="2"]');
 assert.match(e.q('.bank-senses').textContent,/vườn thú/);e.click('[data-action="bank-speak"]');assert.equal(e.spoken[0].text,'zoo');assert.equal(e.spoken[0].lang,'en-US');
 e.click('[data-action="bank-back"]');e.q('#bank-search').value='ben tau';e.q('#bank-search').dispatchEvent({type:'input'});e.flush(180);
 e.click('[data-action="bank-detail"][data-bank="1"]');assert.match(e.q('.bank-senses').textContent,/khấu đuôi/);
 e.q('#bank-custom-meaning').value='bến tàu';e.click('[data-action="bank-save"][data-bank="1"]');
 assert.equal(e.qa.days[0].words[0].en,'dock');assert.equal(e.qa.days[0].words[0].vi,'bến tàu');assert.equal(e.q('[data-action="bank-save"]').disabled,true);
 e.click('[data-action="close-utility"]');assert.match(e.q('#app').textContent,/dock/);
});

test('Dictionary paginates lookup results, preserves query/focus on Back and does not store the whole bank',async()=>{
 const rows=Array.from({length:250},(_,i)=>['word'+i,'nghĩa '+i,'',0]);const e=environment({bankRows:rows});await e.qa.bankOpen();
 e.q('#bank-search').value='word';e.q('#bank-search').dispatchEvent({type:'input'});e.flush(180);
 assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,30);e.click('[data-action="bank-next"]');assert.equal(e.qa.bankState.page,1);
 const result=e.q('[data-action="bank-detail"]'),index=result.dataset.bank;e.click('[data-action="bank-detail"][data-bank="'+index+'"]');assert.equal(e.doc.activeElement.id,'utility-title');
 e.click('[data-action="bank-back"]');assert.equal(e.q('#bank-search').value,'word');assert.equal(e.qa.bankState.page,1);assert.equal(e.doc.activeElement.dataset.bank,index);
 e.click('[data-action="bank-reset"]');assert.equal(e.q('#bank-search').value,'');assert.equal(e.qa.bankState.page,0);assert.equal(e.doc.activeElement.id,'bank-search');assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,0);
 assert.equal(e.map.get('tungngay.v1'),undefined);
});

test('Dictionary handles no matches, submit and unavailable speech without losing the query',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',0]]});await e.qa.bankOpen();
 e.q('#bank-search').value='nothinghere';e.q('#bank-search-form').dispatchEvent({type:'submit'});assert.match(e.q('#bank-list').textContent,/Không tìm thấy/);
 e.q('#bank-search').value='hello';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');assert.equal(e.q('[data-action="bank-speak"]').disabled,true);assert.match(e.q('#utility-dialog').textContent,/chưa hỗ trợ phát âm/);
 e.click('[data-action="bank-back"]');assert.equal(e.q('#bank-search').value,'hello');
});

test('Opening an expired result or unavailable matching route returns to its day safely',()=>{
 for(const hash of ['#/result/2026-10-22','#/match/2026-10-22']){const e=environment({hash});assert.equal(e.box.location.hash,'#/day/2026-10-22');assert.equal(e.qa.session,null);assert.equal(e.q('#study-dialog').open,false);}
});

test('A wrong match makes a future scheduled word due again even if the session is closed',()=>{
 const e=demo();for(const w of e.qa.days[0].words){w.remembered=true;w.reviewLevel=4;w.nextReview='2099-01-01';}
 e.click('[data-action="start-match"]');const s=e.qa.session,a=0,b=s.cells.findIndex(c=>c.pair!==s.cells[a].pair);
 e.click('[data-cell="'+a+'"]');e.click('[data-cell="'+b+'"]');
 for(const id of [s.cells[a].pair,s.cells[b].pair]){const w=e.qa.days[0].words.find(w=>w.id===id);assert.equal(w.remembered,false);assert.equal(w.reviewLevel,0);assert.equal(w.nextReview,e.qa.days[0].date);}
});

test('Quick add, examples, review across dates, schedules and progress views work together',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]});e.qa.quickAddOpen();await e.qa.loadBank();
 e.q('#quick-en').value='he';e.q('#quick-en').dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);e.click('[data-action="quick-suggest"]');
 e.q('#quick-example').value='Hello, Viet!';e.q('#quick-example-vi').value='Chào Việt!';e.q('#quick-add-form').dispatchEvent({type:'submit'});
 assert.equal(e.qa.days[0].words[0].example,'Hello, Viet!');
 const date=e.qa.days[0].date;e.qa.days[0].date='2026-01-01';e.box.location.hash='#/review';assert.ok(e.q('[data-action="review-start"]'));
 e.qa.startGlobalReview('due');assert.equal(e.qa.session.words[0]._date,'2026-01-01');assert.match(e.q('.front').textContent,/Hello, Viet!/);
 e.qa.flipCard();e.qa.answer(true);assert.equal(e.qa.days[0].words[0].remembered,true);assert.ok(e.qa.days[0].words[0].nextReview>date);
 assert.equal(e.qa.activity[date].reviewed,1);e.box.location.hash='#/progress';assert.match(e.q('#app').textContent,/1 \/ 10 lượt ôn/);
 e.box.location.hash='#/settings';assert.ok(e.q('#preferences-form'));e.q('#pref-goal').value='20';e.q('#pref-rate').value='1';e.q('#pref-theme').value='light';e.q('#preferences-form').dispatchEvent({type:'submit'});
 assert.equal(e.qa.preferences.goal,20);assert.equal(e.doc.documentElement.getAttribute('data-theme'),'light');
});
