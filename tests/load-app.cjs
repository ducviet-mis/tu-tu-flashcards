// Test-only bridge: load the actual deployment files into the existing DOM harness.
const fs=require('node:fs');
module.exports=function({legacyRelations=false}={}){
 let html=fs.readFileSync('index.html','utf8');
 if(legacyRelations)html=html.replace('<script defer src="./assets/js/features/kaikki-word.js"></script>','<script defer src="./assets/js/lexicon.js"></script><script defer src="./assets/js/features/word-relations.js"></script>');
 const paths=[...html.matchAll(/<script defer src="\.\/([^\"]+)"><\/script>/g)].map(m=>m[1]);
 const engine=fs.readFileSync('assets/js/review-engine.js','utf8'),core=fs.readFileSync('assets/js/core.js','utf8');
 const app=paths.filter(p=>!p.endsWith('/core.js')&&!p.endsWith('/review-engine.js')).map(p=>p.endsWith('/main.js')?'/* QA_EXPORT_POINT */\n'+fs.readFileSync(p,'utf8'):fs.readFileSync(p,'utf8')).join('\n');
 html=html.replace(/<script defer[^>]*><\/script>/g,'');
 html=html.replace(/<link rel="stylesheet" href="\.\/([^\"]+)">/g,(_,p)=>'<style>'+fs.readFileSync(p,'utf8')+'</style>');
 html+=`<script id="dictionary-data" type="application/octet-stream">${fs.readFileSync('data/dictionary.json.gz').toString('base64')}</script><script id="core">${engine}\n${core}</script><script id="application">(()=>{\n${app}\n})();</script>`;
 return html;
};
