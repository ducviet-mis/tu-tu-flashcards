'use strict';
module.exports=require('../../server/push/http.cjs').createHandler('unsubscribe',{config:{cronSecret:process.env.CRON_SECRET}});
