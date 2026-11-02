const fs=require('fs');
const deps='C:/Users/poran/Documents/Codex/2026-09-21/files-mentioned-by-the-user-1438th/tmp/support-rule-tests/node_modules/';
const localRequire=require('module').createRequire(deps+'../package.json');const {initializeTestEnvironment,assertSucceeds,assertFails}=localRequire('@firebase/rules-unit-testing');const {doc,getDoc,setDoc,updateDoc,collection,getDocs,query,where,serverTimestamp}=localRequire('firebase/firestore');
(async()=>{const env=await initializeTestEnvironment({projectId:'demo-support-audit',firestore:{host:'127.0.0.1',port:8189,rules:fs.readFileSync('firestore.rules','utf8')}});try{
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();for(const [uid,role]of [['member','Soldier'],['other','Soldier'],['admin','Admin'],['dev','NCO / Leader']])await setDoc(doc(db,'users/'+uid),{status:'Active',role});await setDoc(doc(db,'supportStaff/dev'),{enabled:true});await setDoc(doc(db,'supportTickets/t1'),{requesterId:'member',requesterName:'Member',subject:'Test',description:'Issue',category:'Tasks',status:'Escalated',assignedDeveloperId:'dev',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastActorId:'admin'});await setDoc(doc(db,'supportTickets/t1/internalNotes/n1'),{body:'Private'});await setDoc(doc(db,'supportTickets/t2'),{requesterId:'other',status:'Open'});await setDoc(doc(db,'supportNotifications/member/items/n1'),{message:'Private'});});
 const db=id=>env.authenticatedContext(id).firestore();
 await assertSucceeds(getDoc(doc(db('member'),'supportTickets/t1')));await assertFails(getDoc(doc(db('other'),'supportTickets/t1')));
 await assertSucceeds(getDoc(doc(db('dev'),'supportTickets/t1')));await assertFails(getDoc(doc(db('dev'),'supportTickets/t2')));
 await assertFails(getDoc(doc(db('member'),'supportTickets/t1/internalNotes/n1')));await assertSucceeds(getDoc(doc(db('dev'),'supportTickets/t1/internalNotes/n1')));
 await assertFails(setDoc(doc(db('member'),'supportStaff/member'),{enabled:true}));await assertSucceeds(setDoc(doc(db('admin'),'supportStaff/other'),{enabled:true}));
 await assertFails(updateDoc(doc(db('member'),'supportTickets/t1'),{status:'Resolved',updatedAt:serverTimestamp(),lastActorId:'member'}));
 await assertSucceeds(updateDoc(doc(db('admin'),'supportTickets/t1'),{status:'Resolved',updatedAt:serverTimestamp(),lastActorId:'admin'}));
 await assertSucceeds(getDoc(doc(db('member'),'supportNotifications/member/items/n1')));await assertFails(getDoc(doc(db('other'),'supportNotifications/member/items/n1')));
 await assertFails(setDoc(doc(db('member'),'supportNotifications/member/items/fake'),{message:'Fake'}));
 await assertSucceeds(getDocs(query(collection(db('dev'),'supportTickets'),where('assignedDeveloperId','==','dev'))));
 console.log('14 support privacy and permissions checks passed.');
 }finally{await env.cleanup();}})().catch(error=>{console.error(error);process.exitCode=1;});
