 'use strict';
const {onDocumentCreated,onDocumentUpdated}=require('firebase-functions/v2/firestore');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore');
const nodemailer=require('nodemailer');
const {buildTicketEmail}=require('./support-email-content');
if(!getApps().length)initializeApp();
const db=getFirestore(),smtp=defineSecret('APPROVAL_SMTP');
async function sendStatusEmail(event,ticket,created){
 const content=buildTicketEmail(ticket,event.params.ticketId,created);if(!content)return;
 const user=await db.collection('users').doc(ticket.requesterId).get();
 if(!user.exists||!user.data().email)return;
 const email=user.data().email;
 const ref=db.collection('supportEmailDeliveries').doc(Buffer.from(event.id).toString('base64url'));
 const claim=await db.runTransaction(async tx=>{
  const previous=await tx.get(ref),data=previous.exists?previous.data():{};
  if(data.state==='sent'||(data.state==='sending'&&data.leaseUntil?.toMillis()>Date.now()))return false;
  tx.set(ref,{ticketId:event.params.ticketId,recipientId:ticket.requesterId,state:'sending',leaseUntil:Timestamp.fromMillis(Date.now()+10*60*1000),updatedAt:FieldValue.serverTimestamp()},{merge:true});return true;
 });if(!claim)return;
 try{
  const config=JSON.parse(smtp.value());
  if(!config.host||!config.from||!config.user||!config.password)throw new Error('Support email SMTP configuration is incomplete');
  const transport=nodemailer.createTransport({host:config.host,port:config.port||465,secure:config.secure!==false,auth:{user:config.user,pass:config.password}});
  await transport.sendMail({from:config.from,to:email,...content,messageId:'<support-'+Buffer.from(event.id).toString('base64url')+'@engineer-hub-1438.web.app>'});
  await ref.set({state:'sent',sentAt:FieldValue.serverTimestamp()},{merge:true});
 }catch(error){await ref.set({state:'failed',updatedAt:FieldValue.serverTimestamp()},{merge:true});throw error;}
}
exports.supportTicketReceivedEmail=onDocumentCreated({document:'supportTickets/{ticketId}',secrets:[smtp],retry:true},async event=>{if(event.data)await sendStatusEmail(event,event.data.data(),true);});
exports.supportTicketStatusEmail=onDocumentUpdated({document:'supportTickets/{ticketId}',secrets:[smtp],retry:true},async event=>{if(!event.data)return;const before=event.data.before.data(),after=event.data.after.data();if(before.status!==after.status)await sendStatusEmail(event,after,false);});
