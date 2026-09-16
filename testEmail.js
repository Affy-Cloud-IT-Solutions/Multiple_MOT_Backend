require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
  console.log('Testing SMTP connection...');
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  console.log('User:', user);
  console.log('Pass length:', pass.length);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  try {
    const verify = await transporter.verify();
    console.log('✅ Verify succeeded:', verify);
    
    const info = await transporter.sendMail({
      from: `"Multiple MOT UK" <${user}>`,
      to: 'nkenterprises1925@gmail.com',
      subject: 'Test connection',
      text: 'Hello from Multiple MOT UK'
    });
    console.log('✅ Send succeeded:', info.messageId);
  } catch (err) {
    console.error('❌ Verify / Send failed:', err.message);
  }
  process.exit(0);
}

test();
