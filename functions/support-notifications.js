 'use strict';
const {onDocumentCreated,onDocumentUpdated}=require('firebase-functions/v2/firestore');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
if(!getApps().length)initializeApp();
const db=getFirestore();
const {ensureTicketNumber}=require('./ticket-numbering');
exports.supportTicketNumberAssigned=onDocumentCreated({document:'supportTickets/{ticketId}',retry:true},event=>ensureTicketNumber(event.params.ticketId));
async function admins(){const snapshot=await db.collection('users').where('role','==','Admin').get();return snapshot.docs.filter(d=>d.data().status==='Active').map(d=>d.id);}
async function send(event,ticket,ids,message,actor){
 const recipients=[...new Set(ids.filter(id=>id&&id!==actor))];
 await Promise.all(recipients.map(async uid=>{
  const person=await db.collection('users').doc(uid).get();if(!person.exists||person.data().status!=='Active')return;
  const id=Buffer.from(event.id).toString('base64url');
  await db.collection('supportNotifications').doc(uid).collection('items').doc(id).set({message,route:'support-ticket/'+event.params.ticketId,createdAt:FieldValue.serverTimestamp(),userId:uid,kind:'support'});
 }));
}
exports.supportTicketCreated=onDocumentCreated('supportTickets/{ticketId}',async event=>{
 if(!event.data)return;const ticket=event.data.data();if(ticket.clientNotifications)return;await send(event,ticket,await admins(),'New support ticket: '+ticket.subject,ticket.requesterId);
});
exports.supportTicketStatusChanged=onDocumentUpdated('supportTickets/{ticketId}',async event=>{
 const before=event.data.before.data(),ticket=event.data.after.data();if(ticket.clientNotifications)return;if(before.status===ticket.status&&before.assignedDeveloperId===ticket.assignedDeveloperId)return;
 const ids=[ticket.requesterId,...await admins()];
 if(ticket.assignedDeveloperId){const staff=await db.collection('supportStaff').doc(ticket.assignedDeveloperId).get();const assignee=await db.collection('users').doc(ticket.assignedDeveloperId).get();if((staff.exists&&staff.data().enabled)||(assignee.exists&&assignee.data().status==='Active'&&['Admin','NCO / Leader'].includes(assignee.data().role)))ids.push(ticket.assignedDeveloperId);}
 await send(event,ticket,ids,'Support ticket '+ticket.status+': '+ticket.subject,ticket.lastActorId);
});
exports.supportTicketReply=onDocumentCreated('supportTickets/{ticketId}/messages/{messageId}',async event=>{
 if(!event.data)return;const message=event.data.data();if(message.clientNotifications||message.kind!=='reply')return;
 const parent=await db.collection('supportTickets').doc(event.params.ticketId).get();if(!parent.exists)return;const ticket=parent.data();
 const ids=message.authorId===ticket.requesterId?await admins():[ticket.requesterId];await send(event,ticket,ids,'New reply on support ticket: '+ticket.subject,message.authorId);
});
exports.supportInternalNote=onDocumentCreated('supportTickets/{ticketId}/internalNotes/{noteId}',async event=>{
 if(!event.data)return;const note=event.data.data();if(note.clientNotifications||note.kind!=='note')return;
 const parent=await db.collection('supportTickets').doc(event.params.ticketId).get();if(!parent.exists)return;const ticket=parent.data(),ids=await admins();
 if(ticket.assignedDeveloperId){const staff=await db.collection('supportStaff').doc(ticket.assignedDeveloperId).get();const assignee=await db.collection('users').doc(ticket.assignedDeveloperId).get();if((staff.exists&&staff.data().enabled)||(assignee.exists&&assignee.data().status==='Active'&&['Admin','NCO / Leader'].includes(assignee.data().role)))ids.push(ticket.assignedDeveloperId);}
 await send(event,ticket,ids,'Internal support update: '+ticket.subject,note.authorId);
});
