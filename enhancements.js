
'use strict';

const enhancementInitials = name => String(name || 'User').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const enhancementCurrentUser = () => state.demoUsers.find(user => user.id === state.currentUserId) || state.demoUsers.find(user => user.role === state.role && user.status === 'Active');
const routeTrail = [];

const taskMatches = task => {
  const filter = state.taskFilter || 'all';
  if (filter === 'open' && !taskIsOpen(task)) return false;
  if (filter === 'completed' && !state.completed[task.id]) return false;
  if (filter === 'due' && !taskDueSoon(task)) return false;
  const query = String(state.taskSearch || '').trim().toLowerCase();
  return !query || `${task.title} ${task.category} ${task.instructions}`.toLowerCase().includes(query);
};

const enhancedTasks = () => {
  const all = tasks();
  const visible = all.filter(taskMatches);
  const filter = state.taskFilter || 'all';
  return head('Tasks', 'Personal and published unit tasks.') + `<div class="content"><label class="search-field">${icon('document')}<input data-task-search type="search" value="${e(state.taskSearch || '')}" placeholder="Search tasks"></label><div class="filter-bar" role="group" aria-label="Task filters">${[['all','All'],['open','Open'],['completed','Completed'],['due','Due Soon']].map(([value,label]) => `<button type="button" data-task-filter="${value}" aria-pressed="${filter === value}">${label}</button>`).join('')}</div><div class="progress-heading"><strong>My Tasks</strong><span>${all.filter(task => state.completed[task.id]).length} of ${all.length} complete</span></div><div id="task-results" class="card">${visible.length ? taskRows(visible,leader()) : '<p class="empty">No tasks match this filter.</p>'}</div>${note}</div>`;
};

const resourcePageContent = () => {
  const all = state.customResources;
  const query = String(state.resourceSearch || '').trim().toLowerCase();
  const visible = all.filter(resource => !query || `${resource.title} ${resource.subtitle || ''} ${resource.description || ''}`.toLowerCase().includes(query));
  return head('Resources', 'Public links, forms, and guides.') + `<div class="content">${state.role==='NCO / Leader'?`<button type="button" class="action outline" data-route="leader-resources">Add Resource ${icon('book')}</button>`:''}<label class="search-field">${icon('document')}<input data-resource-search type="search" value="${e(state.resourceSearch || '')}" placeholder="Search resources"></label><div id="resource-results" class="card">${visible.length ? visible.map(resource => row(`resource/${resource.id}`, resource.title, resource.subtitle || resource.description, resource.symbol || 'document')).join('') : '<p class="empty">No resources match your search.</p>'}</div><p class="notice">Public information only. Readiness resources are links only; no medical or readiness records are stored.</p></div>`;
};

let soldierInfoTab='resources';
const announcementSeen=item=>{const read=state.announcementAcknowledgements?.[item.id]?.[state.currentUserId];return !!read&&(!item.updatedAt||read.createdAt>=item.updatedAt);};
const soldierAnnouncementFilters={query:'',category:'all',status:'all'};
const soldierAnnouncementList=()=>{const today=new Date().toLocaleDateString('en-CA');return orderedAnnouncements().filter(a=>(!a.audience||['All Users','Soldiers','All Soldiers','Soldier'].includes(a.audience))&&(!soldierAnnouncementFilters.query||`${a.title} ${a.message} ${a.category||''}`.toLowerCase().includes(soldierAnnouncementFilters.query))&&(soldierAnnouncementFilters.category==='all'||a.category===soldierAnnouncementFilters.category)&&(true||(soldierAnnouncementFilters.status==='seen'?announcementSeen(a):soldierAnnouncementFilters.status==='no-response'?!announcementSeen(a):soldierAnnouncementFilters.status==='pinned'?a.pinned:soldierAnnouncementFilters.status==='expired'?a.expires&&a.expires<today:!a.expires||a.expires>=today)));};
const soldierAnnouncementRows=()=>{const list=soldierAnnouncementList();return list.length?list.map(a=>`<button type="button" class="announcement announcement-button ${announcementSeen(a)?'announcement-seen':'announcement-unseen'}" data-route="announcement/${e(a.id)}"><strong>${a.pinned?`<span class="announcement-pin-marker">${icon('pin')}</span>`:''}${e(a.title)}</strong><small>${e(a.category||'General')}${announcementDateValue(a)?' · Date '+date(announcementDateValue(a)):''}</small><p>${e(a.message)}</p></button>`).join(''):'<p class="empty">No announcements match your filters.</p>';};
const enhancedResources=()=>resourcePageContent();
document.addEventListener('click',event=>{const button=event.target.closest('[data-info-tab]');if(!button)return;soldierInfoTab=button.dataset.infoTab;render('resources',false);});

