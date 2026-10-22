// events.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');
  if(!b||b.disabled)return;
  const action=b.dataset.action,id=b.dataset.id;
  switch(action){
    case'add-today':addToday();
    break;
    case'backup':backupOpen();
    break;
    case'cloud':if(cloudBusy)toast('Đang đồng bộ. Vui lòng chờ hoàn tất.');
    else cloudOpen();
    break;
    case'bulk':bulkOpen();
    break;
    case'close-utility':utility.close();
    break;
    case'edit':editOpen(id);
    break;
    case'delete':deleteWord(id);
    break;
    case'speak':{
      const w=day().words.find(w=>w.id===id);
      if(w)speak(w.en);
      break;
    }
    case'toggle':{
      const w=day().words.find(w=>w.id===id);
      if(w){
        w.remembered=!w.remembered;
        persist();
        renderBase();
        toast(w.remembered?'Đã đánh dấu nhớ “'+w.en+'”.':'Đã chuyển “'+w.en+'” sang cần ôn.');
      }
      break;
    }
    case'bulk-add':{
      const p=bulkParsed();
      if(!p.words.length)return;
      ensureDay(bulkDate).words.push(...p.words.map(w=>({
        ...w,id:C.uid(),remembered:false
      }
      )));
      persist();
      utility.close();
      renderBase();
      $('#english')?.focus();
      toast('Đã thêm '+p.words.length+' từ mới.');
      break;
    }
    case'export':exportFile();
    break;
    case'import':applyImport();
    break;
    case'start-flip':startStudy('flip');
    break;
    case'start-match':startStudy('match');
    break;
    case'review':startStudy('flip',true);
    break;
    case'close-study':closeStudy();
    break;
    case'flip-card':flipCard();
    break;
    case'answer-no':answer(false);
    break;
    case'answer-yes':answer(true);
    break;
    case'session-speak':if(session?.type==='flip')speak(session.words[session.index].en);
    break;
    case'shuffle':if(session?.type==='flip'){
      const s=session;
      s.words=[...s.words.slice(0,s.index),...C.shuffle(s.words.slice(s.index))];
      s.flipped=false;
      renderFlip();
      toast('Đã xáo các thẻ còn lại.');
    }
    break;
    case'reverse':if(session?.type==='flip'){
      session.reversed=!session.reversed;
      session.flipped=false;
      renderFlip();
    }
    break;
    case'match-cell':selectCell(Number(b.dataset.cell));
    break;
    case'restart-match':{
      const date=session.date;
      stopSession();
      createSession('match',date,false);
      renderMatch();
      break;
    }
    case'finish-match':finishStudy();
    break;
    case'result-review':{
      const global=session.fromReview,date=session.date;
      stopSession();
      if(global)startGlobalReview('unknown');
      else go('#/flip/'+date+'?review=1');
      break;
    }
    case'home':go('#/');
    break;
    case'sample':sample();
    break;
    case'generate-key':{
      if(!globalThis.crypto?.getRandomValues){
        toast('Không tạo được mã ngẫu nhiên trên trình duyệt này.',null,'',true);
        break;
      }
      const a=new Uint8Array(32);
      crypto.getRandomValues(a);
      $('#cloud-key').value=[...a].map(n=>n.toString(16).padStart(2,'0')).join('');
      toast('Đã tạo mã mới. Lưu cấu hình và cất một bản riêng.');
      break;
    }
    case'show-key':$('#cloud-key').type=$('#cloud-key').type==='password'?'text':'password';
    break;
    case'copy-key':{
      const key=$('#cloud-key').value;
      if(!key){
        toast('Hãy tạo hoặc nhập mã trước.');
        break;
      }
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(key).then(()=>toast('Đã sao chép mã đồng bộ.')).catch(()=>{
        toast('Không sao chép được. Bấm HIỆN rồi tự sao chép mã.');
      }
      );
      else toast('Bấm HIỆN rồi tự sao chép mã đồng bộ.');
      break;
    }
    case'cloud-push':cloudAction('push');
    break;
    case'cloud-pull':cloudAction('pull');
    break;
    case'disconnect':cloud={
      url:'',apiKey:'',key:'',revision:null
    }
    ;
    saveConfig();
    cloudOpen();
    toast('Đã xóa cấu hình trên máy. Từ vựng vẫn được giữ.');
    break;
  }
}
);
utility.addEventListener('input',e=>{
  if(e.target.id==='bulk-text')bulkPreview();
}
);
utility.addEventListener('change',e=>{
  if(e.target.id==='import-file')readImport(e.target.files[0]);
}
);
utility.addEventListener('submit',e=>{
  e.preventDefault();
  if(e.target.id==='edit-form'){
    const {
      id,date
    }
    =editId,en=$('#edit-en').value.trim().normalize('NFC'),vi=$('#edit-vi').value.trim().normalize('NFC'),d=day(date),w=d.words.find(w=>w.id===id);
    if(!en||!vi||!w)return;
    if(d.words.some(w=>w.id!==id&&C.wordKey(w.en)===C.wordKey(en))){
      toast('Từ tiếng Anh này đã có trong ngày.',null,'',true);
      return;
    }
    w.en=en;
    w.vi=vi;
    w.example=$('#edit-example').value.trim();
    w.exampleVi=$('#edit-example-vi').value.trim();
    w.remembered=false;
    w.reviewLevel=0;
    w.nextReview=C.isoToday();
    persist();
    utility.close();
    renderBase();
    toast('Đã sửa từ. Từ được chuyển sang cần ôn lại.');
  }
  else if(e.target.id==='cloud-form'){
    try{
      configureCloud();
      $('#cloud-status').textContent='Đã lưu cấu hình. Chọn tải lên hoặc tải xuống.';
      toast('Đã lưu cấu hình đồng bộ.');
    }
    catch(e){
      toast(e.message,null,'',true);
    }
  }
}
);
utility.addEventListener('close',()=>{
  if(utilityReturn?.isConnected)utilityReturn.focus({
    preventScroll:true
  }
  );
}
);
study.addEventListener('cancel',e=>{
  e.preventDefault();
  closeStudy();
}
);
document.addEventListener('keydown',e=>{
  if(!study.open||utility.open||e.repeat||e.ctrlKey||e.altKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(session?.type==='flip'){
    if(e.code==='Space'){
      e.preventDefault();
      flipCard();
    }
    else if(e.code==='ArrowLeft'){
      e.preventDefault();
      answer(false);
    }
    else if(e.code==='ArrowRight'){
      e.preventDefault();
      answer(true);
    }
  }
}
);
window.addEventListener('hashchange',()=>{
  if(utility.open)utility.close();
  route();
}
);
window.addEventListener('storage',e=>{
  if(e.key===STORE){
    storageError('Dữ liệu vừa thay đổi ở một tab khác. Hãy xuất file của tab này trước khi tải lại trang để lấy bản mới.');
    writeBlocked=true;
  }
}
);
function sample(){
  const samples=[['assemble','lắp ráp'],['merchandise','hàng hóa'],['dock','bến tàu'],['wrap','bọc; gói'],['post','đăng; gửi thư'],['pull','kéo'],['income','thu nhập'],['profit','lợi nhuận']];
  const today=C.isoToday(),y=new Date();
  y.setDate(y.getDate()-1);
  const previous=C.isoToday(y),z=new Date();
  z.setDate(z.getDate()-2);
  const demo=[{
    date:today,words:samples.map(([en,vi],i)=>({
      id:C.uid(),en,vi,remembered:i<2
    }
    ))
  }
  ,{
    date:previous,words:[{
      id:C.uid(),en:'opportunity',vi:'cơ hội',remembered:true
    }
    ,{
      id:C.uid(),en:'achieve',vi:'đạt được',remembered:false
    }
    ,{
      id:C.uid(),en:'improve',vi:'cải thiện',remembered:false
    }
    ]
  }
  ,{
    date:C.isoToday(z),words:[{
      id:C.uid(),en:'consistent',vi:'kiên trì; nhất quán',remembered:false
    }
    ,{
      id:C.uid(),en:'progress',vi:'sự tiến bộ',remembered:true
    }
    ,{
      id:C.uid(),en:'curious',vi:'tò mò; ham tìm hiểu',remembered:false
    }
    ]
  }
  ];
  days=C.mergeDays(days,demo);
  persist();
  selected=today;
  renderBase();
  toast('Đã nạp 14 từ mẫu để bạn trải nghiệm.');
}
