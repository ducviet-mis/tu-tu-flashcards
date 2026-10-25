'use strict';
module.exports=require('../../server/push/http.cjs').createHandler('subscribe',{config:{cronSecret:process.env.CRON_SECRET}});
