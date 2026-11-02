'use strict';
(() => {
 const canCreate=()=>state.signedIn&&(admin()||state.role==='NCO / Leader');
 window.hubCreateUser={page(){if(!canCreate())return head('Create User','','admin')+'<p class="empty">Admin access required.</p>';return head('Create User','Add a new account to your unit.',admin()?'admin-users':'leadership')+`<div class="content"><form id="admin-create-user-form" class="card pad"><div class="field"><label>Full name<input name="name" required maxlength="80"></label></div><div class="field"><label>Email address<input name="email" type="email" required autocomplete="off"></label></div><div class="field"><label>Phone number<input name="phone" type="tel" maxlength="30"></label></div><div class="field"><label>Role<select name="role"><option>Soldier</option>${admin()?'<option>NCO / Leader</option><option>Admin</option>':''}</select></label></div><div class="field"><label>Password<input name="password" type="password" minlength="6" required autocomplete="new-password"></label></div><p class="form-error" role="alert" hidden></p><button class="action" type="submit">Create User</button></form></div>`;}};
 document.addEventListener('submit',async event=>{
  const form=event.target;if(form.id!=='admin-create-user-form')return;event.preventDefault();if(!canCreate()||form.dataset.saving==='true'||!form.reportValidity())return;form.dataset.saving='true';
  const fields=new FormData(form),button=form.querySelector('[type="submit"]'),error=form.querySelector('.form-error');button.disabled=true;error.hidden=true;
  let secondary;
  try{
   secondary=firebase.initializeApp(firebase.app().options,'admin-create-'+crypto.randomUUID());
   const auth=secondary.auth();await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
   const credential=await auth.createUserWithEmailAndPassword(String(fields.get('email')).trim(),String(fields.get('password')));
   const profile={name:String(fields.get('name')).trim(),email:credential.user.email,phone:String(fields.get('phone')||'').trim(),role:admin()?String(fields.get('role')):'Soldier',status:'Active',createdBy:state.currentUserId,requiresEmailVerification:true,emailVerified:false,createdAt:new Date().toISOString()};
   try{await window.firebaseHub.db.collection('users').doc(credential.user.uid).set(profile);}catch(failure){await credential.user.delete();throw failure;}
   let verificationSent=true;try{await credential.user.sendEmailVerification({url:'https://engineer-hub-1438.web.app/index.html#login'});}catch{verificationSent=false;}
   state.notifications??=[];state.notifications.unshift({id:'user-created-'+credential.user.uid,message:`New user created: ${profile.name}`,roles:['Admin','NCO / Leader'],route:'leadership',createdAt:new Date().toISOString()});state.activity.unshift({...activityActor(),message:`User created: ${profile.name}.`,createdAt:new Date().toISOString()});save();go(admin()?'admin-users':'leadership');toast(verificationSent?'User created. Verification email sent. The user can sign in after verification; no further approval is needed.':'User created. Verification email could not be sent. Ask the user to sign in to request a link.');
  }catch(failure){error.textContent=failure.code==='auth/email-already-in-use'?'This email already has an account.':failure.code==='auth/weak-password'?'Use a password with at least 6 characters.':failure.code==='permission-denied'?'Your account cannot create this profile. Refresh the page and check Admin access.':failure.code==='auth/invalid-email'?'Enter a valid email address.':failure.code==='auth/network-request-failed'?'Could not connect. Check your connection and try again.':'Could not create the user. Please check the details and try again.';error.hidden=false;button.disabled=false;}
  finally{delete form.dataset.saving;if(button.isConnected)button.disabled=false;if(secondary){await secondary.auth().signOut();await secondary.delete();}}
 });
})();
