 'use strict';
const {getFirestore}=require('firebase-admin/firestore');
async function ensureTicketNumber(id,db=getFirestore()){
 const ref=db.collection('supportTickets').doc(id),counter=db.collection('supportCounters').doc('tickets');
 return db.runTransaction(async tx=>{
  const ticket=await tx.get(ref);if(!ticket.exists)return null;
  if(ticket.data().ticketNumber)return ticket.data().ticketNumber;
  const sequence=await tx.get(counter),last=sequence.exists?sequence.data().lastNumber:0;
  if(!Number.isSafeInteger(last)||last<0)throw new Error('Invalid ticket counter');
  const next=last+1,number='TKT-'+String(next).padStart(4,'0');
  tx.set(counter,{lastNumber:next});tx.update(ref,{ticketNumber:number});return number;
 });
}
module.exports={ensureTicketNumber};
