'use strict';
module.exports=require('../../server/push/http.cjs').createHandler('cron',{config:{cronSecret:process.env.CRON_SECRET}});
