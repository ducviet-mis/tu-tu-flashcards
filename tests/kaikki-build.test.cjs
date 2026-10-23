'use strict';
const test=require('node:test'),{execFileSync}=require('node:child_process');
test('Kaikki builder preserves source senses, translations and missing fields',()=>{
 execFileSync(process.platform==='win32'?'python':'python3',['tests/kaikki-build.test.py'],{stdio:'pipe'});
});
