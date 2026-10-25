/* Account lifecycle and automatic saving. Keep cloud work outside Auth callbacks. */
'use strict';
let accountDataTimer=null,accountDataPending=Promise.resolve(false),accountDataStatus={kind:'guest'},accountIdentityPending=null,accountIdentityChecked=0;
const accountDataKeys=[STORE,PREF_STORE,ACTIVITY_STORE,TOPIC_PROGRESS_STORE,LOOKUP_HISTORY_STORE];
function currentLearningData(){return {days,preferences,topics:topicProgress,history:recentLookups};}
function accountDataStatusText(){
 if(!accountUser)return dataOwner?'Đang xác nhận tài khoản…':'Đang lưu trên thiết bị này';
 return {pending:'Đã lưu trên thiết bị · Đang chờ lưu vào tài khoản',syncing:'Đang cập nhật dữ liệu tài khoản…',saved:'Đã lưu vào tài khoản',offline:'Đã lưu trên thiết bị · Sẽ cập nhật khi có mạng',setup:'Chưa bật lưu theo tài khoản. Tiến trình đang được giữ trên thiết bị.',error:'Đã lưu trên thiết bị · Chưa lưu được vào tài khoản', 'local-error':'Chưa lưu được trên thiết bị. Hãy kiểm tra dung lượng trình duyệt.'}[accountDataStatus.kind]||'Đã lưu trên thiết bị';
}
function updateAccountDataStatus(status=accountDataStatus){
 accountDataStatus=status;const label=accountDataStatusText(),indicator=$('#save-indicator');if(indicator)indicator.textContent=label;
 document.querySelectorAll('[data-account-data-status]').forEach(el=>{el.textContent=label;el.setAttribute('data-state',status.kind);});
}
function refreshLearningViews(force=false){
 applyTheme();updateThemeControls(preferences.theme);updateAccountHeader();
 const page=(location.hash||'#/').split('/')[1]?.split('?')[0];updateNav(session?.fromReview?'review':['day','flip','match','type','listen','result','topic'].includes(page)?'notebook':page||'home');
 if(study.open||utility.open)return;
 const active=document.activeElement;
 if(!force&&(profileHasUnsavedChanges()||['INPUT','TEXTAREA','SELECT'].includes(active?.tagName)))return;
 if(accountPages.includes(page)){if(page==='account')renderAccount();}
 else renderBase();
 updateAccountDataStatus();
}
function applyAccountSnapshot(snapshot,force=false){
 if(snapshot.user!==dataOwner)return;
 days=C.validateBackup({version:1,days:snapshot.data.days});preferences={...snapshot.data.preferences};topicProgress={...snapshot.data.topics};recentLookups=[...snapshot.data.history];activity={...snapshot.activity};writeBlocked=false;
 saveLearningSnapshot();refreshLearningViews(force);
}
function saveLearningSnapshot(){
 const values=[{version:1,days},preferences,activity,topicProgress,recentLookups];
 try{accountDataKeys.forEach((key,i)=>localStorage.setItem(learningStorageKey(key),JSON.stringify(values[i])));}catch{updateAccountDataStatus({kind:'local-error'});}
}
const accountDataController=TuTuSync.create({storage:localStorage,apply:applyAccountSnapshot,onStatus:updateAccountDataStatus,rpc:(name,args)=>{
 if(!accountConnection.enabled||accountUser?.id!==dataOwner)throw Error('Account is not ready');
 if(typeof accountConnection.client.rpc!=='function')throw {code:'PGRST202',message:'Account data connection unavailable'};
 let request=accountConnection.client.rpc(name,args);if(request?.abortSignal&&globalThis.AbortSignal?.timeout)request=request.abortSignal(AbortSignal.timeout(15000));return request;
}});
function scheduleAccountData(delay=650){
 clearTimeout(accountDataTimer);if(!dataOwner)return;
 accountDataTimer=setTimeout(()=>{accountDataTimer=null;void flushAccountData();},delay);
}
function accountDataChanged(){
 if(!dataOwner)return;
 try{accountDataController.capture(currentLearningData());}catch{updateAccountDataStatus({kind:'local-error'});}
 scheduleAccountData();
}
function accountDataReview(word,known){
 if(!dataOwner)return;
 try{accountDataController.capture(currentLearningData());accountDataController.recordReview({date:C.isoToday(),word:word.en,wordId:word.id,known,mode:session?.type==='match'?'ghep_cap':'lat_the',topic:session?.fromTopic||word._topic||null,progress:Object.fromEntries(['remembered','reviewLevel','reviewCount','lastReviewed','nextReview'].map(k=>[k,word[k]??null]))});}catch{updateAccountDataStatus({kind:'local-error'});}
 scheduleAccountData();
}
async function refreshAccountIdentity(force=false){
 const user=dataOwner,auth=accountConnection.client?.auth;
 if(!user||accountUser?.id!==user||typeof auth?.getUser!=='function')return false;
 if(accountIdentityPending)return accountIdentityPending;
 if(!force&&Date.now()-accountIdentityChecked<60000)return true;
 accountIdentityChecked=Date.now();
 const request=(async()=>{let timer;try{
  const result=await Promise.race([auth.getUser(),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),8000);})]);
  if(result?.error||!result?.data?.user||dataOwner!==user||accountUser?.id!==user||result.data.user.id!==user)return false;
  if(JSON.stringify(accountUser)!==JSON.stringify(result.data.user)){accountUser=result.data.user;const identity=$('.profile-identity-card');if(identity)identity.innerHTML=profileIdentityCardContent();refreshLearningViews();}
  return true;
 }catch{return false;}finally{clearTimeout(timer);}})();
 accountIdentityPending=request;void request.finally(()=>{if(accountIdentityPending===request)accountIdentityPending=null;});return request;
}
function flushAccountData(){
 clearTimeout(accountDataTimer);accountDataTimer=null;
 if(!dataOwner||accountUser?.id!==dataOwner)return Promise.resolve(false);
 accountDataPending=(async()=>{const saved=await accountDataController.flush();await refreshAccountIdentity();return saved;})();return accountDataPending;
}
function readLearningSnapshot(){
 const parse=(key,fallback)=>{const raw=localStorage.getItem(learningStorageKey(key));return raw?JSON.parse(raw):fallback;};
 const savedDays=C.validateBackup(parse(STORE,{version:1,days:[]}));
 return {data:{days:savedDays,preferences:parse(PREF_STORE,TuTuSync.emptyData().preferences),topics:parse(TOPIC_PROGRESS_STORE,{}),history:parse(LOOKUP_HISTORY_STORE,[])},activity:parse(ACTIVITY_STORE,{})};
}
function switchAccountData(user){
 const next=user?.id||'';if(next===dataOwner){if(next)scheduleAccountData(0);updateAccountDataStatus();return;}
 if(dataOwner){try{accountDataController.capture(currentLearningData());}catch{}}
 clearTimeout(accountDataTimer);accountIdentityPending=null;accountIdentityChecked=0;accountDataController.stop();stopSession();if(study.open)study.close();if(utility.open)utility.close();closeSuggestions();closeHomeSuggestions();stopPronunciation();topicPageToken++;
 $('#toasts').innerHTML='';editId=null;bulkDate=null;selected=C.isoToday();
 let seed=null;
 try{
  if(next&&!localStorage.getItem('tutu.legacy-owner.v1')){
   // Claim legacy shared data once; preserve its original bytes for recovery.
   const previous=dataOwner;dataOwner='';seed=readLearningSnapshot();dataOwner=previous;
   localStorage.setItem('tutu.legacy-owner.v1',next);
  }
  dataOwner=next;localStorage.setItem('tutu.active-user.v1',next);
  if(next){const snapshot=accountDataController.start(next,seed||readLearningSnapshot());applyAccountSnapshot(snapshot,true);}
  else{const guest=readLearningSnapshot();days=guest.data.days;preferences={...guest.data.preferences};topicProgress={...guest.data.topics};recentLookups=[...guest.data.history];activity={...guest.activity};writeBlocked=false;refreshLearningViews(true);updateAccountDataStatus({kind:'guest'});}
 }catch{
  // Never show the previous account's values if a different cache is unreadable.
  dataOwner=next;days=[];preferences=TuTuSync.emptyData().preferences;topicProgress={};recentLookups=[];activity={};writeBlocked=true;refreshLearningViews(true);updateAccountDataStatus({kind:'local-error'});
 }
 if(next)scheduleAccountData(0);
}
function initializeAccountData(){
 if(dataOwner){try{const snapshot=accountDataController.start(dataOwner,readLearningSnapshot());applyAccountSnapshot(snapshot);}catch{writeBlocked=true;updateAccountDataStatus({kind:'local-error'});}}
 window.addEventListener('online',()=>scheduleAccountData(0));window.addEventListener('focus',()=>scheduleAccountData(0));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')scheduleAccountData(0);});
 window.addEventListener('storage',event=>{if(dataOwner&&event.key?.startsWith('tutu.account.'))scheduleAccountData(0);});
 setInterval(()=>{if(dataOwner&&accountUser?.id===dataOwner&&document.visibilityState!=='hidden')void flushAccountData();},20000);
}
