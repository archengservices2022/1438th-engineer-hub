'use strict';
(() => {
 function overdueFor(task,today){return /^\d{4}-\d{2}-\d{2}$/.test(task.due||'')&&task.due<today&&!state.completed[task.id]&&!state.closed[task.id]&&task.workStatus!=='Completed'&&(!task.assignedUserId||task.assignedUserId===state.currentUserId)&&(!task.audience||task.audience==='All Users'||(task.audience==='All Soldiers'||task.audience==='Soldiers'?state.role==='Soldier':task.audience==='Leadership'||task.audience==='NCO / Leaders'?state.role==='NCO / Leader':true));}
 function check(){
  if(!state.signedIn||!window.firebaseHub?.auth?.currentUser)return;
  const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  state.notifications??=[];let changed=false;
  tasks().filter(t=>!['On Hold','Cancelled'].includes(t.workStatus)&&overdueFor(t,today)).forEach(t=>{const id=`overdue-${state.currentUserId}-${t.id}-${today}`;if(state.notifications.some(n=>n.id===id))return;state.notifications.unshift({id,kind:'overdue',taskId:t.id,userId:state.currentUserId,message:`Overdue task: ${t.title} (due ${t.due})`,route:`task/${t.id}`,createdAt:now.toISOString()});changed=true;});
  if(changed){save();render(current,false);}
 }
 setTimeout(check,5000);setInterval(check,60000);
 window.hubOverdue={check,overdueFor};
})();
