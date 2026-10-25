'use strict';
module.exports=require('../../server/push/http.cjs').createHandler('test',{config:{cronSecret:process.env.CRON_SECRET}});
