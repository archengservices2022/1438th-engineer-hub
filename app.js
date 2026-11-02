'use strict';
const I={home:'<path fill="currentColor" d="m2.8 10 9.2-7.4 9.2 7.4v10a1.1 1.1 0 0 1-1.1 1.1h-5.3v-7.2H9.2v7.2H3.9A1.1 1.1 0 0 1 2.8 20Z"/>',binoculars:'<path fill="currentColor" d="M7 3.5h3l1.1 5.1h1.8L14 3.5h3l2.7 9.4v2.4h-1.2a4.45 4.45 0 0 1-8.9 0h-1.2a4.45 4.45 0 0 1-8.9 0H1.3v-2.4L4 3.5h3ZM6 14.2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Zm12 0a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z"/><path fill="currentColor" d="M10.4 9.7h3.2v2h-3.2z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M15 14h2M7 17h2"/>',tasks:'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M8 13l2.5 2.5L16 10"/>',book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/><path d="M6 8h3M15 8h3M6 12h3M15 12h3"/>',menu:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',chevron:'<path d="m9 5 7 7-7 7"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v3"/>',document:'<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h6"/>',wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 7V4l14-2v4M21 12h-6v4"/>',external:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',profile:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="9" r="3"/><path d="M6.8 18.1c.8-2.8 2.7-4.1 5.2-4.1s4.4 1.3 5.2 4.1"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${I[n]||I.info}</svg>`,e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const roles=['Soldier','NCO / Leader','Admin'],cats=['Training','Drill Preparation','Equipment','Personnel','Safety','Operations','Other'],priorities=['Normal','Important','Urgent'],audiences=['All Soldiers','Leadership','Section','Team'];
const permissions={soldier:['view_drill','view_tasks','complete_tasks','view_resources','view_announcements'],leader:['view_drill','view_tasks','complete_tasks','view_resources','view_announcements','create_tasks','manage_tasks','create_announcements','add_resources','view_completion_summary'],admin:['view_drill','view_tasks','view_resources','view_announcements','create_tasks','manage_tasks','create_announcements','manage_announcements','manage_schedule','manage_resources','manage_roles','manage_app']};

/* All state lives in memory and is populated from Firebase (Auth + Firestore)
   by firebase-sync.js and approval.js. Nothing here is read from or written
   to localStorage — refreshing the page re-reads everything from Firebase. */
let state={role:'Soldier',signedIn:false,authReady:false,currentUserId:'',demoUsers:[],completed:{},packing:{},closed:{},published:[],announcements:[],customDrills:[],customResources:[],activity:[],taskComments:{},announcementReads:{},notifications:[],notificationReadAt:{},notificationReadIds:{},drillAttendance:{},accountRequests:[]};
let save=()=>{};

/* This is a plain static site — no service worker is registered anymore.
   If a browser has one left over from an earlier version of this app, it
   can keep serving stale cached JS/HTML indefinitely. Unregister it and
   clear its caches so every load always runs the current code. */
if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(reg=>reg.unregister())).catch(()=>{});
if('caches'in window)caches.keys().then(keys=>keys.filter(k=>k.startsWith('1438-hub-')).forEach(k=>caches.delete(k))).catch(()=>{});

/* Sign Out is registered first, before any other code in this file runs.
   `render`/`toast`/`go` are only called once the user actually clicks
   something (long after the whole script has finished loading), so it's
   safe for this to sit above their definitions — but registering the
   listener itself this early means no later error anywhere else in this
   file can ever prevent Sign Out from working. */
document.addEventListener('click',event=>{
  const signout=event.target.closest('[data-signout]');
  if(signout){
    event.preventDefault();event.stopImmediatePropagation();
    if(document.querySelector('#signout-confirmation'))return;
    const layer=document.createElement('div');
    layer.id='signout-confirmation';layer.className='confirm-layer';layer.setAttribute('role','presentation');
    layer.innerHTML=`<section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title"><h2 id="logout-title">Log out?</h2><p>Are you sure you want to log out?</p><div class="confirm-actions"><button class="confirm-cancel" type="button" data-cancel-signout>No</button><button class="confirm-logout" type="button" data-confirm-signout>Yes, Logout</button></div></section>`;
    document.body.append(layer);layer.querySelector('[data-cancel-signout]')?.focus();
    return;
  }
  if(event.target.closest('[data-cancel-signout]')||event.target===document.querySelector('#signout-confirmation')){document.querySelector('#signout-confirmation')?.remove();return;}
  const confirm=event.target.closest('[data-confirm-signout]');
  if(confirm){
    event.preventDefault();event.stopImmediatePropagation();
    if(confirm.disabled)return;
    confirm.disabled=true;confirm.textContent='Signing out…';
    const finishSignOut=()=>{
      document.querySelector('#signout-confirmation')?.remove();
      state.signedIn=false;state.currentUserId='';state.role='Soldier';
      state.completed={};state.packing={};
      save();location.hash='login';render('login');toast('Signed out.');
    };
    const auth=window.firebaseHub?.auth;
    Promise.resolve().then(()=>auth?auth.signOut():undefined).then(finishSignOut).catch(()=>{
      confirm.disabled=false;confirm.textContent='Yes, Logout';
      toast('Could not sign out. Please try again.');
    });
  }
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('#signout-confirmation')?.remove();});

