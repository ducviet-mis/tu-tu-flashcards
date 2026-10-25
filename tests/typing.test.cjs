const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={};vm.createContext(box);
const file='assets/js/typing-engine.js';
if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),box);
test('Typing accepts case and whitespace while preserving meaningful spelling',()=>{
 assert.ok(box.TuTuTyping,'typing engine must be available');
 for(const [actual,expected,want] of [['  HELLO  ','hello',true],['ice   cream','ice cream',true],["DON’T","don't",true],['well–known','well-known',true],['relutant','reluctant',false],['cant',"can't",false],['','apple',false],['  ','apple',false]])assert.equal(box.TuTuTyping.correct(actual,expected),want,actual);
});
