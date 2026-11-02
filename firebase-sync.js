'use strict';

/* Firebase Authentication and Firestore are the only source of truth for app
   data. Nothing here reads from or writes to localStorage. */
(function () {
  const {auth, db} = window.firebaseHub || {};
  if (!auth || !db) {state.authReady=true;render('login',false);return;}
  const sharedRef = db.collection('appData').doc('shared');
  const usersRef = db.collection('users');
  const requestedSupportTicket=/^(support|support-new|support-mine|admin-support|developer-support|support-ticket\/[A-Za-z0-9_-]+)$/.test(location.hash.slice(1))?location.hash.slice(1):'';
  let applyingRemoteState = false;
  let lastShared = '';
  /* Never write the in-memory empty state until Firestore has supplied the
     existing shared document. This protects tasks during a page reload. */
  let sharedLoaded = false;
  let registeringAccount = false;
  const restoreFailure=()=>{
   state.authReady=true;state.signedIn=false;
   render('login',false);
   const message=document.querySelector('#firebase-login-error');
   if(message){message.hidden=false;message.textContent='Could not restore your session. Check your connection, then sign in again.';}
  };
  const restoreTimer=setTimeout(()=>{if(!state.authReady)restoreFailure();},12000);


  const sharedData = () => ({
    published: state.published || [], announcements: state.announcements || [],
    customDrills: state.customDrills || [], customResources: state.customResources || [],
    activity: state.activity || [], taskComments: state.taskComments || {},
    announcementAcknowledgements: state.announcementAcknowledgements || {}, announcementReads: state.announcementReads || {}, notifications: state.notifications || [],
    notificationReadAt: state.notificationReadAt || {}, notificationOpenedIds: state.notificationOpenedIds || {}, notificationReadIds: state.notificationReadIds || {}, drillAttendance: state.drillAttendance || {}, drillAttendanceReasons: state.drillAttendanceReasons || {}, accountRequests: state.accountRequests || [],
    closed: state.closed || {}
  });
  const serialize = value => JSON.stringify(value);
  const contentKeys=['published','announcements','customDrills','customResources'];
  const contentCount=value=>contentKeys.reduce((total,key)=>total+(Array.isArray(value[key])?value[key].length:0),0);
  const persistShared=payload=>{
    if(!sharedLoaded || !auth.currentUser)return Promise.resolve();
    const previous=lastShared?JSON.parse(lastShared):{};
    if(contentCount(previous)>0 && contentCount(payload)===0){
      toast('Save stopped to protect existing records. Refresh the page before making changes.');
      return Promise.reject(new Error('Blocked empty shared content overwrite'));
    }
    return sharedRef.set({...payload,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  };

  let lastSaveFailureToast = 0;
  const notifySaveFailure = () => {
    const now = Date.now();
    if (now - lastSaveFailureToast < 8000) return;
    lastSaveFailureToast = now;
    toast('Could not save to Firebase. Check your connection and try again.');
  };
  const logUpdate = message => {
    state.activity ??= [];
    state.activity.unshift({...activityActor(),message, createdAt: new Date().toISOString()});
    state.activity = state.activity.slice(0, 100);
    save();
    if (auth.currentUser) {
      const payload = sharedData();
      persistShared(payload).then(()=>{lastShared=serialize(payload);}).catch(()=>{notifySaveFailure();});
    }
  };
  const audienceRoles = audience => {
    if (audience === 'Soldiers' || audience === 'All Soldiers') return ['Soldier'];
    if (audience === 'NCO / Leaders' || audience === 'Leadership') return ['NCO / Leader'];
    return ['Soldier', 'NCO / Leader'];
  };
  const sendNotification = (message, roles, route) => {
    state.notifications ??= [];
    state.notifications.unshift({id: `notice-${crypto.randomUUID()}`, message, roles, route, createdAt: new Date().toISOString()});
    state.notifications = state.notifications.slice(0, 100);
    save();
    if (auth.currentUser) {
      const payload = sharedData();
      persistShared(payload).then(()=>{lastShared=serialize(payload);}).catch(()=>{notifySaveFailure();});
    }
  };
  const writeShared = () => {
    if (!sharedLoaded || applyingRemoteState || !auth.currentUser) return;
    const payload = sharedData();
    const next = serialize(payload);
    if (next === lastShared) return;
    persistShared(payload).then(()=>{lastShared=next;}).catch(() => { notifySaveFailure(); });
  };

  sharedRef.onSnapshot(snapshot => {
    if (!snapshot.exists) {sharedLoaded=false;return;}
    sharedLoaded = true;
    const remote = snapshot.data();
    applyingRemoteState = true;
    ['published', 'announcements', 'customDrills', 'customResources', 'activity', 'taskComments', 'announcementAcknowledgements', 'announcementReads', 'notifications', 'notificationReadAt', 'notificationReadIds', 'notificationOpenedIds', 'drillAttendance', 'drillAttendanceReasons', 'accountRequests', 'closed'].forEach(key => {
      if (remote[key] !== undefined) state[key] = ['published','announcements','customDrills','customResources'].includes(key)?newestFirst(remote[key]):remote[key];
    });
    (state.accountRequests || []).forEach(profile => {
      const index = (state.demoUsers || []).findIndex(user => user.id === profile.id || (profile.email && String(user.email || '').toLowerCase() === String(profile.email).toLowerCase()));
      if (index >= 0) state.demoUsers[index] = {...state.demoUsers[index], ...profile, firebaseAccount: true};
      else state.demoUsers.push({...profile, firebaseAccount: true});
    });
    lastShared = serialize(sharedData());
    save();
    applyingRemoteState = false;
    if (state.signedIn) render(current, false);
  }, () => {});
  setInterval(writeShared, 1500);

  let knownUserIds = null,knownVerifiedIds=new Set();
  usersRef.onSnapshot(snapshot => {
    const profiles = snapshot.docs.map(document => ({id: document.id, ...document.data(), firebaseAccount: true}));
    const seen = new Set(profiles.map(profile => profile.id));
    state.demoUsers = state.demoUsers.filter(user => seen.has(user.id));
    const newlyPending = [];
    profiles.forEach(profile => {
      const index = state.demoUsers.findIndex(user => user.id === profile.id);
      if (index >= 0) state.demoUsers[index] = {...state.demoUsers[index], ...profile};
      else state.demoUsers.push(profile);
      if (knownUserIds && profile.status === 'Pending' && (!profile.requiresEmailVerification||profile.emailVerified) && (!knownUserIds.has(profile.id)||!knownVerifiedIds.has(profile.id))) newlyPending.push(profile);
    });
    /* A Pending account can't write to appData/shared (it isn't Active yet),
       so it can't log its own "new account request" activity/notification.
       An Active Admin session that's already open does it on their behalf,
       the moment their live users listener sees the new profile. */
    if (knownUserIds && state.signedIn && admin()) {
      newlyPending.forEach(profile => {
        const already = (state.activity || []).some(item => item.message.includes(profile.name) && item.message.includes('account request'));
        if (already) return;
        logUpdate(`New ${profile.role || 'Soldier'} account request: ${profile.name} (${profile.email || 'no email on file'}).`);
        sendNotification(`New account request: ${profile.name}`, ['Admin','NCO / Leader'], 'admin-users');
      });
    }
    knownUserIds = seen;knownVerifiedIds=new Set(profiles.filter(p=>p.emailVerified).map(p=>p.id));
    save();
    if (state.signedIn && ['admin-users', 'admin'].includes(location.hash.slice(1))) render(current, false);
  }, () => {});

  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id !== 'firebase-login-form' && form.id !== 'firebase-create-form') return;
    event.preventDefault();
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');
    const error = form.querySelector('.form-error');
    const fail = message => { error.textContent = message; error.hidden = false; };
    if (form.id === 'firebase-login-form') {
      auth.signInWithEmailAndPassword(email, password).catch(() => fail('Email address or password does not match.'));
      return;
    }
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const requestedRole = String(data.get('role') || 'Soldier');
    if (!name || !phone || password.length < 6) return fail('Complete all fields. Password must have at least 6 characters.');
    let createdUserId = '';
    registeringAccount = true;
    auth.createUserWithEmailAndPassword(email, password).then(async ({user}) => {
      createdUserId = user.uid;
      const isDefaultAdmin = email === 'sridharkota17@gmail.com';
      await usersRef.doc(user.uid).set({name, email, phone, role: isDefaultAdmin ? 'Admin' : requestedRole, status: isDefaultAdmin ? 'Active' : 'Pending', requiresEmailVerification: true, emailVerified: false, createdAt: new Date().toISOString()});
      try{await user.sendEmailVerification({url:'https://engineer-hub-1438.web.app/index.html#login'});return true;}catch{return false;}
    }).then(async verificationSent => {
      state.accountRequests ??= [];
      state.accountRequests = state.accountRequests.filter(profile => profile.id !== createdUserId && String(profile.email || '').toLowerCase() !== email);
      state.accountRequests.unshift({id: createdUserId, name, email, phone, role: requestedRole, status: 'Pending', createdAt: new Date().toISOString(), firebaseAccount: true});
      save();
      /* A brand-new account is Pending, not Active, so it has no permission to
         write appData/shared itself — an already-open Admin session records
         the "new account request" activity/notification (see usersRef listener
         above) once its live users query sees this profile. */
      await auth.signOut();render('login', false);const notice=document.querySelector('#firebase-login-error');const message=verificationSent?'Verification email sent. Open the link, then sign in to submit your verified account for Admin approval. Check your spam folder too.':'Account created, but the verification email could not be sent. Sign in again to request a new link.';if(notice){notice.textContent=message;notice.hidden=false;}toast(message); }).catch(errorMessage => {
      if (errorMessage?.code === 'auth/email-already-in-use') {
        error.hidden = true;
        toast('An account already exists with this email. Please sign in instead.');
        return;
      }
      fail('Could not create the account. Check your details and try again.');
    }).finally(() => { registeringAccount = false; });
  }, true);

  /* Per-user data (task completions, packing checklist) lives on the
     signed-in user's own Firestore document, keyed by uid. */
  let myUid = '';
  let lastMine = '';
  const mySerializable = () => ({completed: state.completed || {}, packing: state.packing || {}, photo: (state.profilePhotos && state.profilePhotos[myUid]) || ''});
  const writeMine = () => {
    if (!myUid) return;
    const next = serialize(mySerializable());
    if (next === lastMine) return;
    lastMine = next;
    usersRef.doc(myUid).set(mySerializable(), {merge: true}).catch(() => { lastMine = ''; notifySaveFailure(); });
  };
  setInterval(writeMine, 1500);

  /* Every state change already calls save(); make that trigger an
     immediate (debounced) Firestore write instead of waiting up to 1.5s
     for the polling interval, so a save can't be lost to a closed tab or
     a quick navigation right after adding or editing something. */
  let saveDebounce;
  save = () => {
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => { writeShared(); writeMine(); }, 200);
  };

  /* Keep an active Firebase login after browser refreshes. */
  const localPersistence = window.firebase?.auth?.Auth?.Persistence?.LOCAL;
  if (localPersistence) auth.setPersistence(localPersistence).catch(() => {});

  auth.onAuthStateChanged(user => {
    if (registeringAccount && user) return;
    if (!user) {
      myUid = ''; lastMine = '';
      const wasSignedIn = state.signedIn;
      state.signedIn = false; state.currentUserId = ''; state.role = 'Soldier'; state.authReady = true;
      state.completed = {}; state.packing = {};
      if (wasSignedIn) go('login');
      else render('login', false);
      return;
    }
    Promise.race([usersRef.doc(user.uid).get(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Session restore timed out')),10000))]).then(async snapshot => {
      if (auth.currentUser !== user) return;
      if (!snapshot.exists) { state.authReady = true; auth.signOut(); toast('Your account profile could not be found. Please sign in again.'); return; }
      const profile = snapshot.data();
      if(profile.status==='Disabled'){toast('This account is disabled.');await auth.signOut();return;}
      if (profile.requiresEmailVerification) {
        await user.reload();
        if (auth.currentUser !== user) return;
        if (!user.emailVerified) {
          let message;
          try {
            await user.sendEmailVerification({url:'https://engineer-hub-1438.web.app/index.html#login'});
            message='Verify your email first. A verification link has been sent. Open it, then sign in to submit your account for Admin approval.';
          } catch (error) {
            message=error.code==='auth/too-many-requests'?'Verify your email using the link already sent. Please wait before requesting another email.':'Email verification is required. Could not send the email; please check your connection and sign in again.';
          }
          await auth.signOut();
          render('login', false);
          const notice=document.querySelector('#firebase-login-error');
          if(notice){notice.textContent=message;notice.hidden=false;}
          return;
        }
        await user.getIdToken(true);
        if(!profile.emailVerified)await usersRef.doc(user.uid).update({emailVerified:true});
      }
      if(profile.status!=='Active'){await auth.signOut();render('login',false);const notice=document.querySelector('#firebase-login-error');if(notice){notice.textContent='Email verified. Your account is waiting for Admin approval.';notice.hidden=false;}return;}
      state.currentUserId = user.uid;
      state.role = profile.role;
      state.completed = profile.completed || {};
      state.packing = profile.packing || {};
      state.profilePhotos ??= {};
      if (profile.photo) state.profilePhotos[user.uid] = profile.photo;
      state.signedIn = true; state.authReady = true; clearTimeout(restoreTimer);
      myUid = user.uid;
      lastMine = serialize(mySerializable());
      save();
      go(requestedSupportTicket||'home');
    }).catch(() => {
      state.authReady = true;
      state.signedIn = false;
      render('login', false);
      toast('Could not restore your session. Please sign in again.');
    });
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!['announcement-form', 'schedule-form', 'resource-form'].includes(form.id)) return;
    const data = new FormData(form);
    const value = name => String(data.get(name) || '').trim();
    if (form.id === 'announcement-form' && value('title') && value('message')) {
      setTimeout(() => logUpdate(`Announcement created: ${value('title')} — ${value('category') || 'General'} for ${value('audience') || 'All Soldiers'}.`), 0);
      setTimeout(() => { const announcement = (state.announcements || []).find(item => item.title === value('title')); sendNotification(`New announcement: ${value('title')}`, audienceRoles(value('audience')), announcement ? `announcement/${announcement.id}` : 'announcement-list'); }, 40);
    }
    if (form.id === 'schedule-form' && value('date') && value('label')) {
      setTimeout(() => logUpdate(`Drill added: ${value('label')} — ${value('date')}. ${value('note')}`), 0);
      setTimeout(() => sendNotification(`New drill: ${value('label')}`, ['Soldier', 'NCO / Leader'], 'drill'), 40);
    }
    if (form.id === 'resource-form' && value('title')) {
      setTimeout(() => logUpdate(`Resource added: ${value('title')} — ${value('category') || 'General'}.`), 0);
    }
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('#task-form button[type="submit"]');
    if (!button) return;
    const data = new FormData(button.form);
    const value = name => String(data.get(name) || '').trim();
    if (value('taskId')) return;
    if (!value('title') || !value('due') || !value('instructions') || !value('category')) return;
    setTimeout(() => {
      const task = (state.published || []).find(item => item.title === value('title'));
      if (!task) return;
      state.activity = (state.activity || []).filter(item => item.message !== `Task updated: ${value('title')}.`);
      logUpdate(`Task created: ${value('title')} — ${value('category') || 'General'}, due ${value('due')}, for ${value('audience') || 'All Soldiers'}.`);
      sendNotification(`New task: ${value('title')}`, audienceRoles(value('audience')), `task/${task.id}`);
    }, 30);
  }, true);
})();
