require('dotenv').config();
const nodemailer = require('nodemailer');

// Initialize Transporter
let transporter = null;

function getSmtpConfig(portOverride = null, secureOverride = null) {
  let host = process.env.MAIL_HOST || process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.hostinger.com';
  let port = portOverride !== null 
    ? portOverride 
    : parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT || process.env.SMTP_PORT || '465', 10);
  let user = (process.env.MAIL_USERNAME || process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  let pass = (process.env.MAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim();

  const isSecure = secureOverride !== null 
    ? secureOverride 
    : (process.env.MAIL_ENCRYPTION === 'ssl' || process.env.EMAIL_SECURE === 'true' || port === 465);

  return { host, port, user, pass, isSecure };
}

function createSmtpTransporter(portOverride = null, secureOverride = null) {
  const { host, port, user, pass, isSecure } = getSmtpConfig(portOverride, secureOverride);

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    requireTLS: !isSecure, // Use STARTTLS if not port 465 SSL
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false
    }
  });
}

function getTransporter() {
  if (!transporter) {
    transporter = createSmtpTransporter();
    if (transporter) {
      const { host, port, user } = getSmtpConfig();
      console.log(`[EMAIL SERVICE] Configured SMTP Transport via ${host}:${port} (${user})`);
    } else {
      console.log('[EMAIL SERVICE] No live SMTP credentials found in environment. Running in preview/log mode.');
    }
  }
  return transporter;
}

/**
 * Diagnostic Verification Helper
 */
async function verifySmtpConnection() {
  const { host, user, pass } = getSmtpConfig();

  if (!user || !pass) {
    return {
      success: false,
      error: 'SMTP user or password missing in environment variables',
      config: { host, user: user ? `${user.substring(0, 3)}***` : 'NOT_SET' }
    };
  }

  // Attempt Port 465 (SSL)
  try {
    const transport465 = createSmtpTransporter(465, true);
    await transport465.verify();
    return {
      success: true,
      portUsed: 465,
      encryption: 'SSL',
      host,
      user: `${user.substring(0, 4)}***@${user.split('@')[1] || ''}`,
      message: 'SMTP connection verified successfully on port 465 (SSL)'
    };
  } catch (err465) {
    console.warn(`[EMAIL DIAGNOSTIC] Port 465 check failed (${err465.message}). Testing Port 587 (STARTTLS)...`);
    
    // Attempt Port 587 (STARTTLS)
    try {
      const transport587 = createSmtpTransporter(587, false);
      await transport587.verify();
      return {
        success: true,
        portUsed: 587,
        encryption: 'STARTTLS',
        host,
        user: `${user.substring(0, 4)}***@${user.split('@')[1] || ''}`,
        message: 'SMTP connection verified successfully on port 587 (STARTTLS) (Port 465 had: ' + err465.message + ')'
      };
    } catch (err587) {
      return {
        success: false,
        error: `SMTP connection failed on both ports. Port 465 error: ${err465.message} | Port 587 error: ${err587.message}`,
        config: { host, user: `${user.substring(0, 4)}***@${user.split('@')[1] || ''}` }
      };
    }
  }
}

/**
 * Base Email Layout - Clean, simple, easy-to-read template
 */
