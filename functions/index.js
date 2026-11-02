const {onDocumentUpdated}=require('firebase-functions/v2/firestore');
const {defineSecret}=require('firebase-functions/params');
const nodemailer=require('nodemailer');
const smtp=defineSecret('APPROVAL_SMTP');
exports.approvalEmail=onDocumentUpdated({document:'users/{uid}',secrets:[smtp]},async event=>{
 const before=event.data.before.data(),after=event.data.after.data();
 if(before.status==='Active'||after.status!=='Active'||!after.email)return;
 const config=JSON.parse(smtp.value());
 const transport=nodemailer.createTransport({host:config.host,port:config.port||465,secure:config.secure!==false,auth:{user:config.user,pass:config.password}});
 await transport.sendMail({from:config.from,to:after.email,subject:'Your 1438th Engineer Hub account is approved',text:'Your account has been approved. You can now sign in at https://engineer-hub-1438.web.app'});
});

Object.assign(exports,require('./support-notifications'));

Object.assign(exports,require('./support-emails'));
