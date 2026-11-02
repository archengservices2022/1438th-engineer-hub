const managedAnnouncements=()=>{if(!leader())return head('Announcements','','more');return head('Manage Announcements','Search and manage unit updates.','leader-announcements')+`<div class="content"><div class="card">${state.announcements.length ? orderedAnnouncements().map(item => `<article class="announcement managed clickable-record ${announcementSeen(item)?'announcement-seen':'announcement-unseen'}" data-open-card="announcement/${e(item.id)}"><button type="button" class="record-heading" data-route="announcement/${e(item.id)}"><strong>${item.pinned?`<span class="announcement-pin-marker">${icon('pin')}</span>`:''}${e(item.title)}</strong>${icon('chevron')}</button><small>${e(item.category || 'General')} · ${announcementDateValue(item)?`Date ${date(announcementDateValue(item))}`:'Date not recorded'}</small><p>${e(displayDateText(item.message))}</p><div class="user-actions"><button type="button" class="user-action" data-edit-announcement="${e(item.id)}">Edit</button><button type="button" class="user-action danger" data-delete-announcement="${e(item.id)}">Delete</button></div></article>`).join('') : '<p class="empty">No announcements yet.</p>'}</div></div>`;};
'use strict';

/* Admin account-management flow. All reads/writes go through Firebase
   (Firestore for profile data, Firebase Auth for sign-in and password reset).
   Nothing here is local-only. */
state.activity ??= [];
const recordActivity = message => { state.activity.unshift({...activityActor(),message, createdAt: new Date().toISOString()}); state.activity = state.activity.slice(0, 100); save(); };
const restoreMissingActivity = () => {
  let changed = false;
  (state.published || []).forEach(task => {
    if (!state.activity.some(item => String(item.message || '').includes(task.title))) {
      state.activity.unshift({...activityActor(),message: `Task created: ${task.title}.`, createdAt: new Date().toISOString()});
      changed = true;
    }
  });
  (state.announcements || []).forEach(announcement => {
    if (!state.activity.some(item => String(item.message || '').includes(announcement.title))) {
      state.activity.unshift({...activityActor(),message: `Announcement created: ${announcement.title}.`, createdAt: new Date().toISOString()});
      changed = true;
    }
  });
  if (changed) { state.activity = state.activity.slice(0, 30); save(); }
};

const userActionControls = user => `<div class="user-actions compact-user-actions"><button type="button" class="user-action primary" data-manage-user="${e(user.id)}">Manage Account</button></div>`;


const accountRequests = () => {
  if (!admin()) return head('Users & Roles', '', 'admin') + '<div class="content"><p class="notice">Open an Admin account to manage requests.</p></div>';
  const statusClass = status => String(status || 'Active').toLowerCase();
  return head('Users & Roles', 'Review accounts and update roles.', 'admin') + `<div class="content"><label class="search-field">${icon('people')}<input data-user-search type="search" placeholder="Search users"></label><button type="button" class="action create-user-control" data-route="admin-create-user">Create User ${icon('people')}</button><div class="card">${newestFirst(state.demoUsers).map(user => `<article class="announcement managed user-account-card" data-user-card><div class="user-card-heading"><div><strong>${e(user.name)}</strong><small>${e(user.role)}</small></div><span class="account-status ${statusClass(user.status)}">${e(user.status || 'Active')}</span></div><div class="account-details"><span><b>Email</b>${e(user.email || 'Not added')}</span><span><b>Phone</b>${e(user.phone || 'Not added')}</span><span><b>Created</b>${user.createdAt ? e(date(String(user.createdAt).slice(0, 10))) : 'Not available'}</span></div>${userActionControls(user)}</article>`).join('')}</div></div>`;
};