const packing=['Uniform','Boots','Identification required by official guidance','Notebook','Pen/pencil','Water source','Personal hygiene items','Weather-appropriate items'];
const newestFirst=list=>[...list].sort((a,b)=>{const time=x=>{const v=x.createdAt;return v?.toMillis?v.toMillis():v?.seconds?v.seconds*1000:Date.parse(v)||0;};return time(b)-time(a);});
I.trash='<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>';
I.pin='<path d="m16 3 5 5-4 1-3 5-1 4-7-7 4-1 5-3ZM6 18l-3 3"/>';
I.pinOff='<path d="m16 3 5 5-4 1-2 3M9 9l-3 2 7 7 1-4M6 18l-3 3M3 3l18 18"/>';
const orderedAnnouncements=()=>newestFirst(state.announcements).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(a.pinned&&b.pinned?(Date.parse(b.pinnedAt)||0)-(Date.parse(a.pinnedAt)||0):0));
const tasks=()=>state.published.filter(t=>state.role!=='Soldier'||((!t.assignedUserId||t.assignedUserId===state.currentUserId)&&(!t.audience||['All Users','Soldiers','All Soldiers','Soldier'].includes(t.audience)))), leader=()=>state.role!=='Soldier',admin=()=>state.role==='Admin',date=v=>new Date(`${v}T12:00`).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}),status=t=>state.completed[t.id]?'Completed':state.closed[t.id]?'Closed':['In Progress','On Hold','Cancelled'].includes(t.workStatus)?t.workStatus:'Not Started';
const announcementDateValue=item=>item.announcementDate||String(item.createdAt||'').slice(0,10);
const resetAnnouncementSeen=item=>{
 item.updatedAt=new Date().toISOString();
 state.announcementAcknowledgements??={};state.announcementAcknowledgements[item.id]={};
 state.announcementReads??={};state.announcementReads[item.id]=[];
 state.notifications??=[];
 state.notifications.unshift({id:'announcement-update-'+crypto.randomUUID(),message:`Announcement updated: ${item.title}. Please view the latest information.`,roles:!item.audience||item.audience==='All Users'?['Soldier','NCO / Leader','Admin']:['Soldier','Soldiers','All Soldiers'].includes(item.audience)?['Soldier']:item.audience==='Admin'?['Admin']:['NCO / Leader'],route:`announcement/${item.id}`,createdAt:item.updatedAt});
};
const displayDateText=value=>String(value||'').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$2/$3/$1');
const canOpenRoute=route=>{
 const role=state.role;
 if(['login','create-account','home','restoring-session'].includes(route))return true;
 if(!state.signedIn)return false;
 if(route==='admin-create-user')return role==='Admin'||role==='NCO / Leader';
 if(route==='leader-resources'||route==='leader-manage-resources')return role==='Admin'||role==='NCO / Leader';
 if(route.startsWith('admin')||['data-backups','activity-log'].includes(route))return role==='Admin';
 if(route.startsWith('leader-')||['leadership','task-completion','attendance-dashboard','task-report','weekly-summary','open-tasks','due-soon','completed-tasks'].includes(route))return role==='Admin'||role==='NCO / Leader';
 return true;
};
const taskIsOpen=task=>!['On Hold','Cancelled'].includes(task.workStatus)&&!state.closed[task.id]&&!state.completed[task.id];
const taskIsCancelled=task=>task?.workStatus==='Cancelled';
const activityActor=()=>({actorId:state.currentUserId,actorName:state.demoUsers.find(u=>u.id===state.currentUserId)?.name||'Account holder'});
const recordTaskHistory=(task,previous,actor,now=new Date().toISOString())=>{
 task.createdAt=previous?previous.createdAt||'':task.createdAt||now;
 task.createdById=previous?previous.createdById||'':actor.actorId;
 task.createdByName=previous?previous.createdByName||'':actor.actorName;
 task.deadlineHistory=[...(previous?.deadlineHistory||[])];
 if(previous&&previous.due!==task.due)task.deadlineHistory.unshift({id:'deadline-'+crypto.randomUUID(),previousDue:previous.due,newDue:task.due,actorId:actor.actorId,actorName:actor.actorName,changedAt:now});
 return task;
};
const taskHistoryMarkup=task=>`<section class="task-history"><h3>Task information</h3><dl class="detail-list"><div><dt>Scheduled by</dt><dd>${e(task.createdByName||'Not recorded for this older task')}</dd></div><div><dt>Scheduled date</dt><dd>${task.createdAt?e(new Date(task.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})):'Not recorded'}</dd></div></dl>${task.deadlineHistory?.length?`<h3>Deadline change history</h3><ol>${task.deadlineHistory.map(change=>`<li><strong>${e(change.actorName||'Account holder')}</strong><p>${e(change.previousDue?date(change.previousDue):'No deadline')} → ${e(date(change.newDue))}</p><small>${e(new Date(change.changedAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}))}</small></li>`).join('')}</ol>`:''}</section>`;
const allNotifications=()=>[...(state.notifications||[]),...(window.hubSupportNotices||[])];
const notificationVisible=item=>{
 const uid=state.currentUserId;if(!uid)return false;
 if(item.kind==='support')return item.userId===uid;
 if(/^(New account request:|New user(?: created)?:|User created:|New (?:Soldier|NCO \/ Leader|Admin) account request:)/i.test(item.message||''))return state.role==='Admin'||state.role==='NCO / Leader';
 if(item.kind==='overdue'&&(taskIsCancelled(state.published.find(t=>t.id===item.taskId))||state.completed[item.taskId]||state.closed[item.taskId]||!state.published.some(t=>t.id===item.taskId)))return false;
 if(item.userId&&item.userId!==uid)return false;
 if(item.userIds&&!item.userIds.includes(uid))return false;
 if(String(item.id||'').startsWith('account-approved-'))return item.id===`account-approved-${uid}`;
 if(item.roles?.length&&!item.roles.includes(state.role))return false;
 let task=null;
 if(item.route?.startsWith('task/'))task=state.published.find(t=>t.id===item.route.slice(5));
 else if(/^(New task:|Reminder:)/i.test(item.message||''))task=state.published.find(t=>item.message.includes(t.title));
 if(task?.assignedUserId&&task.assignedUserId!==uid&&!/Task completed:/i.test(item.message||''))return false;
 if(taskIsCancelled(task)&&/^(Reminder:|Overdue task:)/i.test(item.message||''))return false;
 if(state.role==='Soldier'){
  const route=item.route||'',message=item.message||'';
  const audienceAllowed=value=>!value||['All Users','Soldiers','All Soldiers','Soldier'].includes(value);
  if(route.startsWith('task/')||item.taskId||/^(New task:|Reminder:|Overdue task:)/i.test(message)){
   task=task||state.published.find(t=>t.id===item.taskId);
   return !!task&&(!task.assignedUserId||task.assignedUserId===uid)&&audienceAllowed(task.audience);
  }
  if(route.startsWith('announcement/')||route==='announcement-list'||/^New announcement:/i.test(message)){
   const announcement=route.startsWith('announcement/')?state.announcements.find(a=>a.id===route.slice(13)):null;
   return route.startsWith('announcement/')?!!announcement&&audienceAllowed(announcement.audience):true;
  }
  if(route==='drill'||route.startsWith('drill/')||/^New drill:/i.test(message))return true;
  return item.userId===uid&&['account','security','account-update'].includes(item.kind);
 }
 return true;
};
const taskDueSoon=(task,now=new Date())=>{const end=new Date(now);end.setDate(end.getDate()+7);end.setHours(23,59,59,999);const due=new Date(`${task.due}T23:59:59`);return !['On Hold','Cancelled'].includes(task.workStatus)&&!state.completed[task.id]&&!state.closed[task.id]&&Number.isFinite(+due)&&due>=now&&due<=end;};
const headerNotificationBell=()=>{if(!state.signedIn||current==='notifications')return '';const readIds=(state.notificationReadIds||{})[state.currentUserId]||[];const legacyReadAt=(state.notificationReadAt||{})[state.currentUserId]||'';const count=allNotifications().filter(notificationVisible).filter(item=>!readIds.includes(item.id)&&(!legacyReadAt||item.createdAt>legacyReadAt)).length;return `<button type="button" class="header-notification" data-route="notifications" data-task-notifications="true" aria-label="${count?`${count} unread notifications`:'Notifications'}"><span aria-hidden="true">🔔</span>${count?`<b>${count>99?'99+':count}</b>`:''}</button>`;};
const head=(t,s='',back='')=>`<header class="page-header">${back?`<button class="back" data-history-back data-back-route="${back}">${icon('chevron')} Back</button>`:''}<h1 tabindex="-1">${e(t)}</h1>${s?`<p>${e(s)}</p>`:''}${headerNotificationBell()}</header>`, note='<p class="local-note">Synced to your account</p>',row=(r,t,s,i)=>`<button class="row-button" data-route="${r}"><span class="tile-icon">${icon(i)}</span><span class="row-copy"><strong>${e(t)}</strong><small>${e(s)}</small></span>${icon('chevron')}</button>`;
function taskRows(a,manage=false){return a.map(t=>`<div class="task-row clickable-record" data-open-card="task/${e(t.id)}"><label class="check-target"><input type="checkbox" data-task="${t.id}" ${state.completed[t.id]?'checked':''} aria-label="Complete ${e(t.title)}"></label><button class="task-open" data-route="task/${t.id}"><strong>${e(t.title)}</strong><span class="task-meta">${e(t.category)} · Due ${date(t.due)} · ${e(t.priority||'Normal')}</span><span class="badge ${state.completed[t.id]?'done':''}">${status(t)}</span></button>${manage?`<div class="task-tools"><button data-route="leader-edit-task/${t.id}">Edit</button><button data-close-task="${t.id}">Close</button><button data-delete-task="${t.id}">Delete</button></div>`:''}</div>`).join('');}
function summary(){const box=document.querySelector('#role-summary'),all=tasks(),open=all.filter(t=>taskIsOpen(t)).length,done=all.filter(t=>state.completed[t.id]).length,anns=state.announcements,today=new Date().toISOString().slice(0,10),next=[...state.customDrills].sort((a,b)=>a.date.localeCompare(b.date)).find(d=>d.date>=today);const card=(a,b,c,r)=>`<button class="dashboard-card" data-route="${r}"><span>${a}</span><strong>${b}</strong><small>${c}</small></button>`;if(state.role==='Soldier')box.innerHTML=`<h2>My Overview</h2><div class="dashboard-grid">${card('NEXT DRILL',next?date(next.date):'None scheduled',next?next.label:'Check back soon','drill')}${card('MY TASKS',open,open?'Open tasks':'All complete','tasks')}</div><h3>Announcements</h3>${anns.length?anns.slice(0,2).map(x=>`<article class="announcement"><strong>${e(x.title)}</strong><p>${e(x.message)}</p></article>`).join(''):'<p class="empty">No announcements yet.</p>'}<button class="summary-link" data-route="resources">Quick Resources ${icon('chevron')}</button>`;else if(state.role==='NCO / Leader')box.innerHTML=`<h2>Leadership Dashboard</h2><div class="dashboard-grid">${card('OPEN TASKS',open,'Shared with your unit','leader-manage-tasks')}${card('COMPLETED',done,'All accounts','leadership')}${card('ANNOUNCEMENTS',anns.length,'Shared','leader-announcements')}</div><button class="summary-link" data-route="leadership">Open Leadership Tools ${icon('chevron')}</button>`;else box.innerHTML=`<h2>App Management</h2><div class="dashboard-grid">${card('USERS',state.demoUsers.length,'Registered accounts','admin-users')}${card('TASKS',open,'Open, shared with your unit','leader-manage-tasks')}${card('SCHEDULE',state.customDrills.length,'Non-sensitive dates','admin-schedule')}</div><button class="summary-link" data-route="admin">Open Admin Dashboard ${icon('chevron')}</button>`;}
function drill(i){const list=[...state.customDrills].sort((a,b)=>a.date.localeCompare(b.date));if(i!==undefined){const d=list[i];if(!d)return drill();const n=packing.filter((_,x)=>state.packing[`item-${x}`]).length;return head('Drill Details',d.label,'drill')+`<div class="content"><div class="card pad"><dl class="detail-list"><div><dt>Date</dt><dd>${date(d.date)}</dd></div>${d.note?`<div><dt>Note</dt><dd>${e(d.note)}</dd></div>`:''}</dl><h2 class="section-label">General preparation</h2><p class="muted">Confirm report time, uniform and changes through official unit channels. This page contains only general, non-sensitive information.</p></div><div class="card pad"><h2>Packing List</h2><div class="progress-heading"><span>Personal preparation</span><span id="packing-count">${n} of ${packing.length}</span></div><progress id="packing-progress" value="${n}" max="${packing.length}"></progress>${packing.map((x,n)=>`<label class="packing-row"><input type="checkbox" data-packing="item-${n}" ${state.packing[`item-${n}`]?'checked':''}><span>${x}</span></label>`).join('')}</div>${note}</div>`;}if(!list.length)return head('Drill','Drill dates added by an Admin will appear here.')+`<div class="content"><p class="empty">No drill dates have been added yet.</p></div>`;const [next,...upcoming]=list;return head('Drill','Dates added by your Admin.')+`<div class="content"><article class="card pad next-card"><span class="eyebrow">NEXT DRILL</span><h2>${e(next.label)}</h2><div class="location">${icon('pin')} ${date(next.date)}</div>${next.note?`<p class="muted">${e(next.note)}</p>`:''}<button class="action" data-route="drill/0">View Drill Details ${icon('chevron')}</button></article>${upcoming.length?`<h2 class="section-label">Upcoming Drills</h2><div class="card">${upcoming.map((d,n)=>`<button class="schedule-row" data-route="drill/${n+1}"><span class="month">${new Date(`${d.date}T12:00`).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</span><span><strong>${e(d.label)}</strong><small>${date(d.date)}</small></span></button>`).join('')}</div>`:''}</div>`;}
function task(id){const t=tasks().find(x=>x.id===id);if(!t)return head('Task not found','','tasks');return head('Task Detail','Published task','tasks')+`<div class="content"><article class="card pad task-detail-card"><h2>${e(t.title)}</h2><dl class="detail-list"><div><dt>Category</dt><dd>${e(t.category)}</dd></div><div><dt>Due date</dt><dd>${date(t.due)}</dd></div><div><dt>Priority</dt><dd>${e(t.priority||'Normal')}</dd></div></dl><h3 class="section-label">Instructions</h3><p class="instructions">${e(t.instructions)}</p>${taskHistoryMarkup(t)}<button class="action" data-toggle-task="${id}">${icon('tasks')}${state.completed[id]?'Mark Incomplete':'Mark Complete'}</button></article>${note}</div>`;}
function resource(id){const r=state.customResources.find(x=>x.id===id);if(!r)return pages.resources();return head('Resource Detail','','resources')+`<div class="content"><article class="card pad compact-detail-card resource-detail-card"><span class="tile-icon">${icon(r.symbol||'document')}</span><h2 style="margin-top:20px">${e(r.title)}</h2><p>${e(r.description)}</p>${r.link?`<a class="action" href="${e(r.link)}" target="_blank" rel="noopener noreferrer">${e(r.linkLabel||'Open public link')} ${icon('external')}</a>`:''}</article></div>`;}

