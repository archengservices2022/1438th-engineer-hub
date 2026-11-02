 'use strict';
const updates={
 Open:'Your ticket is open and awaiting review. We will email you when its status changes.',
 'In Progress':'Your ticket has been reviewed and our support team is working on it. We will keep you updated.',
 Escalated:'Your ticket has been escalated to our developer team for technical investigation. We will update you when there is progress.',
 Resolved:'Your ticket has been marked as resolved. Please check the resolution in Help & Support. If the issue remains, you can reopen the ticket.'
};
function buildTicketEmail(ticket,id,created){
 if(!created&&!updates[ticket.status])return null;
 const status=created?'Received':ticket.status;
 const number=ticket.ticketNumber||id;
 return {subject:'1438th Engineer Hub | Ticket '+number+' | '+status,
 text:['Hello,',created?'Thank you for raising a support ticket. We have received your request and will review it.':updates[ticket.status],'','Ticket number: '+number,'Subject: '+ticket.subject,'Status: '+(created?'Open':ticket.status),'','View your ticket and replies:','https://engineer-hub-1438.web.app/#support-ticket/'+encodeURIComponent(id),'','1438th Engineer Hub Support'].join('\n')};
}
module.exports={buildTicketEmail};
