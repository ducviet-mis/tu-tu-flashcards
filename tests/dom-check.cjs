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
function environment({map=new Map(),blocked=false,hash='#/',bankRows=null,speech=false,lexicon=false}={}){
 const doc={activeElement:null,downloads:[],blobs:new Map()};doc.body=new El('body',doc);doc.documentElement=new El('html',doc);doc.querySelector=s=>doc.body.querySelector(s);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);doc.createElement=s=>new El(s,doc);doc.addEventListener=(...args)=>doc.body.addEventListener(...args);
 parse(html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''),doc.body);
 if(bankRows){const node=new El('script',doc,{id:'dictionary-data'});node.textContent=require('node:zlib').gzipSync(JSON.stringify({version:1,count:bankRows.length,commonCount:bankRows.filter(r=>r[3]).length,entries:bankRows})).toString('base64');doc.body.append(node);}
 const events={},timers=[];let currentHash=hash;
 const location={get hash(){return currentHash;},set hash(v){currentHash=v;for(const fn of events.hashchange||[])fn();}};
 const storage={getItem:k=>{if(blocked)throw Error('blocked');return map.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');map.set(k,v);}};
 const box={document:doc,location,history:{replaceState:(s,t,v)=>{currentHash=v;}},localStorage:storage,crypto:require('node:crypto').webcrypto,URL:class extends URL{static createObjectURL(b){const u='blob:'+doc.blobs.size;doc.blobs.set(u,b);return u;}static revokeObjectURL(){}},URLSearchParams,AbortSignal,Blob,Date,Set,Map,console,Uint8Array,atob,navigator:{},setTimeout:(fn,ms)=>{const id={fn,ms};timers.push(id);return id;},clearTimeout:id=>{if(id)id.cancelled=true;},setInterval:(fn,ms)=>({fn,ms}),clearInterval:()=>{},requestAnimationFrame:fn=>fn(),addEventListener:(n,fn)=>(events[n]??=[]).push(fn),fetch:async(url)=>{if(lexicon&&/^\.\/data\/wordnet(?:\/|\-vi)/.test(String(url)))return new Response(fs.readFileSync(String(url)));if(bankRows&&String(url).includes('data/dictionary.json.gz'))return new Response(require('node:zlib').gzipSync(JSON.stringify({version:1,count:bankRows.length,commonCount:bankRows.filter(r=>r[3]).length,entries:bankRows})));throw Error('No real network in harness');}};
 const spoken=[];if(speech){box.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};box.speechSynthesis={cancel(){},getVoices:()=>[{lang:'en-US'}],speak:utterance=>spoken.push(utterance)};}box.performance=performance;box.Response=Response;box.DecompressionStream=DecompressionStream;box.window=box;vm.createContext(box);const scripts=[...html.matchAll(/<script id="(?:core|application)">([\s\S]*?)<\/script>/g)].map(m=>m[1]);vm.runInContext(scripts[0],box);
 const src=scripts[1].replace('/* QA_EXPORT_POINT */',`globalThis.QA={get days(){return days;},get session(){return session;},get cloud(){return cloud;},getCloudForm,cloudAction,readImport,applyImport,route,renderBase,startStudy,selectCell,answer,flipCard,closeStudy,exportFile,configureCloud,bankOpen,loadBank,get bankData(){return bankData;},bankState,bankSave,get bankRelationsPending(){return bankRelationsPending;},renderReview,renderProgress,renderSettings,quickAddOpen,startGlobalReview,get activity(){return activity;},get preferences(){return preferences;}};`);vm.runInContext(src,box);
 return{box,doc,spoken,q:s=>doc.querySelector(s),qa:box.QA,map,click:s=>{const e=doc.querySelector(s);assert.ok(e,'Missing element '+s);e.click();},flush:ms=>{for(const t of timers.splice(0))if(!t.cancelled&&t.ms<=ms)t.fn();},key:code=>doc.body.dispatchEvent({type:'keydown',code,target:doc.activeElement||doc.body})};
}
function demo(){const e=environment();e.click('[data-action="sample"]');e.box.location.hash='#/day/'+e.qa.days[0].date;return e;}
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
 const e=environment();assert.match(e.q('#app').textContent,/Từ nhỏ hôm nay/);e.click('[data-action="sample"]');e.box.location.hash=e.q('.home-today').getAttribute('href');e.q('#english').value='Testword';e.q('#vietnamese').value='từ kiểm tra';const submit=()=>e.q('#add-form').dispatchEvent({type:'submit'});submit();assert.equal(e.qa.days[0].words.length,9);assert.equal(e.doc.activeElement.id,'english');e.q('#english').value=' testWORD ';e.q('#vietnamese').value='trùng';submit();assert.equal(e.qa.days[0].words.length,9);
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