/* Firebase Authentication is the only way into the app. There is no local or
   demo login path, and no account data is stored in the browser. */
function restoringSession(){return `<section class="silent-session" aria-label="1438th Engineer Hub"><img src="./assets/engineer-castle-white.png" alt="1438th Engineer Hub"></section>`;}
function login(){return `<section class="login-screen" aria-labelledby="login-title"><div class="login-brand"><img src="./assets/engineer-castle-white.png" alt="White Engineer Castle"><div><h1 id="login-title">1438TH<br>ENGINEER HUB</h1><p>PEOPLE · READINESS · SUPPORT</p></div></div><div class="login-card"><h2>Sign in</h2><form id="firebase-login-form" autocomplete="off" onsubmit="return false"><div class="field"><label>Email Address<input name="email" type="email" autocomplete="off" data-lpignore="true" required placeholder="Enter email address"></label></div><div class="field"><label>Password<input name="password" type="password" autocomplete="new-password" data-lpignore="true" required placeholder="Enter password"></label></div><p class="form-error" id="firebase-login-error" hidden></p><button class="action" type="submit">Login to 1438th Hub ${icon('chevron')}</button></form><button type="button" class="text-action forgot-password" data-forgot-password>Forgot password?</button><button class="text-action" data-route="create-account">New user? Create account</button></div></section>`;}
function createAccount(){return `<section class="login-screen" aria-labelledby="create-title"><div class="login-brand"><img src="./assets/engineer-castle-white.png" alt="White Engineer Castle"><div><h1>1438TH<br>ENGINEER HUB</h1><p>PEOPLE · READINESS · SUPPORT</p></div></div><div class="login-card"><h2 id="create-title">Create account</h2><form id="firebase-create-form" onsubmit="return false"><div class="field"><label>Full Name<input name="name" required maxlength="70"></label></div><div class="field"><label>Email Address<input name="email" type="email" required maxlength="100"></label></div><div class="field"><label>Phone Number<input name="phone" type="tel" required maxlength="30"></label></div><div class="field"><label>Password<input name="password" type="password" required minlength="6"></label></div><div class="field"><label>Role<select name="role"><option>Soldier</option><option>NCO / Leader</option><option>Admin</option></select></label></div><p class="form-error" id="firebase-create-error" hidden></p><button class="action" type="submit">Create Account ${icon('chevron')}</button></form><button class="text-action" data-route="login">Back to Login</button></div></section>`;}

