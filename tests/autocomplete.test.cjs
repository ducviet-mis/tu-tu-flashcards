const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const html=require('./load-app.cjs')(),box={crypto:require('node:crypto').webcrypto};
vm.createContext(box);vm.runInContext(html.match(/<script id="core">([\s\S]*?)<\/script>/)[1],box);
const C=box.FlashCore;
test('Prefix suggestions prefer exact and common words, preserve meanings, and ignore case',()=>{
 const rows=[['he','anh ấy','',1],['heliocentric','nhật tâm','',0],['hello','xin chào','',1],['help','giúp đỡ','',1],['the','mạo từ','',1]];
 const index=C.bankSuggestionIndex(rows);
 const results=C.bankSuggestions(rows,index,' HE ',3);
 assert.deepEqual(Array.from(results),[0,2,3]);
 assert.equal(C.bankSummary(rows[results[1]]),'xin chào');
 assert.equal(C.bankSuggestions(rows,index,'',8).length,0);
 assert.equal(C.bankSuggestions(rows,index,'zzzz',8).length,0);
 assert.deepEqual(Array.from(C.bankSuggestions(rows,index,'hello',8)),[2]);
});
