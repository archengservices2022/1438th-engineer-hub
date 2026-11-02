"use strict";
/* Operational features: reminders, attendance, reports, pinning, filters, and password changes. */
(() => {
  const user = () => state.demoUsers.find(x => x.id === state.currentUserId) || {id: state.currentUserId, name: 'Account holder'};
  const esc = value => e(value || '');
  const activeUsers = () => state.demoUsers.filter(x => x.status === 'Active');
  const taskProgress = task => {
    const users = activeUsers();
    const done = users.filter(x => x.completed && x.completed[task.id]).length;
    return `${done} of ${users.length} active users completed`;
  };
  const addDueReminders = () => {
    if (!state.signedIn || !state.published?.length) return;
    const tomorrow = new Date(); tomorrow.setHours(0,0,0,0); tomorrow.setDate(tomorrow.getDate() + 1);
    state.notifications ??= [];
    let changed = false;
    state.published.forEach(task => {
      const due = new Date(`${task.due}T00:00:00`);
      const id = `reminder-${task.id}-${task.due}`;
      if (!taskIsCancelled(task)&&!state.closed[task.id]&&task.workStatus!=='Completed'&&+due === +tomorrow && !state.notifications.some(item => item.id === id)) {
        state.notifications.unshift({id, message: `Reminder: ${task.title} is due tomorrow.`, roles: ['Soldier','NCO / Leader'], route: `task/${task.id}`, createdAt: new Date().toISOString()}); changed = true;
      }
    });
    if (changed) save();
  };
  const inject = () => {
    const route = location.hash.slice(1) || 'home';
    if (route === 'leader-manage-tasks') {
      const content = document.querySelector('#page .content');
      if (content && !content.querySelector('[data-export-task-report]')) content.insertAdjacentHTML('afterbegin', `<button class="action outline report-export" data-export-task-report>Download Report</button>`);
      const reportButton = content?.querySelector('[data-route="task-report"]');
      const downloadButton = content?.querySelector('[data-export-task-report]');
      if (content && reportButton && downloadButton && !content.querySelector('.report-toolbar')) {
        const toolbar = document.createElement('div'); toolbar.className = 'report-toolbar';
        downloadButton.before(toolbar); toolbar.append(reportButton, downloadButton);
      }
      document.querySelectorAll('.task-row').forEach(row => {
        if (row.querySelector('.completion-progress')) return;
        const title = row.querySelector('.task-open strong')?.textContent;
        const task = state.published.find(item => item.title === title);
        if (task) row.querySelector('.task-open')?.insertAdjacentHTML('beforeend', `<small class="completion-progress">${taskProgress(task)}</small>`);
      });
    }
    if (route === 'leader-manage-announcements') {
      document.querySelectorAll('.announcement.managed').forEach(card => {
        if (card.querySelector('[data-pin-announcement]')) return;
        const title = card.querySelector('strong')?.textContent;
        const item = state.announcements.find(x => x.title === title);
        if (!item) return;
        (card.querySelector('.user-actions') || card).insertAdjacentHTML('beforeend', `<button type="button" class="user-action announcement-pin-control" data-pin-announcement="${esc(item.id)}" title="${item.pinned?'Unpin announcement':'Pin announcement'}" aria-label="${item.pinned?'Unpin announcement':'Pin announcement'}" aria-pressed="${!!item.pinned}">${icon(item.pinned?'pinOff':'pin')}</button>`);
      });
    }
    if (route === 'drill') {
      const card = document.querySelector('.next-card');
      const label = card?.querySelector('h2')?.textContent;
      const drill = state.customDrills.find(x => x.label === label);
      if (card && drill && !card.querySelector('.attendance-actions')) {
        const status = state.drillAttendance?.[drill.id]?.[user().id] || '';
        card.insertAdjacentHTML('beforeend', `<section class="attendance-actions"><h3>Drill attendance</h3><p>${status ? `Your response: <strong>${esc(status)}</strong>` : 'Mark your own attendance, including Admins who will participate.'}</p><div><button class="user-action ${status === 'Attending' ? 'primary' : ''}" data-drill-attendance="Attending" data-drill-id="${esc(drill.id)}">Attending</button><button class="user-action ${status === 'Not attending' ? 'danger' : ''}" data-drill-attendance="Not attending" data-drill-id="${esc(drill.id)}">Not attending</button></div></section>`);
      }
    }
    if (route === 'admin-manage-drills') {
      const content = document.querySelector('#page .content');

      document.querySelectorAll('.announcement.managed').forEach(card => {
        if (card.querySelector('[data-edit-drill]')) return;
        const title = card.querySelector('strong')?.textContent || '';
        const drill = state.customDrills.find(item => title.includes(item.label));
        if (drill) card.querySelector('[data-delete-schedule]')?.insertAdjacentHTML('beforebegin', `<button type="button" class="user-action" data-edit-drill="${esc(drill.id)}">Edit</button>`);
      });
    }
    if (route === 'leadership') {
      const content = document.querySelector('#page .content');
      if (content && !content.querySelector('[data-route="weekly-summary"]')) content.insertAdjacentHTML('afterbegin', `<button class="action outline weekly-summary-link" data-route="weekly-summary">View Weekly Overview</button>`);
    }
    if (route === 'more') {
      const card = document.querySelector('#page .content > .card');
      if (card && !card.querySelector('[data-open-calendar]')) { const calendar = document.createElement('button'); calendar.type='button'; calendar.className='row-button'; calendar.dataset.openCalendar='true'; calendar.innerHTML=`<span class="tile-icon">▣</span><span class="row-copy"><strong>Calendar</strong><small>Drills and task due dates</small></span>${icon('chevron')}`; card.querySelector('[data-signout]')?.before(calendar); }
    }
    if (route === 'admin') {
      const content = document.querySelector('#page .content');
      if (content && !content.querySelector('[data-show-activity]')) content.insertAdjacentHTML('beforeend', `<button class="action outline" data-show-activity>View Full Activity Log</button>`);
    }
  };
  const csvDownload = (name, headings, rows) => {
    const quote = v => `"${String(v ?? '').replaceAll('"','""')}"`;
    const blob = new Blob([[headings, ...rows].map(row => row.map(quote).join(',')).join('\r\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const downloadDrillAttendancePdf = () => {
    const pdf=new window.jspdf.jsPDF({orientation:'landscape'});
    pdf.setFontSize(18);pdf.text('1438th Engineer Hub - Drill Attendance',14,18);
    pdf.setFontSize(10);pdf.text('Generated: '+new Date().toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}),14,26);
    const reportRows=[];
    state.customDrills.forEach(drill=>activeUsers().forEach(person=>reportRows.push([drill.label,drill.date,person.name,person.role,state.drillAttendance?.[drill.id]?.[person.id]||'No response',state.drillAttendanceReasons?.[drill.id]?.[person.id]||''])));
    pdf.autoTable({head:[['Drill','Date','Name','Role','Attendance','Reason']],body:reportRows.length?reportRows:[['No attendance records','','','','','']],startY:33,styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:[18,59,34]},didDrawPage:()=>{pdf.setFontSize(9);pdf.text('Page '+pdf.internal.getNumberOfPages(),14,pdf.internal.pageSize.height-8);}});
    pdf.save('1438th-drill-attendance-'+new Date().toLocaleDateString('en-CA')+'.pdf');
  };
  const notifyAdminTaskCompletion = taskId => {
    if (!taskId || state.role === 'Admin' || !state.currentUserId) return;
    const task = state.published.find(item => item.id === taskId);
    if (!task) return;
    state.notifications ??= [];
    const id = `task-complete-${taskId}-${state.currentUserId}`;
    if (state.notifications.some(item => item.id === id)) return;
    state.notifications.unshift({id, message: `Task completed: ${task.title} — ${user().name}.`, roles: ['Admin'], route: `task/${task.id}`, createdAt: new Date().toISOString()});
    state.notifications = state.notifications.slice(0, 100);
    state.activity ??= [];
    state.activity.unshift({...activityActor(),message: `${user().name} completed task: ${task.title}.`, createdAt: new Date().toISOString()});
    state.activity = state.activity.slice(0, 100);
    save();
  };
  document.addEventListener('change', event => {
    const checkbox = event.target.closest('[data-task]');
    const status = event.target.closest('[data-task-status]');
    if (checkbox && checkbox.checked) setTimeout(() => notifyAdminTaskCompletion(checkbox.dataset.task), 0);
    if (status && status.value === 'Completed') setTimeout(() => notifyAdminTaskCompletion(status.dataset.taskStatus), 0);
  }, true);
  document.addEventListener('click', event => {
    const complete = event.target.closest('[data-toggle-task]');
    if (complete && !state.completed[complete.dataset.toggleTask]) setTimeout(() => notifyAdminTaskCompletion(complete.dataset.toggleTask), 0);
  }, true);

  document.addEventListener('click', event => {
    const darkMode = event.target.closest('[data-toggle-dark-mode]');
    if (darkMode) { const enabled = !document.body.classList.contains('dark-mode'); document.body.classList.toggle('dark-mode', enabled); const profile = user(); profile.theme = enabled ? 'dark' : 'light'; window.firebaseHub?.db?.collection('users').doc(profile.id).set({theme: profile.theme},{merge:true}).catch(() => toast('Could not save display preference.')); window.hubThemeControls?.refresh(); return; }
    const editDrill = event.target.closest('[data-edit-drill]');
    if (editDrill) { const drill = state.customDrills.find(item => item.id === editDrill.dataset.editDrill); if (!drill) return;  document.body.insertAdjacentHTML('beforeend', `<div class="confirm-layer" id="drill-editor"><form id="drill-edit-form" class="confirm-dialog" data-drill-id="${esc(drill.id)}" onsubmit="return false"><button class="dialog-close" type="button" data-close-drill-editor aria-label="Close">×</button><h2>Edit Drill</h2><div class="field"><label>Attendance response deadline (optional)<input name="attendanceDeadline" type="date" value="${esc(drill.attendanceDeadline||'')}"></label></div><div class="field"><label>Date<input name="date" type="date" required value="${date(drill.date)}"></label></div><div class="field"><label>Drill title<input name="label" maxlength="60" required value="${esc(drill.label)}"></label></div><div class="field"><label>General note<textarea name="note" maxlength="180" required>${esc(drill.note)}</textarea></label></div><div class="confirm-actions"><button type="button" class="confirm-cancel" data-close-drill-editor>Cancel</button><button class="confirm-logout" type="submit">Save Changes</button></div></form></div>`); return; }
    if (event.target.closest('[data-close-drill-editor]')) { document.querySelector('#drill-editor')?.remove(); return; }
    const attendance = event.target.closest('[data-drill-attendance]');
    if (attendance) { state.drillAttendance ??= {}; const id = attendance.dataset.drillId; state.drillAttendance[id] ??= {}; state.drillAttendance[id][user().id] = attendance.dataset.drillAttendance; save(); render(location.hash.slice(1) || 'drill', false); toast(`Attendance marked: ${attendance.dataset.drillAttendance}.`); return; }
    const pin = event.target.closest('[data-pin-announcement]');
    if (pin) { const item = state.announcements.find(x => x.id === pin.dataset.pinAnnouncement); if (!item) return; if(!item.pinned&&state.announcements.filter(x=>x.pinned).length>=3){toast('You can pin up to 3 announcements. Unpin one first.');return;}item.pinned = !item.pinned;if(item.pinned)item.pinnedAt=new Date().toISOString();else delete item.pinnedAt;state.announcements=orderedAnnouncements(); save(); render('leader-manage-announcements', false); toast(item.pinned ? 'Announcement pinned to the top.' : 'Announcement unpinned.'); return; }
    if (event.target.closest('[data-export-task-report]')) { window.taskReportDownloads.open(); return; }
    if (event.target.closest('[data-export-drill-report]')) { const rows=[]; state.customDrills.forEach(drill => activeUsers().forEach(person => rows.push([drill.label,drill.date,person.name,state.drillAttendance?.[drill.id]?.[person.id] || 'No response']))); downloadDrillAttendancePdf(); toast('Drill attendance PDF downloaded.'); return; }
    if (event.target.closest('[data-show-activity]')) { document.body.insertAdjacentHTML('beforeend', `<div class="confirm-layer" id="activity-modal"><section class="confirm-dialog activity-modal"><button class="dialog-close" data-close-activity aria-label="Close">×</button><h2>Activity Log</h2><div class="activity-items">${(state.activity||[]).slice(0,100).map(item => `<p><strong>${esc(displayDateText(item.message))}</strong><small>${esc(item.actorName||'Earlier activity (actor unavailable)')} · ${new Date(item.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})}</small></p>`).join('') || '<p>No activity yet.</p>'}</div></section></div>`); return; }
    if (event.target.closest('[data-close-activity]')) { document.querySelector('#activity-modal')?.remove(); return; }
    if (event.target.closest('[data-open-password-change]')) { document.body.insertAdjacentHTML('beforeend', `<div class="confirm-layer" id="password-modal"><form id="password-change-form" class="confirm-dialog" onsubmit="return false"><button class="dialog-close" type="button" data-close-password aria-label="Close">×</button><h2>Change Password</h2><p>Use your current password to securely choose a new password.</p><div class="field"><label>Current password<input name="current" type="password" required></label></div><div class="field"><label>New password<input name="next" type="password" minlength="6" required></label></div><p class="form-error" hidden></p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-close-password>Cancel</button><button class="confirm-logout" type="submit">Update Password</button></div></form></div>`); return; }
    if (event.target.closest('[data-close-password]')) document.querySelector('#password-modal')?.remove();
  }, true);
  document.addEventListener('change', event => { const select = event.target.closest('[data-priority-filter]'); if (!select) return; state.taskPriority=select.value; refreshTaskResults(); });
  document.addEventListener('submit', event => { const form=event.target; if (form.id !== 'drill-edit-form') return; event.preventDefault(); const drill=state.customDrills.find(item => item.id === form.dataset.drillId); if (!drill) return;  const previous={...drill}; const data=new FormData(form); drill.attendanceDeadline=String(data.get('attendanceDeadline')||''); drill.date=String(data.get('date')||''); drill.label=String(data.get('label')||'').trim(); drill.note=String(data.get('note')||'').trim(); if (!drill.date || !drill.label || !drill.note) {Object.assign(drill,previous);return;} if(previous.date!==drill.date||previous.label!==drill.label||previous.note!==drill.note||previous.attendanceDeadline!==drill.attendanceDeadline){drill.changeHistory??=[];drill.changeHistory.unshift({...activityActor(),changedAt:new Date().toISOString(),previousDate:previous.date,newDate:drill.date,previousTitle:previous.label,newTitle:drill.label,previousNote:previous.note,newNote:drill.note,previousDeadline:previous.attendanceDeadline||'',newDeadline:drill.attendanceDeadline||''});state.notifications??=[];state.notifications.unshift({id:'drill-update-'+crypto.randomUUID(),message:previous.date!==drill.date?`Drill date changed: ${drill.label} — ${previous.date} → ${drill.date}.`:`Drill details changed: ${drill.label}. Please review the updated information.`,roles:['Soldier','NCO / Leader','Admin'],route:'drill',drillId:drill.id,createdAt:new Date().toISOString()});} state.activity ??= []; state.activity.unshift({...activityActor(),message:`Drill updated: ${drill.label}.`,createdAt:new Date().toISOString()}); save(); document.querySelector('#drill-editor')?.remove(); render('admin-manage-drills',false); toast('Drill updated.'); }, true);
  document.addEventListener('submit', event => { const form=event.target; if (form.id !== 'password-change-form') return; event.preventDefault(); const auth=window.firebaseHub?.auth, current=String(new FormData(form).get('current')), next=String(new FormData(form).get('next')), error=form.querySelector('.form-error'); const account=auth?.currentUser; if (!auth||!account) { error.textContent='Sign in again, then try changing your password.'; error.hidden=false; return; } const credential=firebase.auth.EmailAuthProvider.credential(account.email,current); auth.currentUser.reauthenticateWithCredential(credential).then(() => auth.currentUser.updatePassword(next)).then(() => { document.querySelector('#password-modal')?.remove(); toast('Password updated.'); }).catch(() => { error.textContent='Current password is incorrect or the new password is not allowed.'; error.hidden=false; }); }, true);
  const weeklySummary = () => {
    const today = new Date(); today.setHours(0,0,0,0); const end = new Date(today); end.setDate(end.getDate()+7);
    const due = state.published.filter(task => { const date = new Date(`${task.due}T00:00:00`); return date >= today && date <= end; });
    const drills = state.customDrills.filter(drill => { const date = new Date(`${drill.date}T00:00:00`); return date >= today && date <= end; });
    const completed = state.published.filter(task => state.completed[task.id]).length;
    return head('Weekly Overview', 'Next seven days at a glance.', 'leadership') + `<div class="content weekly-overview-content"><div class="stats weekly-stat-links"><button type="button" class="stat" data-route="due-soon"><span>Tasks due</span><b>${due.length}</b></button><button type="button" class="stat" data-route="completed-tasks"><span>My completed</span><b>${completed}</b></button><button type="button" class="stat" data-route="drill"><span>Drills</span><b>${drills.length}</b></button><button type="button" class="stat" data-route="leader-manage-tasks"><span>Published tasks</span><b>${state.published.length}</b></button></div><div class="card weekly-list"><h2>Upcoming tasks</h2>${due.length ? due.map(task => `<button data-route="task/${esc(task.id)}"><strong>${esc(task.title)}</strong><small>Due ${date(task.due)} · ${esc(task.priority||'Normal')}</small></button>`).join('') : '<p class="empty">No tasks due this week.</p>'}</div><div class="card weekly-list"><h2>Upcoming drills</h2>${drills.length ? drills.map(drill => `<button type="button" data-route="drill/${addedDrills().findIndex(item=>item.id===drill.id)}"><strong>${esc(drill.label)}</strong><small>${date(drill.date)}</small></button>`).join('') : '<p class="empty">No drills this week.</p>'}</div></div>`;
  };
  const calendarView = () => {
    const items = [...state.customDrills.map(drill => ({date:drill.date, title:drill.label, kind:'Drill', route:'drill'})), ...state.published.map(task => ({date:task.due,title:task.title,kind:'Task',route:`task/${task.id}`}))].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    return head('Calendar', 'Drills and task due dates.', 'more') + `<div class="content"><div class="card calendar-list">${items.length ? items.map(item => `<button data-route="${esc(item.route)}"><span>${esc(item.date)}</span><strong>${esc(item.title)}</strong><small>${esc(item.kind)}</small>${icon('chevron')}</button>`).join('') : '<p class="empty">No drills or task due dates yet.</p>'}</div></div>`;
  };
  const previousRender = render;
  render = function(route, focus=true) {
 if(!canOpenRoute(route)){go(state.signedIn?'home':'login');return;}
    if (route === 'weekly-summary' || route === 'calendar-view') { current = route; document.querySelector('#home').hidden = true; const page=document.querySelector('#page'); page.hidden=false; page.innerHTML=route==='weekly-summary'?weeklySummary():calendarView(); document.querySelector('#bottom-nav').hidden=!state.signedIn; nav(route==='weekly-summary'?'leadership':'more'); if(focus){window.scrollTo(0,0);document.querySelector('#main').focus({preventScroll:true});} return; }
    previousRender(route, focus); setTimeout(() => { const profile=user(); document.body.classList.toggle('dark-mode', profile.theme==='dark'); inject(); },0);
  };
  document.addEventListener('click', event => {
    const calendar = event.target.closest('[data-open-calendar]'); if (calendar) go('calendar-view');
  }, true);
  setInterval(() => { addDueReminders(); inject(); }, 2500);
})();