test('Vietnamese lookup displays the matching sense and keeps it when saving a flashcard',async()=>{
 const e=environment({bankRows:[['all Canadian company','công ty toàn vốn','',0],['meal','bột\nlượng sữa\nbữa ăn\năn, ăn cơm','',0]]});await e.qa.bankOpen();
 e.q('#bank-search').value='ăn cơm';e.q('#bank-search-form').dispatchEvent({type:'submit'});
 assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,1);
 assert.match(e.q('.bank-meaning').textContent,/ăn cơm/);
 e.click('[data-action="bank-detail"]');const meaning=e.q('#bank-custom-meaning');assert.match(meaning.textContent,/ăn cơm/);
 meaning.value=meaning.textContent; // The minimal DOM harness does not initialize textarea values from markup.
 e.click('[data-action="bank-save"]');assert.match(e.qa.days[0].words[0].vi,/ăn cơm/);
});

test('Word relations stay attached to the selected sense and Back restores the lookup',async()=>{
 const rows=[['light','nhẹ\nsáng\nnhạt màu','tính từ',1],['heavy','nặng nề về tâm trạng\nnặng về trọng lượng','tính từ',1],['dark','tối\nđậm màu','tính từ',1]];
 const e=environment({bankRows:rows,lexicon:true});await e.qa.bankOpen();
 e.q('#bank-search').value='light';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"][data-bank="0"]');await e.qa.bankRelationsPending;
 const weight=e.q('[data-sense="light%3:00:01::"]');assert.ok(weight);assert.match(weight.textContent,/Nhẹ/);assert.match(weight.textContent,/heavy/);assert.doesNotMatch(weight.textContent,/dark/);
 weight.querySelector('[data-relation="antonyms"]').querySelector('[data-action="bank-related"]').click();await e.qa.bankRelationsPending;
 assert.match(e.q('#utility-title').textContent,/heavy/);assert.equal(e.q('.dictionary-sense').dataset.sense,'heavy%3:00:01::');
 assert.match(e.q('#bank-custom-meaning').value,/trọng lượng/);assert.doesNotMatch(e.q('#bank-custom-meaning').value,/tâm trạng/);
 e.click('[data-action="bank-back"]');await e.qa.bankRelationsPending;assert.equal(e.q('#utility-title').textContent,'light');
 e.click('[data-action="bank-back"]');assert.equal(e.q('#bank-search').value,'light');
});

test('Word details show the new layout while loading and preserve the reader’s position',async()=>{
 const e=environment({bankRows:[['light','nhẹ\nsáng\nnhạt màu','tính từ',1]],lexicon:true});await e.qa.bankOpen();
 const original=e.box.fetch;let release,notify;const started=new Promise(resolve=>notify=resolve);
 e.box.fetch=async url=>{if(String(url).endsWith('/l.json.gz')){notify();return new Promise(resolve=>release=()=>resolve(new Response(fs.readFileSync(String(url)))));}return original(url);};
 e.q('#bank-search').value='light';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await started;
 const full=e.q('.dictionary-translations'),dialog=e.q('#utility-dialog');
 assert.equal(full.getAttribute('open'),null,'Legacy meanings must not expand before the new sense cards load');
 assert.match(e.q('#bank-relations').textContent,/Theo từng nghĩa/);
 assert.ok(e.q('#bank-relations').querySelector('[role="status"]'));
 assert.equal(e.q('#bank-relations').getAttribute('aria-busy'),'true');
 full.open=true;dialog.scrollTop=180;
 release();await e.qa.bankRelationsPending;
 assert.ok(e.q('.dictionary-sense[data-sense="light%3:00:01::"]'));
 assert.equal(e.q('#bank-relations').getAttribute('aria-busy'),'false');
 assert.ok(full.open,'Finishing a download must not close meanings the reader opened');
 assert.equal(dialog.scrollTop,180,'Finishing a download must not jump to the top');
});

test('Missing relation download preserves the dictionary and can be retried',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]});await e.qa.bankOpen();
 e.q('#bank-search').value='hello';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await e.qa.bankRelationsPending;
 assert.match(e.q('.bank-senses').textContent,/xin chào/);assert.ok(e.q('[data-action="bank-relations-retry"]'));
 e.box.fetch=async url=>new Response(fs.readFileSync(String(url)));e.click('[data-action="bank-relations-retry"]');await e.qa.bankRelationsPending;
 assert.match(e.q('#bank-relations').textContent,/hi/);assert.equal(e.q('#bank-relations').getAttribute('aria-busy'),'false');
});

