const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={crypto:require('node:crypto').webcrypto};vm.createContext(box);
for(const name of ['review-engine','core']){const path='assets/js/'+name+'.js';if(fs.existsSync(path))vm.runInContext(fs.readFileSync(path,'utf8'),box);}
test('Review scheduling crosses month and year boundaries; forgetting returns the word to today',()=>{
 const R=box.ReviewEngine;assert.ok(R,'Review engine must exist');let w={id:'x',en:'hello',vi:'chào',remembered:false};
 R.grade(w,true,'2026-12-31');assert.equal(w.nextReview,'2027-01-01');assert.equal(w.reviewLevel,1);
 R.grade(w,true,'2027-01-01');assert.equal(w.nextReview,'2027-01-04');
 R.grade(w,false,'2027-01-04');assert.equal(w.nextReview,'2027-01-04');assert.equal(w.reviewLevel,0);assert.equal(w.remembered,false);
});
test('The global review queue includes due words from older days and excludes future words',()=>{
 const rows=[{date:'2026-10-20',words:[{id:'a',remembered:false},{id:'b',nextReview:'2026-10-24',remembered:true}]},{date:'2026-10-22',words:[{id:'c',nextReview:'2026-10-21',remembered:true}]}];
 assert.deepEqual(Array.from(box.ReviewEngine.queue(rows,'2026-10-22'),x=>x.word.id),['a','c']);
 assert.deepEqual(Array.from(box.ReviewEngine.queue(rows,'2026-10-22','unknown'),x=>x.word.id),['a']);
});
test('Backup validation preserves examples and review dates, and rejects damaged schedule metadata',()=>{
 const w={id:'a',en:'hello',vi:'chào',remembered:true,example:'Hello, Viet!',exampleVi:'Chào Việt!',nextReview:'2026-10-25',lastReviewed:'2026-10-22',reviewLevel:2,reviewCount:3};
 const data={version:1,days:[{date:'2026-10-22',words:[w]}]};assert.equal(box.FlashCore.validateBackup(data)[0].words[0].example,w.example);
 assert.equal(box.FlashCore.validateBackup(data)[0].words[0].nextReview,w.nextReview);
 assert.throws(()=>box.FlashCore.validateBackup({days:[{date:'2026-10-22',words:[{...w,nextReview:'2026-02-31'}]}]}));
});
test('Streak counts actual activity and stays live when yesterday was the last active day',()=>{
 assert.equal(box.ReviewEngine.streak({'2026-10-20':{reviewed:1},'2026-10-21':{reviewed:2}},'2026-10-22'),2);
 assert.equal(box.ReviewEngine.streak({},'2026-10-22'),0);
});

test('Practising an already remembered word before its due date keeps its schedule',()=>{
 const R=box.ReviewEngine,w={id:'a',remembered:false};
 R.grade(w,true,'2026-10-22');assert.equal(w.nextReview,'2026-10-23');
 R.grade(w,true,'2026-10-22');assert.equal(w.nextReview,'2026-10-23');assert.equal(w.reviewLevel,1);
 R.grade(w,true,'2026-10-23');assert.equal(w.nextReview,'2026-10-26');assert.equal(w.reviewLevel,2);
 R.grade(w,true,'2026-10-24');assert.equal(w.nextReview,'2026-10-26');assert.equal(w.reviewLevel,2);
 assert.equal(w.reviewCount,4);assert.equal(w.lastReviewed,'2026-10-24');
 R.grade(w,false,'2026-10-24');assert.equal(w.nextReview,'2026-10-24');assert.equal(w.reviewLevel,0);
 R.grade(w,true,'2026-10-24');assert.equal(w.nextReview,'2026-10-25');assert.equal(w.reviewLevel,1);
});

test('A forgotten word is due even if an older app left it with a future schedule',()=>{
 const rows=[{date:'2026-10-20',words:[{id:'forgotten',remembered:false,reviewLevel:4,nextReview:'2026-11-01'},{id:'known',remembered:true,nextReview:'2026-11-01'}]}];
 assert.deepEqual(Array.from(box.ReviewEngine.queue(rows,'2026-10-22'),x=>x.word.id),['forgotten']);
 box.ReviewEngine.grade(rows[0].words[0],true,'2026-10-22');
 assert.equal(rows[0].words[0].reviewLevel,1);assert.equal(rows[0].words[0].nextReview,'2026-10-23');
});