const currentProfile=()=>state.demoUsers.find(u=>u.id===state.currentUserId)||{name:'Account holder',role:state.role,status:'Active',email:'',phone:''};
function profilePage(){const user=currentProfile();return head('My Profile','Your account information.','more')+`<div class="content"><article class="card pad profile-card compact-detail-card"><div class="profile-identity"><span class="tile-icon">${icon('profile')}</span><div><span class="eyebrow">ACCOUNT</span><h2>${e(user.name)}</h2></div></div><dl class="detail-list"><div><dt>Role</dt><dd>${e(user.role)}</dd></div><div><dt>Account Status</dt><dd>${e(user.status||'Active')}</dd></div><div><dt>Email Address</dt><dd>${e(user.email||'Not added')}</dd></div><div><dt>Phone Number</dt><dd>${e(user.phone||'Not added')}</dd></div>${user.createdAt?`<div><dt>Created</dt><dd>${date(String(user.createdAt).slice(0,10))}</dd></div>`:''}</dl><div class="profile-actions"><button class="action outline" data-route="edit-profile">Edit Profile</button><button class="action outline profile-password-button" data-open-password-change>Change Password</button></div></article></div>`;}
function editProfilePage(){const user=currentProfile();return head('Edit Profile','Update your basic account details.','profile')+`<div class="content"><form id="edit-profile-form" class="card pad" onsubmit="return false"><div class="field"><label>Full Name<input name="name" maxlength="70" required value="${e(user.name)}"></label></div><div class="field"><label>Phone Number<input name="phone" type="tel" maxlength="30" value="${e(user.phone||'')}"></label></div><p class="notice">Email address is managed on the sign-in screen. Use My Profile to change your password securely.</p><button class="action" type="submit">Save Profile ${icon('chevron')}</button></form></div>`;}

