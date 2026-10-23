const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
let C={};
const html=fs.existsSync('index.html')?require('./load-app.cjs')():'';
const source=html.match(/<script id="core">([\s\S]*?)<\/script>/)?.[1];
if(source){const box={crypto:require('node:crypto').webcrypto};vm.createContext(box);vm.runInContext(source,box);C=box.FlashCore;}
const plain=x=>JSON.parse(JSON.stringify(x));
test('Dán 10 dòng với 5 kiểu dấu tách; giữ dấu gạch trong từ và bỏ dòng lỗi',()=>{
 const lines=['apple - quả táo','dock – bến tàu','post : đăng','wrap = bọc','pull\tkéo','assemble - lắp ráp','merchandise – hàng hóa','well-known : nổi tiếng','income = thu nhập','profit\tlợi nhuận','sai dòng',' - thiếu',''];
 const r=C.parseBulk(lines.join('\n'));assert.equal(r.words.length,10);assert.equal(r.invalid,2);assert.equal(r.words[7].en,'well-known');
});
test('Từ trùng trong cùng ngày được phát hiện không phân biệt hoa thường/Unicode',()=>{assert.equal(C.wordKey('  Apple  '),C.wordKey('apple'));assert.equal(C.wordKey('café'),C.wordKey('cafe\u0301'));});
test('Sao lưu round-trip giữ trạng thái và ngày, từ chối JSON sai hoặc ngày không thật',()=>{
 const x={version:1,days:[{date:'2026-10-22',words:[{id:'a',en:'apple',vi:'quả táo',remembered:true}]}]};assert.deepEqual(plain(C.validateBackup(JSON.parse(JSON.stringify(x)))),x.days);
 for(const bad of [{days:[{date:'2026-02-30',words:[]}]},{days:[{date:'2026-10-22',words:[{id:'x',en:'a',vi:'b',remembered:'yes'}]}]},{days:'bad'},{days:[{date:'2026-10-22',words:[{id:'x',en:'',vi:'b',remembered:false}]}]}])assert.throws(()=>C.validateBackup(bad));
});
test('Gộp bảo toàn từ và trạng thái bản hiện có; thêm từ mới và sắp ngày giảm dần',()=>{
 const a=[{date:'2026-10-21',words:[{id:'a',en:'apple',vi:'táo',remembered:true}]}];
 const b=[{date:'2026-10-22',words:[]},{date:'2026-10-21',words:[{id:'b',en:'APPLE',vi:'táo mới',remembered:false},{id:'c',en:'dock',vi:'bến',remembered:false}]}];
 const out=C.mergeDays(a,b);assert.equal(out[0].date,'2026-10-22');assert.equal(out[1].words.length,2);assert.equal(out[1].words[0].remembered,true);assert.equal(a[0].words.length,1);
});
test('Chọn ghép cặp tối đa 6 từ, ưu tiên chưa nhớ',()=>{const words=Array.from({length:12},(_,i)=>({id:String(i),remembered:i>3}));const chosen=C.matchWords(words);assert.equal(chosen.length,6);for(let i=0;i<4;i++)assert.ok(chosen.some(w=>w.id===String(i)));assert.equal(new Set(chosen.map(w=>w.id)).size,6);});
test('Nhập file có trùng ID hoặc từ trùng trong một ngày phải báo lỗi',()=>{for(const words of [[{id:'x',en:'a',vi:'a',remembered:false},{id:'x',en:'b',vi:'b',remembered:false}],[{id:'x',en:'a',vi:'a',remembered:false},{id:'y',en:'A',vi:'b',remembered:false}]])assert.throws(()=>C.validateBackup({version:1,days:[{date:'2026-10-22',words}]}));});
test('Tên truy cập thẻ luôn chứa nội dung đang hiển thị',()=>{const w={en:'assemble',vi:'lắp ráp'};assert.match(C.cardLabel(w,false,false),/assemble/);assert.match(C.cardLabel(w,false,true),/lắp ráp/);assert.match(C.cardLabel(w,true,false),/lắp ráp/);assert.match(C.cardLabel(w,true,true),/assemble/);});
test('Kho từ tìm Anh/Việt bỏ dấu, ưu tiên khớp chính xác và phân trang',()=>{const rows=[['apple pie','bánh táo','danh từ',0],['apple','quả táo\ncây táo','danh từ',1],['assemble','lắp ráp\ntập hợp','động từ',1],['profit','lợi nhuận','danh từ',0]];assert.equal(C.bankSearch(rows,{q:'apple',kind:'all',page:0,size:1}).indices[0],1);assert.equal(C.bankSearch(rows,{q:'lap rap',mode:'vi'}).total,1);assert.equal(C.bankSearch(rows,{kind:'common'}).total,2);assert.equal(C.bankSearch(rows,{kind:'phrase'}).total,1);assert.equal(C.bankSearch(rows,{kind:'single'}).total,3);assert.equal(C.bankSearch(rows,{q:'zzzzz'}).total,0);assert.deepEqual(plain(C.bankSearch(rows,{page:1,size:2}).indices),[2,3]);});
test('Nghĩa gợi ý cho flashcard lấy 3 nghĩa đầu, giữ giới hạn 1000 ký tự',()=>{assert.equal(C.bankSummary(['word','một\nhai\nba\nbốn']), 'một; hai; ba');assert.ok(C.bankSummary(['x','a'.repeat(2000)]).length<=1000);});
test('Tìm kho theo từng đợt có cùng kết quả khi thực hiện nhiều bước nhỏ',()=>{const rows=Array.from({length:127},(_,i)=>['word'+i,'nghĩa '+i,'',1]);const q=C.bankQuery(rows,{q:'word1',size:7,page:1});let loops=0;while(!q.step(9))loops++;assert.ok(loops>1);assert.deepEqual(plain(q.result()),plain(C.bankSearch(rows,{q:'word1',size:7,page:1})));});
test('Nghĩa cụm không bị dùng làm nghĩa độc lập của từ gốc',()=>{const row=['apple','quả táo\n⟦cụm: apple of discord⟧ mối bất hoà\ncây táo'];assert.equal(C.bankSummary(row),'quả táo; cây táo');});

