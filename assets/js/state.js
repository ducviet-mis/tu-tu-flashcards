// state.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
const C=FlashCore,$=s=>document.querySelector(s),app=$('#app'),study=$('#study-dialog'),utility=$('#utility-dialog');
const STORE='tungngay.v1';
let days=[],selected=C.isoToday(),session=null,lastBase='#/',focusBeforeStudy=null,utilityReturn=null,bulkDate=null,editId=null,writeBlocked=false;
