'use strict';
(() => {
 const approved=new WeakSet();
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-drill-attendance]');if(!button||!state.signedIn||approved.has(button))return;
  const id=button.dataset.drillId;
  if(button.dataset.drillAttendance==='Attending'){state.drillAttendanceReasons??={};if(state.drillAttendanceReasons[id])delete state.drillAttendanceReasons[id][state.currentUserId];return;}
  event.preventDefault();event.stopImmediatePropagation();if(document.querySelector('#absence-dialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="confirm-layer" id="absence-dialog"><form class="confirm-dialog" id="absence-form" role="dialog" aria-modal="true" aria-labelledby="absence-title"><h2 id="absence-title">Not attending</h2><p>Please tell your leader why you cannot attend.</p><div class="field"><label>Reason<textarea name="reason" maxlength="300" required>${e(state.drillAttendanceReasons?.[id]?.[state.currentUserId]||'')}</textarea></label></div><div class="confirm-actions"><button type="button" class="confirm-cancel" data-cancel-absence>Cancel</button><button type="submit" class="confirm-logout">Save response</button></div></form></div>`);
  const form=document.querySelector('#absence-form');form.querySelector('textarea').focus();
  form.addEventListener('submit',ev=>{ev.preventDefault();const reason=form.elements.reason.value.trim();if(!reason){form.elements.reason.focus();return;}state.drillAttendanceReasons??={};state.drillAttendanceReasons[id]??={};state.drillAttendanceReasons[id][state.currentUserId]=reason;document.querySelector('#absence-dialog').remove();approved.add(button);try{button.click();}finally{approved.delete(button);}});
 },true);
 document.addEventListener('click',ev=>{if(ev.target.closest('[data-cancel-absence]'))document.querySelector('#absence-dialog')?.remove();});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape')document.querySelector('#absence-dialog')?.remove();});
 function rowSet(box){const kind=box.dataset.browseKind;if(kind==='activity')return [...box.parentElement.querySelectorAll('.activity-items p')];if(kind==='announcements')return [...box.parentElement.querySelectorAll('.announcement.managed,.announcement-button')];return [...box.parentElement.querySelectorAll('.upcoming-drill-item,.next-card,.attendance-drill,.announcement.managed')];}
 function filter(box){const q=box.querySelector('input').value.trim().toLowerCase(),mode=box.querySelector('select').value;rowSet(box).forEach(row=>{const text=row.textContent.toLowerCase();row.hidden=!text.includes(q)||(mode!=='all'&&!text.includes(mode));});}
 function install(){
  if(!state.signedIn)return;const route=location.hash.slice(1),content=document.querySelector('#page:not([hidden]) .content');
  const activity=document.querySelector('#activity-modal .activity-items');
  let target=activity?.parentElement,kind='activity';
  if(!target&&content){if(['admin-manage-drills','attendance-dashboard'].includes(route)){target=content;kind='drills';}else if(['announcement-list','leader-announcements'].includes(route)){target=null;}}
  if(target&&!target.querySelector('[data-browse-kind]')){const choices=kind==='activity'?['created','edited','updated','deleted','restored']:kind==='announcements'?['General','Training','Safety','Drill Preparation']:[];target.insertAdjacentHTML(activity?'afterbegin':'afterbegin',`<div class="browse-controls" data-browse-kind="${kind}"><label class="search-field">${icon('document')}<input type="search" placeholder="Search ${kind}" aria-label="Search ${kind}"></label>${choices.length?`<select aria-label="Filter ${kind}"><option value="all">All ${kind}</option>${choices.map(x=>`<option value="${x.toLowerCase()}">${x}</option>`).join('')}</select>`:'<select aria-label="Filter drills"><option value="all">All drills</option>'+[...new Set(state.customDrills.map(d=>d.date))].sort().map(d=>`<option value="${date(d).toLowerCase()}">${date(d)}</option>`).join('')+'</select>'}</div>`);}
  if(content&&!content.querySelector('[data-empty-create]')){let dest='',label='';if(['tasks','leader-manage-tasks'].includes(route)&&!state.published.length&&leader()){dest='leader-create-task';label='Create Task';}else if(route==='drill'&&!state.customDrills.length&&admin()){dest='admin-schedule';label='Add Drill';}else if(route==='announcement-list'&&!state.announcements.length&&leader()){dest='leader-announcements';label='Create Announcement';}if(dest)content.insertAdjacentHTML('beforeend',`<button type="button" class="action" data-empty-create data-route="${dest}">${label}</button>`);}
 }
 document.addEventListener('input',ev=>{const box=ev.target.closest('[data-browse-kind]');if(box)filter(box);});
 document.addEventListener('change',ev=>{const box=ev.target.closest('[data-browse-kind]');if(box)filter(box);});
 new MutationObserver(install).observe(document.querySelector('.app'),{childList:true,subtree:true});
 setInterval(install,1500);
})();
