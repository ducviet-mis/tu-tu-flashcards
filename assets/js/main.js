/* Bootstrap runs after all deferred feature files. */
'use strict';
initializeAccountData();
applyTheme();
if(TuTuAuth.callbackKind(location.href||'https://local.invalid/'))app.innerHTML='<p class="auth-message" role="status">Đang xác nhận đăng nhập…</p>';else route();
updateAccountHeader();
void initializeAccount();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change',applyTheme);
initPwa();
