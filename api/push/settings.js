'use strict';
module.exports=require('../../server/push/http.cjs').createHandler('settings',{config:{cronSecret:process.env.CRON_SECRET}});