const userEditor = user => `<div class="confirm-layer" id="user-editor"><form id="user-edit-form" class="confirm-dialog" data-user-id="${e(user.id)}" onsubmit="return false"><h2>Edit user details</h2><p>Update this account’s name and phone number. Email changes are managed in Firebase Console. Existing passwords cannot be viewed; use Send password reset.</p><div class="field"><label>Full Name<input name="name" maxlength="70" required value="${e(user.name)}"></label></div><div class="field"><label>Email Address<input type="email" readonly value="${e(user.email || '')}"></label></div><div class="field"><label>Phone Number<input name="phone" type="tel" maxlength="30" value="${e(user.phone || '')}"></label></div><p class="form-error" id="user-edit-error" hidden></p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-close-user-editor>Cancel</button><button type="submit" class="confirm-logout">Save Changes</button></div></form></div>`;


const userManager = user => {
  const statusAction = user.status === 'Pending'
    ? `<button class="user-action primary" data-approve-user="${e(user.id)}" ${user.requiresEmailVerification&&!user.emailVerified?'disabled title="Waiting for email verification"':''}>Approve</button><button class="user-action" data-decline-user="${e(user.id)}">Decline</button>`
    : user.status === 'Disabled'
      ? `<button class="user-action primary" data-reactivate-user="${e(user.id)}">Reactivate</button>`
      : `<button class="user-action" data-disable-user="${e(user.id)}">Disable</button>`;
  const disabled = user.id === state.currentUserId ? 'disabled title="You cannot delete the signed-in Admin account"' : '';
  return `<div class="confirm-layer" id="user-manager"><section class="confirm-dialog user-manager" role="dialog" aria-modal="true" aria-labelledby="manage-user-title"><button type="button" class="dialog-close" data-close-user-manager aria-label="Close">×</button><h2 id="manage-user-title">${e(user.name)}</h2><p>${e(user.email || 'No email address on file')}</p><span class="account-status ${String(user.status || 'Active').toLowerCase()}">${e(user.status || 'Active')}</span><h3>Account access</h3>${user.status==='Pending'&&user.requiresEmailVerification&&!user.emailVerified?'<p class="muted">Waiting for email verification. The user must verify their email and sign in before approval.</p>':''}<div class="user-actions">${statusAction}</div><h3>Role</h3><div class="role-choice" role="group" aria-label="Change role for ${e(user.name)}">${roles.map(role => `<button type="button" data-change-role="${e(user.id)}" data-role-value="${role}" aria-pressed="${role === user.role}">${role}</button>`).join('')}</div><h3>Account options</h3><div class="user-actions"><button type="button" class="user-action" data-edit-user="${e(user.id)}">Edit details</button><button type="button" class="user-action" data-reset-user="${e(user.id)}">Send password reset</button><button type="button" class="user-action danger" data-delete-user="${e(user.id)}" ${disabled}>Delete account</button></div></section></div>`;
};

document.addEventListener('click', event => {
  const manage = event.target.closest('[data-manage-user]');
  const close = event.target.closest('[data-close-user-manager]');
  if (close) { document.querySelector('#user-manager')?.remove(); return; }
  if (!manage || !admin()) return;
  event.preventDefault();
  const user = state.demoUsers.find(item => item.id === manage.dataset.manageUser);
  if (!user) return;
  document.querySelector('#user-manager')?.remove();
  document.body.insertAdjacentHTML('beforeend', userManager(user));
}, true);

users = accountRequests;

/* Keep the home screen simple for Soldiers and NCO / Leaders. Their role
   tools remain available through the bottom navigation and More menu. */
setTimeout(() => {
  const summaryForHome = summary;
  summary = () => {
    summaryForHome();
    if (state.role === 'NCO / Leader') document.querySelector('#role-summary').innerHTML = '';
  };
  if (state.signedIn && state.role === 'NCO / Leader' && (location.hash.slice(1) === '' || location.hash.slice(1) === 'home')) summary();
}, 400);