function more(){const user=currentProfile();return head('More','Your account and useful tools.')+`<div class="content"><div class="card"><button class="profile-summary" data-route="profile" aria-label="Open My Profile"><span class="tile-icon">${icon('profile')}</span><span class="row-copy"><strong>${e(user.name)}</strong><small>${e(user.role)} · ${e(user.status||'Active')}</small></span>${icon('chevron')}</button>${row('resources','Resources','View unit reference links','book')}${row('support','Help & Support','Raise tickets and follow replies','info')}${row('unit','Unit Information','1438th Engineer Company','pin')}${row('security','Security & Data Rules','Keep sensitive information out','shield')}${`<button class="row-button signout-row" data-signout><span class="tile-icon signout-icon" aria-hidden="true">⏻</span><span class="row-copy"><strong>Sign Out</strong></span>${icon('chevron')}</button>`}</div></div>`;}
function leadership(){if(!leader())return head('Leadership','','more')+'<div class="content leadership-content"><p class="notice">Sign in with an NCO / Leader or Admin account to use this page.</p></div>';const all=tasks(),open=all.filter(t=>taskIsOpen(t)).length;return head('Leadership Dashboard','Shared with your unit.','more')+`<div class="content leadership-content"><p class="notice">Tasks and announcements here are shared with every signed-in account.</p><div class="dashboard-grid">${[['OPEN TASKS',open,'Shared','open-tasks'],['DUE SOON',all.filter(t=>taskDueSoon(t)).length,'Published','due-soon'],['COMPLETED',all.filter(t=>state.completed[t.id]).length,'Your account','completed-tasks'],['ANNOUNCEMENTS',state.announcements.length,'Shared','announcement-list']].map(x=>`<button class="dashboard-card" data-route="${x[3]}"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></button>`).join('')}</div><div class="card">${state.role==='NCO / Leader'?row('admin-create-user','Create User','Create a Soldier account','people'):''}${row('leader-create-task','Create Task','Assign work to your unit','tasks')}${row('leader-manage-tasks','Manage Tasks','View, edit, close, or delete tasks','document')}${row('leader-announcements','Announcements','Create and manage unit updates','info')}${state.role==='NCO / Leader'?row('leader-resources','Add Resources','Share public links, forms, and guides','book'):''}${row('task-completion','Task Completion','See completed and pending members','tasks')}${row('attendance-dashboard','Drill Attendance','Review attendance responses','people')}</div></div>`;}
function taskForm(id){const t=state.published.find(x=>x.id===id)||{};const customCategory=!!t.category&&!cats.includes(t.category);return head(id?'Edit Task':'Create Task',id?'':'Non-sensitive information only.','leadership')+`<div class="content"><form id="task-form" class="card pad" onsubmit="return false"><input type="hidden" name="taskId" value="${e(t.id||'')}"><div class="field"><label>Task Title<input name="title" maxlength="100" required value="${e(t.title||'')}"></label></div><div class="field"><label>Description / Instructions<textarea name="instructions" maxlength="1000" required>${e(t.instructions||'')}</textarea></label></div><div class="field"><label>Category<select name="category" data-category-choice required>${cats.map(x=>`<option value="${e(x)}" ${(t.category?t.category===x:x===cats[0])?'selected':''}>${e(x)}</option>`).join('')}</select></label><label class="custom-category-field" ${customCategory||t.category==='Other'?'':'hidden'}>Other category<input name="customCategory" maxlength="60" ${customCategory||t.category==='Other'?'required':''} value="${e(customCategory?t.category:'')}" placeholder="Type your category"></label></div><div class="field"><label>Due Date<input name="due" type="date" required value="${e(t.due||'')}"></label></div><div class="field"><label>Priority<select name="priority">${priorities.map(x=>`<option ${t.priority===x?'selected':''}>${x}</option>`).join('')}</select></label></div><div class="field"><label>Assign task to<select name="audience">${audiences.map(x=>`<option ${t.audience===x?'selected':''}>${x}</option>`).join('')}</select></label></div><p id="form-error" class="form-error" hidden></p><button class="action" type="submit">${id?'Save Task':'Publish Task'} ${icon('chevron')}</button></form></div>`;}
function manage(){return head('Manage Tasks','Shared with your unit.','leadership')+`<div class="content manage-tasks-content"><div class="report-toolbar"><button type="button" class="action outline" data-route="task-report">View Report ${icon('document')}</button><button type="button" class="action outline" data-export-task-report>Download Report ${icon('download')}</button></div><button class="action" data-route="leader-create-task">Create Task ${icon('chevron')}</button><h2 class="section-label">Published Tasks</h2><div class="card">${state.published.length?taskRows(state.published,true):'<p class="empty">No tasks published yet.</p>'}</div>${note}</div>`;}
function announcements(){return head('Announcements','Shared with your unit.','leadership')+`<div class="content"><form id="announcement-form" class="card pad" onsubmit="return false"><h2>Create Announcement</h2><div class="field"><label>Title<input name="title" maxlength="100" required></label></div><div class="field"><label>Message<textarea name="message" maxlength="1000" required></textarea></label></div><div class="field"><label>Category<input name="category" list="announcement-category-options" maxlength="60" required placeholder="Enter a category"></label><datalist id="announcement-category-options"><option value="General"><option value="Drill Preparation"><option value="Training"><option value="Safety"><option value="Personnel"></datalist></div><div class="field"><label>Expiration Date<input name="expires" type="date"></label></div><div class="field"><label>Assign task to<select name="audience">${audiences.map(x=>`<option>${x}</option>`).join('')}</select></label></div><button class="action" type="submit">Publish Announcement ${icon('chevron')}</button></form><div class="card">${state.announcements.length?state.announcements.map(a=>`<article class="announcement managed"><strong>${e(a.title)}</strong><small>${e(a.category)} · ${a.expires?`Expires ${date(a.expires)}`:'No expiration'}</small><p>${e(a.message)}</p><button data-delete-announcement="${a.id}">Delete</button></article>`).join(''):'<p class="empty">No announcements yet.</p>'}</div></div>`;}
function adminPage(){if(!admin())return head('Admin','','more')+'<div class="content"><p class="notice">Sign in with an Admin account to use this page.</p></div>';return head('App Management','Manage users, content, and shared data.','more')+`<div class="content"><div class="card">${row('admin-users','Users & Roles','Approve and manage accounts','people')}${row('admin-settings','Settings & User Access','Account access notes','shield')}${row('admin-schedule','Drill Schedule','Non-sensitive dates and notes','calendar')}${row('admin-resources','Resources','Public links and categories','book')}${row('leader-announcements','Announcements','Create and delete content','info')}${row('leader-manage-tasks','Tasks','Manage published tasks','tasks')}${row('security','Security Information','Data rules and production needs','shield')}</div></div>`;}
function users(){return head('Users & Roles','Registered accounts.','admin')+`<div class="content"><div class="card">${state.demoUsers.map(user=>`<article class="announcement"><strong>${e(user.name)}</strong><p>${e(user.role)} · ${e(user.status||'Active')}</p></article>`).join('')}</div></div>`;}
function schedule(){return head('Drill Schedule','Add and manage drill dates.','admin')+`<div class="content"><p class="notice">Only dates added here will appear in the Drill page.</p><form id="schedule-form" class="card pad" onsubmit="return false"><h2>Add Drill Date</h2><div class="field"><label>Attendance response deadline (optional)<input name="attendanceDeadline" type="date"></label></div><div class="field"><label>Date<input name="date" type="date" required></label></div><div class="field"><label>Label<input name="label" maxlength="40" required></label></div><div class="field"><label>General Note<input name="note" maxlength="180" required></label></div><button class="action" type="submit">Add Drill</button></form><button type="button" class="action outline" data-route="admin-manage-drills">Manage Drills ${icon('chevron')}</button></div>`;}
function manageDrills(){if(!admin())return head('Manage Drills','','more');return head('Manage Drills','Search and manage drill dates.','admin-schedule')+`<div class="content manage-drills-content"><div class="card">${state.customDrills.length?state.customDrills.map(d=>`<article class="announcement managed clickable-record" data-open-card="drill/${[...state.customDrills].sort((a,b)=>String(a.date).localeCompare(String(b.date))).findIndex(x=>x.id===d.id)}"><button type="button" class="record-heading" data-route="drill/${[...state.customDrills].sort((a,b)=>String(a.date).localeCompare(String(b.date))).findIndex(x=>x.id===d.id)}"><strong>${e(d.label)} · ${date(d.date)}</strong>${icon('chevron')}</button><p>${e(d.note)}</p><button data-delete-schedule="${d.id}">Remove</button></article>`).join(''):'<p class="empty">No drills have been added yet.</p>'}</div></div>`;}
function adminResources(){if(!leader())return head('Resources','','more')+'<div class="content"><p class="empty">Leadership access required.</p></div>';return head(admin()?'Resource Management':'Add Resources','Public links only.',admin()?'admin':'leadership')+`<div class="content"><p class="notice">Only add approved public HTTPS links. Never enter credentials, records, CUI, or internal documents.</p><form id="resource-form" class="card pad" onsubmit="return false"><div class="field"><label>Resource Name<input name="title" maxlength="100" required></label></div><div class="field"><label>Category<input name="category" maxlength="60" required></label></div><div class="field"><label>Description<textarea name="description" maxlength="500" required></textarea></label></div><div class="field"><label>URL<input name="url" type="url" required placeholder="https://"></label></div><div class="field"><label>Audience<select name="audience">${audiences.map(x=>`<option>${x}</option>`).join('')}</select></label></div><button class="action" type="submit">Add Public Resource</button></form><button type="button" class="action outline" data-route="leader-manage-resources">Manage Resources ${icon('chevron')}</button></div>`;}
function manageResources(){if(!leader())return head('Resources','','more');return head('Manage Resources','Search and manage public links.',admin()?'admin-resources':'leader-resources')+`<div class="content manage-resources-content"><label class="search-field">${icon('document')}<input type="search" data-manage-resource-search placeholder="Search resources" aria-label="Search resources"></label><div class="card">${state.customResources.map(r=>`<article class="announcement managed clickable-record" data-open-card="resource/${e(r.id)}"><button type="button" class="record-heading" data-route="resource/${e(r.id)}"><strong>${e(r.title)}</strong>${icon('chevron')}</button><small>${e(r.subtitle)}</small><p>${e(r.description)}</p>${admin()?`<div class="user-actions"><button type="button" class="user-action" data-edit-resource="${e(r.id)}">Edit</button><button type="button" class="user-action danger" data-delete-resource="${r.id}">Delete</button></div>`:''}</article>`).join('')}</div></div>`;}
function adminSettings(){if(!admin())return head('Admin','','more')+'<div class="content"><p class="notice">Sign in with an Admin account to use this page.</p></div>';return head('Settings & User Access','Manage accounts from Users & Roles.','admin')+`<div class="content"><p class="notice">New sign-ins are created from the Create Account screen. New requests appear in Users & Roles for approval.</p><div class="card">${row('admin-users','Users & Roles','Approve, edit, and manage accounts','people')}</div></div>`;}
function install(){return head('Install on Phone','A shortcut to your Engineer Hub.','more')+`<div class="content"><div class="card pad"><h2>iPhone</h2><ol class="step-list"><li>Open the site in Safari.</li><li>Tap Share.</li><li>Tap Add to Home Screen.</li><li>Tap Add.</li></ol></div><div class="card pad"><h2>Android</h2><ol class="step-list"><li>Open the site in Chrome.</li><li>Open the browser menu.</li><li>Select Install App or Add to Home Screen.</li></ol></div></div>`;}
function security(){return head('Security & Data Rules','Non-sensitive sample information only.','more')+`<div class="content"><div class="card pad"><h2>This app must not contain:</h2><ul class="rule-list"><li>SSNs or DoD ID numbers</li><li>CAC credentials or passwords</li><li>Medical or readiness records</li><li>Security-clearance information</li><li>CUI, classified, or FOUO information</li><li>Sensitive operational or weapons information</li><li>Unnecessary personal information</li></ul></div><p class="notice">Use official Army systems and approved communication channels for sensitive information.</p></div>`;}
function about(unit=false){return head(unit?'Unit Information':'About','', 'more')+`<div class="content"><article class="card about"><img class="castle" src="./assets/engineer-castle-red.jpg" alt="Red Engineer Castle"><h2>${unit?'1438th Engineer Company':'1438th Engineer Hub'}</h2><p>${unit?'':'1438th Engineer Company<br>'}Macon, Missouri</p><p>People • Readiness • Support<br><em>Always Forward</em></p><hr><span class="eyebrow">UNOFFICIAL PROTOTYPE</span><p>This application is a demonstration concept and is not an official U.S. Army or Department of Defense application.</p></article></div>`;}

