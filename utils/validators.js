function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidMobile(mobile) {
  // Checks for simple UK or international phone digits length
  const phoneRegex = /^\+?[0-9\s-]{10,15}$/;
  return phoneRegex.test(mobile);
}

function isValidVRN(vrn) {
  // UK standard registrations are generally 1-8 alphanumeric chars
  const vrnRegex = /^[A-Z0-9\s]{1,8}$/i;
  return vrnRegex.test(vrn);
}

module.exports = {
  isValidEmail,
  isValidMobile,
  isValidVRN
};
