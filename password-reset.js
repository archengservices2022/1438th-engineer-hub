'use strict';
(() => {
 let opener=null;
 const close=()=>{document.querySelector('#password-reset-dialog')?.remove();opener?.focus();};
 window.hubPasswordReset={open(button){
  close();opener=button;
  const email=document.querySelector('#firebase-login-form input[name="email"]')?.value||'';
  document.body.insertAdjacentHTML('beforeend',`<div class="confirm-layer" id="password-reset-dialog"><form class="confirm-dialog" id="password-reset-form" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title"><button type="button" class="dialog-close" data-close-reset-dialog aria-label="Close">×</button><h2 id="reset-dialog-title">Reset password</h2><p>Enter your account email to receive a password reset link.</p><div class="field"><label for="reset-email">Email address</label><input id="reset-email" name="email" type="email" autocomplete="email" required value="${e(email)}" placeholder="Enter email address"></div><p class="form-error" role="status" data-reset-message hidden></p><div class="confirm-actions"><button type="button" class="confirm-cancel" data-close-reset-dialog>Cancel</button><button type="submit" class="confirm-logout">Send reset link</button></div></form></div>`);
  document.querySelector('#reset-email').focus();
 }};
 document.addEventListener('click',event=>{if(event.target.closest('[data-close-reset-dialog]')||event.target.id==='password-reset-dialog')close();});
 document.addEventListener('keydown',event=>{const dialog=document.querySelector('#password-reset-dialog');if(!dialog)return;if(event.key==='Escape'){event.preventDefault();close();}else if(event.key==='Tab'){const controls=[...dialog.querySelectorAll('button:not(:disabled),input')],first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
 document.addEventListener('submit',async event=>{
  if(event.target.id!=='password-reset-form')return;event.preventDefault();
  const form=event.target,button=form.querySelector('[type="submit"]'),message=form.querySelector('[data-reset-message]');
  if(!form.reportValidity())return;button.disabled=true;button.textContent='Sending...';message.hidden=true;
  try{const auth=window.firebaseHub?.auth;if(!auth)throw {code:'auth/not-ready'};await auth.sendPasswordResetEmail(form.elements.email.value.trim());message.textContent='If an account uses this email, a reset link will be sent. Check your inbox and spam folder.';message.style.color='var(--text)';message.hidden=false;button.textContent='Link requested';form.querySelector('[data-close-reset-dialog].confirm-cancel').textContent='Done';}
  catch(error){message.textContent=error.code==='auth/invalid-email'?'Please enter a valid email address.':error.code==='auth/too-many-requests'?'Too many requests. Please try again later.':error.code==='auth/network-request-failed'?'Check your internet connection and try again.':'Could not send the reset link. Please try again.';message.hidden=false;button.disabled=false;button.textContent='Send reset link';}
 });
})();
