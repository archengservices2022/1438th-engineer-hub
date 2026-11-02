'use strict';
(() => {
 const keys=['published','customDrills','announcements','customResources','drillAttendance','drillAttendanceReasons','activity','taskComments','announcementReads','notifications','notificationReadAt','notificationReadIds','accountRequests','closed'];
 const data=()=>Object.fromEntries(keys.map(k=>[k,state[k]||(['published','customDrills','announcements','customResources','activity','notifications','accountRequests'].includes(k)?[]:{})]));
 const db=()=>window.firebaseHub.db;
 async function create(reason){
  const profiles=await db().collection('users').get();
  const copy={type:'hub-backup',createdAt:new Date().toISOString(),reason,data:data(),users:profiles.docs.map(d=>({id:d.id,...d.data()}))};
  await db().collection('appData').doc('backup-'+Date.now()+'-'+crypto.randomUUID()).set(copy);
  return copy;
 }
 function confirmDeletion(button, restoring=false){
  return new Promise(resolve=>{
   if(document.querySelector('#delete-confirm-dialog')){resolve(false);return;}
   const layer=document.createElement('div');layer.className='confirm-layer';layer.id='delete-confirm-dialog';
   layer.innerHTML='<section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title"><h2 id="delete-confirm-title">Delete this item?</h2><p>Are you sure you want to delete this item?</p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-delete-no>No</button><button type="button" class="confirm-logout" data-delete-yes>Yes, Delete</button></div></section>';
   if(restoring){layer.querySelector('h2').textContent='Restore this item?';layer.querySelector('p').textContent='Are you sure you want to restore this item?';layer.querySelector('[data-delete-yes]').textContent='Yes, Restore';}
   document.body.append(layer);
   const finish=value=>{document.removeEventListener('keydown',keydown,true);layer.remove();button.focus();resolve(value);};
   const keydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish(false);}if(event.key==='Tab'){const buttons=layer.querySelectorAll('button');event.preventDefault();(document.activeElement===buttons[0]?buttons[1]:buttons[0]).focus();}};
   layer.addEventListener('click',event=>{if(event.target.closest('[data-delete-yes]'))finish(true);else if(event.target===layer||event.target.closest('[data-delete-no]'))finish(false);});
   document.addEventListener('keydown',keydown,true);layer.querySelector('[data-delete-no]').focus();
  });
 }
 const approved=new WeakSet();
 document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-delete-task],[data-delete-schedule],[data-delete-announcement],[data-delete-resource],[data-delete-user]');
  if(!b||approved.has(b)||!state.signedIn)return;
  ev.preventDefault();ev.stopImmediatePropagation();b.disabled=true;
  confirmDeletion(b).then(async yes=>{if(!yes){b.disabled=false;b.focus();return;}await create('Before deletion: '+b.textContent.trim());b.disabled=false;approved.add(b);try{b.click();}finally{approved.delete(b);}}).catch(()=>{b.disabled=false;toast('Deletion stopped: could not save a recovery backup.');});
 },true);
 const groups=[['published','Tasks'],['announcements','Announcements'],['customResources','Resources'],['users','Users'],['customDrills','Drills']];
 let deleted=[],selectedGroup=null;
 const page=()=>{selectedGroup=null;if(!admin())return head('Recycle Bin','','admin')+'<p class="empty">Admin access required.</p>';setTimeout(load,0);return head('Recycle Bin','Restore individual items deleted from your website.','admin')+`<div class="content"><div id="deleted-data-list" aria-live="polite">Loading deleted items...</div></div>`;};
 function missingItems(copies,live,users){
  const missing=[];
  for(const [key] of groups){const present=new Set((key==='users'?users:(live[key]||[])).map(x=>x.id));const seen=new Set();for(const copy of copies){for(const item of (key==='users'?copy.users:copy.data?.[key])||[]){if(!item.id||present.has(item.id)||seen.has(item.id))continue;seen.add(item.id);missing.push({key,item,copy});}}}
  return missing;
 }
 function paint(box=document.querySelector('#deleted-data-list')){
  if(!box)return;
  if(!selectedGroup){
   const symbols={published:'tasks',users:'people',announcements:'info',customResources:'book',customDrills:'calendar'};
   box.innerHTML='<div class="card deleted-category-list">'+groups.map(([key,label])=>`<button type="button" class="deleted-category-row" data-deleted-category="${key}"><span class="tile-icon">${icon(symbols[key])}</span><span class="deleted-category-text"><strong>${label}</strong><small>${deleted.filter(x=>x.key===key).length} deleted items</small></span>${icon('chevron')}</button>`).join('')+'</div>';return;
  }
  const label=groups.find(([key])=>key===selectedGroup)[1],items=deleted.filter(x=>x.key===selectedGroup);
  box.innerHTML=`<button type="button" class="user-action deleted-category-back" data-deleted-categories>Back to categories</button><h2 class="section-label">Deleted ${label} (${items.length})</h2><div class="card">${items.length?items.map(x=>`<article class="deleted-item"><div><strong>${e(x.item.title||x.item.name||x.item.label||'Untitled')}</strong><small>${e(selectedGroup==='users'?x.item.email||x.item.role||'':x.item.due||x.item.date||x.item.category||x.item.subtitle||'')}</small></div><button type="button" class="user-action" data-restore-deleted="${deleted.indexOf(x)}">Restore</button></article>`).join(''):'<p class="empty">No deleted '+label.toLowerCase()+'.</p>'}</div>`;
 }
 async function load(){
  const box=document.querySelector('#deleted-data-list');if(!box)return;
  try{
   const [result,profiles,shared]=await Promise.all([db().collection('appData').get(),db().collection('users').get(),db().collection('appData').doc('shared').get()]);
   const copies=result.docs.filter(d=>d.data().type==='hub-backup').map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   deleted=missingItems(copies,shared.data()||{},profiles.docs.map(d=>({id:d.id,...d.data()})));
   if(!box.isConnected)return;
   paint(box);
  }catch{box.textContent='Could not load deleted data. Please check your connection and try again.';}
 }
 async function restoreItem(entry){
  const {key,item,copy}=entry;
  if(key==='users'){
   const ref=db().collection('users').doc(item.id);
   await db().runTransaction(async tx=>{const current=await tx.get(ref);if(!current.exists){const {id,...profile}=item;tx.set(ref,profile);}});
  }else{
   const ref=db().collection('appData').doc('shared');
   await db().runTransaction(async tx=>{const doc=await tx.get(ref),live=doc.data()||{};if((live[key]||[]).some(x=>x.id===item.id))return;
    const next={[key]:[...(live[key]||[]),item]};
    const related=key==='published'?['taskComments','closed']:key==='customDrills'?['drillAttendance','drillAttendanceReasons']:key==='announcements'?['announcementReads']:[];
    for(const field of related){if(copy.data?.[field]?.[item.id]!==undefined && live[field]?.[item.id]===undefined)next[field]={...(live[field]||{}),[item.id]:copy.data[field][item.id]};}
    tx.set(ref,next,{merge:true});
   });
  }
 }
 document.addEventListener('click',async ev=>{
  if(!state.signedIn||!admin())return;
  const category=ev.target.closest('[data-deleted-category]');if(category){selectedGroup=category.dataset.deletedCategory;paint();return;}
  if(ev.target.closest('[data-deleted-categories]')){selectedGroup=null;paint();return;}
  const button=ev.target.closest('[data-restore-deleted]');if(!button||!state.signedIn||!admin())return;
  const entry=deleted[Number(button.dataset.restoreDeleted)];if(!entry)return;
  button.disabled=true;
  if(!await confirmDeletion(button,true)){button.disabled=false;button.focus();return;}
  button.textContent='Restoring...';
  try{await restoreItem(entry);state.activity.unshift({...activityActor(),message:`Restored: ${entry.item.title||entry.item.name||entry.item.label}.`,createdAt:new Date().toISOString()});save();await load();toast('Item restored.');}catch{button.disabled=false;button.textContent='Restore';toast('Could not restore this item. Please try again.');}
 });
 window.hubBackups={page,create,missingItems,restoreItem};
})();
