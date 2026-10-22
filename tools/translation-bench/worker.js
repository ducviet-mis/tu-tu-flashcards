// Experimental diagnostic only. Not imported by the production app.
let lib, translator, current, blocked=false;
const originalFetch=self.fetch.bind(self);
const progressBuckets=new Map();
self.fetch=async(input,options)=>{
 const url=typeof input==='string'?input:input.url||String(input);const start=performance.now();
 try{const response=await originalFetch(input,options);const safeURL=new URL(response.url);safeURL.search='';send('fetch',{url,status:response.status,responseURL:safeURL.href,headersMs:performance.now()-start});return response;}
 catch(error){send('fetch-error',{url,message:error.message,ms:performance.now()-start});throw error;}
};
const revisions={'en-vi':'30bcd46','vi-en':'541dfd7'};
const send=(type,data={})=>postMessage({type,...data});
async function library(){
 if(lib)return lib;
 const start=performance.now();
 lib=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
 lib.env.allowLocalModels=false;
 lib.env.useBrowserCache=true;
 lib.env.backends.onnx.wasm.numThreads=1;
 lib.env.backends.onnx.wasm.proxy=false;
 send('library',{ms:performance.now()-start});
 return lib;
}
async function load(direction){
 await library();
 if(current===direction&&translator)return;
 if(translator){await translator.dispose();translator=null;current=null;}
 const start=performance.now();
 translator=await lib.pipeline('translation','Xenova/opus-mt-'+direction,{
  revision:revisions[direction],device:'wasm',dtype:'q8',
  progress_callback:p=>{const bucket=Math.floor((p.progress||0)/20);if(['initiate','done','ready'].includes(p.status)||p.status==='progress'&&progressBuckets.get(p.file)!==bucket){progressBuckets.set(p.file,bucket);send('progress',{progress:p});}},
 });
 current=direction;
 send('loaded',{direction,ms:performance.now()-start,offlineFetchBlocked:blocked});
}
async function translate(test){
 await load(test.direction);
 const tokens=translator.tokenizer(test.input).input_ids.dims.at(-1);
 const start=performance.now();
 // The English→Vietnamese source model card requires a target-language token.
 const modelInput=test.direction==='en-vi'?'>>vie<< '+test.input:test.input;
 const output=await translator(modelInput,{max_new_tokens:256,num_beams:4});
 send('result',{result:{...test,output:output[0].translation_text,ms:performance.now()-start,inputTokens:tokens,offlineFetchBlocked:blocked}});
}
let chain=Promise.resolve();
self.onmessage=event=>{
 chain=chain.then(async()=>{
  const {type,tests}=event.data;
  if(type==='offline'){
   await library();if(translator)await translator.dispose();translator=null;current=null;
   self.fetch=async()=>{throw new TypeError('Network disabled by offline diagnostic');};blocked=true;
   send('offline');
  }
  if(type==='run')for(const test of tests)await translate(test);
  if(type==='run')send('complete');
 }).catch(e=>send('error',{message:e.message,stack:e.stack}));
};
