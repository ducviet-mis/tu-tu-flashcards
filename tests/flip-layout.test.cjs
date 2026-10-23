const fs=require('node:fs'),assert=require('node:assert/strict'),test=require('node:test');
const html=require('./load-app.cjs')(),css=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
test('The rotating span must form a full-size transformable box for its absolute card faces',()=>{
 const rule=css.match(/\.flip-inner\{([^}]*)\}/)[1];
 const declarations=Object.fromEntries(rule.split(';').filter(Boolean).map(s=>{const i=s.indexOf(':');return[s.slice(0,i).trim(),s.slice(i+1).trim()];}));
 assert.ok(['block','flex','grid','inline-block'].includes(declarations.display),'Inline spans ignore explicit height/width and cannot rotate as a card');
 assert.equal(declarations.width,'100%');assert.equal(declarations.height,'100%');
 assert.equal(declarations.position,'relative');assert.equal(declarations['transform-style'],'preserve-3d');
 assert.match(css,/\.flip-card\.flipped \.flip-inner\{transform:rotateY\(180deg\)/);
 assert.match(css,/\.face[^}]*backface-visibility:hidden/);
});