/* Announcement editing is available from the management screen. */
setTimeout(() => {
  announcements = () => head('Announcements', 'Create and manage announcements.', 'leadership') + `<div class="content"><form id="announcement-form" class="card pad" onsubmit="return false"><h2>Publish Announcement</h2><div class="field"><label>Title<input name="title" maxlength="100" required></label></div><div class="field"><label>Message<textarea name="message" maxlength="1000" required></textarea></label></div><div class="field"><label>Category<select name="category" data-category-choice required>${['General', 'Drill Preparation', 'Training', 'Safety', 'Personnel', 'Other'].map(category => `<option>${category}</option>`).join('')}</select></label><label class="custom-category-field" hidden>Other category<input name="customCategory" maxlength="60" placeholder="Type your category"></label></div><div class="field"><label>Audience<select name="audience">${audiences.map(audience => `<option>${audience}</option>`).join('')}</select></label></div><button class="action" type="submit">Publish Announcement ${icon('chevron')}</button></form><button type="button" class="action outline" data-route="leader-manage-announcements">Manage Announcements ${icon('chevron')}</button></div>`;
  if (location.hash.slice(1) === 'leader-announcements') render('leader-announcements', false);
}, 500);

document.addEventListener('click',event=>{
 if(event.target.closest('[data-close-announcement-editor]')){document.querySelector('#announcement-editor')?.remove();return;}
 const button=event.target.closest('[data-edit-announcement]');if(!button||!leader())return;
 event.preventDefault();const item=state.announcements.find(a=>a.id===button.dataset.editAnnouncement);if(!item)return;
 document.querySelector('#announcement-editor')?.remove();
 document.body.insertAdjacentHTML('beforeend',`<div class="confirm-layer" id="announcement-editor"><form class="confirm-dialog" id="announcement-edit-form" data-announcement-id="${e(item.id)}" role="dialog" aria-modal="true" aria-labelledby="announcement-edit-title"><h2 id="announcement-edit-title">Edit announcement</h2><div class="field"><label>Announcement Date<input name="announcementDate" type="date" required value="${e(announcementDateValue(item))}"></label></div><div class="field"><label>Title<input name="title" required maxlength="100" value="${e(item.title)}"></label></div><div class="field"><label>Message<textarea name="message" required maxlength="1000">${e(item.message)}</textarea></label></div><div class="field"><label>Category<input name="category" required maxlength="60" value="${e(item.category||'General')}"></label></div><div class="confirm-actions"><button type="button" class="confirm-cancel" data-close-announcement-editor>Cancel</button><button type="submit" class="confirm-logout">Save changes</button></div></form></div>`);
 document.querySelector('#announcement-edit-form input').focus();
},true);
document.addEventListener('submit',event=>{
 const form=event.target;if(form.id!=='announcement-edit-form')return;event.preventDefault();if(!leader()||!form.reportValidity())return;
 const item=state.announcements.find(a=>a.id===form.dataset.announcementId);if(!item)return;
 const fields=new FormData(form),title=String(fields.get('title')).trim(),message=String(fields.get('message')).trim(),category=String(fields.get('category')).trim(),announcementDate=String(fields.get('announcementDate')||'');
 if(!title||!message||!category||!/^\d{4}-\d{2}-\d{2}$/.test(announcementDate))return;
 if(item.title!==title||item.message!==message||item.category!==category||announcementDateValue(item)!==announcementDate){
  item.editHistory??=[];item.editHistory.unshift({...activityActor(),changedAt:new Date().toISOString(),previousDate:announcementDateValue(item),newDate:announcementDate});Object.assign(item,{title,message,category,announcementDate});resetAnnouncementSeen(item);recordActivity(`Announcement updated: ${item.title}.`);save();
 }
 document.querySelector('#announcement-editor').remove();render('leader-manage-announcements',false);toast('Announcement saved.');
},true);

const confirmedAccountActions=new WeakSet();
const roleChangeConfirmation = (user, role) => `<div class="confirm-layer" id="role-change-confirmation"><section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="role-confirm-title"><h2 id="role-confirm-title">Change role?</h2><p>Are you sure you want to change ${e(user.name)}’s role from <b>${e(user.role)}</b> to <b>${e(role)}</b>?</p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-cancel-role-change>Cancel</button><button type="button" class="confirm-logout" data-confirm-role-change="${e(user.id)}" data-role-value="${e(role)}">Yes, change role</button></div></section></div>`;

