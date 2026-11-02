# New features setup
Website: run firebase emulators:start --only hosting --project engineer-hub-1438.

## Backups
The app creates daily snapshots while an Admin is online. Download backups work immediately.
Review firestore.rules before deploying: this ZIP contains the original rules, including its original bootstrap admin email.
The added rule for /appData/recovery/snapshots allows only Admins to read/create snapshots. Apply that rule to your existing project rules without replacing other live rules unintentionally.

## Approval email
Requires Firebase billing for Cloud Functions and your SMTP email provider.
In functions run npm install.
Run firebase functions:secrets:set APPROVAL_SMTP and enter JSON containing host, port, secure, user, password, from.
Then deploy firebase deploy --only functions --project engineer-hub-1438.
No email credentials belong in browser JavaScript.
Email runs when a user status changes to Active. SMTP and billing have not been configured or tested.
