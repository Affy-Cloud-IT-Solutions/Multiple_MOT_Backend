function sendEmail(to, subject, body) {
  console.log(`[MOCK EMAIL SERVICE] Sending mail to: ${to}`);
  console.log(`[MOCK EMAIL SERVICE] Subject: ${subject}`);
  console.log(`[MOCK EMAIL SERVICE] Body:\n${body}\n---------------------------`);
  return true;
}

module.exports = { sendEmail };
