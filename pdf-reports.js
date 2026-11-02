'use strict';
(() => {
 const period=(list,key)=>window.hubReportPeriod.filter(list,key);
 const bases={tasks:'task due date',announcements:'announcement creation date',drills:'drill date',users:'account creation date',resources:'resource creation date',attendance:'drill date',completion:'task due date',activity:'activity date'};
 const assigned=(item,person)=>item.assignedUserId?item.assignedUserId===person.id:!item.audience||item.audience==='All Users'||(['Soldiers','All Soldiers','Soldier'].includes(item.audience)?person.role==='Soldier':['NCO / Leaders','Leadership','NCO / Leader'].includes(item.audience)?person.role==='NCO / Leader':item.audience==='Admin'?person.role==='Admin':true);
 const done=(u,id)=>(u.id===state.currentUserId?state.completed:u.completed)?.[id];
 const active=()=>state.demoUsers.filter(u=>u.status==='Active');
 const configs={
  tasks:{title:'Tasks',headers:['Task','Category','Due','Priority','Audience','Status','Instructions'],rows:()=>newestFirst(period(state.published,'due')).map(t=>[t.title,t.category,t.due,t.priority||'Normal',t.audience||'All Users',state.closed[t.id]?'Closed':t.workStatus||'Not Started',t.instructions])},
  announcements:{title:'Announcements',headers:['Title','Category','Audience','Expires','Pinned','Message'],rows:()=>period(orderedAnnouncements(),'createdAt').map(a=>[a.title,a.category||'General',a.audience||'All Users',a.expires||'No expiration',a.pinned?'Yes':'No',a.message])},
  drills:{title:'Drill Schedule',headers:['Drill','Date','Notes'],rows:()=>newestFirst(period(state.customDrills,'date')).map(d=>[d.label,d.date,d.note])},
  users:{title:'Users',headers:['Name','Email','Phone','Role','Status','Created'],rows:()=>newestFirst(period(state.demoUsers,'createdAt')).map(u=>[u.name,u.email,u.phone,u.role,u.status,u.createdAt?.toDate?u.createdAt.toDate().toLocaleDateString():String(u.createdAt||'').slice(0,10)])},
  resources:{title:'Resources',headers:['Title','Category','Audience','Description','URL'],rows:()=>newestFirst(period(state.customResources,'createdAt')).map(r=>[r.title,r.subtitle,r.audience||'All Users',r.description,r.link||r.url])},
  attendance:{title:'Drill Attendance',headers:['Drill','Date','Name','Role','Attendance','Reason'],rows:()=>period(state.customDrills,'date').flatMap(d=>active().map(u=>[d.label,d.date,u.name,u.role,state.drillAttendance?.[d.id]?.[u.id]||'No response',state.drillAttendanceReasons?.[d.id]?.[u.id]||'']))},
  completion:{title:'Task Completion',headers:['Task','Due','Member','Role','Status','Completed on'],rows:()=>period(state.published,'due').filter(t=>!taskIsCancelled(t)).flatMap(t=>active().filter(u=>assigned(t,u)).map(u=>[t.title,t.due,u.name,u.role,done(u,t.id)?'Completed':'Not completed',done(u,t.id)&&u.completedAt?.[t.id]?new Date(u.completedAt[t.id]).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}):'']))},
  activity:{title:'Activity History',headers:['Date and time','Person','Activity'],rows:()=>newestFirst(period(state.activity||[],'createdAt')).map(a=>[new Date(a.createdAt).toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}),a.actorName||'Unavailable',a.message])}
 };
 const restricted=['users','drills','resources','activity'];
 function exportPdf(key){
  if(!leader()||restricted.includes(key)&&!admin())return;
  const cfg=configs[key];if(!cfg)return;
  const pdf=new window.jspdf.jsPDF({orientation:'landscape'}),rows=cfg.rows();
  pdf.setFontSize(18);pdf.text('1438th Engineer Hub - '+cfg.title,14,18);pdf.setFontSize(9);pdf.text('Generated: '+new Date().toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'})+' | Records: '+rows.length,14,26);
  pdf.text(window.hubReportPeriod.label()+' | Based on '+bases[key],14,31);
  pdf.autoTable({head:[cfg.headers],body:rows.length?rows.map(r=>r.map(v=>displayDateText(v??''))):[['No records',...cfg.headers.slice(1).map(()=> '')]],startY:38,margin:{bottom:16},styles:{fontSize:8,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:[18,59,34]},didDrawPage:()=>{pdf.setFontSize(9);pdf.text('Page '+pdf.internal.getNumberOfPages(),14,pdf.internal.pageSize.height-8);}});
  pdf.save('1438th-'+key+'-'+new Date().toLocaleDateString('en-CA')+'.pdf');toast(cfg.title+' PDF downloaded.');
 }
 const routes={'leader-manage-announcements':'announcements','admin-manage-drills':'drills','admin-users':'users','leader-manage-resources':'resources','attendance-dashboard':'attendance','task-completion':'completion'};
 function inject(){
  if(!state.signedIn||!leader())return;
  const key=routes[location.hash.slice(1)],content=document.querySelector('#page:not([hidden]) .content');
  if(key&&content&&!content.querySelector('[data-pdf-report]')){
   const button=document.createElement('button');button.type='button';button.className='action outline pdf-report-download';button.dataset.pdfReport=key;button.innerHTML='<span>Download '+e(configs[key].title)+' (PDF)</span>'+icon('download');
   const toolbar=content.querySelector('.report-toolbar');if(toolbar)toolbar.after(button);else content.prepend(button);
  }
  const modal=document.querySelector('#activity-modal .activity-items');
  if(modal&&admin()&&!modal.parentElement.querySelector('[data-pdf-report]'))modal.insertAdjacentHTML('beforebegin','<button type="button" class="user-action" data-pdf-report="activity">Download Activity (PDF)</button>');
 }
 document.addEventListener('click',event=>{const b=event.target.closest('[data-pdf-report]');if(!b)return;try{const key=b.dataset.pdfReport;window.hubReportPeriod.open(configs[key].title,bases[key],()=>{try{exportPdf(key);}catch(error){console.error(error);toast('Could not generate PDF.');}},()=>({headers:configs[key].headers,rows:configs[key].rows()}));}catch(error){console.error(error);toast('Could not generate PDF. Please try again.');}});
 new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
 window.hubPdfReports={exportPdf,configs};
})();
