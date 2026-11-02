'use strict';
(() => {
 const close=()=>document.querySelector('#resource-editor')?.remove();
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-close-resource-editor]')){close();return;}
  const b=event.target.closest('[data-edit-resource]');if(!b||!admin())return;
  const r=state.customResources.find(x=>x.id===b.dataset.editResource);if(!r)return;close();
  document.body.insertAdjacentHTML('beforeend',`<div class="confirm-layer" id="resource-editor"><form id="resource-edit-form" class="confirm-dialog" data-resource-id="${e(r.id)}" role="dialog" aria-modal="true" aria-labelledby="resource-edit-title" style="max-height:85dvh;overflow:auto;position:relative"><button type="button" class="dialog-close" data-close-resource-editor aria-label="Close">×</button><h2 id="resource-edit-title">Edit Resource</h2><div class="field"><label>Resource name<input name="title" maxlength="100" required value="${e(r.title)}"></label></div><div class="field"><label>Category<input name="category" maxlength="60" required value="${e(r.subtitle||'')}"></label></div><div class="field"><label>Description<textarea name="description" maxlength="500" required>${e(r.description||'')}</textarea></label></div><div class="field"><label>URL<input name="url" type="url" required value="${e(r.link||r.url||'')}"></label></div><div class="field"><label>Audience<select name="audience">${['All Users','Soldiers','NCO / Leaders'].map(v=>`<option ${r.audience===v?'selected':''}>${v}</option>`).join('')}</select></label></div><p class="form-error" hidden></p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-close-resource-editor>Cancel</button><button type="submit" class="confirm-logout">Save Changes</button></div></form></div>`);
  document.querySelector('#resource-edit-form input').focus();
 });
 document.addEventListener('submit',event=>{
  const form=event.target;if(form.id!=='resource-edit-form')return;event.preventDefault();if(!admin()||!form.reportValidity())return;
  const r=state.customResources.find(x=>x.id===form.dataset.resourceId);if(!r)return;
  const data=new FormData(form),value=k=>String(data.get(k)||'').trim();let url;
  try{url=new URL(value('url'));if(url.protocol!=='https:')throw Error();}catch{const error=form.querySelector('.form-error');error.textContent='Enter a valid public HTTPS URL.';error.hidden=false;return;}
  Object.assign(r,{title:value('title'),subtitle:value('category'),description:value('description'),link:url.href,audience:value('audience'),updatedAt:new Date().toISOString()});
  state.activity.unshift({...activityActor(),message:`Resource edited: ${r.title}.`,createdAt:new Date().toISOString()});save();close();render(current,false);toast('Resource updated.');
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
})();
