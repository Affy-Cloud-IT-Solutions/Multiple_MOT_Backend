// Checks the Hostinger SMTP settings from .env (MAIL_* variables) using the real email service.
//   node testEmail.js                 -> verify the SMTP login only (no email is sent)
//   node testEmail.js you@example.com -> verify, then send one test email to that address
require('dotenv').config();
const { verifySmtpConnection, sendDiagnosticTestEmail } = require('./services/emailService');

async function test() {
  const to = process.argv[2];
  try {
    if (to) {
      const result = await sendDiagnosticTestEmail(to);
      console.log(result.success ? '✅ Test email sent:' : '❌ Test email failed:', JSON.stringify(result, null, 2));
    } else {
      const result = await verifySmtpConnection();
      console.log(result.success ? '✅ SMTP login verified:' : '❌ SMTP login failed:', JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error('❌ Verify / Send failed:', err.message);
  }
  process.exit(0);
}

test();
