const test = require('node:test');
const assert = require('node:assert/strict');
const { isRetryableConnectionError } = require('../services/emailService');

const smtpError = (code, command) => Object.assign(new Error(code), { code, command });

test('connection failures before the message is sent are retried on the fallback port', () => {
  assert.equal(isRetryableConnectionError(smtpError('ECONNECTION', 'CONN')), true);
  assert.equal(isRetryableConnectionError(smtpError('ETIMEDOUT', 'CONN')), true);
  assert.equal(isRetryableConnectionError(smtpError('ECONNREFUSED')), true);
  assert.equal(isRetryableConnectionError(smtpError('EDNS')), true);
});

test('failures after the server may have accepted the message are not retried (no duplicate email)', () => {
  assert.equal(isRetryableConnectionError(smtpError('ETIMEDOUT', 'DATA')), false);
  assert.equal(isRetryableConnectionError(smtpError('ESOCKET', 'DATA')), false);
  assert.equal(isRetryableConnectionError(smtpError('EMESSAGE', 'DATA')), false);
});

test('authentication and envelope errors are not retried', () => {
  assert.equal(isRetryableConnectionError(smtpError('EAUTH', 'AUTH PLAIN')), false);
  assert.equal(isRetryableConnectionError(smtpError('EENVELOPE', 'RCPT TO')), false);
  assert.equal(isRetryableConnectionError(new Error('unknown')), false);
  assert.equal(isRetryableConnectionError(null), false);
});