function createHtmlEmailLayout({ title, badgeText, badgeColor = '#1677FF', contentHtml, ctaText, ctaUrl, secondaryActions = [] }) {
  const currentYear = new Date().getFullYear();
  const defaultActions = [
    { label: 'Check MOT Status', url: 'https://multiplemot.co.uk' },
    { label: 'Find Local Garages', url: 'https://multiplemot.co.uk/garages' },
    { label: 'My Vehicles & Bookings', url: 'https://multiplemot.co.uk/portal' },
  ];
  const navActions = secondaryActions.length > 0 ? secondaryActions : defaultActions;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 0; color: #1E293B; }
    .wrapper { width: 100%; background-color: #F1F5F9; padding: 32px 16px; box-sizing: border-box; }
    .container { max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); }
    .header { background-color: #0B1F33; padding: 24px; text-align: center; border-bottom: 3px solid #1677FF; }
    .brand-title { font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.8px; margin: 0; text-transform: uppercase; }
    .brand-title span { color: #1677FF; }
    .brand-sub { font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-weight: 600; }
    .body { padding: 28px 24px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px; }
    .title { font-size: 19px; font-weight: 800; color: #0B1F33; margin: 0 0 12px 0; line-height: 1.4; }
    .text { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 12px 0; }
    .card-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #EDF2F7; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748B; font-weight: 600; }
    .info-val { color: #0B1F33; font-weight: 700; text-align: right; }
    .plate-badge { display: inline-block; background-color: #FFD200; color: #111827; font-family: 'Courier New', Courier, monospace, sans-serif; font-weight: 900; padding: 3px 8px; border-radius: 4px; border: 1.5px solid #111827; font-size: 13px; letter-spacing: 1.2px; }
    .btn-container { text-align: center; margin: 22px 0 14px 0; }
    .btn-primary { display: inline-block; background-color: #1677FF; color: #FFFFFF !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 12px 30px; border-radius: 8px; letter-spacing: 0.3px; }
    .app-nav-section { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; margin-top: 22px; }
    .app-nav-title { font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
    .app-nav-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .app-nav-link { display: inline-block; background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #0B1F33 !important; font-size: 12px; font-weight: 700; text-decoration: none; padding: 6px 12px; border-radius: 6px; }
    .notice-box { background-color: #EFF6FF; border-left: 4px solid #1677FF; border-radius: 0 8px 8px 0; padding: 12px 14px; margin: 14px 0; font-size: 13px; line-height: 1.5; color: #1E3A8A; }
    .notice-title { font-weight: 800; margin-bottom: 2px; }
    .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 20px; text-align: center; font-size: 11px; color: #64748B; line-height: 1.6; }
    .footer a { color: #1677FF; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">MULTIPLE MOT <span>UK</span></h1>
        <div class="brand-sub">UK MOT Reminders & Booking</div>
      </div>
      <div class="body">
        ${badgeText ? `<span class="badge" style="background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}35;">${badgeText}</span>` : ''}
        <h2 class="title">${title}</h2>
        ${contentHtml}
        
        ${ctaText && ctaUrl ? `
          <div class="btn-container">
            <a href="${ctaUrl}" class="btn-primary" target="_blank">${ctaText}</a>
          </div>
        ` : ''}

        <!-- Quick Links -->
        <div class="app-nav-section">
          <div class="app-nav-title">Quick Links</div>
          <div class="app-nav-grid">
            ${navActions.map(action => `<a href="${action.url}" class="app-nav-link" target="_blank">${action.label}</a>`).join('')}
          </div>
        </div>
      </div>
      <div class="footer">
        <p>This email was sent by Multiple MOT UK.<br>© ${currentYear} Multiple MOT UK. All rights reserved.</p>
        <p>Need help? Email us at <a href="mailto:support@multiplemot.co.uk">support@multiplemot.co.uk</a> or open your <a href="https://multiplemot.co.uk/portal">Account</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Universal Dispatcher
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    console.warn('[EMAIL SERVICE] Skipping dispatch: No recipient email provided.');
    return false;
  }

  const config = getSmtpConfig();
  const rawFromName = process.env.MAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Tech Trade IT Solutions';
  const fromName = rawFromName.replace(/"/g, '').trim();
  const fromAddress = process.env.MAIL_FROM_ADDRESS || config.user || 'noreply@techtradeitsolutions.com';
  const from = `"${fromName}" <${fromAddress}>`;

  const transport = getTransporter();

  if (transport) {
    try {
      const sendPromise = transport.sendMail({
        from,
        sender: fromAddress,
        to,
        subject,
        html,
        text: text || subject,
        envelope: {
          from: fromAddress,
          to: Array.isArray(to) ? to : [to]
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP Connection Timeout on primary port')), 12000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[EMAIL DISPATCHED VIA SMTP] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
      return true;
    } catch (err) {
      console.warn(`[EMAIL SMTP NOTICE] Direct SMTP delivery failed (${err.message}). Trying fallback SMTP (Port 587 STARTTLS)...`);
      
      // Fallback attempt with Port 587 STARTTLS
      try {
        const fallbackTransport = createSmtpTransporter(587, false);
        if (!fallbackTransport) {
          throw new Error('Fallback transporter could not be initialized');
        }

        const fallbackSendPromise = fallbackTransport.sendMail({
          from,
          sender: fromAddress,
          to,
          subject,
          html,
          text: text || subject,
          envelope: {
            from: fromAddress,
            to: Array.isArray(to) ? to : [to]
          }
        });

        const fallbackTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP Connection Timeout on fallback port 587')), 12000)
        );

        const fallbackInfo = await Promise.race([fallbackSendPromise, fallbackTimeoutPromise]);
        console.log(`[EMAIL DISPATCHED VIA FALLBACK 587] To: ${to} | Subject: "${subject}" | MessageId: ${fallbackInfo.messageId}`);
        return true;
      } catch (fallbackErr) {
        console.error(`[EMAIL SMTP ERROR] All SMTP dispatches failed for ${to}. Primary error: ${err.message} | Fallback error: ${fallbackErr.message}`);
        console.log(`\n======================================================`);
        console.log(`[EMAIL DISPATCH FAILED - RECORD LOGGED]`);
        console.log(`FROM:    ${from}`);
        console.log(`TO:      ${to}`);
        console.log(`SUBJECT: ${subject}`);
        console.log(`PREVIEW: ${text || subject}`);
        console.log(`======================================================\n`);
        return false;
      }
    }
  } else {
    console.warn(`[EMAIL SERVICE] No live SMTP credentials found in environment. Email not sent for: ${to}`);
    console.log(`\n======================================================`);
    console.log(`[EMAIL PREVIEW] (Add MAIL_USERNAME & MAIL_PASSWORD to .env for real delivery)`);
    console.log(`FROM:    ${from}`);
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`PREVIEW: ${text || subject}`);
    console.log(`======================================================\n`);
    return false;
  }
}

/**
 * Diagnostic Test Email Sender (returns detailed results for API inspection)
 */
async function sendDiagnosticTestEmail(toEmail = null) {
  const config = getSmtpConfig();
  const targetEmail = toEmail || process.env.SUPER_ADMIN_EMAIL || config.user || 'noreply@techtradeitsolutions.com';
  const timestamp = new Date().toISOString();

  const verifyRes = await verifySmtpConnection();
  if (!verifyRes.success) {
    return {
      success: false,
      stage: 'VERIFY_FAILED',
      verification: verifyRes,
      error: verifyRes.error
    };
  }

  const rawFromName = process.env.MAIL_FROM_NAME || 'Tech Trade IT Solutions';
  const fromName = rawFromName.replace(/"/g, '').trim();
  const fromAddress = process.env.MAIL_FROM_ADDRESS || config.user || 'noreply@techtradeitsolutions.com';
  const from = `"${fromName}" <${fromAddress}>`;

  const html = createHtmlEmailLayout({
    title: 'Multiple MOT UK - Email Test Successful',
    badgeText: 'Test Passed',
    badgeColor: '#059669',
    contentHtml: `
      <p class="text">This is a test email to confirm your email service is working properly.</p>
      <div class="card-box" style="border: 2px solid #059669;">
        <div class="info-row"><span class="info-label">Host:</span><span class="info-val">${verifyRes.host}</span></div>
        <div class="info-row"><span class="info-label">Port:</span><span class="info-val">Port ${verifyRes.portUsed} (${verifyRes.encryption})</span></div>
        <div class="info-row"><span class="info-label">Sent To:</span><span class="info-val">${targetEmail}</span></div>
        <div class="info-row"><span class="info-label">Time:</span><span class="info-val">${timestamp}</span></div>
      </div>
      <div class="notice-box">
        <div class="notice-title">Status: Ready</div>
        <div>All automated MOT reminders and booking emails are ready to send.</div>
      </div>
    `,
    ctaText: 'Open Motorist Portal',
    ctaUrl: 'https://multiplemot.co.uk/portal'
  });

  try {
    const transport = createSmtpTransporter(verifyRes.portUsed, verifyRes.encryption === 'SSL');
    const sendRes = await transport.sendMail({
      from,
      sender: fromAddress,
      to: targetEmail,
      subject: `[Test Email] Multiple MOT UK Email Service Verified (${timestamp})`,
      html,
      text: `Multiple MOT UK email test passed at ${timestamp}. Sent via ${verifyRes.host}:${verifyRes.portUsed} (${verifyRes.encryption})`,
      envelope: {
        from: fromAddress,
        to: [targetEmail]
      }
    });

    return {
      success: true,
      stage: 'SENT',
      messageId: sendRes.messageId,
      recipient: targetEmail,
      portUsed: verifyRes.portUsed,
      encryption: verifyRes.encryption,
      host: verifyRes.host,
      timestamp
    };
  } catch (sendErr) {
    return {
      success: false,
      stage: 'SEND_FAILED',
      verification: verifyRes,
      error: sendErr.message
    };
  }
}


// =========================================================================
// 1. ONBOARDING & AUTHENTICATION NOTIFICATIONS
// =========================================================================

async function sendCustomerWelcomeEmail(customer) {
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'there';
  const html = createHtmlEmailLayout({
    title: 'Welcome to Multiple MOT UK',
    badgeText: 'Account Created',
    badgeColor: '#059669',
    contentHtml: `
      <p class="text">Welcome to Multiple MOT UK, <strong>${customerName}</strong>! Your account is now active and ready to use.</p>
      <p class="text">You can now save your cars, get free MOT reminders before they expire, and book MOT tests with trusted local garages.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Name:</span><span class="info-val">${customerName}</span></div>
        <div class="info-row"><span class="info-label">Email:</span><span class="info-val">${customer.email}</span></div>
        <div class="info-row"><span class="info-label">MOT Reminders:</span><span class="info-val" style="color: #059669;">Active (45, 30, 15 & 7 days before expiry)</span></div>
      </div>
    `,
    ctaText: 'Go to My Account',
    ctaUrl: 'https://multiplemot.co.uk/portal',
    secondaryActions: [
      { label: 'Add a Car', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Find Local Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'Check MOT Date', url: 'https://multiplemot.co.uk' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: 'Welcome to Multiple MOT UK - Account Created',
    html,
    text: `Welcome to Multiple MOT UK, ${customerName}! Your account (${customer.email}) is ready and set up for free MOT reminders.`
  });
}

async function sendGarageRegistrationEmail(garage, ownerUser) {
  const garageName = garage.name || 'Your Garage';
  const ownerName = ownerUser?.username || 'Garage Manager';
  const html = createHtmlEmailLayout({
    title: 'Garage Sign-Up Received',
    badgeText: 'Under Review',
    badgeColor: '#D97706',
    contentHtml: `
      <p class="text">Hello <strong>${ownerName}</strong>, we have received your sign-up application for <strong>${garageName}</strong>.</p>
      <p class="text">Our team is reviewing your garage details. We will email you as soon as your account is approved and live on Multiple MOT UK.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Garage Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">VTS Number:</span><span class="info-val">${garage.vtsNumber || 'Provided'}</span></div>
        <div class="info-row"><span class="info-label">Location:</span><span class="info-val">${garage.city || 'UK'} (${garage.postcode || ''})</span></div>
        <div class="info-row"><span class="info-label">Status:</span><span class="info-val" style="color: #D97706; font-weight: 800;">Waiting for Review ⏳</span></div>
      </div>
    `,
    ctaText: 'Open Garage Portal',
    ctaUrl: 'https://multiplemot.co.uk/admin',
    secondaryActions: [
      { label: 'Garage Portal', url: 'https://multiplemot.co.uk/admin' },
      { label: 'Help & Support', url: 'mailto:support@multiplemot.co.uk' },
    ]
  });

  return sendEmail({
    to: garage.email || ownerUser?.email,
    subject: `[Application Received] ${garageName} - Multiple MOT UK`,
    html,
    text: `Hello ${ownerName}, we have received your application for ${garageName}. It is currently under review.`
  });
}

async function sendSuperAdminNewGarageAlert(garage) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@gmail.com';
  const garageName = garage.name || 'New MOT Station';
  const html = createHtmlEmailLayout({
    title: `New Garage Sign-Up: ${garageName}`,
    badgeText: 'Review Needed',
    badgeColor: '#DC2626',
    contentHtml: `
      <p class="text">A new garage, <strong>${garageName}</strong>, has just signed up and is waiting for your review and approval.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Garage Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Email:</span><span class="info-val">${garage.email || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Phone:</span><span class="info-val">${garage.phone || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">VTS Number:</span><span class="info-val">${garage.vtsNumber || 'See Docs'}</span></div>
        <div class="info-row"><span class="info-label">Location:</span><span class="info-val">${garage.city || ''} (${garage.postcode || ''})</span></div>
      </div>
    `,
    ctaText: 'Review Garage in Admin Panel',
    ctaUrl: 'https://multiplemot.co.uk/super-admin',
    secondaryActions: [
      { label: 'Admin Dashboard', url: 'https://multiplemot.co.uk/super-admin' },
    ]
  });

  return sendEmail({
    to: superAdminEmail,
    subject: `[Admin Alert] New Garage Sign-Up: ${garageName}`,
    html,
    text: `A new garage (${garageName}) has signed up on Multiple MOT UK and needs your review.`
  });
}

async function sendGarageStatusEmail(garage, status, reason = '') {
  const isApproved = status === 'Approved';
  const garageName = garage.name || 'Your Garage';
  const html = createHtmlEmailLayout({
    title: isApproved ? `Garage Approved: ${garageName}` : `Application Update: ${garageName}`,
    badgeText: isApproved ? 'Garage Live' : 'Application Update',
    badgeColor: isApproved ? '#059669' : '#DC2626',
    contentHtml: `
      <p class="text">
        ${isApproved 
          ? `Great news! Your garage <strong>${garageName}</strong> is approved and now active on Multiple MOT UK. Drivers can now find your garage and book MOT test slots online.` 
          : `We are sorry, but your garage application for <strong>${garageName}</strong> could not be approved at this time.`}
      </p>
      ${!isApproved && reason ? `
        <div class="card-box" style="border-left: 4px solid #DC2626;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Reason:</div>
          <div style="font-size: 13px; color: #334155;">${reason}</div>
        </div>
      ` : ''}
      <div class="card-box">
        <div class="info-row"><span class="info-label">Garage Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Status:</span><span class="info-val" style="color: ${isApproved ? '#059669' : '#DC2626'}; font-weight: 800;">${isApproved ? 'Approved & Live ✅' : 'Rejected ❌'}</span></div>
        <div class="info-row"><span class="info-label">Location:</span><span class="info-val">${garage.city || ''} (${garage.postcode || ''})</span></div>
      </div>
    `,
    ctaText: isApproved ? 'Go to Garage Dashboard' : 'Contact Support',
    ctaUrl: isApproved ? 'https://multiplemot.co.uk/admin' : 'mailto:support@multiplemot.co.uk',
    secondaryActions: [
      { label: 'Garage Dashboard', url: 'https://multiplemot.co.uk/admin' },
      { label: 'Help & Support', url: 'mailto:support@multiplemot.co.uk' },
    ]
  });

  return sendEmail({
    to: garage.email,
    subject: isApproved ? `[Approved] ${garageName} is live on Multiple MOT UK` : `[Update] Application for ${garageName}`,
    html,
    text: isApproved ? `Great news! Your garage ${garageName} is approved and live on Multiple MOT UK.` : `Your application for ${garageName} was not approved: ${reason}`
  });
}

// =========================================================================
// 2. MOT BOOKING LIFECYCLE NOTIFICATIONS
// =========================================================================

async function sendBookingRequestEmailCustomer(booking, customer, garage) {
  const reg = booking.registrationNumber || 'Vehicle';
  const makeModel = booking.makeModel || '';
  const garageName = garage?.name || 'Selected Garage';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Selected Date';
  const slotTime = booking.slotTime || 'Selected Slot';

  const html = createHtmlEmailLayout({
    title: 'MOT Booking Request Sent',
    badgeText: 'Waiting for Garage',
    badgeColor: '#D97706',
    contentHtml: `
      <p class="text">We received your MOT booking request for car <strong>${reg}</strong> at <strong>${garageName}</strong>.</p>
      <p class="text">The garage will review your request and confirm your time slot soon. We will email you as soon as they confirm.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Car:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${makeModel}</span></div>
        <div class="info-row"><span class="info-label">Garage:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Date:</span><span class="info-val">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Time:</span><span class="info-val">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Service:</span><span class="info-val">${booking.serviceName || 'MOT Test'} (£${booking.price || 45})</span></div>
      </div>
    `,
    ctaText: 'View My Bookings',
    ctaUrl: 'https://multiplemot.co.uk/portal',
    secondaryActions: [
      { label: 'My Bookings', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Find Garages', url: 'https://multiplemot.co.uk/garages' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `[Booking Request] MOT for ${reg} at ${garageName}`,
    html,
    text: `Your MOT booking request for ${reg} on ${bookingDate} at ${garageName} has been sent.`
  });
}

async function sendBookingRequestEmailGarage(booking, customer, garage) {
  const reg = booking.registrationNumber || 'Vehicle';
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || booking.customerName || 'Customer';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Selected Date';
  const slotTime = booking.slotTime || 'Selected Slot';

  const html = createHtmlEmailLayout({
    title: 'New MOT Booking Request',
    badgeText: 'Action Needed',
    badgeColor: '#1677FF',
    contentHtml: `
      <p class="text">You have a new MOT booking request for car <strong>${reg}</strong> on <strong>${bookingDate}</strong> at <strong>${slotTime}</strong>.</p>
      <p class="text">Please log in to your garage dashboard to accept this booking or propose a new time slot.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${customerName}</span></div>
        <div class="info-row"><span class="info-label">Phone Number:</span><span class="info-val">${customer.mobile || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Car:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">Requested Date:</span><span class="info-val">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Requested Time:</span><span class="info-val">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Service:</span><span class="info-val">${booking.serviceName || 'MOT Test'} (£${booking.price || 45})</span></div>
      </div>
    `,
    ctaText: 'Review & Accept Booking',
    ctaUrl: 'https://multiplemot.co.uk/admin',
    secondaryActions: [
      { label: 'Garage Bookings', url: 'https://multiplemot.co.uk/admin' },
      { label: 'Garage Calendar', url: 'https://multiplemot.co.uk/admin' },
    ]
  });

  return sendEmail({
    to: garage.email,
    subject: `[New Booking Request] MOT for ${reg} on ${bookingDate} (${slotTime})`,
    html,
    text: `New MOT booking request from ${customerName} for ${reg} on ${bookingDate} at ${slotTime}.`
  });
}

async function sendBookingConfirmedEmail(booking, customer, garage) {
  const reg = booking.registrationNumber || 'Vehicle';
  const garageName = garage?.name || 'Your Garage';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Selected Date';
  const slotTime = booking.slotTime || 'Selected Slot';

  const html = createHtmlEmailLayout({
    title: 'MOT Booking Confirmed',
    badgeText: 'Confirmed',
    badgeColor: '#059669',
    contentHtml: `
      <p class="text">Great news! Your MOT booking for <strong>${reg}</strong> at <strong>${garageName}</strong> is confirmed.</p>
      <div class="card-box" style="border: 2px solid #059669;">
        <div class="info-row"><span class="info-label">Car:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">Date:</span><span class="info-val" style="color: #059669; font-weight: 800;">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Time:</span><span class="info-val" style="color: #059669; font-weight: 800;">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Garage:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Address:</span><span class="info-val">${garage.address || ''}, ${garage.city || ''} (${garage.postcode || ''})</span></div>
        <div class="info-row"><span class="info-label">Phone:</span><span class="info-val">${garage.phone || 'N/A'}</span></div>
      </div>
      <div class="notice-box">
        <div class="notice-title">Helpful Tip</div>
        <div>Please try to arrive 10 minutes before your time slot. Bring your car log book (V5C) if you have it.</div>
      </div>
    `,
    ctaText: 'Get Driving Directions',
    ctaUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${garage.name} ${garage.address} ${garage.postcode}`)}`,
    secondaryActions: [
      { label: 'View in My Account', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Change Booking', url: 'https://multiplemot.co.uk/portal' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `[Confirmed] MOT for ${reg} at ${garageName} on ${bookingDate}`,
    html,
    text: `Your MOT appointment for ${reg} is confirmed at ${garageName} for ${bookingDate} at ${slotTime}.`
  });
}

async function sendBookingRejectedEmail(booking, customer, garage, reason = '') {
  const reg = booking.registrationNumber || 'Vehicle';
  const garageName = garage?.name || 'Selected Garage';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Selected Date';

  const html = createHtmlEmailLayout({
    title: 'MOT Booking Not Available',
    badgeText: 'Slot Not Available',
    badgeColor: '#DC2626',
    contentHtml: `
      <p class="text">Your MOT booking request for <strong>${reg}</strong> at <strong>${garageName}</strong> on <strong>${bookingDate}</strong> could not be accepted.</p>
      ${reason ? `
        <div class="card-box" style="border-left: 4px solid #DC2626;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Note from Garage:</div>
          <div style="font-size: 13px; color: #334155;">${reason}</div>
        </div>
      ` : ''}
      <p class="text">You can easily pick another time or choose a different local garage.</p>
    `,
    ctaText: 'Find Another Garage or Time',
    ctaUrl: 'https://multiplemot.co.uk/garages',
    secondaryActions: [
      { label: 'Find Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'My Account', url: 'https://multiplemot.co.uk/portal' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `[Not Available] MOT booking for ${reg} at ${garageName}`,
    html,
    text: `Your MOT booking for ${reg} on ${bookingDate} could not be confirmed by ${garageName}. ${reason ? `Reason: ${reason}` : ''}`
  });
}

async function sendBookingRescheduledEmailCustomer(booking, customer, garage, isApproved = false) {
  const reg = booking.registrationNumber || 'Vehicle';
  const garageName = garage?.name || 'Selected Garage';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Selected Date';
  const slotTime = booking.slotTime || (booking.makeModel && booking.makeModel.includes(' - Slot: ') ? booking.makeModel.split(' - Slot: ')[1] : 'Selected Slot');

  const html = createHtmlEmailLayout({
    title: isApproved ? 'MOT Booking Rescheduled' : 'Reschedule Request Sent',
    badgeText: isApproved ? 'New Time Confirmed' : 'Waiting for Garage',
    badgeColor: isApproved ? '#059669' : '#D97706',
    contentHtml: `
      <p class="text">
        ${isApproved 
          ? `Your MOT appointment for <strong>${reg}</strong> at <strong>${garageName}</strong> has been changed to a new date and time.` 
          : `Your request to change your MOT appointment for <strong>${reg}</strong> at <strong>${garageName}</strong> has been sent to the garage.`}
      </p>
      <div class="card-box" style="border: 2px solid ${isApproved ? '#059669' : '#D97706'};">
        <div class="info-row"><span class="info-label">Car:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">New Date:</span><span class="info-val" style="color: ${isApproved ? '#059669' : '#D97706'}; font-weight: 800;">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">New Time:</span><span class="info-val" style="color: ${isApproved ? '#059669' : '#D97706'}; font-weight: 800;">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Garage:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Address:</span><span class="info-val">${garage.address || ''}${garage.city ? `, ${garage.city}` : ''} (${garage.postcode || ''})</span></div>
      </div>
    `,
    ctaText: 'View in My Account',
    ctaUrl: 'https://multiplemot.co.uk/portal',
    secondaryActions: [
      { label: 'My Bookings', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Garage Details', url: 'https://multiplemot.co.uk/garages' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `[Rescheduled] MOT for ${reg} at ${garageName} (${bookingDate})`,
    html,
    text: `Your MOT appointment for ${reg} has been rescheduled to ${bookingDate} at ${slotTime} with ${garageName}.`
  });
}

async function sendBookingRescheduledEmailGarage(booking, customer, garage) {
  const reg = booking.registrationNumber || 'Vehicle';
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || booking.customerName || 'Customer';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Selected Date';
  const slotTime = booking.slotTime || (booking.makeModel && booking.makeModel.includes(' - Slot: ') ? booking.makeModel.split(' - Slot: ')[1] : 'Selected Slot');

  const html = createHtmlEmailLayout({
    title: 'MOT Booking Time Changed',
    badgeText: 'Time Changed',
    badgeColor: '#D97706',
    contentHtml: `
      <p class="text">The customer <strong>${customerName}</strong> has requested a new date/time for car <strong>${reg}</strong>.</p>
      <div class="card-box" style="border-left: 4px solid #D97706;">
        <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${customerName}</span></div>
        <div class="info-row"><span class="info-label">Phone Number:</span><span class="info-val">${customer.mobile || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Car:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">New Date:</span><span class="info-val" style="color: #D97706; font-weight: 800;">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">New Time Slot:</span><span class="info-val" style="color: #D97706; font-weight: 800;">${slotTime}</span></div>
      </div>
    `,
    ctaText: 'Open Garage Schedule',
    ctaUrl: 'https://multiplemot.co.uk/admin',
    secondaryActions: [
      { label: 'Garage Bookings', url: 'https://multiplemot.co.uk/admin' },
      { label: 'Garage Calendar', url: 'https://multiplemot.co.uk/admin' },
    ]
  });

  return sendEmail({
    to: garage.email,
    subject: `[Time Changed] MOT for ${reg} on ${bookingDate} (${slotTime})`,
    html,
    text: `Customer ${customerName} has changed their MOT for ${reg} to ${bookingDate} at ${slotTime}.`
  });
}

// =========================================================================
// 3. VEHICLE APPROVAL & REMINDER NOTIFICATIONS
// =========================================================================

async function sendVehiclePendingEmail(customer, vehicle) {
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'there';
  const reg = vehicle.registrationNumber || 'Vehicle';
  const makeModel = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';
  const motDateFormatted = vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB') : 'N/A';

  const html = createHtmlEmailLayout({
    title: `Car Added: ${reg}`,
    badgeText: 'Waiting for Approval',
    badgeColor: '#D97706',
    contentHtml: `
      <p class="text">Your car <strong>${reg}</strong> (${makeModel}) has been added to your account.</p>
      <p class="text">The garage is checking your car details. Once approved, your automatic MOT reminders will turn on.</p>
      <div class="card-box" style="border: 2px solid #D97706;">
        <div class="info-row"><span class="info-label">Number Plate:</span><span class="info-val"><span class="plate-badge">${reg}</span></span></div>
        <div class="info-row"><span class="info-label">Car Model:</span><span class="info-val">${makeModel}</span></div>
        <div class="info-row"><span class="info-label">MOT Expiry Date:</span><span class="info-val" style="color: #D97706; font-weight: 800;">${motDateFormatted}</span></div>
        <div class="info-row"><span class="info-label">Status:</span><span class="info-val" style="color: #D97706; font-weight: 800;">Waiting for Approval ⏳</span></div>
      </div>
    `,
    ctaText: 'View My Cars',
    ctaUrl: 'https://multiplemot.co.uk/portal',
    secondaryActions: [
      { label: 'My Cars', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Find Garages', url: 'https://multiplemot.co.uk/garages' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `[Car Added] ${reg} (${makeModel}) - Multiple MOT UK`,
    html,
    text: `Your car ${reg} (${makeModel}) has been added and is waiting for garage approval.`
  });
}

async function sendVehicleApprovalEmail(customer, vehicle, status = 'Approved', reason = '') {
  const isApproved = status === 'Approved' || status === 'Active';
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'there';
  const reg = vehicle.registrationNumber || 'Vehicle';
  const makeModel = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || vehicle.makeModel || 'Vehicle';
  const motDateFormatted = vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB') : 'N/A';

  const html = createHtmlEmailLayout({
    title: isApproved ? `Car Approved: ${reg}` : `Car Update: ${reg}`,
    badgeText: isApproved ? 'Car Approved' : 'Approval Issue',
    badgeColor: isApproved ? '#059669' : '#DC2626',
    contentHtml: `
      <p class="text">
        ${isApproved 
          ? `Great news! Your car <strong>${reg}</strong> (${makeModel}) has been <strong>approved</strong> on Multiple MOT UK.` 
          : `We are sorry, but your car <strong>${reg}</strong> could not be approved at this time.`}
      </p>
      ${!isApproved && reason ? `
        <div class="card-box" style="border-left: 4px solid #DC2626;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Reason:</div>
          <div style="font-size: 13px; color: #334155;">${reason}</div>
        </div>
      ` : ''}
      <div class="card-box" style="border: 2px solid ${isApproved ? '#059669' : '#DC2626'};">
        <div class="info-row"><span class="info-label">Number Plate:</span><span class="info-val"><span class="plate-badge">${reg}</span></span></div>
        <div class="info-row"><span class="info-label">Car Model:</span><span class="info-val">${makeModel}</span></div>
        <div class="info-row"><span class="info-label">MOT Expiry Date:</span><span class="info-val" style="color: ${isApproved ? '#059669' : '#DC2626'}; font-weight: 800;">${motDateFormatted}</span></div>
        <div class="info-row"><span class="info-label">Status:</span><span class="info-val" style="color: ${isApproved ? '#059669' : '#DC2626'}; font-weight: 800;">${isApproved ? 'Approved ✅' : 'Rejected ❌'}</span></div>
      </div>
      ${isApproved ? `
        <div class="notice-box">
          <div class="notice-title">Free MOT Reminders are On</div>
          <div>We will send you reminders at 45, 30, 15, and 7 days before your MOT expires so you never forget to renew.</div>
        </div>
      ` : ''}
    `,
    ctaText: isApproved ? 'Book an MOT Test' : 'Contact Support',
    ctaUrl: isApproved ? 'https://multiplemot.co.uk/portal' : 'mailto:support@multiplemot.co.uk',
    secondaryActions: [
      { label: 'Book MOT Test', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Find Garages', url: 'https://multiplemot.co.uk/garages' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: isApproved ? `[Approved] Car ${reg} (${makeModel}) - Multiple MOT UK` : `[Update] Car ${reg} Registration`,
    html,
    text: isApproved ? `Great news! Your car ${reg} (${makeModel}) is approved on Multiple MOT UK.` : `Your car ${reg} was not approved: ${reason}`
  });
}

async function sendMotDueReminderEmail(customer, vehicle, daysLeft, expiryDateFormatted, serviceLink, stage = '') {
  const reg = vehicle.registrationNumber || 'Vehicle';
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'there';
  const vehicleDesc = `${vehicle.make || ''} ${vehicle.model || ''}`.trim();

  let badgeText = 'MOT Reminder';
  let badgeColor = '#1677FF';
  let title = `MOT Due in ${daysLeft} Days: ${reg}`;
  let subject = `[MOT Due] ${reg} expires in ${daysLeft} days (${expiryDateFormatted})`;
  let openingSentence = `Reminder: Your MOT for <strong>${reg}</strong> (${vehicleDesc}) expires in <strong>${daysLeft} days</strong> on <strong>${expiryDateFormatted}</strong>.`;
  let tipHtml = `
    <div class="notice-box">
      <div class="notice-title">Good to Know</div>
      <div>You can test your car up to 1 month early without losing any days on your current certificate.</div>
    </div>
  `;

  if (daysLeft > 30) {
    // 45 Days Pre-Booking Alert
    badgeText = '45 Days to Expiry';
    badgeColor = '#1677FF';
    title = `Advance Notice: MOT Due in ${daysLeft} Days (${reg})`;
    subject = `[Advance Notice] ${reg} MOT expires in ${daysLeft} days (${expiryDateFormatted})`;
    openingSentence = `Reminder: Your MOT for <strong>${reg}</strong> (${vehicleDesc}) expires in <strong>${daysLeft} days</strong> on <strong>${expiryDateFormatted}</strong>. You can book your test slot early.`;
    tipHtml = `
      <div class="notice-box">
        <div class="notice-title">Plan Ahead</div>
        <div>Booking early lets you pick your preferred garage, date, and time before slots get booked up.</div>
      </div>
    `;
  } else if (daysLeft > 15) {
    // 30 Days Early Renewal Window Opened
    badgeText = 'Early Renewal Window Open';
    badgeColor = '#D97706';
    title = `MOT Due in ${daysLeft} Days (${reg})`;
    subject = `[MOT Due in 30 Days] ${reg} expires on ${expiryDateFormatted} - Book Now`;
    openingSentence = `Reminder: Your MOT for <strong>${reg}</strong> (${vehicleDesc}) expires in <strong>${daysLeft} days</strong> on <strong>${expiryDateFormatted}</strong>. Your 30-day early renewal window is now open!`;
    tipHtml = `
      <div class="notice-box">
        <div class="notice-title">Keep Your MOT Date</div>
        <div>You can get your MOT test done today and still keep your same annual renewal date.</div>
      </div>
    `;
  } else if (daysLeft > 7) {
    // 15 Days Reminder
    badgeText = '15 Days Remaining';
    badgeColor = '#EA580C';
    title = `Important: MOT Due in ${daysLeft} Days (${reg})`;
    subject = `[Important] ${reg} MOT expires in ${daysLeft} days (${expiryDateFormatted})`;
    openingSentence = `Important: Your MOT for <strong>${reg}</strong> (${vehicleDesc}) expires in <strong>${daysLeft} days</strong> on <strong>${expiryDateFormatted}</strong>. Please book soon.`;
    tipHtml = `
      <div class="notice-box" style="border-left-color: #EA580C; background-color: #FFF7ED; color: #9A3412;">
        <div class="notice-title">Book Before Slots Fill Up</div>
        <div>Local garages get busy quickly. Book now to keep your car safe and legal on the road.</div>
      </div>
    `;
  } else if (daysLeft >= 0) {
    // 7 Days / Final Week Reminder
    badgeText = 'Final Reminder - Urgent';
    badgeColor = '#DC2626';
    title = `Final Reminder: MOT Expires in ${daysLeft} Days (${reg})`;
    subject = `[FINAL REMINDER] ${reg} MOT expires in ${daysLeft} days (${expiryDateFormatted})`;
    openingSentence = `Urgent: Your MOT for <strong>${reg}</strong> (${vehicleDesc}) expires in <strong>${daysLeft} days</strong> on <strong>${expiryDateFormatted}</strong>. Please book today.`;
    tipHtml = `
      <div class="notice-box" style="border-left-color: #DC2626; background-color: #FEF2F2; color: #991B1B;">
        <div class="notice-title">Action Needed Today</div>
        <div>It is illegal to drive in the UK without a valid MOT, and it can cancel your car insurance.</div>
      </div>
    `;
  } else {
    // Expired
    badgeText = 'MOT Expired';
    badgeColor = '#991B1B';
    title = `MOT Expired: ${reg}`;
    subject = `[EXPIRED] MOT for ${reg} has expired (${expiryDateFormatted})`;
    openingSentence = `Urgent: Your MOT for <strong>${reg}</strong> (${vehicleDesc}) expired on <strong>${expiryDateFormatted}</strong>. Please book a test immediately.`;
    tipHtml = `
      <div class="notice-box" style="border-left-color: #991B1B; background-color: #FEF2F2; color: #991B1B;">
        <div class="notice-title">Do Not Drive on the Road</div>
        <div>It is illegal to drive this car on public roads unless you are driving directly to a pre-booked MOT test.</div>
      </div>
    `;
  }

  const html = createHtmlEmailLayout({
    title,
    badgeText,
    badgeColor,
    contentHtml: `
      <p class="text">${openingSentence}</p>
      <div class="card-box" style="border: 2px solid ${badgeColor};">
        <div class="info-row"><span class="info-label">Number Plate:</span><span class="info-val"><span class="plate-badge">${reg}</span></span></div>
        <div class="info-row"><span class="info-label">Car Model:</span><span class="info-val">${vehicleDesc}</span></div>
        <div class="info-row"><span class="info-label">MOT Expiry Date:</span><span class="info-val" style="color: ${badgeColor}; font-size: 14px; font-weight: 800;">${expiryDateFormatted}</span></div>
        <div class="info-row"><span class="info-label">Time Left:</span><span class="info-val" style="color: ${badgeColor}; font-weight: 800;">${daysLeft >= 0 ? `${daysLeft} Days Left` : `Expired (${Math.abs(daysLeft)} days ago)`}</span></div>
      </div>
      ${tipHtml}
    `,
    ctaText: daysLeft < 0 ? 'Book Urgent MOT Test' : 'Book MOT Test Now',
    ctaUrl: serviceLink || 'https://multiplemot.co.uk/garages',
    secondaryActions: [
      { label: 'Book MOT Test', url: serviceLink || 'https://multiplemot.co.uk/portal' },
      { label: 'Find Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'My Cars', url: 'https://multiplemot.co.uk/portal' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject,
    html,
    text: `Reminder: Your MOT for ${reg} (${vehicleDesc}) expires on ${expiryDateFormatted} (${daysLeft >= 0 ? `${daysLeft} days left` : 'EXPIRED'}). Book your test: ${serviceLink || 'https://multiplemot.co.uk'}`
  });
}

module.exports = {
  sendEmail,
  verifySmtpConnection,
  sendDiagnosticTestEmail,
  getTransporter,
  sendCustomerWelcomeEmail,
  sendGarageRegistrationEmail,
  sendSuperAdminNewGarageAlert,
  sendGarageStatusEmail,
  sendBookingRequestEmailCustomer,
  sendBookingRequestEmailGarage,
  sendBookingRescheduledEmailCustomer,
  sendBookingRescheduledEmailGarage,
  sendBookingConfirmedEmail,
  sendBookingRejectedEmail,
  sendVehiclePendingEmail,
  sendVehicleApprovalEmail,
  sendMotDueReminderEmail
};