document.addEventListener('click', event => {
  const approve = event.target.closest('[data-approve-user]');
  const decline = event.target.closest('[data-decline-user]');
  const roleButton = event.target.closest('[data-change-role]');
  const confirmRole = event.target.closest('[data-confirm-role-change]');
  const cancelRole = event.target.closest('[data-cancel-role-change]');
  if (cancelRole) { document.querySelector('#role-change-confirmation')?.remove(); return; }
  const disable = event.target.closest('[data-disable-user]');
  const reactivate = event.target.closest('[data-reactivate-user]');
  if (!approve && !decline && !roleButton && !confirmRole && !disable && !reactivate) return;
  event.preventDefault();
  if (!admin()) return;
  const id = approve ? approve.dataset.approveUser : decline ? decline.dataset.declineUser : roleButton ? roleButton.dataset.changeRole : confirmRole ? confirmRole.dataset.confirmRoleChange : disable ? disable.dataset.disableUser : reactivate.dataset.reactivateUser;
  const user = state.demoUsers.find(item => item.id === id);
  if (!user) return;
  if(approve&&user.requiresEmailVerification&&!user.emailVerified){toast('This user must verify their email before approval.');return;}
  if((approve||decline||disable||reactivate)&&!confirmedAccountActions.has(approve||decline||disable||reactivate)){
    const actionButton=approve||decline||disable||reactivate,verb=approve?'approve':decline?'decline':disable?'disable':'reactivate';
    document.querySelector('#account-status-confirmation')?.remove();
    document.body.insertAdjacentHTML('beforeend',`<div class="confirm-layer" id="account-status-confirmation"><section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="account-status-title"><h2 id="account-status-title">${verb.charAt(0).toUpperCase()+verb.slice(1)} account?</h2><p>Are you sure you want to ${verb} <strong>${e(user.name)}</strong>'s account?</p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-cancel-account-status>Cancel</button><button type="button" class="confirm-logout" data-confirm-account-status>Yes, ${verb}</button></div></section></div>`);
    const layer=document.querySelector('#account-status-confirmation'),cancel=layer.querySelector('[data-cancel-account-status]'),confirm=layer.querySelector('[data-confirm-account-status]');
    const close=()=>{document.removeEventListener('keydown',keys);layer.remove();};
    const keys=event=>{if(event.key==='Escape'){event.preventDefault();close();actionButton.focus();}if(event.key==='Tab'){event.preventDefault();(document.activeElement===cancel?confirm:cancel).focus();}};
    document.addEventListener('keydown',keys);cancel.focus();cancel.onclick=()=>{close();actionButton.focus();};
    confirm.onclick=()=>{close();confirmedAccountActions.add(actionButton);actionButton.click();confirmedAccountActions.delete(actionButton);};return;
  }
  document.querySelector('#user-manager')?.remove();
  if (roleButton) {
    const role = roleButton.dataset.roleValue;
    if (!roles.includes(role)) return;
    if (role === user.role) { toast(`${user.name} is already ${role}.`); return; }
    document.querySelector('#role-change-confirmation')?.remove();
    document.body.insertAdjacentHTML('beforeend', roleChangeConfirmation(user, role));
    return;
  }
  if (confirmRole) {
    const role = confirmRole.dataset.roleValue;
    if (!roles.includes(role)) return;
    document.querySelector('#role-change-confirmation')?.remove();
    user.role = role;
    const request = (state.accountRequests || []).find(item => item.id === user.id);
    if (request) request.role = role;
    window.firebaseHub?.db?.collection('users').doc(user.id).set({role}, {merge: true}).catch(() => toast('Could not update role.'));
    recordActivity(`${user.name}'s role changed to ${role}.`);
    render('admin-users', false);
    toast(`${user.name}'s role changed to ${role}.`);
    return;
  }
  user.status = (approve || reactivate) ? 'Active' : 'Disabled';
  if (approve) {
    state.notifications ??= [];
    const noticeId = `account-approved-${user.id}`;
    if (!state.notifications.some(item => item.id === noticeId)) state.notifications.unshift({id: noticeId, userId:user.id, message: `Account approved: Welcome to 1438th Engineer Hub, ${user.name}.`, roles: [user.role], route: 'home', createdAt: new Date().toISOString()});
  }
  const request = (state.accountRequests || []).find(item => item.id === user.id);
  if (request) request.status = user.status;
  window.firebaseHub?.db?.collection('users').doc(user.id).set({status: user.status}, {merge: true}).catch(() => toast('Could not update account status.'));
  recordActivity(approve ? `${user.name}'s account was approved.` : reactivate ? `${user.name}'s account was reactivated.` : disable ? `${user.name}'s account was disabled.` : `${user.name}'s account was declined.`);
  render('admin-users', false);
  toast(approve ? 'Account approved.' : reactivate ? 'Account reactivated.' : disable ? 'Account disabled.' : 'Account declined.');
}, true);