let current='home';
const unreadAnnouncementCount=()=>{
 if(!state.signedIn||!state.currentUserId)return 0;
 return (state.announcements||[]).filter(item=>{
  const audience=!item.audience||item.audience==='All Users'||(['Soldier','Soldiers','All Soldiers'].includes(item.audience)?state.role==='Soldier':['Leadership','NCO / Leaders','NCO / Leader'].includes(item.audience)?state.role==='NCO / Leader':item.audience===state.role);
  if(!audience)return false;
  const view=state.announcementAcknowledgements?.[item.id]?.[state.currentUserId];
  return !view||(item.updatedAt&&view.createdAt<item.updatedAt);
 }).length;
};
function nav(screen){const options={Soldier:[['home','Home','home'],['drill','Drill','calendar'],['tasks','Tasks','tasks'],['announcement-list','Announcements','info'],['more','More','menu']],'NCO / Leader':[['home','Home','home'],['drill','Drill','calendar'],['tasks','Tasks','tasks'],['leadership','Leadership','people'],['more','More','menu']],Admin:[['home','Home','home'],['tasks','Tasks','tasks'],['leadership','Leadership','people'],['admin','Admin','shield'],['more','More','menu']]};const active=screen==='announcement-list'?'announcement-list':screen==='task'?'tasks':screen==='resource'?'resources':screen.startsWith('leader-')?'leadership':screen.startsWith('admin-')?'admin':['home','drill','tasks','resources','leadership','admin'].includes(screen)?screen:'more';document.querySelector('#bottom-nav').innerHTML=options[state.role].map(x=>`<button data-route="${x[0]}" ${x[0]===active?'aria-current="page"':''}><span class="nav-icon-wrap">${icon(x[2])}${x[0]==='announcement-list'&&unreadAnnouncementCount()?`<b class="nav-unread-count" aria-label="${unreadAnnouncementCount()} unread announcements">${unreadAnnouncementCount()>99?'99+':unreadAnnouncementCount()}</b>`:''}</span><span>${x[1]}</span></button>`).join('');}
function render(route,focus=true){
  if(!canOpenRoute(route))route=state.signedIn?'home':'login';
  if(!state.authReady&&route!=='create-account')route='restoring-session';
  else if(!state.signedIn&&route!=='login'&&route!=='create-account')route='login';
  document.body.classList.toggle('auth-gate',['login','create-account','restoring-session'].includes(route));
  current=route;
  const [screen,id]=route.split('/'),home=document.querySelector('#home'),page=document.querySelector('#page');
  const pages={'admin-create-user':()=>window.hubCreateUser.page(),'data-backups':()=>window.hubBackups.page(),'restoring-session':restoringSession,login,'create-account':createAccount,profile:profilePage,'edit-profile':editProfilePage,drill:()=>drill(id===undefined?undefined:+id),tasks:()=>head('Tasks','Personal and published unit tasks.')+`<div class="content"><div class="progress-heading"><strong>My Tasks</strong><span>${tasks().filter(t=>state.completed[t.id]).length} of ${tasks().length} complete</span></div><div class="card">${taskRows(tasks())}</div>${note}</div>`,task:()=>task(id),resources:()=>head('Resources','Public links, forms, and guides.')+`<div class="content"><div class="card">${state.customResources.length?state.customResources.map(r=>row(`resource/${r.id}`,r.title,r.subtitle||r.description,r.symbol||'document')).join(''):'<p class="empty">No resources have been added yet.</p>'}</div><p class="notice">Public information only. Readiness resources are links only; no medical or readiness records are stored.</p></div>`,resource:()=>resource(id),more,leadership,'leader-create-task':()=>taskForm(),'leader-edit-task':()=>taskForm(id),'leader-manage-tasks':manage,'leader-announcements':announcements,'leader-manage-announcements':()=>managedAnnouncements(),admin:adminPage,'admin-users':users,'admin-settings':adminSettings,'admin-schedule':schedule,'admin-manage-drills':manageDrills,'admin-resources':adminResources,'leader-resources':adminResources,'leader-manage-resources':manageResources,install,security,about:()=>about(),unit:()=>about(true)};
  const isGate=screen==='restoring-session'||screen==='login'||screen==='create-account';
  home.hidden=screen!=='home';
  page.hidden=screen==='home';
  if(screen==='home')summary();else page.innerHTML=pages[screen]?pages[screen]():['support','support-new','support-mine','admin-support','developer-support','support-ticket'].includes(screen)?restoringSession():head('Page not found','','home');
  document.querySelector('#role-badge').textContent=state.role.toUpperCase();
  document.querySelector('#role-badge').hidden=!state.authReady||!state.signedIn;
  document.querySelector('#bottom-nav').hidden=!state.signedIn;
  if(!isGate)nav(screen);
  document.title=isGate?`${screen==='login'?'Sign In':'Create Account'} · 1438th Engineer Hub`:`${screen==='home'?'Home':page.querySelector('h1')?.textContent||''} · 1438th Engineer Hub`;
  if(focus){window.scrollTo(0,0);document.querySelector('#main').focus({preventScroll:true});}
}
const routeHistory=[];
const go=r=>{if(!canOpenRoute(r)){toast('You do not have access to this page.');r=state.signedIn?'home':'login';}if(r!==current&&current&&r!=='login')routeHistory.push(current);location.hash.slice(1)===r?render(r):location.hash=r;};
function navigateBack(fallback='home'){
  let previous;
  while(routeHistory.length){const candidate=routeHistory.pop();if(candidate!==current&&!['login','create-account'].includes(candidate)){previous=candidate;break;}}
  previous=previous||fallback||'home';
  if(previous===current)previous='home';
  if(routeHistory[routeHistory.length-1]===previous)routeHistory.pop();
  /* Returning must not push the detail screen back onto the trail. */
  if(location.hash.slice(1)===previous)render(previous);else location.hash=previous;
}
document.addEventListener('click',event=>{const back=event.target.closest('[data-history-back]');if(!back)return;event.preventDefault();event.stopImmediatePropagation();navigateBack(back.dataset.backRoute);},true);
/* Notification cards always open their linked destination before any general
   page listeners run. */
