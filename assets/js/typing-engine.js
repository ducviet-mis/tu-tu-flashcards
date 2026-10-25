/* English answer comparison shared by both typing games. */
'use strict';
(()=>{
 const normalize=value=>String(value??'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/[‐‑–—]/g,'-').trim().replace(/\s+/g,' ').toLowerCase();
 globalThis.TuTuTyping=Object.freeze({normalize,correct:(value,expected)=>!!normalize(value)&&normalize(value)===normalize(expected)});
})();
