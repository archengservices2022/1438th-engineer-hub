const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const users={member:{status:'Active',role:'Soldier'},other:{status:'Active',role:'Soldier'},admin:{status:'Active',role:'Admin'},dev:{status:'Active',role:'NCO / Leader'}};
let ticket={subject:'Cannot save task',requesterId:'member',status:'Escalated',assignedDeveloperId:'dev',lastActorId:'admin'},writes=[];
const db={collection(name){
 if(name==='users')return {where(){return {get:async()=>({docs:[{id:'admin',data:()=>users.admin}]})}},doc:id=>({get:async()=>({exists:!!users[id],data:()=>users[id]})})};
 if(name==='supportStaff')return {doc:id=>({get:async()=>({exists:id==='dev',data:()=>({enabled:true})})})};
 if(name==='supportTickets')return {doc:()=>({get:async()=>({exists:true,data:()=>ticket})})};
 if(name==='supportNotifications')return {doc:uid=>({collection:()=>({doc:id=>({set:async data=>writes.push({uid,id,data})})})})};
 throw Error(name);
}};
const output={};const context={exports:output,Buffer,require:name=>name==='firebase-functions/v2/firestore'?{onDocumentCreated:(_,fn)=>fn,onDocumentUpdated:(_,fn)=>fn}:name==='firebase-admin/app'?{getApps:()=>[{}],initializeApp(){}}:{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>123}}};vm.runInNewContext(fs.readFileSync('functions/support-notifications.js','utf8'),context);
const event=data=>({id:'event-1',params:{ticketId:'t1'},data:{data:()=>data}});
(async()=>{
 await output.supportTicketCreated(event(ticket));assert.deepEqual(writes.map(w=>w.uid),['admin']);
 const firstId=writes[0].id;writes=[];await output.supportTicketCreated(event(ticket));assert.equal(writes[0].id,firstId);
 writes=[];await output.supportTicketStatusChanged({id:'status-1',params:{ticketId:'t1'},data:{before:{data:()=>({...ticket,status:'Open'})},after:{data:()=>ticket}}});assert.deepEqual(writes.map(w=>w.uid).sort(),['dev','member']);
 writes=[];await output.supportTicketReply(event({kind:'reply',authorId:'member'}));assert.deepEqual(writes.map(w=>w.uid),['admin']);
 writes=[];await output.supportTicketReply(event({kind:'reply',authorId:'admin'}));assert.deepEqual(writes.map(w=>w.uid),['member']);
 writes=[];await output.supportInternalNote(event({kind:'note',authorId:'dev'}));assert.deepEqual(writes.map(w=>w.uid),['admin']);assert(!writes.some(w=>['member','other'].includes(w.uid)));
 console.log('Passed: new ticket, retry identity, escalation, both public reply directions, and private-note recipients.');
})().catch(error=>{console.error(error);process.exitCode=1;});
