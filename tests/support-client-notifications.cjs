const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('support-tickets.js','utf8');const helper=source.slice(source.indexOf(' function addTicketNotices('),source.indexOf(' async function updateTicket('));
const state={currentUserId:'admin',demoUsers:[{id:'admin',role:'Admin',status:'Active'},{id:'admin2',role:'Admin',status:'Active'},{id:'member',role:'Soldier',status:'Active'},{id:'team',role:'NCO / Leader',status:'Active'},{id:'other',role:'Soldier',status:'Active'},{id:'disabled',role:'Admin',status:'Disabled'}]};
const writes=[];const c={state,firebase:{firestore:{FieldValue:{serverTimestamp:()=>123}}},db:()=>({collection:()=>({doc:id=>({collection:()=>({doc:event=>({id,event})})})})})};vm.createContext(c);vm.runInContext(helper+';this.send=addTicketNotices',c);const writer={set:(ref,data)=>writes.push({ref,data})},ticket={id:'t1',requesterId:'member',assignedDeveloperId:'team'};
function send(actor,source){writes.length=0;state.currentUserId=actor;c.send(writer,ticket,'event1',source,'TKT-0001 · Update');return writes.map(w=>w.ref.id).sort();}
assert.deepEqual(send('admin','messages'),['admin2','member','team']);
assert.deepEqual(send('member','messages'),['admin','admin2','team']);
assert.deepEqual(send('team','internalNotes'),['admin','admin2']);
assert.deepEqual(send('admin','internalNotes'),['admin2','team']);
assert.deepEqual(send('member','ticket'),['admin','admin2','team']);
assert(!writes.some(w=>w.ref.id==='other'||w.ref.id==='disabled'));
assert(writes.every(w=>w.data.route==='support-ticket/t1'&&w.data.eventId==='event1'));
console.log('Passed: status/update recipients, member replies, private team replies to Admin, assignment recipients, disabled/unrelated exclusions and ticket links.');
