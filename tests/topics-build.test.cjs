const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
test('Fixed topic preparation preserves source membership and contextual Kaikki senses',()=>{const r=spawnSync('python',['tests/topics-build.test.py'],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);});
