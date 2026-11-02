 'use strict';
(async()=>{
 const params=new URLSearchParams(location.search),code=params.get('oobCode'),form=document.querySelector('#new-password-form'),status=document.querySelector('#reset-status'),auth=window.firebaseHub.auth;
 const failure=error=>error.code==='auth/network-request-failed'?'Check your connection and try again.':error.code==='auth/weak-password'?'Choose a stronger password and try again.':'This reset link is invalid or has expired. Request a new link from the sign-in page.';
 if(params.get('mode')==='verifyEmail'&&code){
  document.querySelector('h1').textContent='Verify your email';
  try{await auth.applyActionCode(code);history.replaceState(null,'',location.pathname);status.textContent='Email verified. You can now sign in once your account is approved by Admin.';}
  catch(error){status.textContent=error.code==='auth/network-request-failed'?'Check your connection and reopen the verification link.':'This verification link is invalid or expired. Sign in again to request a new email.';}
  return;
 }
 if(params.get('mode')!=='resetPassword'||!code){status.textContent='Request a password reset link from the sign-in page first.';return;}
 try{const email=await auth.verifyPasswordResetCode(code);status.textContent='Choose a new password for '+email;form.hidden=false;}catch(error){status.textContent=failure(error);return;}
 document.querySelector('#show-password').addEventListener('change',event=>{form.elements.password.type=form.elements.confirm.type=event.target.checked?'text':'password';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  if(form.elements.password.value!==form.elements.confirm.value){status.textContent='Passwords do not match.';form.elements.confirm.focus();return;}
  const button=form.querySelector('button');button.disabled=true;button.textContent='Saving…';
  try{await auth.confirmPasswordReset(code,form.elements.password.value);form.reset();form.hidden=true;history.replaceState(null,'',location.pathname);status.textContent='Password updated. You can now sign in with your new password.';}
  catch(error){status.textContent=failure(error);button.disabled=false;button.textContent='Save password';}
 });
})();
