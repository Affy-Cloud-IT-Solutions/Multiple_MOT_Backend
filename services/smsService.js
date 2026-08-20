function sendSMS(to, body) {
  console.log(`[MOCK SMS/WHATSAPP SERVICE] Sending message to: ${to}`);
  console.log(`[MOCK SMS/WHATSAPP SERVICE] Body:\n${body}\n---------------------------`);
  return true;
}

module.exports = { sendSMS };