test('A late word relation response cannot overwrite another word or the user’s edited meaning',async()=>{
 const e=environment({bankRows:[['light','nhẹ','',1],['heavy','nặng','',1]],lexicon:true});await e.qa.bankOpen();
 const original=e.box.fetch;let release,notify;const started=new Promise(resolve=>notify=resolve);
 e.box.fetch=async url=>{if(String(url).endsWith('/l.json.gz')){notify();return new Promise(resolve=>release=()=>resolve(new Response(fs.readFileSync(String(url)))));}return original(url);};
 e.q('#bank-search').value='light';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');const stale=e.qa.bankRelationsPending;await started;
 e.click('[data-action="bank-back"]');e.q('#bank-search').value='heavy';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');
 e.q('#bank-custom-meaning').value='nghĩa tôi tự viết';e.q('#bank-custom-meaning').dispatchEvent({type:'input'});await e.qa.bankRelationsPending;
 release();await stale;assert.equal(e.q('#utility-title').textContent,'heavy');assert.equal(e.q('#bank-custom-meaning').value,'nghĩa tôi tự viết');
 assert.ok(e.q('.dictionary-sense[data-sense="heavy%3:00:01::"]'));assert.equal(e.q('.dictionary-sense[data-sense="light%3:00:01::"]'),null);
});

