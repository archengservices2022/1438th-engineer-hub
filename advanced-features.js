'use strict';

/* Team collaboration features for the Firebase-connected prototype. */
setTimeout(() => {
  const safe = value => e(value || '');
  const activeUser = () => state.demoUsers.find(user => user.id === state.currentUserId) || {id: state.currentUserId || 'local-user', name: 'Account holder', role: state.role};
  const activity = message => { state.activity ??= []; state.activity.unshift({...activityActor(),message, createdAt: new Date().toISOString()}); state.activity = state.activity.slice(0, 100); save(); };
  const notify = (message, roles = ['Soldier', 'NCO / Leader']) => { state.notifications ??= []; state.notifications.unshift({id: `notice-${crypto.randomUUID()}`, message, roles, createdAt: new Date().toISOString()}); state.notifications = state.notifications.slice(0, 100); save(); };
  const taskFor = id => state.published.find(task => task.id === id) || tasks().find(task => task.id === id);
  /* The shared notification center is a complete activity feed for every signed-in account. */
  const notificationFeed = () => allNotifications().filter(notificationVisible).sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  const unreadNotifications = () => {
    const userId = activeUser().id;
    state.notificationReadIds ??= {};
    const readIds = state.notificationReadIds[userId] || [];
    const legacyReadAt = (state.notificationReadAt || {})[userId] || '';
    return notificationFeed().filter(item => !readIds.includes(item.id) && (!legacyReadAt || item.createdAt > legacyReadAt));
  };
  const notificationCount = () => unreadNotifications().length;
  const notificationRoute = item => {
    if(item.route==='admin-users'&&state.role==='NCO / Leader')return 'leadership';
    if (item.route) return item.route;
    const message = String(item.message || '');
    if (message.startsWith('Task ')) {
      const task = [...(state.published || []), ...tasks()].find(entry => message.includes(entry.title));
      return task ? `task/${task.id}` : 'tasks';
    }
    if (message.startsWith('Announcement')) {
      const announcement = (state.announcements || []).find(entry => message.includes(entry.title));
      return announcement ? `announcement/${announcement.id}` : 'announcement-list';
    }
    if (message.startsWith('Drill')) return 'drill';
    if (message.startsWith('Resource')) return 'resources';
    if (/account|role/i.test(message)) return admin() ? 'admin-users' : 'profile';
    return 'tasks';
  };

  const addTaskFields = () => {};

  const saveTaskDetails = data => {
    const title = String(data.get('title') || '').trim();
    if (!title) return;
    const task = state.published.find(item => item.title === title);
    if (!task) return;
    task.assignedTo = String(data.get('audience') || 'All Users');
    task.workStatus ??= 'Not Started';
    task.createdAt ??= new Date().toISOString();
    task.createdBy = activeUser().name;
    if (task.workStatus === 'Completed') state.completed[task.id] = true;
    activity(`Task created: ${task.title} — assigned to ${task.assignedTo}; due ${task.due}.`);
    save();
  };

  const enhanceTaskDetail = () => {
    const route = location.hash.slice(1);
    if (!route.startsWith('task/')) return;
    const task = taskFor(route.split('/')[1]);
    const card = document.querySelector('#page .card.pad');
    if (!task || !card || card.querySelector('.task-collaboration')) return;
    state.taskComments ??= {};
    const comments = state.taskComments[task.id] || [];
    const section = document.createElement('section');
    section.className = 'task-collaboration';
    section.innerHTML = `<details class="task-panel"><summary>Comments (${comments.length}) ${icon('chevron')}</summary><div class="task-panel-body"><div class="comment-list">${comments.length ? comments.map(comment => `<article><strong>${safe(comment.author)}</strong><p>${safe(comment.message)}</p><small>${new Date(comment.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})}</small></article>`).join('') : '<p class="muted">No comments yet.</p>'}</div><form data-task-comment-form="${safe(task.id)}" class="comment-form" onsubmit="return false"><label>Add Comment<textarea name="comment" maxlength="500" required placeholder="Write an update or question"></textarea></label><button class="action outline" type="submit">Post Comment</button></form></div></details>`;
    const detailList=card.querySelector(':scope > .detail-list');
    if(detailList&&!detailList.querySelector('[data-task-status]'))detailList.insertAdjacentHTML('beforeend', `<div class="task-status-row"><dt>Task status</dt><dd><label class="status-control"><select aria-label="Task status" data-task-status="${safe(task.id)}"><option ${task.workStatus === 'Not Started' ? 'selected' : ''}>Not Started</option><option ${task.workStatus === 'In Progress' ? 'selected' : ''}>In Progress</option><option ${task.workStatus === 'On Hold' ? 'selected' : ''}>On Hold</option><option ${task.workStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option><option ${task.workStatus === 'Completed' ? 'selected' : ''}>Completed</option></select></label></dd></div>`);
    card.append(section);
  };
  const markAnnouncementRead = () => {
    const route = location.hash.slice(1);
    if (!route.startsWith('announcement/')) return;
    const id = route.split('/')[1];
    state.announcementReads ??= {};
    state.announcementReads[id] ??= [];
    const user = activeUser();
    if (!state.announcementReads[id].some(read => read.userId === user.id)) {
      state.announcementReads[id].push({userId: user.id, name: user.name, createdAt: new Date().toISOString()});
      save();
    }
  };

  const addHomeNotifications = () => { document.querySelectorAll('.home-notifications').forEach(section => section.remove()); };

  const addMoreOptions = () => {
    if (location.hash.slice(1) !== 'more') return;
    const card = document.querySelector('#page .content > .card');
    if (!card) return;
    card.querySelector('[data-route="notifications"]')?.remove();
    const signOut = card.querySelector('[data-signout]');
    if (signOut && card.lastElementChild !== signOut) card.append(signOut);
  };

  const addTaskNotificationBell = () => {
    const route = location.hash.slice(1);
    if (!route || ['notifications', 'login', 'create-account'].includes(route)) return;
    const header = document.querySelector('#page .page-header');
    if (!header || header.querySelector('[data-task-notifications]')) return;
    const count = notificationCount();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'header-notification';
    button.dataset.route = 'notifications';
    button.dataset.taskNotifications = 'true';
    button.setAttribute('aria-label', count ? `${count} unread notifications` : 'Notifications');
    button.innerHTML = `<span aria-hidden="true">🔔</span>${count ? `<b>${count > 99 ? '99+' : count}</b>` : ''}`;
    header.append(button);
  };


  const addUserFilter = () => {
    if (location.hash.slice(1) !== 'admin-users') return;
    const search = document.querySelector('[data-user-search]');
    const searchField = search?.closest('.search-field');
    if (!searchField || searchField.closest('.content').querySelector('.user-filter-bar')) return;
    const filter = document.createElement('div');
    filter.className = 'filter-bar user-filter-bar';
    filter.innerHTML = `<button data-user-filter="all" aria-pressed="true">All</button><button data-user-filter="Pending">Pending</button><button data-user-filter="Active">Active</button><button data-user-filter="Disabled">Disabled</button>`;
    (searchField.closest('.search-download-bar')||searchField).after(filter);
  };
  const simplifyAudienceOptions = () => {
    const options = ['All Users', 'Soldiers', 'NCO / Leaders'];
    document.querySelectorAll('select[name="audience"]').forEach(select => {
      if (select.dataset.simpleAudience === 'true') return;
      const previous = select.value;
      select.dataset.simpleAudience = 'true';
      select.replaceChildren(...options.map(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        return option;
      }));
      select.value = options.includes(previous) ? previous : 'All Users';
    });
  };
  const addReopenButtons = () => {
    document.querySelectorAll('[data-close-task]').forEach(button => {
      const id = button.dataset.closeTask;
      if (!state.closed?.[id]) return;
      button.removeAttribute('data-close-task');
      button.dataset.reopenTask = id;
      button.textContent = 'Reopen';
      button.classList.add('reopen-task');
    });
  };
  const removeCloseButtons = () => {
    document.querySelectorAll('[data-close-task]').forEach(button => button.remove());
  };

  const originalRender = render;
  render = function(route, focus = true) {
 if(!canOpenRoute(route)){go(state.signedIn?'home':'login');return;}
    if (route === 'notifications') {
      current = route; document.querySelector('#home').hidden = true; const page = document.querySelector('#page'); page.hidden = false;
      const notices = notificationFeed();
      const userId=state.currentUserId;
      if(userId){
        state.notificationReadIds ??= {};
        const read=new Set(state.notificationReadIds[userId]||[]);
        const added=notices.filter(item=>item.id&&!read.has(item.id));
        if(added.length){added.forEach(item=>read.add(item.id));state.notificationReadIds[userId]=[...read];save();}
      }
      const opened=new Set((state.notificationOpenedIds||{})[userId]||[]);
      const unread = new Set(notices.filter(item=>!opened.has(item.id)).map(item=>item.id));
      page.innerHTML = head('Notifications', 'Tap an update to open it.', 'tasks') + `<div class="content"><div class="card notification-list">${notices.length ? notices.map(item => `<button type="button" class="notification-card ${unread.has(item.id) ? 'unread-notification' : ''}" data-notification-id="${safe(item.id)}" data-route="${safe(notificationRoute(item))}"><strong>${safe(displayDateText(item.message))}</strong><small>${new Date(item.createdAt).toLocaleDateString('en-US',{day:'2-digit',month:'2-digit',year:'numeric'})} · ${new Date(item.createdAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</small><span aria-hidden="true">${icon('chevron')}</span></button>`).join('') : '<p class="empty">No notifications yet.</p>'}</div></div>`;
      document.querySelector('#bottom-nav').hidden = false; nav('more'); if (focus) window.scrollTo(0, 0); return;
    }
    if (route === 'task-report') {
      current = route; document.querySelector('#home').hidden = true; const page = document.querySelector('#page'); page.hidden = false;
      const list = state.published || []; const completed = list.filter(task => state.completed[task.id] || task.workStatus === 'Completed').length;
      page.innerHTML = head('Task Report', 'Published task progress.', 'leadership') + `<div class="content"><div class="stats report-stats"><button type="button" class="stat" data-route="leader-manage-tasks"><span>Published</span><b>${list.length}</b><small>Manage tasks</small></button><button type="button" class="stat" data-route="completed-tasks"><span>Completed</span><b>${completed}</b><small>View completed</small></button></div><div class="card report-list">${list.length ? list.map(task => `<button type="button" class="report-task-row" data-route="task/${safe(task.id)}"><strong>${safe(task.title)}</strong><small>${safe(task.workStatus || 'Not Started')} · Assigned to ${safe(task.assignedTo || task.audience || 'All Soldiers')} · Due ${date(task.due)}</small>${icon('chevron')}</button>`).join('') : '<p class="empty">No tasks created yet.</p>'}</div></div>`;
      document.querySelector('#bottom-nav').hidden = false; nav('leadership'); if (focus) window.scrollTo(0, 0); return;
    }
    originalRender(route, focus);
    setTimeout(() => { addTaskFields(); simplifyAudienceOptions(); enhanceTaskDetail(); markAnnouncementRead(); addHomeNotifications(); addMoreOptions(); addTaskNotificationBell(); addUserFilter(); addReopenButtons(); removeCloseButtons(); if (route === 'leader-manage-tasks') { const content = document.querySelector('#page .content'); if (content && !content.querySelector('[data-route="task-report"]')) content.insertAdjacentHTML('afterbegin', `<button class="action outline" data-route="task-report">View Task Report ${icon('chevron')}</button>`); } }, 0);
  };

  new MutationObserver(() => setTimeout(() => { addTaskFields(); simplifyAudienceOptions(); enhanceTaskDetail(); markAnnouncementRead(); addHomeNotifications(); addMoreOptions(); addTaskNotificationBell(); addUserFilter(); addReopenButtons(); removeCloseButtons(); }, 0)).observe(document.querySelector('#page'), {childList: true, subtree: true});

  document.addEventListener('click', event => {
    const taskButton = event.target.closest('#task-form button[type="submit"]');
    if (taskButton) { const data = new FormData(taskButton.form); setTimeout(() => saveTaskDetails(data), 80); }
    const forgot = event.target.closest('[data-forgot-password]');
    if (forgot) { window.hubPasswordReset.open(forgot); return; }
    const filter = event.target.closest('[data-user-filter]');
    if (filter) { document.querySelectorAll('[data-user-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === filter))); document.querySelectorAll('[data-user-card]').forEach(card => { card.hidden = filter.dataset.userFilter !== 'all' && !card.textContent.includes(filter.dataset.userFilter); }); }
    const reopen = event.target.closest('[data-reopen-task]');
    if (reopen) { delete state.closed[reopen.dataset.reopenTask]; activity(`Task reopened: ${taskFor(reopen.dataset.reopenTask)?.title || 'Task'}.`); save(); render('leader-manage-tasks', false); toast('Task reopened.'); }
  }, true);

  document.addEventListener('change', event => {
    const select = event.target.closest('[data-task-status]');
    if (select) { const task = taskFor(select.dataset.taskStatus); if (!task) return; task.workStatus = select.value; state.completed[task.id] = select.value === 'Completed'; activity(`Task status changed: ${task.title} is ${select.value}.`); save(); render(location.hash.slice(1), false); }

  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-task-comment-form]');
    if (!form) return;
    event.preventDefault(); const message = String(new FormData(form).get('comment') || '').trim(); if (!message) return;
    const id = form.dataset.taskCommentForm; state.taskComments ??= {}; state.taskComments[id] ??= []; state.taskComments[id].push({author: activeUser().name, message, createdAt: new Date().toISOString()});
    activity(`Comment added to task: ${taskFor(id)?.title || 'Task'}.`); save(); render(location.hash.slice(1), false);
  }, true);
}, 2600);