document.addEventListener('click',event=>{const notice=event.target.closest('.notification-card[data-route]');if(!notice)return;event.preventDefault();event.stopImmediatePropagation();const notificationId=notice.dataset.notificationId;if(notificationId&&state.currentUserId){state.notificationOpenedIds??={};const opened=state.notificationOpenedIds[state.currentUserId]??=[];if(!opened.includes(notificationId))opened.push(notificationId);state.notificationReadIds??={};const readIds=state.notificationReadIds[state.currentUserId]??=[];if(!readIds.includes(notificationId)){readIds.push(notificationId);state.notificationReadIds[state.currentUserId]=readIds.slice(-200);save();}}const route=notice.dataset.route||'tasks';if(route.startsWith('task/')&&!state.published.some(task=>task.id===route.slice(5))){go('tasks');toast('This task is no longer available.');return;}if(route.startsWith('announcement/')&&!state.announcements.some(item=>item.id===route.slice(13))){go('announcement-list');toast('This announcement is no longer available.');return;}go(route);},true);
let timer;function toast(x){const n=document.querySelector('#toast');n.textContent=x;n.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>n.classList.remove('visible'),4000);}
document.querySelectorAll('[data-icon]').forEach(x=>x.innerHTML=icon(x.dataset.icon));
document.addEventListener('click',ev=>{const r=ev.target.closest('[data-route]');if(r){go(r.dataset.route);return;}const toggle=ev.target.closest('[data-toggle-task]');if(toggle){state.completed[toggle.dataset.toggleTask]=!state.completed[toggle.dataset.toggleTask];save();render(current,false);toast(state.completed[toggle.dataset.toggleTask]?'Task marked complete.':'Task marked incomplete.');return;}const b=ev.target.closest('[data-delete-task],[data-close-task],[data-delete-announcement],[data-delete-schedule],[data-delete-resource]');if(!b)return;const deletedRecord=b.dataset.deleteTask?state.published.find(x=>x.id===b.dataset.deleteTask):b.dataset.deleteAnnouncement?state.announcements.find(x=>x.id===b.dataset.deleteAnnouncement):b.dataset.deleteSchedule?state.customDrills.find(x=>x.id===b.dataset.deleteSchedule):b.dataset.deleteResource?state.customResources.find(x=>x.id===b.dataset.deleteResource):null;if(deletedRecord){state.activity.unshift({...activityActor(),message:`Deleted: ${deletedRecord.title||deletedRecord.label}.`,createdAt:new Date().toISOString()});}if(b.dataset.deleteTask){state.published=state.published.filter(t=>t.id!==b.dataset.deleteTask);delete state.completed[b.dataset.deleteTask];}if(b.dataset.closeTask)state.closed[b.dataset.closeTask]=true;if(b.dataset.deleteAnnouncement)state.announcements=state.announcements.filter(a=>a.id!==b.dataset.deleteAnnouncement);if(b.dataset.deleteSchedule)state.customDrills=state.customDrills.filter(x=>x.id!==b.dataset.deleteSchedule);if(b.dataset.deleteResource)state.customResources=state.customResources.filter(x=>x.id!==b.dataset.deleteResource);save();render(current,false);toast('Updated.');});
document.addEventListener('change',ev=>{const x=ev.target;if(x.dataset.task){state.completed[x.dataset.task]=x.checked;save();render(current,false);toast(x.checked?'Task marked complete.':'Task marked incomplete.');}if(x.dataset.packing){state.packing[x.dataset.packing]=x.checked;save();const n=packing.filter((_,i)=>state.packing[`item-${i}`]).length;document.querySelector('#packing-count').textContent=`${n} of ${packing.length}`;document.querySelector('#packing-progress').value=n;}});
document.addEventListener('submit',ev=>{const f=ev.target;if(!['task-form','announcement-form','schedule-form','resource-form'].includes(f.id))return;ev.preventDefault();const d=new FormData(f),v=k=>String(d.get(k)||'').trim();if(f.id==='task-form'){const t={id:v('taskId')||`pub-${crypto.randomUUID()}`,createdAt:state.published.find(x=>x.id===v('taskId'))?.createdAt||new Date().toISOString(),title:v('title'),instructions:v('instructions'),category:v('category'),due:v('due'),priority:v('priority'),audience:v('audience'),section:state.published.find(x=>x.id===v('taskId'))?.section||'',workStatus:state.published.find(x=>x.id===v('taskId'))?.workStatus||'Not Started',assignedUserId:state.published.find(x=>x.id===v('taskId'))?.assignedUserId||''};if(!t.title||!t.instructions||!t.category||!t.due){document.querySelector('#form-error').textContent='Complete title, instructions, category, and due date.';document.querySelector('#form-error').hidden=false;return;}const i=state.published.findIndex(x=>x.id===t.id);recordTaskHistory(t,i>=0?state.published[i]:null,activityActor());if(i>=0&&state.published[i].due!==t.due){const previous=state.published[i];state.notifications??=[];state.notifications.unshift({id:'task-date-'+crypto.randomUUID(),message:`Task due date changed: ${t.title} — ${previous.due} → ${t.due}.`,roles:!t.audience||t.audience==='All Users'?['Soldier','NCO / Leader','Admin']:['Soldier','Soldiers','All Soldiers'].includes(t.audience)?['Soldier']:['NCO / Leader'],...(t.assignedUserId?{userId:t.assignedUserId}:{}),route:`task/${t.id}`,taskId:t.id,createdAt:new Date().toISOString()});}i<0?state.published.unshift(t):state.published[i]=t;save();go('leader-manage-tasks');toast('Task saved.');}if(f.id==='announcement-form'){if(!v('title')||!v('message'))return;state.announcements.unshift({id:`ann-${crypto.randomUUID()}`,createdAt:new Date().toISOString(),createdById:state.currentUserId,createdByName:activityActor().actorName,title:v('title'),message:v('message'),category:v('category'),expires:v('expires'),audience:v('audience')});save();render(current,false);toast('Announcement saved.');}if(f.id==='schedule-form'){state.customDrills.unshift({id:`drill-${crypto.randomUUID()}`,createdAt:new Date().toISOString(),createdById:state.currentUserId,createdByName:activityActor().actorName,date:v('date'),label:v('label'),note:v('note'),attendanceDeadline:v('attendanceDeadline')});save();render(current,false);toast('Date saved.');}if(f.id==='resource-form'){if(!leader())return;let url;try{url=new URL(v('url'));}catch{return toast('Enter a valid public HTTPS URL.');}if(url.protocol!=='https:')return toast('Only HTTPS public links may be added.');state.customResources.unshift({id:`res-${crypto.randomUUID()}`,createdAt:new Date().toISOString(),title:v('title'),subtitle:v('category'),description:v('description'),link:url.href,linkLabel:'Open public link',symbol:'document',audience:v('audience')});save();render(current,false);toast('Public resource saved.');}});
document.addEventListener('submit',event=>{if(event.target.id!=='edit-profile-form')return;event.preventDefault();const data=new FormData(event.target),name=String(data.get('name')||'').trim(),phone=String(data.get('phone')||'').trim();if(!name)return;const db=window.firebaseHub?.db,uid=state.currentUserId;if(db&&uid)db.collection('users').doc(uid).set({name,phone},{merge:true}).catch(()=>toast('Could not save profile.'));go('profile');toast('Profile updated.');});
document.addEventListener('click',event=>{if(!event.target.closest('[data-reset-password]'))return;const auth=window.firebaseHub?.auth,email=currentProfile().email;if(!auth||!email)return;auth.sendPasswordResetEmail(email).then(()=>toast('Password reset email sent.')).catch(()=>toast('Could not send reset email.'));});
window.addEventListener('hashchange',()=>render(location.hash.slice(1)||'home'));
try{const hero=document.querySelector('.heroPhoto');if(hero){const fallback=()=>{hero.hidden=true;const fb=document.querySelector('.photo-fallback');if(fb)fb.hidden=false;};hero.addEventListener('error',fallback);if(hero.complete&&!hero.naturalWidth)fallback();}}catch{}