test('Dictionary both mode searches Vietnamese without accents and ranks English exact and prefix first',()=>{
 const rows=[['other','hello trong lời chào','',0],['hello','xin chào','',0],['hello there','chào bạn','',0],['dock','bến tàu','',0]];
 assert.deepEqual(plain(C.bankSearch(rows,{q:'hello',kind:'all',mode:'both'}).indices),[1,2,0]);
 assert.deepEqual(plain(C.bankSearch(rows,{q:'ben tau',kind:'all',mode:'both'}).indices),[3]);
});

test('Vietnamese lookup matches complete words and ranks direct senses before incidental mentions',()=>{
 const rows=[
  ['all Canadian company','công ty toàn vốn của Ca-na-đa','',0],
  ['compact space','không gian compac','',0],
  ['ante-room','phòng khách (ở nơi ăn cơm của sĩ quan)','',0],
  ['mutton','thịt cừu\n⟦cụm: to eat mutton⟧ ăn cơm với ai','',0],
  ['meal','bột\nlượng sữa\nbữa ăn\năn, ăn cơm','',0],
  ['dine','ăn cơm (trưa, chiều)\nthết cơm (ai)','',0],
  ['eat','ăn; (từ Mỹ,nghĩa Mỹ) ăn cơm','',1],
  ['metadata only','⟦cụm: an com⟧ không có nghĩa phù hợp','',0]];
 for(const q of ['ăn cơm','an com','  ăn   cơm  ']){
  const result=plain(C.bankSearch(rows,{q,mode:'both'}));
  assert.equal(result.total,5);assert.equal(result.indices[0],5);
  for(const i of [4,6])assert.ok(result.indices.indexOf(i)<result.indices.indexOf(2));
  const job=C.bankQuery(rows,{q,mode:'both'});while(!job.step(2)){}assert.deepEqual(plain(job.result()),result);
 }
 assert.equal(C.bankSearch([['an','mạo từ','',0],['eat','ăn','',1]],{q:'ăn',mode:'both'}).indices[0],1);
});

test('Lookup summary shows the matching sense even when it is buried in the definition',()=>{
 const row=['meal','bột\nlượng sữa\nbữa ăn\năn, ăn cơm'];
 assert.match(C.bankSummary(row,'an com'),/ăn cơm/);
 assert.equal(C.bankSummary(row),'bột; lượng sữa; bữa ăn');
 assert.equal(C.bankSummary(['x','⟦cụm: an com⟧ nghĩa khác'],'an com'),'⟦cụm: an com⟧ nghĩa khác');
});
