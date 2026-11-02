# Website password reset

After deploying the website, open Firebase Console > Authentication > Templates > Password reset > Edit > Customize action URL.

Set the action URL to:
https://engineer-hub-1438.web.app/reset-password.html

Save the template and request a NEW password reset email. Previously sent links still use their original address.

The custom page verifies Firebase's one-time reset code and saves the new password using confirmPasswordReset. Email verification remains necessary for forgotten passwords.