/* A slash icon always means the password is hidden. */
const syncPasswordEye=button=>{
  const input=button.closest('.password-shell')?.querySelector('input');
  if(!input||button.dataset.eyeState===input.type)return;
  const hidden=input.type==='password';
  button.dataset.eyeState=input.type;
  button.setAttribute('aria-label',hidden?'Show password':'Hide password');
  button.innerHTML=hidden
    ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.8"></circle><path d="M4 4 20 20"></path></svg>'
    :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.8"></circle></svg>';
};
const syncAllPasswordEyes=()=>document.querySelectorAll('.password-eye').forEach(syncPasswordEye);
const addPasswordEyes=()=>document.querySelectorAll('input[type="password"]:not([data-eye-ready])').forEach(input=>{input.dataset.eyeReady='true';const wrap=document.createElement('span');wrap.className='password-shell';input.parentNode.insertBefore(wrap,input);wrap.append(input);const button=document.createElement('button');button.type='button';button.className='password-eye';button.setAttribute('aria-label','Show password');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.8"></circle></svg>';button.addEventListener('click',()=>{const show=input.type==='password';input.type=show?'text':'password';syncPasswordEye(button);});wrap.append(button);});
document.addEventListener('click',event=>{const button=event.target.closest('.password-eye');if(button)setTimeout(()=>syncPasswordEye(button),0);},false);
new MutationObserver(()=>{addPasswordEyes();syncAllPasswordEyes();}).observe(document.body,{childList:true,subtree:true});
addPasswordEyes();syncAllPasswordEyes();

/* Adds one consistent return path to every in-app page. */
setTimeout(()=>{
  const parentRoute=route=>{
    if(route==='home')return '';
    if(['drill','tasks','resources','more'].includes(route))return 'home';
    if(route==='profile'||route==='edit-profile')return 'more';
    if(route.startsWith('task/'))return 'tasks';
    if(route.startsWith('resource/'))return 'resources';
    if(route.startsWith('leader'))return 'leadership';
    if(route.startsWith('admin'))return 'admin';
    if(['install','unit','security','about'].includes(route))return 'more';
    return 'home';
  };
  const ensureBackButton=()=>{
    const route=location.hash.slice(1)||'home';
    const header=document.querySelector('#page .page-header');
    const parent=parentRoute(route);
    if(!header||!parent||header.querySelector('.back'))return;
    const button=document.createElement('button');
    button.className='back';
    button.dataset.route=parent;
    button.setAttribute('aria-label',`Back to ${parent==='home'?'Home':parent}`);
    button.innerHTML=`${icon('chevron')} Back`;
    header.insertBefore(button,header.firstChild);
  };
  new MutationObserver(ensureBackButton).observe(document.querySelector('#page'),{childList:true,subtree:true});
  window.addEventListener('hashchange',ensureBackButton);
  ensureBackButton();
},120);

/* Keep the Admin home screen focused on the Hub instead of management counters. */
setTimeout(()=>{
  const previousSummary=summary;
  summary=function(){
    if(admin()){document.querySelector('#role-summary').innerHTML='';return;}
    previousSummary();
  };
  if(state.signedIn&&state.role==='Admin'&&(location.hash.slice(1)===''||location.hash.slice(1)==='home'))summary();
},1400);

render('home',false);

// Card backgrounds open details; nested controls keep their own actions.
document.addEventListener('click',event=>{
 const card=event.target.closest('[data-open-card]');
 if(!card||event.target.closest('button,a,input,select,textarea,label,summary,details'))return;
 go(card.dataset.openCard);
});

document.addEventListener('input',event=>{
 if(!event.target.matches('[data-manage-resource-search]'))return;
 const query=event.target.value.trim().toLowerCase();
 document.querySelectorAll('.manage-resources-content .announcement.managed').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(query);});
});
