 'use strict';
(()=>{
 const selectors='#support-ticket-form,#support-reply-form,#support-note-form,#support-action-form,#task-form,#announcement-form,#announcement-edit-form,#resource-form,#schedule-form,#admin-create-user-form,#resource-edit-form,#drill-edit-form,#edit-profile-form';
 const dirty=new Set();
 const hasDraft=()=>[...dirty].some(form=>form.isConnected);
 document.addEventListener('input',event=>{const form=event.target.closest(selectors);if(form)dirty.add(form);});
 document.addEventListener('change',event=>{const form=event.target.closest(selectors);if(form)dirty.add(form);});
 window.addEventListener('beforeunload',event=>{if(!hasDraft())return;event.preventDefault();event.returnValue='';});
 document.addEventListener('click',event=>{
  const link=event.target.closest('[data-route],[data-open-card],[data-history-back],.back,[data-close-drill-editor],[data-close-resource-editor],[data-close-announcement-editor],[data-signout]');
  if(!link||!hasDraft()||event.target.closest('[type="submit"]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(document.querySelector('#unsaved-changes-dialog'))return;
  const opener=event.target.closest('button,a')||link;
  document.body.insertAdjacentHTML('beforeend',`<div class="confirm-layer" id="unsaved-changes-dialog"><section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"><h2 id="unsaved-title">Unsaved changes</h2><p>Leave without saving? Your changes will be lost.</p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-stay-draft>Stay</button><button type="button" class="confirm-logout" data-discard-draft>Discard changes</button></div></section></div>`);
  const layer=document.querySelector('#unsaved-changes-dialog'),stay=layer.querySelector('[data-stay-draft]'),discard=layer.querySelector('[data-discard-draft]');
  const cleanup=()=>{document.removeEventListener('keydown',keys);layer.remove();};
  const keys=event=>{if(event.key==='Escape'){event.preventDefault();cleanup();opener.focus?.();}if(event.key==='Tab'){event.preventDefault();(document.activeElement===stay?discard:stay).focus();}};
  document.addEventListener('keydown',keys);stay.focus();
  stay.onclick=()=>{cleanup();opener.focus?.();};
  discard.onclick=()=>{dirty.clear();cleanup();opener.click();};
 },true);
 document.addEventListener('submit',event=>{
  const form=event.target;if(!form.matches(selectors))return;
  if(form.id==='schedule-form'||form.id==='drill-edit-form'){
   const deadline=form.elements.attendanceDeadline,date=form.elements.date;
   if(deadline&&date&&deadline.value&&date.value&&deadline.value>date.value){deadline.setCustomValidity('Attendance response deadline must be on or before the drill date.');deadline.reportValidity();event.preventDefault();event.stopImmediatePropagation();return;}
  }
  if(form.checkValidity())dirty.delete(form);
 },true);
 document.addEventListener('input',event=>{const form=event.target.closest('#schedule-form,#drill-edit-form');if(form)form.elements.attendanceDeadline?.setCustomValidity('');});
 const emptyStates=()=>{
  const groups=[['#announcement-browse-filters','#page .announcement.managed,#page .announcement-button'],['.manage-resources-content','.manage-resources-content .announcement.managed'],['.user-filter-bar','[data-user-card]'],['[data-browse-kind]','']];
  groups.forEach(([selector,rows])=>document.querySelectorAll(selector).forEach(control=>{
   const scope=control.closest('.content,.confirm-dialog');if(!scope)return;
   const items=rows?[...scope.querySelectorAll(rows)]:[...scope.querySelectorAll('.activity-items p,.upcoming-drill-item,.next-card,.attendance-drill,.announcement.managed')];
   if(!items.length)return;
   let message=scope.querySelector(':scope > .filter-empty-message');
   const noResults=items.every(item=>item.hidden);
   if(noResults&&!message){message=document.createElement('p');message.className='empty filter-empty-message';message.setAttribute('role','status');message.textContent='No matching records. Try a different search or filter.';scope.append(message);}
   if(message&&message.hidden===noResults)message.hidden=!noResults;
  }));
 };
 document.addEventListener('input',()=>setTimeout(emptyStates,0));document.addEventListener('change',()=>setTimeout(emptyStates,0));document.addEventListener('click',()=>setTimeout(emptyStates,0));
 new MutationObserver(emptyStates).observe(document.body,{childList:true,subtree:true});
})();