document.addEventListener('click', event => {
  const edit = event.target.closest('[data-edit-user]');
  const remove = event.target.closest('[data-delete-user]');
  const reset = event.target.closest('[data-reset-user]');
  const close = event.target.closest('[data-close-user-editor]');
  if (close) { document.querySelector('#user-editor')?.remove(); return; }
  if (!edit && !remove && !reset) return;
  event.preventDefault();
  if (!admin()) return;
  const action = edit || remove || reset;
  const id = action.dataset.editUser || action.dataset.deleteUser || action.dataset.resetUser;
  const user = state.demoUsers.find(item => item.id === id);
  if (!user) return;
  document.querySelector('#user-manager')?.remove();
  if (reset) {
    if (!user.email) { toast('This account has no email address on file.'); return; }
    window.firebaseHub?.auth?.sendPasswordResetEmail(user.email).then(() => {
      recordActivity(`Password reset email sent to ${user.name}.`);
      toast('Password reset email sent.');
    }).catch(() => toast('Could not send a password reset email.'));
    return;
  }
  if (edit) { document.querySelector('#user-editor')?.remove(); document.body.insertAdjacentHTML('beforeend', userEditor(user)); return; }
  if (user.id === state.currentUserId) { toast('You cannot delete the signed-in Admin account.'); return; }
  // Deletion is confirmed by the shared recovery handler before this click.
  window.firebaseHub?.db?.collection('users').doc(user.id).delete().then(() => {
    state.demoUsers = state.demoUsers.filter(item => item.id !== user.id);
    recordActivity(`${user.name}'s account was deleted.`);
    render('admin-users', false);
    toast('User account deleted.');
  }).catch(() => toast('Could not delete this account.'));
}, true);

document.addEventListener('submit', event => {
  if (event.target.id !== 'user-edit-form') return;
  event.preventDefault();
  if (!admin()) return;
  const form = event.target;
  const user = state.demoUsers.find(item => item.id === form.dataset.userId);
  if (!user) return;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const error = form.querySelector('#user-edit-error');
  if (!name) { error.textContent = 'Enter a full name.'; error.hidden = false; return; }
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled || !form.reportValidity()) return;
  submit.disabled = true; submit.textContent = 'Saving…'; error.hidden = true;
  Promise.resolve().then(() => {
    const db = window.firebaseHub?.db;
    if (!db) throw new Error('Firebase is unavailable. Reload and try again.');
    return db.collection('users').doc(user.id).update({name, phone});
  }).then(() => {
    user.name = name;
    user.phone = phone;
    recordActivity(`${user.name}'s details were updated.`);
    document.querySelector('#user-editor')?.remove();
    render('admin-users', false);
    toast('User details updated.');
  }).catch(failure => { error.textContent = failure.message || 'Could not save changes.'; error.hidden = false; })
    .finally(() => { submit.disabled = false; submit.textContent = 'Save Changes'; });
}, true);

document.addEventListener('input', event => {
  if (!event.target.matches('[data-user-search]')) return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('[data-user-card]').forEach(card => { card.hidden = !!query && !card.textContent.toLowerCase().includes(query); });
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id !== 'task-form' && form.id !== 'announcement-form') return;
  const title = String(new FormData(form).get('title') || '').trim();
  if (!title) return;
  setTimeout(() => recordActivity(`${form.id === 'task-form' ? 'Task' : 'Announcement'} updated: ${title}.`), 0);
});

/* app.js saves a task from its Publish button's click handler, which prevents
   the browser submit event. Record that save path as well. */