test('Inflections link to their root and words without antonyms never show invented opposites',async()=>{
 const e=environment({bankRows:[['ate','ăn','động từ',0],['eat','ăn','động từ',1],['apple','quả táo','danh từ',1]],lexicon:true});await e.qa.bankOpen();
 e.q('#bank-search').value='ate';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await e.qa.bankRelationsPending;
 assert.match(e.q('.dictionary-root').textContent,/eat/);assert.match(e.q('#bank-relations').textContent,/eaten/);
 e.click('[data-action="bank-back"]');e.q('#bank-search').value='apple';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await e.qa.bankRelationsPending;
 assert.equal(e.q('#bank-relations').querySelector('[data-relation="antonyms"]'),null);
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

test('Notebook memory toggles update due counts without counting as a study session',()=>{
 const e=demo(),word=e.qa.days[0].words.find(w=>!w.remembered),today=e.qa.days[0].date;
 const toggle=()=>e.click('[data-action="toggle"][data-id="'+word.id+'"]');
 toggle();assert.equal(word.remembered,true);assert.equal(word.reviewLevel,1);assert.ok(word.nextReview>today);
 assert.equal(word.reviewCount,undefined);assert.equal(e.qa.activity[today],undefined);
 e.box.location.hash='#/review';assert.equal(e.q('.feature-number').textContent,'13');
 e.box.location.hash='#/day/'+today;toggle();assert.equal(word.remembered,false);assert.equal(word.reviewLevel,0);assert.equal(word.nextReview,today);
 e.box.location.hash='#/';assert.equal(e.q('[data-home-count="due"]').textContent,'14');
});

test('Editing only an example preserves the schedule; changing a meaning resets it',()=>{
 const e=demo(),word=e.qa.days[0].words[0];word.remembered=true;word.reviewLevel=3;word.nextReview='2099-01-01';word.reviewCount=5;
 const edit=()=>{e.click('[data-action="edit"][data-id="'+word.id+'"]');e.q('#edit-example').value='A new example.';e.q('#edit-example-vi').value='Một ví dụ mới.';};
 edit();e.q('#edit-form').dispatchEvent({type:'submit'});
 assert.equal(word.remembered,true);assert.equal(word.reviewLevel,3);assert.equal(word.nextReview,'2099-01-01');assert.equal(word.reviewCount,5);
 edit();e.q('#edit-vi').value='nghĩa mới';e.q('#edit-form').dispatchEvent({type:'submit'});
 assert.equal(word.remembered,false);assert.equal(word.reviewLevel,0);assert.equal(word.nextReview,e.qa.days[0].date);assert.equal(word.reviewCount,5);
});

test('A review result and its retry contain only missed words from that session',()=>{
 const e=demo(),today=e.qa.days[0].date,oldDay=e.qa.days[1];
 for(const d of e.qa.days)for(const w of d.words){w.remembered=true;w.reviewLevel=2;w.nextReview='2099-01-01';}
 const missed=oldDay.words[0],passed=e.qa.days[0].words[0],outside=oldDay.words[1];
 missed.nextReview=today;passed.nextReview=today;e.qa.startGlobalReview('due');assert.equal(e.qa.session.words.length,2);
 const studied=[...e.qa.session.words];
 for(const w of studied){e.qa.flipCard();e.qa.answer(w.id!==missed.id);}
 outside.remembered=false;outside.nextReview=today;e.qa.route();
 assert.equal(e.qa.session.type,'result');assert.match(e.q('.result-tags').textContent,new RegExp(missed.en));assert.doesNotMatch(e.q('.result-tags').textContent,new RegExp(outside.en));
 e.click('[data-action="result-review"]');assert.equal(e.qa.session.words.length,1);assert.equal(e.qa.session.words[0].id,missed.id);assert.equal(e.qa.session.words[0]._date,oldDay.date);
 e.qa.flipCard();e.qa.answer(true);assert.equal(e.qa.session.type,'result');assert.ok(!e.q('[data-action="result-review"]'));
 assert.equal(outside.remembered,false);
});

test('A match result does not offer unplayed words from the rest of the notebook',()=>{
 const e=demo(),all=e.qa.days[0].words;for(const w of all)w.remembered=false;
 e.click('[data-action="start-match"]');assert.equal(e.qa.session.words.length,6);
 const selected=new Set(e.qa.session.words.map(w=>w.id)),outside=all.filter(w=>!selected.has(w.id));
 for(const w of e.qa.session.words){const cells=e.qa.session.cells.flatMap((c,i)=>c.pair===w.id?[i]:[]);e.click('[data-cell="'+cells[0]+'"]');e.click('[data-cell="'+cells[1]+'"]');}
 e.flush(500);assert.equal(e.qa.session.type,'result');assert.ok(!e.q('[data-action="result-review"]'),'Unplayed words must not appear in the result retry');
 assert.ok(outside.every(w=>!w.remembered));
});

test('Stopping a match early does not claim that every word was recalled',()=>{
 const e=demo();for(const w of e.qa.days[0].words){w.remembered=true;w.reviewLevel=2;w.nextReview='2099-01-01';}
 e.click('[data-action="start-match"]');e.click('[data-action="finish-match"]');
 assert.equal(e.qa.session.result.completed,false);assert.doesNotMatch(e.q('.success-note').textContent,/Bạn đã nhớ hết/);
 assert.ok(e.qa.days[0].words.every(w=>w.nextReview==='2099-01-01'&&w.reviewLevel===2));
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


test('V3 home lookup submits into the existing dictionary and records only opened words',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1],['help','giúp','',1]]});
 assert.ok(e.q('#home-lookup-form'));assert.equal(e.q('[data-nav="home"]').getAttribute('aria-current'),'page');
 e.q('#home-lookup').value='hello';e.q('#home-lookup-form').dispatchEvent({type:'submit'});
 await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(e.q('#bank-search').value,'hello');assert.match(e.q('#bank-list').textContent,/hello/);
 e.click('[data-action="bank-detail"]');e.click('[data-action="close-utility"]');
 assert.equal(e.q('#recent-lookups').querySelectorAll('[data-action="home-lookup-recent"]').length,1);
 assert.match(e.q('#recent-lookups').textContent,/hello/);
 const reloaded=environment({map:e.map});assert.match(reloaded.q('#recent-lookups').textContent,/hello/);
 assert.equal(reloaded.qa.days.length,0);
});
test('Home lookup suggests English prefixes and opens the chosen word directly',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1],['help','giúp đỡ','',1],['hero','anh hùng','',0]]});
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);await e.qa.loadBank();await new Promise(setImmediate);
 assert.ok(e.q('#home-lookup-suggestions'),'Home search needs its own suggestion panel');
 assert.equal(e.q('#home-lookup-suggestions').hidden,false);
 assert.match(e.q('#home-lookup-options').textContent,/hello/);assert.match(e.q('#home-lookup-options').textContent,/xin chào/);
 assert.equal(e.q('#utility-dialog').open,false);assert.equal(input.getAttribute('aria-expanded'),'true');
 e.click('[data-action="home-lookup-suggest"][data-position="0"]');await new Promise(setImmediate);await e.qa.bankRelationsPending;
 assert.equal(e.q('#utility-title').textContent,'hello');assert.equal(e.q('#utility-dialog').getAttribute('data-view'),'bank-detail');
 assert.equal(e.q('#home-lookup-suggestions').hidden,true);assert.equal(e.qa.days.length,0);
});

