/* Account data transport: durable pending work, three-way merge and idempotent reviews.
   Dictionary catalogs are never part of a user snapshot. */
(function(root){
 'use strict';
 const defaults={goal:10,rate:.85,autoSpeak:false,reverse:false,theme:'dark'};
 const clone=x=>JSON.parse(JSON.stringify(x)),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const safeKey=k=>!['__proto__','constructor','prototype'].includes(k);
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='1900-01-01'&&s<='9999-12-31'&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const progress=w=>Object.fromEntries(['remembered','reviewLevel','reviewCount','lastReviewed','nextReview'].map(k=>[k,w?.[k]??null]));
 const emptyData=()=>({days:[],preferences:{...defaults},topics:{},history:[]});
 function cleanStats(input={}){
  if(!object(input))throw Error('Invalid activity');const out={};
  for(const [date,a] of Object.entries(input)){if(!validDate(date)||!Number.isSafeInteger(a?.reviewed)||a.reviewed<0||!Number.isSafeInteger(a.correct)||a.correct<0||a.correct>a.reviewed)throw Error('Invalid activity');out[date]={reviewed:a.reviewed,correct:a.correct};}return out;
 }
 function normalize(input=emptyData()){
  if(!object(input)||!Array.isArray(input.days))throw Error('Invalid notebook');
  let days=clone(input.days);
  if(root.FlashCore)days=root.FlashCore.validateBackup({version:1,days});
  else{const ids=new Set(),dates=new Set();for(const d of days){if(!validDate(d.date)||dates.has(d.date)||!Array.isArray(d.words))throw Error('Invalid notebook');dates.add(d.date);for(const w of d.words){if(typeof w.id!=='string'||!w.id||ids.has(w.id)||typeof w.en!=='string'||!w.en.trim()||typeof w.vi!=='string'||!w.vi.trim()||typeof w.remembered!=='boolean')throw Error('Invalid word');ids.add(w.id);}}}
  const preferences={...defaults,...input.preferences};
  if(!Number.isInteger(preferences.goal)||preferences.goal<1||preferences.goal>200||!Number.isFinite(preferences.rate)||preferences.rate<.5||preferences.rate>1.5||typeof preferences.autoSpeak!=='boolean'||typeof preferences.reverse!=='boolean'||!['dark','light','system'].includes(preferences.theme))throw Error('Invalid preferences');
  const topics={};for(const [k,v] of Object.entries(input.topics||{})){if(!/^[a-z0-9-]+:tw-[a-z0-9-]+$/.test(k)||typeof v!=='boolean')throw Error('Invalid topic progress');topics[k]=v;}
  const history=[...new Set((input.history||[]).filter(w=>typeof w==='string'&&w.trim()&&w.length<=200))].slice(0,8);
  return {days:days.sort((a,b)=>b.date.localeCompare(a.date)),preferences,topics,history};
 }
 function mapMerge(base,local,remote){
  const out={...remote};for(const k of new Set([...Object.keys(base),...Object.keys(local)])){if(!safeKey(k))continue;if(!equal(base[k],local[k])){if(local[k]===undefined)delete out[k];else out[k]=clone(local[k]);}}return out;
 }
 const flatten=days=>Object.fromEntries(days.flatMap(d=>d.words.map(w=>[w.id,{...w,_date:d.date}])));
 function merge(base,local,remote){
  local=normalize(local);remote=normalize(remote);const initial=!base;base=base?normalize(base):emptyData();
  const b=flatten(base.days),l=flatten(local.days),r=flatten(remote.days),words={};
  for(const id of new Set([...Object.keys(r),...Object.keys(l),...Object.keys(b)])){
   if(b[id]&&(!l[id]||!r[id]))continue; // Deletions win over a stale copy.
   if(l[id]&&r[id])words[id]=initial?(Number(l[id].reviewCount||0)>Number(r[id].reviewCount||0)?l[id]:r[id]):mapMerge(b[id]||{},l[id],r[id]);
   else if(l[id]||r[id])words[id]=clone(l[id]||r[id]);
  }
  const dayMap=new Map();for(const d of [...remote.days,...local.days])if(initial||!base.days.some(x=>x.date===d.date)||local.days.some(x=>x.date===d.date)&&remote.days.some(x=>x.date===d.date))dayMap.set(d.date,{date:d.date,words:[]});
  for(const w of Object.values(words)){const date=w._date;delete w._date;if(!dayMap.has(date))dayMap.set(date,{date,words:[]});const list=dayMap.get(date).words,key=w.en.normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase(),old=list.find(x=>x.en.normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase()===key);if(!old)list.push(w);else if(Number(w.reviewCount||0)>Number(old.reviewCount||0))Object.assign(old,{...w,id:old.id});}
  let preferences,topics;
  if(initial){preferences={...remote.preferences};for(const k of Object.keys(defaults))if(equal(remote.preferences[k],defaults[k])&&!equal(local.preferences[k],defaults[k]))preferences[k]=local.preferences[k];topics={...remote.topics};for(const [k,v] of Object.entries(local.topics))if(v||topics[k]===undefined)topics[k]=v;}
  else{preferences=mapMerge(base.preferences,local.preferences,remote.preferences);topics=mapMerge(base.topics,local.topics,remote.topics);}
  return normalize({days:[...dayMap.values()],preferences,topics,history:equal(local.history,base.history)?remote.history:[...new Set([...local.history,...remote.history])].slice(0,8)});
 }
 function maxStats(a,b){const out=clone(a);for(const [date,v] of Object.entries(b)){const old=out[date]||{reviewed:0,correct:0};out[date]={reviewed:Math.max(old.reviewed,v.reviewed),correct:Math.max(old.correct,v.correct)};}return out;}
 function create({storage,rpc,apply=()=>{},onStatus=()=>{}}){
  let state=null,epoch=0,running=null,lastJournal=null;
  const clientId=root.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
  const journalKey=user=>'tutu.account.pending.v1.'+user+'.'+clientId;
  function journals(user){
   const out=[];if(typeof storage.key!=='function')return out;
   for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith('tutu.account.pending.v1.'+user+'.')){const raw=storage.getItem(k);if(!raw)continue;const v=JSON.parse(raw);if(v?.user===user&&object(v.events))out.push({key:k,raw,...v});}}
   return out.sort((a,b)=>a.updated-b.updated||a.key.localeCompare(b.key));
  }
  function absorbPending(){
   const pending=journals(state.user);
   for(const j of pending){state.data=merge(j.base,j.data,state.data);state.legacy=maxStats(state.legacy,cleanStats(j.legacy));state.events={...state.events,...j.events};}
   return pending;
  }

  const key=user=>'tutu.account.v1.'+user;
  function persist(){if(!state)return;try{storage.setItem(key(state.user),JSON.stringify(state));
   const dirty=!equal(state.data,state.base||emptyData())||Object.keys(state.events).length||!equal(state.legacy,state.remoteBaseline);
   if(dirty){lastJournal=clone({user:state.user,base:state.base,data:state.data,legacy:state.legacy,events:state.events,updated:Date.now()});storage.setItem(journalKey(state.user),JSON.stringify(lastJournal));}
   else{storage.removeItem?.(journalKey(state.user));lastJournal=null;}}catch{onStatus({kind:'local-error'});throw Object.assign(Error('Cannot save account data on this device'),{code:'LOCAL_STORAGE'});}}
  function visible(){
   if(!state)return null;const activity=clone(state.activity);
   for(const [date,v] of Object.entries(state.legacy)){const old=state.remoteBaseline[date]||{reviewed:0,correct:0},a=activity[date]||{reviewed:0,correct:0};a.reviewed+=Math.max(0,v.reviewed-old.reviewed);a.correct=Math.min(a.reviewed,a.correct+Math.max(0,v.correct-old.correct));activity[date]=a;}
   for(const e of Object.values(state.events)){const a=activity[e.date]||{reviewed:0,correct:0};a.reviewed++;a.correct+=Number(e.known);activity[e.date]=a;}
   return {user:state.user,data:clone(state.data),activity};
  }
  function start(user,seed={}){
   if(typeof user!=='string'||!user||user.length>100)throw Error('Invalid user');if(state?.user===user)return visible();epoch++;running=null;
   const raw=storage.getItem(key(user));let saved=null;
   if(raw){saved=JSON.parse(raw);if(saved.user!==user)throw Error('Account cache owner mismatch');saved.data=normalize(saved.data);if(saved.base)saved.base=normalize(saved.base);cleanStats(saved.activity);cleanStats(saved.legacy);cleanStats(saved.remoteBaseline);if(!object(saved.events))throw Error('Invalid pending reviews');}
   state=saved||{version:1,user,data:normalize(seed.data||emptyData()),base:null,legacy:cleanStats(seed.activity||{}),remoteBaseline:{},activity:{},events:{}};
   absorbPending();persist();onStatus({kind:'pending'});return visible();
  }
  function stop(){epoch++;running=null;state=null;lastJournal=null;}
  function capture(data){if(!state)return;state.data=normalize(data);persist();onStatus({kind:'pending'});}
  function recordReview(event){
   if(!state)return;const id=root.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.random()*16|0;return(c==='x'?n:(n&3|8)).toString(16);});
   if(!validDate(event.date)||typeof event.known!=='boolean'||!['lat_the','ghep_cap'].includes(event.mode))throw Error('Invalid review');
   state.events[id]={id,date:event.date,known:event.known,mode:event.mode,word:String(event.word||'').slice(0,200),wordId:event.wordId||null,topic:event.topic||null,at:new Date().toISOString(),progress:event.progress||progress(state.data.days.flatMap(d=>d.words).find(w=>w.id===event.wordId))};persist();onStatus({kind:'pending'});return id;
  }
  function response(value){
   if(!object(value)||!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('Invalid cloud revision');
   return {...value,data:normalize(value.data),activity:cleanStats(value.activity),baseline:cleanStats(value.baseline)};
  }
  async function call(name,args,user){const result=await rpc(name,{...args,p_nguoi_dung_id:user});if(result?.error)throw result.error;if(!result||!('data'in result))throw Error('Invalid server response');return result.data;}
  function flush(){
   if(!state)return Promise.resolve(false);if(running)return running;const token=epoch,user=state.user;
   const active=()=>state?.user===user&&epoch===token;
   const task=(async()=>{onStatus({kind:'syncing'});try{
    // Another tab may already have committed our exact pending journal.
    if(lastJournal&&storage.removeItem&&storage.getItem(journalKey(user))===null&&equal(lastJournal.data,state.data)&&equal(lastJournal.events,state.events)){
     const cached=JSON.parse(storage.getItem(key(user))||'null');if(cached?.user===user&&cached.base){state=cached;state.data=normalize(state.data);lastJournal=null;}
    }
    for(let attempt=0;attempt<5;attempt++){
     const pending=absorbPending();
     const loaded=await call('tu_tu_tai_du_lieu',{p_revision:state.revision??null,p_event_ids:Object.keys(state.events)},user);if(!active())return false;
     let remote;
     if(loaded?.unchanged){if(!state.base||loaded.revision!==state.revision)throw Error('Invalid unchanged response');remote={revision:state.revision,data:clone(state.base),activity:clone(state.activity),baseline:clone(state.remoteBaseline),acknowledged:loaded.acknowledged};}
     else remote=response(loaded);
     const acknowledged=new Set(remote.acknowledged||[]),allEvents=Object.values(state.events),remaining=allEvents.filter(e=>!acknowledged.has(e.id));
     for(const e of allEvents.filter(e=>acknowledged.has(e.id))){
      const newer=remaining.some(x=>x.topic===e.topic&&x.wordId===e.wordId);
      if(!newer&&e.topic&&e.wordId){const key=e.topic+':'+e.wordId;if(state.data.topics[key]===e.known){if(remote.data.topics[key]===undefined)delete state.data.topics[key];else state.data.topics[key]=remote.data.topics[key];}}
      else if(!newer&&e.wordId){const localWord=state.data.days.flatMap(d=>d.words).find(w=>w.id===e.wordId),cloudWord=remote.data.days.flatMap(d=>d.words).find(w=>w.id===e.wordId);if(localWord&&cloudWord&&equal(progress(localWord),e.progress)){for(const k of Object.keys(progress(cloudWord))){if(cloudWord[k]===undefined)delete localWord[k];else localWord[k]=cloudWord[k];}}}
      delete state.events[e.id];
     }
     const local=clone(state.data),merged=merge(state.base,local,remote.data),baseline=maxStats(remote.baseline,state.legacy),events=Object.values(state.events).map(clone);
     // A review is an explicit intent even when false equals the cached base.
     for(const e of events){
      if(e.topic&&e.wordId)merged.topics[e.topic+':'+e.wordId]=e.known;
      else if(e.wordId){const target=merged.days.flatMap(d=>d.words).find(w=>w.id===e.wordId),source=local.days.flatMap(d=>d.words).find(w=>w.id===e.wordId);if(target&&source){for(const k of ['remembered','reviewLevel','reviewCount','lastReviewed','nextReview']){if(source[k]!==undefined)target[k]=source[k];else delete target[k];}target.remembered=e.known;}}
     }
     const changed=!equal(merged,remote.data)||!equal(baseline,remote.baseline)||events.length;
     let answer=remote;
     if(changed){const result=await call('tu_tu_luu_du_lieu',{p_revision:remote.revision,p_data:merged,p_baseline:baseline,p_events:events},user);if(!active())return false;if(result?.conflict)continue;answer=response(result);}
     if(!active())return false;
     state.data=merge(local,state.data,answer.data);state.base=clone(answer.data);state.revision=answer.revision;state.activity=answer.activity;state.remoteBaseline=answer.baseline;state.legacy=maxStats(state.legacy,answer.baseline);for(const e of events)delete state.events[e.id];persist();
     for(const j of pending)if(storage.getItem(j.key)===j.raw)storage.removeItem?.(j.key);
     apply(visible());
     if(equal(state.data,state.base)&&!Object.keys(state.events).length){onStatus({kind:'saved'});return true;}
    }
    onStatus({kind:'pending'});return false;
   }catch(error){if(active())onStatus({kind:error?.code==='LOCAL_STORAGE'?'local-error':['PGRST202','42P01','42883'].includes(error?.code)?'setup':error?.code?'error':'offline',message:error?.message||''});return false;}})();
   running=task;void task.finally(()=>{if(running===task)running=null;});return task;
  }
  return {start,stop,capture,recordReview,flush,snapshot:visible};
 }
 root.TuTuSync={create,merge,emptyData};
})(globalThis);