document.addEventListener('click', event => {
  const button = event.target.closest('#task-form button[type="submit"]');
  if (!button) return;
  const form = button.form;
  const title = String(new FormData(form).get('title') || '').trim();
  if (!title) return;
  setTimeout(() => {
    if (state.published.some(task => task.title === title)) recordActivity(`Task updated: ${title}.`);
  }, 0);
}, true);

const recentUpdateRoute=item=>{
 if(item.route&&canOpenRoute(item.route))return item.route;
 const message=item.message||'';
 const find=(list,key)=>[...list].sort((a,b)=>String(b[key]||'').length-String(a[key]||'').length).find(record=>record[key]&&message.toLowerCase().includes(String(record[key]).toLowerCase()));
 if(/^Task/i.test(message)){const task=find(state.published,'title');return task?`task/${task.id}`:'leader-manage-tasks';}
 if(/^Announcement/i.test(message)){const announcement=find(state.announcements,'title');return announcement?`announcement/${announcement.id}`:'leader-manage-announcements';}
 if(/^Drill/i.test(message)){const drill=find(state.customDrills,'label');const dated=state.customDrills.find(d=>message.includes(d.label)&&message.includes(d.date));return drill?`drill/${addedDrills().findIndex(d=>d.id===(dated||drill).id)}`:'admin-manage-drills';}
 if(/Resource/i.test(message)){const resource=find(state.customResources,'title');return resource?`resource/${resource.id}`:'leader-manage-resources';}
 if(/User|Account|role/i.test(message))return 'admin-users';
 if(/Deleted|Restored/i.test(message))return 'data-backups';
 return 'admin';
};
const adminDashboard = () => {
  if (!admin()) return head('Admin', '', 'more') + '<div class="content"><p class="notice">Open an Admin account to manage the hub.</p></div>';
  restoreMissingActivity();
  const total = state.demoUsers.length;
  const active = state.demoUsers.filter(user => user.status === 'Active').length;
  const pending = state.demoUsers.filter(user => user.status === 'Pending').length;
  const activities = state.activity.slice(0, 100);
  const openTasks = tasks().filter(taskIsOpen).length;
  return head('Admin', 'Manage users, content, and shared data.', 'more') + `<div class="content admin-dashboard-content"><div class="stats admin-dashboard-stats"><button type="button" class="stat" data-route="admin-users" aria-label="View all ${total} users"><span>Total users</span><b>${total}</b><small>View users</small></button><button type="button" class="stat" data-route="admin-users" aria-label="View ${active} active users"><span>Active users</span><b>${active}</b><small>Manage accounts</small></button><button type="button" class="stat" data-route="admin-users" aria-label="Review ${pending} pending requests"><span>Pending requests</span><b>${pending}</b><small>Review requests</small></button><button type="button" class="stat" data-route="leader-manage-tasks" aria-label="View ${openTasks} open tasks"><span>Open tasks</span><b>${openTasks}</b><small>Manage tasks</small></button></div>${pending ? `<button class="action" data-route="admin-users">Review ${pending} pending request${pending === 1 ? '' : 's'} ${icon('chevron')}</button>` : ''}<div class="card">${row('admin-users','Users & Roles','Search, approve, edit, reset passwords, and change roles','people')}${row('admin-schedule','Drill Schedule','Add and manage drill dates','calendar')}${row('admin-resources','Resources','Manage public resources','book')}${row('data-backups','Recycle Bin','View and restore deleted items','trash')}</div><h2 class="section-label">Recent Updates</h2><div class="card">${activities.length ? activities.map(item => `<button type="button" class="recent-update-link" data-route="${e(recentUpdateRoute(item))}"><span><strong>${e(displayDateText(item.message))}</strong><small>${new Date(item.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})}</small></span>${icon('chevron')}</button>`).join('') : '<p class="empty">No updates yet.</p>'}</div></div>`;
};

setTimeout(() => {
  users = accountRequests;
  adminPage = adminDashboard;
  if (location.hash.slice(1) === 'admin-users') render('admin-users', false);
  if (location.hash.slice(1) === 'admin') render('admin', false);
}, 300);
