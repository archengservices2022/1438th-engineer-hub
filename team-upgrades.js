'use strict';
setTimeout(() => {
 const db=window.firebaseHub?.db;
 const me=()=>state.demoUsers.find(x=>x.id===state.currentUserId)||{};
 const members=()=>state.demoUsers.filter(x=>x.status==='Active');
 const relevant=t=>!t.assignedUserId||t.assignedUserId===state.currentUserId;
 // Task access is filtered by the core task provider.
 const eligible=t=>members().filter(u=>t.assignedUserId?u.id===t.assignedUserId:!t.audience||t.audience==='All Users'||(['Soldiers','All Soldiers','Soldier'].includes(t.audience)?u.role==='Soldier':['Leadership','NCO / Leaders','NCO / Leader'].includes(t.audience)?u.role==='NCO / Leader':t.audience==='Admin'?u.role==='Admin':true));
 const completed=u=>u.id===state.currentUserId?state.completed:(u.completed||{});
 const stampCompletion=id=>{
  if(!id||!state.signedIn)return;
  const done=!!state.completed[id];
  const profile=me();profile.completed={...state.completed};profile.completedAt??={};
  if(done)profile.completedAt[id]??=new Date().toISOString();else delete profile.completedAt[id];
  db?.collection('users').doc(state.currentUserId).update({completed:profile.completed,completedAt:profile.completedAt}).catch(()=>toast('Could not save completion details.'));
 };
 document.addEventListener('click',ev=>{const b=ev.target.closest('[data-toggle-task]');if(b)setTimeout(()=>stampCompletion(b.dataset.toggleTask),0);},true);
 document.addEventListener('change',ev=>{const b=ev.target.closest('[data-task],[data-task-status]');if(b)setTimeout(()=>stampCompletion(b.dataset.task||b.dataset.taskStatus),0);},true);
 const detail=t=>`<details class="team-details task-panel"><summary>Member completion (${eligible(t).filter(u=>completed(u)[t.id]).length}/${eligible(t).length}) ${icon('chevron')}</summary><div class="task-panel-body">${eligible(t).map(u=>`<p><strong>${e(u.name)}</strong><small>${completed(u)[t.id]?'Completed':'Not completed'}${u.completedAt?.[t.id]?' · Completed '+e(new Date(u.completedAt[t.id]).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})):completed(u)[t.id]?' · Completion date unavailable':''}</small></p>`).join('')}</div></details>`;
 const setup=()=>{
  const form=document.querySelector('#task-form');
  const route=location.hash.slice(1);
  if(route.startsWith('task/')&&leader()){
   const t=state.published.find(x=>x.id===route.slice(5));const c=document.querySelector('#page .card');if(t&&c&&!c.querySelector('.team-details'))c.insertAdjacentHTML('beforeend',detail(t));
  }
  if(route==='more'){
   document.querySelectorAll('[data-route="notification-settings"]').forEach(button=>button.remove());
  }
  if(route==='admin'){
   const c=document.querySelector('#page .content');if(c&&!c.querySelector('[data-route="data-backups"]'))c.insertAdjacentHTML('beforeend',row('data-backups','Data Backups','Download or recover shared data','download'));
  }
  if((route==='leadership')&&!document.querySelector('[data-route="attendance-dashboard"]'))document.querySelector('#page .content')?.insertAdjacentHTML('beforeend',row('attendance-dashboard','Drill Attendance','Review responses from your unit','people'));
 };
 document.addEventListener('click',ev=>{
  const b=ev.target.closest('#task-form button[type="submit"]');if(!b)return;
  const data=new FormData(b.form);const id=data.get('taskId');const title=data.get('title');
  setTimeout(()=>{const t=state.published.find(x=>id?x.id===id:x.title===title);if(!t)return;if(data.has('assignedUserId'))t.assignedUserId=String(data.get('assignedUserId')||'');if(data.get('personalDue'))t.due=String(data.get('personalDue'));save();},100);
 },true);
 let selectedDay=null;
 let month=new Date();month.setDate(1);
 const calendar=()=>{
  const y=month.getFullYear(),m=month.getMonth(),count=new Date(y,m+1,0).getDate(),offset=new Date(y,m,1).getDay();
  const ds=[...state.customDrills].sort((a,b)=>a.date.localeCompare(b.date));
  const events=[...tasks().map(t=>({date:t.due,title:t.title,route:'task/'+t.id})),...ds.map((d,i)=>({date:d.date,title:d.label,route:'drill/'+i}))];
  const prefix=`${y}-${String(m+1).padStart(2,'0')}-`,today=new Date(),todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const visible=events.filter(x=>selectedDay?x.date===selectedDay:x.date?.startsWith(prefix)).sort((a,b)=>a.date.localeCompare(b.date));
  return head('Calendar','Drills and task due dates.','more')+`<div class="content calendar-content"><section class="card calendar-panel"><div class="month-controls"><button type="button" data-month-step="-1" aria-label="Previous month">${icon('chevron')}</button><strong>${month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button type="button" data-month-step="1" aria-label="Next month">${icon('chevron')}</button></div><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<span class="calendar-weekday">${d}</span>`).join('')}${'<span class="calendar-blank"></span>'.repeat(offset)}${Array.from({length:count},(_,i)=>{const key=prefix+String(i+1).padStart(2,'0'),n=events.filter(x=>x.date===key).length;return `<button type="button" class="calendar-day ${key===todayKey?'is-today':''} ${key===selectedDay?'is-selected':''}" data-calendar-day="${key}" aria-pressed="${key===selectedDay}" aria-label="${key}, ${n} events"><strong>${i+1}</strong><span class="calendar-dots">${n?'<i></i>':''}</span></button>`;}).join('')}</div><p class="calendar-hint">A dot marks dates with tasks or drills. Select a date to view details.</p></section><div class="calendar-list-heading"><h2 class="section-label">${selectedDay?date(selectedDay):'This month'}</h2>${selectedDay?'<button type="button" class="user-action" data-calendar-all>Show all</button>':''}</div><div class="card calendar-agenda">${visible.length?visible.map(x=>`<button type="button" class="calendar-event" data-route="${e(x.route)}"><span class="calendar-event-date">${new Date(x.date+'T12:00:00').getDate()}<small>${new Date(x.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</small></span><span><strong>${e(x.title)}</strong><small>${x.route.startsWith('task/')?'Task due':'Drill'} · ${date(x.date)}</small></span>${icon('chevron')}</button>`).join(''):'<p class="empty">No tasks or drills scheduled.</p>'}</div></div>`;

 };
 const attendance=()=>head('Drill Attendance','Review attendance responses by drill.','admin')+`<div class="content attendance-dashboard">${state.customDrills.map(d=>{
  const categories=['Attending','Not attending','No response'];
  const lists=categories.map(label=>members().filter(u=>(state.drillAttendance?.[d.id]?.[u.id]||'No response')===label));
  return `<section class="card attendance-drill drill-attendance-card clickable-record" data-open-card="drill/${addedDrills().findIndex(item=>item.id===d.id)}"><header><button type="button" class="completion-detail-link" data-route="drill/${addedDrills().findIndex(item=>item.id===d.id)}"><span><h2>${e(d.label)}</h2><small>${date(d.date)}</small></span>${icon('chevron')}</button></header><div class="attendance-groups">${categories.map((label,i)=>`<details class="attendance-group"><summary><span>${label}</span><span class="attendance-group-count">${lists[i].length}</span>${icon('chevron')}</summary><div class="attendance-members">${lists[i].length?lists[i].map(u=>`<div class="attendance-person"><span class="attendance-initials">${e((u.name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join(''))}</span><span><strong>${e(u.name)}</strong><small>${e(u.role)}</small>${label==='Not attending'&&state.drillAttendanceReasons?.[d.id]?.[u.id]?`<small>Reason: ${e(state.drillAttendanceReasons[d.id][u.id])}</small>`:''}</span></div>`).join(''):'<p class="attendance-empty">No members in this group.</p>'}</div></details>`).join('')}</div></section>`;
 }).join('')||'<div class="card"><p class="empty">No drills yet.</p></div>'}</div>`;

 const taskCompletion=()=>head('Task Completion','See who has completed each assigned task.','leadership')+`<div class="content attendance-dashboard">${newestFirst(state.published).filter(t=>!taskIsCancelled(t)).map(t=>{
  const assigned=eligible(t),done=assigned.filter(u=>completed(u)[t.id]),pending=assigned.filter(u=>!completed(u)[t.id]);
  return `<section class="card attendance-drill task-completion-card clickable-record" data-open-card="task/${e(t.id)}"><header><button type="button" class="completion-detail-link" data-route="task/${e(t.id)}"><span><h2>${e(t.title)}</h2><small>Due ${date(t.due)} · ${e(t.audience||'All Users')}</small></span>${icon('chevron')}</button></header><div class="attendance-groups">${[['Completed',done],['Not completed',pending]].map(([label,list])=>`<details class="attendance-group"><summary><span>${label}</span><span class="attendance-group-count">${list.length}</span>${icon('chevron')}</summary><div class="attendance-members">${list.length?list.map(u=>`<div class="attendance-person"><span class="attendance-initials">${e((u.name||'U').split(/\s+/).slice(0,2).map(x=>x[0]).join(''))}</span><span><strong>${e(u.name)}</strong><small>${e(u.role)}${label==='Completed'&&u.completedAt?.[t.id]?' · Completed '+e(new Date(u.completedAt[t.id]).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})):completed(u)[t.id]?' · Completion date unavailable':''}</small></span></div>`).join(''):'<p class="attendance-empty">No members in this group.</p>'}</div></details>`).join('')}</div></section>`;
 }).join('')||'<div class="card"><p class="empty">No tasks yet.</p></div>'}</div>`;
 const settings=()=>head('Notification Settings','Choose which updates appear in your feed.','more')+`<div class="content"><form id="notification-preferences" class="card pad">${['Tasks','Drills','Announcements','Accounts'].map(k=>`<label class="packing-row"><input type="checkbox" name="${k}" ${me().notificationPreferences?.[k]===false?'':'checked'}>${k}</label>`).join('')}<button class="action">Save Settings</button></form></div>`;
 const backupPage=()=>head('Data Backups','Daily snapshots and downloadable recovery copies.','admin')+`<div class="content"><button class="action" data-download-backup>Download current backup</button><p class="notice">Snapshots are created once per day while an Admin uses the app. Recovery restores tasks, drills, and announcements.</p><div id="backup-list" class="card pad">Loading backups...</div></div>`;
 const base=render;render=function(route,focus=true){
 if(!canOpenRoute(route)){go(state.signedIn?'home':'login');return;}
  const pages={'task-completion':taskCompletion,'calendar-view':calendar,'attendance-dashboard':attendance,'notification-settings':settings};
  if(pages[route]&&state.signedIn){if(['task-completion','attendance-dashboard','data-backups'].includes(route)&&!leader()){go('home');return;}current=route;document.querySelector('#home').hidden=true;const p=document.querySelector('#page');p.hidden=false;p.innerHTML=pages[route]();nav('more');if(route==='data-backups')loadBackups();return;}
  base(route,focus);setTimeout(setup,0);
 };
 document.addEventListener('submit',ev=>{if(ev.target.id!=='notification-preferences')return;ev.preventDefault();const p={};['Tasks','Drills','Announcements','Accounts'].forEach(k=>p[k]=ev.target.elements[k].checked);db.collection('users').doc(state.currentUserId).update({notificationPreferences:p}).then(()=>{me().notificationPreferences=p;toast('Notification settings saved.');}).catch(()=>toast('Could not save settings.'));});
 const category=n=>/task|reminder/i.test(n.message)?'Tasks':/drill/i.test(n.message)?'Drills':/announcement/i.test(n.message)?'Announcements':'Accounts';
 setInterval(()=>{setup();document.querySelectorAll('.notification-card').forEach(card=>{const n=state.notifications.find(x=>x.id===card.dataset.notificationId);if(n)card.hidden=me().notificationPreferences?.[category(n)]===false;});},1500);
 const snapshot=()=>({published:state.published,customDrills:state.customDrills,announcements:state.announcements,drillAttendance:state.drillAttendance||{}});
 const backups=db?.collection('appData').doc('recovery').collection('snapshots');
 let backupBusy=false;
 setInterval(async()=>{if(!admin()||!state.signedIn||backupBusy||!state.published.length)return;backupBusy=true;try{const id=new Date().toISOString().slice(0,10);const ref=backups.doc(id);if(!(await ref.get()).exists)await ref.set({...snapshot(),createdAt:new Date().toISOString()});}catch{}finally{backupBusy=false;}},60000);
 async function loadBackups(){try{const result=await backups.orderBy('createdAt','desc').limit(14).get();document.querySelector('#backup-list').innerHTML=result.docs.map(d=>`<p>${e(d.id)} <button data-restore-backup="${e(d.id)}">Restore</button></p>`).join('')||'No snapshots yet.';}catch{document.querySelector('#backup-list').textContent='Snapshot access needs the backup Firestore rule in SETUP.md. Download backups are available now.';}}
 document.addEventListener('click',async ev=>{
  const day=ev.target.closest('[data-calendar-day]');if(day){selectedDay=day.dataset.calendarDay;render('calendar-view',false);return;}
  if(ev.target.closest('[data-calendar-all]')){selectedDay=null;render('calendar-view',false);return;}
  const step=ev.target.closest('[data-month-step]');if(step){selectedDay=null;month.setMonth(month.getMonth()+Number(step.dataset.monthStep));render('calendar-view');}
  if(ev.target.closest('[data-download-backup]')){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));a.download='1438th-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  const restore=ev.target.closest('[data-restore-backup]');if(restore&&admin()&&confirm('Restore tasks, drills, and announcements from this backup?')){try{const doc=await backups.doc(restore.dataset.restoreBackup).get();const before=snapshot();await backups.doc('before-restore-'+Date.now()).set({...before,createdAt:new Date().toISOString()});await db.collection('appData').doc('shared').set(doc.data(),{merge:true});toast('Backup restored.');}catch{toast('Could not restore backup.');}}
 });
},3200);