test('Home lookup suggests Vietnamese meanings, supports keyboard selection and clears on Escape',async()=>{
 const e=environment({bankRows:[['eat','ăn\năn cơm','',1],['have a meal','ăn cơm','',1],['Canadian company','công ty Canada','',0]]});
 const input=e.q('#home-lookup');input.focus();input.value='an com';input.dispatchEvent({type:'input'});e.flush(180);await e.qa.loadBank();await new Promise(setImmediate);
 assert.ok(e.q('#home-lookup-options'),'Vietnamese queries also need home suggestions');
 assert.match(e.q('#home-lookup-options').textContent,/eat/);assert.doesNotMatch(e.q('#home-lookup-options').textContent,/Canadian/);
 input.dispatchEvent({type:'keydown',key:'ArrowDown'});input.dispatchEvent({type:'keydown',key:'ArrowDown'});assert.ok(input.getAttribute('aria-activedescendant'));
 input.dispatchEvent({type:'keydown',key:'Enter'});await new Promise(setImmediate);await e.qa.bankRelationsPending;
 assert.equal(e.q('#utility-title').textContent,'eat');
 e.click('[data-action="close-utility"]');input.focus();input.value='eat';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 input.dispatchEvent({type:'keydown',key:'Escape'});assert.equal(e.q('#home-lookup-suggestions').hidden,true);assert.equal(input.value,'eat');
 input.value='';input.dispatchEvent({type:'input'});assert.equal(input.getAttribute('aria-expanded'),'false');
});

test('Home suggestions discard stale downloads after a query is cleared or route changes',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]}),original=e.box.fetch;let release,notify;
 const started=new Promise(resolve=>notify=resolve);
 e.box.fetch=async url=>{if(String(url).includes('data/dictionary.json.gz')){notify();await new Promise(resolve=>release=resolve);}return original(url);};
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);
 assert.ok(e.q('#home-lookup-suggestions'),'Loading feedback must appear while the dictionary downloads');
 await started;
 assert.equal(e.q('#home-lookup-suggestions').hidden,false);
 input.value='';input.dispatchEvent({type:'input'});e.box.location.hash='#/notebook';release();await new Promise(setImmediate);await new Promise(setImmediate);
 e.box.location.hash='#/';assert.equal(e.q('#home-lookup-suggestions').hidden,true);assert.equal(e.q('#home-lookup-options').querySelectorAll('[role="option"]').length,0);
});

test('Home suggestions preserve keyboard selection while Vietnamese results finish loading',async()=>{
 const rows=[['hello','xin chào','',1],['help','giúp đỡ','',1],...Array.from({length:2000},(_,i)=>['word'+i,'nghĩa khác','',0])];
 const e=environment({bankRows:rows});await e.qa.loadBank();
 const frames=[];let clock=0;e.box.requestAnimationFrame=fn=>frames.push(fn);e.box.performance={now:()=>clock+=10};
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 assert.ok(frames.length);input.dispatchEvent({type:'keydown',key:'ArrowDown'});
 const selected=input.getAttribute('aria-activedescendant');assert.ok(selected);
 while(frames.length)frames.shift()();
 assert.equal(input.getAttribute('aria-activedescendant'),selected);
 assert.equal(e.q('#'+selected).getAttribute('aria-selected'),'true');
});

test('Home lookup handles a failed download and can retry without reloading the page',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]}),original=e.box.fetch;
 e.box.fetch=async()=>{throw Error('offline');};
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 assert.match(e.q('#home-lookup-status').textContent,/Chưa tải được/);
 e.box.fetch=original;input.dispatchEvent({type:'input'});e.flush(180);await e.qa.loadBank();await new Promise(setImmediate);
 assert.match(e.q('#home-lookup-options').textContent,/hello/);
 input.value='no-match';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 assert.match(e.q('#home-lookup-status').textContent,/Chưa tìm thấy/);assert.equal(e.q('#home-lookup-options').querySelectorAll('[role="option"]').length,0);
});

test('V3 home and notebook are separate routes and use real counts without creating an empty day',()=>{
 const e=environment();assert.ok(e.q('#home-lookup-form'));e.click('[data-action="sample"]');
 assert.equal(e.q('[data-home-count="due"]').textContent,'14');
 e.box.location.hash='#/notebook';assert.equal(e.q('[data-nav="notebook"]').getAttribute('aria-current'),'page');
 assert.equal(e.q('.notebook-grid').querySelectorAll('.notebook-day').length,3);
 const count=e.qa.days.length;e.box.location.hash='#/';assert.ok(e.q('#home-lookup-form'));assert.equal(e.qa.days.length,count);
 e.box.location.hash='#/day/'+e.qa.days[0].date;assert.ok(e.q('#add-form'));assert.equal(e.q('[data-nav="notebook"]').getAttribute('aria-current'),'page');
});
