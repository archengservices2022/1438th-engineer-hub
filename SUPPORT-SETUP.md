# Three level support setup

Deploy the updated hosting, Firestore rules, and the four support Functions before live use. The existing approvalEmail function uses its own SMTP secret; the support triggers do not require SMTP.

Commands from this project folder:

    firebase deploy --only firestore:rules,hosting,functions:supportTicketCreated,functions:supportTicketStatusChanged,functions:supportTicketReply,functions:supportInternalNote --project engineer-hub-1438

An Admin opens More > Help & Support > Manage Tickets > Developer access to grant an existing active account support-developer access. No account is granted this permission by default. This permission does not change its unit role.

Admin selects Escalated, a developer, and an explanation. The explanation is internal. Assigned developers open More > Help & Support > Manage Tickets to see only assigned tickets and record investigation/test results as internal notes. Admin sends the public reply and resolves the ticket with an explanation.

Internal notes are in their own restricted subcollection; they never enter member conversations or the shared appData document. Notifications are created by trusted Cloud Functions into recipient-specific collections and displayed in the notification bell/feed. They are in-app notifications, not email or push. Event IDs make trigger retries idempotent. Existing historic tickets are not backfilled with notifications.

Review the workflow with separate requester, Admin, developer, and unrelated-member accounts after deployment.


## Ticket status emails

Deploy functions:supportTicketReceivedEmail and functions:supportTicketStatusEmail. These functions use the existing APPROVAL_SMTP secret (JSON with host, port, secure, user, password, and from). If it is not configured, set it with `firebase functions:secrets:set APPROVAL_SMTP --project engineer-hub-1438` using the organisation approved SMTP details. Do not place credentials in website files.

The requester email is read from their users profile, not a form-supplied address. Emails cover received, reviewed/In Progress, Escalated, Resolved, and reopened/Open. Replies and internal notes do not invoke these email handlers. Delivery state is server-only in supportEmailDeliveries; existing default-deny Firestore rules protect it. A lease and sent marker suppress ordinary trigger retries. Historical tickets are not emailed retroactively.

Deploy example for the new email functions:

    firebase deploy --only functions:supportTicketReceivedEmail,functions:supportTicketStatusEmail --project engineer-hub-1438

Status emails contain the ticket number, subject, status, and a link; internal notes and private escalation explanations are excluded. Verify with a test requester after deployment.
