/* Bootstrap runs after all deferred feature files. */
'use strict';
applyTheme();
route();
if(preferences.theme==='system')window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change',applyTheme);
initPwa();