const refreshSoldierAnnouncements=()=>{const box=document.querySelector('#soldier-ann-results');if(box)box.innerHTML=soldierAnnouncementRows();};
document.addEventListener('input',event=>{if(event.target.matches('[data-soldier-ann-search]')){soldierAnnouncementFilters.query=event.target.value.trim().toLowerCase();refreshSoldierAnnouncements();}});
document.addEventListener('change',event=>{if(event.target.matches('[data-soldier-ann-category]')){soldierAnnouncementFilters.category=event.target.value;refreshSoldierAnnouncements();}});
document.addEventListener('click',event=>{const b=event.target.closest('[data-soldier-ann-status]');if(!b)return;soldierAnnouncementFilters.status=b.dataset.soldierAnnStatus;document.querySelectorAll('[data-soldier-ann-status]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));refreshSoldierAnnouncements();});

const managementAnnFilters={query:'',category:'all',status:'all'};
const filterManagedAnnouncements=()=>{
 const controls=document.querySelector('#announcement-browse-filters');if(!controls)return;
 const today=new Date().toLocaleDateString('en-CA');let shown=0;
 document.querySelectorAll('#page .announcement.managed,#page .announcement-button').forEach(card=>{
  const route=card.dataset.route||'';const id=route.startsWith('announcement/')?route.slice(13):card.querySelector('[data-edit-announcement]')?.dataset.editAnnouncement;
  const item=state.announcements.find(a=>a.id===id);if(!item)return;
  const f=managementAnnFilters;const match=(!f.query||`${item.title} ${item.message} ${item.category||''}`.toLowerCase().includes(f.query))&&(f.category==='all'||(item.category||'General')===f.category)&&(true||(f.status==='seen'?announcementSeen(item):f.status==='no-response'?!announcementSeen(item):f.status==='pinned'?item.pinned:f.status==='expired'?item.expires&&item.expires<today:!item.expires||item.expires>=today));card.hidden=!match;if(match)shown++;
 });
 controls.querySelector('[data-ann-result-count]').textContent=`${shown} announcement${shown===1?'':'s'}`;
};
const installAnnouncementFilters=()=>{
 const route=location.hash.slice(1);if(!leader()||!['announcement-list','leader-manage-announcements'].includes(route))return;
 const content=document.querySelector('#page .content');if(!content||content.querySelector('#announcement-browse-filters'))return;
 const categories=[...new Set(state.announcements.map(a=>a.category||'General'))].sort(),f=managementAnnFilters;
 const panel=document.createElement('div');panel.id='announcement-browse-filters';
 panel.innerHTML=`<label class="search-field">${icon('document')}<input type="search" data-managed-ann-search value="${e(f.query)}" placeholder="Search announcements" aria-label="Search announcements"></label><p class="ann-result-count" data-ann-result-count></p>`;
 const list=[...content.children].find(x=>x.classList.contains('card')&&x.tagName!=='FORM');if(list)list.before(panel);else content.append(panel);filterManagedAnnouncements();
};
document.addEventListener('input',event=>{if(event.target.matches('[data-managed-ann-search]')){managementAnnFilters.query=event.target.value.trim().toLowerCase();filterManagedAnnouncements();}});
document.addEventListener('change',event=>{if(event.target.matches('[data-managed-ann-category]')){managementAnnFilters.category=event.target.value;filterManagedAnnouncements();}});
document.addEventListener('click',event=>{const button=event.target.closest('[data-managed-ann-status]');if(!button)return;managementAnnFilters.status=button.dataset.managedAnnStatus;document.querySelectorAll('[data-managed-ann-status]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filterManagedAnnouncements();});
new MutationObserver(installAnnouncementFilters).observe(document.querySelector('#page'),{childList:true,subtree:true});

const refreshTaskResults = () => {
  const result = document.querySelector('#task-results');
  if (!result) return;
  const visible = tasks().filter(taskMatches);
  result.innerHTML = visible.length ? taskRows(visible,leader()) : '<p class="empty">No tasks match this filter.</p>';
};
const refreshResourceResults = () => {
  const result = document.querySelector('#resource-results');
  if (!result) return;
  const query = String(state.resourceSearch || '').trim().toLowerCase();
  const visible = state.customResources.filter(resource => !query || `${resource.title} ${resource.subtitle || ''} ${resource.description || ''}`.toLowerCase().includes(query));
  result.innerHTML = visible.length ? visible.map(resource => row(`resource/${resource.id}`, resource.title, resource.subtitle || resource.description, resource.symbol || 'document')).join('') : '<p class="empty">No resources match your search.</p>';
};

const categoryOptions = ['Training', 'Drill Preparation', 'Equipment', 'Personnel', 'Safety', 'Operations', 'Other'];
const upgradeCategoryControls = () => {
  document.querySelectorAll('.field input[name="category"][list]').forEach(input => {
    const field = input.closest('.field');
    const label = input.closest('label');
    if (!field || !label || field.dataset.categoryUpgraded) return;
    field.dataset.categoryUpgraded = 'true';
    const initial = input.value.trim();
    const select = document.createElement('select');
    select.name = 'category';
    select.dataset.categoryChoice = 'true';
    select.innerHTML = `<option value="" disabled>Select a category</option>${categoryOptions.map(value => `<option value="${e(value)}">${e(value)}</option>`).join('')}`;
    select.value = !initial ? '' : categoryOptions.includes(initial) ? initial : 'Other';
    input.name = 'customCategory';
    input.removeAttribute('list');
    input.placeholder = 'Type your category';
    input.required = select.value === 'Other';
    label.textContent = 'Category';
    label.append(select);
    const customLabel = document.createElement('label');
    customLabel.className = 'custom-category-field';
    customLabel.textContent = 'Other category';
    customLabel.hidden = select.value !== 'Other';
    customLabel.append(input);
    field.append(customLabel);
    field.querySelector('datalist')?.remove();
    field.querySelector('small')?.remove();
  });
};

const enhancedOpenTasks = () => {
  const open = tasks().filter(taskIsOpen);
  return head('Open Tasks', 'Tasks that still need to be completed.', 'leadership') + `<div class="content"><div class="progress-heading"><strong>Open Tasks</strong><span>${open.length} remaining</span></div><div class="card">${open.length ? taskRows(open) : '<p class="empty">There are no open tasks.</p>'}</div>${note}</div>`;
};

const enhancedDueSoon = () => {
  const due = tasks().filter(task=>taskDueSoon(task));
  return head('Due Soon', 'Open tasks due within the next 7 days.', 'leadership') + `<div class="content"><div class="progress-heading"><strong>Due Soon</strong><span>${due.length} task${due.length === 1 ? '' : 's'}</span></div><div class="card">${due.length ? taskRows(due) : '<p class="empty">No open tasks are due within the next 7 days.</p>'}</div>${note}</div>`;
};

const enhancedCompletedTasks = () => {
  const completed = tasks().filter(task => state.completed[task.id]);
  return head('Completed Tasks', 'Tasks marked complete on this browser.', 'leadership') + `<div class="content"><div class="progress-heading"><strong>Completed</strong><span>${completed.length} task${completed.length === 1 ? '' : 's'}</span></div><div class="card">${completed.length ? taskRows(completed) : '<p class="empty">No tasks have been completed yet.</p>'}</div>${note}</div>`;
};

const enhancedAnnouncements = () => {
  if(state.role==='Soldier')return head('Announcements','Unit announcements and reminders.','more')+`<div class="content"><label class="search-field">${icon('document')}<input type="search" data-soldier-ann-search value="${e(soldierAnnouncementFilters.query)}" placeholder="Search announcements" aria-label="Search announcements"></label><div class="card" id="soldier-ann-results">${soldierAnnouncementRows()}</div></div>`;
  const announcements = orderedAnnouncements().filter(item=>admin()||!item.audience||item.audience==='All Users'||(['Soldiers','All Soldiers','Soldier'].includes(item.audience)?state.role==='Soldier':['NCO / Leaders','Leadership','NCO / Leader'].includes(item.audience)?state.role==='NCO / Leader':false));
  return head('Announcements', 'Published local announcements.', 'leadership') + `<div class="content"><div class="card">${announcements.length ? announcements.map(item => `<button type="button" class="announcement announcement-button ${announcementSeen(item)?'announcement-seen':'announcement-unseen'}" data-route="announcement/${e(item.id)}" aria-label="Open announcement: ${e(item.title)}"><strong>${item.pinned?`<span class="announcement-pin-marker">${icon('pin')}</span>`:''}${e(item.title)}</strong><p>${e(item.message)}</p><span class="announcement-open">Open announcement ${icon('chevron')}</span></button>`).join('') : '<p class="empty">No announcements have been published.</p>'}</div>${leader()?`<button class="action" data-route="leader-manage-announcements">Manage Announcements ${icon('chevron')}</button>`:''}${note}</div>`;
};

const announcementAcknowledgement = item => {
 const records=state.announcementAcknowledgements?.[item.id]||{},read=records[state.currentUserId];
 const members=(state.demoUsers||[]).filter(u=>u.status==='Active'&&(!item.audience||item.audience==='All Users'||(['Soldier','Soldiers','All Soldiers'].includes(item.audience)?u.role==='Soldier':['Leadership','NCO / Leaders','NCO / Leader'].includes(item.audience)?u.role==='NCO / Leader':u.role===item.audience)));
 const readers=members.filter(u=>records[u.id]);
 return `<section class="announcement-ack"><h3>Status</h3>${read?`<small>Viewed · ${e(new Date(read.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}))}</small>`:''}${leader()?`<details><summary>Viewed by ${readers.length} of ${members.length} members</summary><ul>${members.map(u=>`<li><strong>${e(u.name)}</strong><span>${records[u.id]?'Viewed · '+e(new Date(records[u.id].createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})):'Not viewed'}</span></li>`).join('')||'<li>No eligible active members.</li>'}</ul></details>`:''}</section>`;
};

const enhancedAnnouncementDetail = id => {
  const item = (state.announcements || []).find(announcement => announcement.id === id);
  if (!item) return head('Announcement not found', '', 'announcement-list') + `<div class="content"><p class="empty">This announcement is no longer available.</p></div>`;
  if(state.signedIn&&state.currentUserId){
   state.announcementAcknowledgements??={};const records=state.announcementAcknowledgements[item.id]??={};
   if(!announcementSeen(item)){records[state.currentUserId]={createdAt:new Date().toISOString(),automatic:true};save();}
  }

  return head('Announcement', 'Unit updates and important information.', 'announcement-list') + `<div class="content"><article class="card pad announcement-detail compact-detail-card"><span class="eyebrow">${e(item.category || 'General')}</span><h2>${e(item.title)}</h2>${announcementDateValue(item)?`<p class="announcement-date-subtitle">${date(announcementDateValue(item))}</p>`:''}<p class="instructions">${e(item.message)}</p><section class="announcement-information"><h3>Announcement information</h3><dl class="detail-list"><div><dt>Scheduled by</dt><dd>${e(item.createdByName||'Not recorded')}</dd></div></dl>${item.editHistory?.length?`<h3>Updated history</h3><ul>${item.editHistory.map(change=>`<li><strong>${e(change.actorName)}</strong> · ${e(new Date(change.changedAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}))}</li>`).join('')}</ul>`:''}</section>${announcementAcknowledgement(item)}</article></div>`;
};

let drillReturnRoute = 'home';
const attendanceBadge=response=>`<span class="badge attendance-response ${response==='Attending'?'is-attending':response==='Not attending'?'is-not-attending':''}">${response==='Attending'?'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.3 12 13 4"/></svg>':response==='Not attending'?'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>':''}<span>${e(response||'Awaiting response')}</span></span>`;
const drillListFilters={query:'',status:'all'};
const drillListRows=()=>{
 const today=new Date().toLocaleDateString('en-CA');
 const records=addedDrills();
 const visible=records.filter(d=>(!drillListFilters.query||`${d.label} ${d.note||''}`.toLowerCase().includes(drillListFilters.query))&&(drillListFilters.status==='all'||(drillListFilters.status==='no-response'?!state.drillAttendance?.[d.id]?.[state.currentUserId]:drillListFilters.status==='completed'?!!state.drillAttendance?.[d.id]?.[state.currentUserId]:d.date>=today)));
 return visible.length?visible.map(d=>`<button type="button" class="drill-list-row" data-route="drill/${records.findIndex(item=>item.id===d.id)}"><span class="drill-list-icon">${icon('calendar')}</span><span class="drill-list-copy"><strong>${e(d.label)}</strong><small>${date(d.date)}${d.attendanceDeadline&&!state.drillAttendance?.[d.id]?.[state.currentUserId]?' · Attendance deadline '+date(d.attendanceDeadline):''}</small>${attendanceBadge(state.drillAttendance?.[d.id]?.[state.currentUserId])}</span>${icon('chevron')}</button>`).join(''):'<p class="empty">No drills match your filters.</p>';
};
document.addEventListener('input',event=>{if(!event.target.matches('[data-drill-list-search]'))return;drillListFilters.query=event.target.value.trim().toLowerCase();document.querySelector('#drill-list-results').innerHTML=drillListRows();});
document.addEventListener('click',event=>{const button=event.target.closest('[data-drill-list-status]');if(!button)return;drillListFilters.status=button.dataset.drillListStatus;document.querySelectorAll('[data-drill-list-status]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('#drill-list-results').innerHTML=drillListRows();});

const addedDrills = () => [...(state.customDrills || [])].sort((left, right) => String(left.date).localeCompare(String(right.date)));
const addedDrillMonth = value => new Date(`${value}T12:00`).toLocaleDateString('en-US', {month: 'short'}).toUpperCase();
let attendanceChangingId='';
let attendanceEditingRoute='';
const drillAttendanceControls = item => {
 const response=state.drillAttendance?.[item.id]?.[state.currentUserId]||'';
 return `<section class="attendance-actions"><h3>Drill attendance</h3>${item.attendanceDeadline&&!response?`<p class="attendance-deadline"><strong>Attendance deadline ${date(item.attendanceDeadline)}</strong>${new Date(item.attendanceDeadline+'T23:59:59')<new Date()?' · Response deadline passed':''}</p>`:!response&&!item.attendanceDeadline?'<p class="muted">No response deadline set.</p>':''}<p>${response?attendanceBadge(response):'Please confirm your attendance.'}</p>${response&&attendanceChangingId!==item.id?`<button type="button" class="user-action change-attendance-response" data-change-attendance="${e(item.id)}">Change response</button>`:`<div><button type="button" class="user-action ${response==='Attending'?'primary':''}" data-drill-attendance="Attending" data-drill-id="${e(item.id)}" aria-pressed="${response==='Attending'}" ${response==='Attending'?'disabled':''}>Attending</button><button type="button" class="user-action ${response==='Not attending'?'danger':''}" data-drill-attendance="Not attending" data-drill-id="${e(item.id)}" aria-pressed="${response==='Not attending'}" ${response==='Not attending'?'disabled':''}>Not attending</button></div>`}</section>`;
};
const addedDrillList = (records, startIndex = 0) => records.map((item, index) => `<article class="upcoming-drill-item"><button class="schedule-row" data-route="drill/${startIndex + index}"><span class="month">${addedDrillMonth(item.date)}</span><span><strong>${e(item.label)}</strong><small>${date(item.date)}</small></span></button>${drillAttendanceControls(item)}</article>`).join('');


const addedDrillPage = index => {
  const records = addedDrills();
  if (index !== undefined) {
    const item = records[index];
    if (!item) return addedDrillPage();
    return head('Drill Details', '', 'drill') + `<div class="content"><article class="card pad compact-detail-card drill-detail-card"><span class="eyebrow">ADDED DRILL DATE</span><h2>${e(item.label)}</h2><p class="drill-date-subtitle"><span>Drill Date</span><strong>${date(item.date)}</strong></p><section class="drill-note-section"><h3>General note</h3><p>${e(item.note || 'No note added.')}</p></section><section class="task-history"><h3>Drill information</h3><dl class="detail-list"><div><dt>Scheduled by</dt><dd>${e(item.createdByName||'Not recorded for this older drill')}</dd></div><div><dt>Scheduled date</dt><dd>${item.createdAt?e(new Date(item.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})):'Not recorded'}</dd></div>${item.changeHistory?.length?`<div><dt>Updated by</dt><dd>${e(item.changeHistory[0].actorName)}</dd></div><div><dt>Updated date</dt><dd>${e(new Date(item.changeHistory[0].changedAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}))}</dd></div>`:''}</dl>${item.changeHistory?.length?`<h3>Drill change history</h3><ol>${item.changeHistory.map(change=>`<li><strong>${e(change.actorName)}</strong><p>${date(change.previousDate)} → ${date(change.newDate)}</p>${change.previousTitle!==change.newTitle?`<p>Title: ${e(change.previousTitle)} → ${e(change.newTitle)}</p>`:''}${change.previousNote!==change.newNote?`<p>Previous details: ${e(change.previousNote||'None')}</p><p>Updated details: ${e(change.newNote||'None')}</p>`:''}<small>${e(new Date(change.changedAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}))}</small></li>`).join('')}</ol>`:''}</section>${drillAttendanceControls(item)}</article></div>`;
  }
  return head('Drill','Drill dates and attendance.',drillReturnRoute)+`<div class="content drill-list-content"><label class="search-field">${icon('calendar')}<input type="search" data-drill-list-search value="${e(drillListFilters.query)}" placeholder="Search drills" aria-label="Search drills"></label><div class="filter-bar">${(state.role==='Soldier'?['all','upcoming','no-response','completed']:['all','upcoming']).map(value=>`<button type="button" data-drill-list-status="${value}" aria-pressed="${drillListFilters.status===value}">${value==='no-response'?'Awaiting response':value[0].toUpperCase()+value.slice(1)}</button>`).join('')}</div><div class="card" id="drill-list-results">${drillListRows()}</div></div>`;

};

const addDrillCalendarButton = () => { document.querySelectorAll('[data-export-next-drill]').forEach(button => button.remove()); };

const exportNextDrill = () => {
  const drill = addedDrills()[0];
  if (!drill) return;
  const formatDate = value => String(value).replaceAll('-', '');
  const end = new Date(`${drill.date}T12:00`); end.setDate(end.getDate() + 1);
  const endDate = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`;
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//1438th Engineer Hub//EN','BEGIN:VEVENT',`UID:${e(drill.id)}@1438th-engineer-hub`,`DTSTAMP:${formatDate(new Date().toISOString().slice(0, 10))}T000000Z`,'DTSTART;VALUE=DATE:' + formatDate(drill.date),'DTEND;VALUE=DATE:' + endDate,`SUMMARY:1438th Engineer Hub - ${drill.label}`,`DESCRIPTION:${String(drill.note || '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], {type: 'text/calendar'}));
  const link = document.createElement('a'); link.href = url; link.download = '1438th-next-drill.ics'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Calendar file downloaded. Open it to add the drill date.');
};

setTimeout(() => {
  drill = addedDrillPage;
  const baseRender = render;
  render = function(route, focus = true) {
    if(route!==attendanceEditingRoute){attendanceChangingId='';attendanceEditingRoute='';}
 if(!canOpenRoute(route)){go(state.signedIn?'home':'login');return;}
    if (route === 'tasks' || route === 'resources' || route === 'open-tasks' || route === 'due-soon' || route === 'completed-tasks' || route === 'announcement-list' || route.startsWith('announcement/')) {
      if (route === 'tasks' && current !== 'tasks') {
        state.taskFilter = 'all';
        state.taskSearch = '';
        save();
      }
      current = route;
      document.querySelector('#home').hidden = true;
      const page = document.querySelector('#page');
      page.hidden = false;
      page.innerHTML = route === 'tasks' ? enhancedTasks() : route === 'resources' ? enhancedResources() : route === 'open-tasks' ? enhancedOpenTasks() : route === 'due-soon' ? enhancedDueSoon() : route === 'completed-tasks' ? enhancedCompletedTasks() : route.startsWith('announcement/') ? enhancedAnnouncementDetail(route.split('/')[1]) : enhancedAnnouncements();
      document.querySelector('#bottom-nav').hidden = !state.signedIn;
      document.querySelector('#role-badge').textContent = state.role.toUpperCase();
      nav(state.role==='Soldier'&&(route==='announcement-list'||route.startsWith('announcement/'))?'announcement-list':['open-tasks','due-soon','completed-tasks','announcement-list'].includes(route)||route.startsWith('announcement/')?'leadership':route);
      if (focus) { window.scrollTo(0, 0); document.querySelector('#main').focus({preventScroll: true}); }
      return;
    }
    baseRender(route, focus);
    if (route === 'profile') {
      const tile = document.querySelector('#page .profile-card .tile-icon');
      const user = enhancementCurrentUser();
      if (tile && user) { tile.textContent = enhancementInitials(user.name); tile.classList.add('profile-initials'); }
    }
    setTimeout(() => { addDrillCalendarButton(); upgradeCategoryControls(); }, 0);
  };
  new MutationObserver(() => { addDrillCalendarButton(); upgradeCategoryControls(); }).observe(document.querySelector('#page'), {childList: true, subtree: true});
  if (location.hash.slice(1) === 'tasks') { state.taskFilter = 'all'; state.taskSearch = ''; save(); }
  if (['tasks','resources','open-tasks','due-soon','completed-tasks','announcement-list','profile','drill'].includes(location.hash.slice(1)) || location.hash.slice(1).startsWith('announcement/')) render(location.hash.slice(1), false);
}, 1850);

document.addEventListener('click', event => {
  const backButton = event.target.closest('.back');
  if (backButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    navigateBack(backButton.dataset.backRoute || backButton.dataset.route || 'home');
    return;
  }
  const routeLink = event.target.closest('[data-route]');
  if (routeLink && routeLink.dataset.route !== current) routeTrail.push(current);
  const drillLink = event.target.closest('[data-route="drill"]');
  if (drillLink) drillReturnRoute = current === 'leadership' ? 'leadership' : 'home';
  const openTasksCard = event.target.closest('.dashboard-card[data-route="leader-manage-tasks"]');
  if (openTasksCard && /OPEN TASKS/i.test(openTasksCard.textContent)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    go('open-tasks');
    return;
  }
  const dashboardCard = event.target.closest('.dashboard-card');
  if (dashboardCard) {
    const label = dashboardCard.querySelector('span')?.textContent.trim().toUpperCase();
    const routes = {'DUE SOON':'due-soon', 'COMPLETED':'completed-tasks', 'ANNOUNCEMENTS':'announcement-list'};
    if (routes[label]) { event.preventDefault(); event.stopImmediatePropagation(); go(routes[label]); return; }
  }
  const filter = event.target.closest('[data-task-filter]');
  if (filter) { state.taskFilter = filter.dataset.taskFilter; document.querySelectorAll('[data-task-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === filter))); refreshTaskResults(); return; }
  if (event.target.closest('[data-export-next-drill]')) { exportNextDrill(); return; }
}, true);
document.addEventListener('input', event => {
  if (event.target.matches('[data-task-search]')) { state.taskSearch = event.target.value; refreshTaskResults(); }
  if (event.target.matches('[data-resource-search]')) { state.resourceSearch = event.target.value; refreshResourceResults(); }
});

document.addEventListener('change', event => {
  const select = event.target.closest('select[data-category-choice]');
  if (!select) return;
  const field = select.closest('.field');
  const custom = field?.querySelector('input[name="customCategory"]');
  const customLabel = field?.querySelector('.custom-category-field');
  if (!custom || !customLabel) return;
  customLabel.hidden = select.value !== 'Other';
  custom.required = select.value === 'Other';
  if (select.value !== 'Other') custom.value = '';
}, true);

document.addEventListener('submit', event => {
  const form = event.target;
  const select = form.querySelector?.('select[data-category-choice]');
  if (!select || select.value !== 'Other') return;
  const custom = form.querySelector('input[name="customCategory"]');
  const value = String(custom?.value || '').trim();
  if (!value) { event.preventDefault(); event.stopImmediatePropagation(); custom?.focus(); return; }
  const option = new Option(value, value, true, true);
  select.add(option);
}, true);

document.addEventListener('click',event=>{
 const change=event.target.closest('[data-change-attendance]');
 if(change){attendanceChangingId=change.dataset.changeAttendance;attendanceEditingRoute=current;render(current,false);return;}
 if(event.target.closest('[data-drill-attendance]')){attendanceChangingId='';attendanceEditingRoute='';}
},true);
