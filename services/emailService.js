const nodemailer = require('nodemailer');

// Initialize Transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.MAIL_HOST || process.env.EMAIL_HOST || 'smtp.hostinger.com';
    const port = parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT || '465', 10);
    const user = (process.env.MAIL_USERNAME || process.env.EMAIL_USER || '').trim();
    const pass = (process.env.MAIL_PASSWORD || process.env.EMAIL_PASS || '').trim();
    const isSecure = process.env.MAIL_ENCRYPTION === 'ssl' || process.env.EMAIL_SECURE === 'true' || port === 465;

    if (user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: { rejectUnauthorized: false }
      });
      console.log(`[EMAIL SERVICE] Configured SMTP Transport via ${host}:${port} (${user})`);
    } else {
      console.log('[EMAIL SERVICE] No live SMTP credentials found in .env. Running in preview/log mode.');
    }
  }
  return transporter;
}

/**
 * Base Email Layout - Clean, professional, UK-automotive enterprise template
 */
function createHtmlEmailLayout({ title, badgeText, badgeColor = '#1677FF', contentHtml, ctaText, ctaUrl, secondaryActions = [] }) {
  const currentYear = new Date().getFullYear();
  const defaultActions = [
    { label: 'Check Vehicle MOT', url: 'https://multiplemot.co.uk' },
    { label: 'Find Approved Garages', url: 'https://multiplemot.co.uk/garages' },
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
    .header { background-color: #0B1F33; padding: 26px 24px; text-align: center; border-bottom: 3px solid #1677FF; }
    .brand-title { font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.8px; margin: 0; text-transform: uppercase; }
    .brand-title span { color: #1677FF; }
    .brand-sub { font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px; font-weight: 600; }
    .body { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; }
    .title { font-size: 19px; font-weight: 800; color: #0B1F33; margin: 0 0 14px 0; line-height: 1.4; }
    .text { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 14px 0; }
    .card-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 18px; margin: 18px 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #EDF2F7; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748B; font-weight: 600; }
    .info-val { color: #0B1F33; font-weight: 700; text-align: right; }
    .plate-badge { display: inline-block; background-color: #FFD200; color: #111827; font-family: 'Courier New', Courier, monospace, sans-serif; font-weight: 900; padding: 3px 10px; border-radius: 4px; border: 1.5px solid #111827; font-size: 13px; letter-spacing: 1.2px; }
    .btn-container { text-align: center; margin: 24px 0 16px 0; }
    .btn-primary { display: inline-block; background-color: #1677FF; color: #FFFFFF !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 13px 32px; border-radius: 8px; letter-spacing: 0.3px; }
    .app-nav-section { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-top: 24px; }
    .app-nav-title { font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
    .app-nav-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .app-nav-link { display: inline-block; background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #0B1F33 !important; font-size: 12px; font-weight: 700; text-decoration: none; padding: 7px 14px; border-radius: 6px; }
    .notice-box { background-color: #EFF6FF; border-left: 4px solid #1677FF; border-radius: 0 8px 8px 0; padding: 12px 14px; margin: 16px 0; font-size: 13px; line-height: 1.5; color: #1E3A8A; }
    .notice-title { font-weight: 800; margin-bottom: 2px; }
    .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748B; line-height: 1.6; }
    .footer a { color: #1677FF; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">MULTIPLE MOT <span>UK</span></h1>
        <div class="brand-sub">DVSA Certified MOT Testing & Reminder Network</div>
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

        <!-- Direct App Navigation Links -->
        <div class="app-nav-section">
          <div class="app-nav-title">Quick App Navigation</div>
          <div class="app-nav-grid">
            ${navActions.map(action => `<a href="${action.url}" class="app-nav-link" target="_blank">${action.label}</a>`).join('')}
          </div>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated operational notification from Multiple MOT UK.<br>© ${currentYear} Multiple MOT Network. Operating in compliance with DVSA testing standards.</p>
        <p>Need assistance? Contact support at <a href="mailto:support@multiplemot.co.uk">support@multiplemot.co.uk</a> or manage your notifications in the <a href="https://multiplemot.co.uk/portal">Motorist Portal</a>.</p>
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

  const transport = getTransporter();
  const fromName = process.env.MAIL_FROM_NAME || 'Tech Trade IT Solutions';
  const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@techtradeitsolutions.com';
  const from = process.env.EMAIL_FROM || `"${fromName}" <${fromAddress}>`;

  if (transport) {
    try {
      // 4-second timeout race to prevent hanging if SMTP ports are blocked by firewall
      const sendPromise = transport.sendMail({
        from,
        to,
        subject,
        html,
        text: text || subject
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP Connection Timeout (Outbound port blocked by network)')), 4000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[EMAIL DISPATCHED VIA SMTP] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
      return true;
    } catch (err) {
      console.warn(`[EMAIL SMTP NOTICE] Direct SMTP delivery note (${err.message}). Logging formatted email preview:`);
      console.log(`\n======================================================`);
      console.log(`[EMAIL DISPATCH RECORD]`);
      console.log(`FROM:    ${from}`);
      console.log(`TO:      ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`PREVIEW: ${text || subject}`);
      console.log(`======================================================\n`);
      return true;
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[EMAIL PREVIEW] (Add EMAIL_USER & EMAIL_PASS to .env for real delivery)`);
    console.log(`FROM:    ${from}`);
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`PREVIEW: ${text || subject}`);
    console.log(`======================================================\n`);
    return true;
  }
}


// =========================================================================
// 1. ONBOARDING & AUTHENTICATION NOTIFICATIONS
// =========================================================================

async function sendCustomerWelcomeEmail(customer) {
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Valued Motorist';
  const html = createHtmlEmailLayout({
    title: `Welcome to Multiple MOT UK, ${customerName}`,
    badgeText: 'Account Verified',
    badgeColor: '#059669',
    contentHtml: `
      <p class="text">Thank you for registering with Multiple MOT UK, the premier platform for automated MOT monitoring, early renewal management, and certified test bookings.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Account Name:</span><span class="info-val">${customerName}</span></div>
        <div class="info-row"><span class="info-label">Registered Email:</span><span class="info-val">${customer.email}</span></div>
        <div class="info-row"><span class="info-label">Alert Channel:</span><span class="info-val">${customer.preferredContact || 'Email'}</span></div>
      </div>
      <div class="notice-box">
        <div class="notice-title">Automated Expiry Alerts Active</div>
        <div>Your vehicles will now receive scheduled renewal reminders at 45, 30, 15, and 7 days prior to MOT expiry.</div>
      </div>
    `,
    ctaText: 'Open Motorist Portal',
    ctaUrl: 'https://multiplemot.co.uk/portal',
    secondaryActions: [
      { label: 'Register a Vehicle', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Find Approved Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'Check MOT History', url: 'https://multiplemot.co.uk' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: 'Welcome to Multiple MOT UK - Account Confirmation',
    html,
    text: `Welcome to Multiple MOT UK, ${customerName}. Your account (${customer.email}) is active and configured for automated MOT reminders.`
  });
}

async function sendGarageRegistrationEmail(garage, ownerUser) {
  const garageName = garage.name || 'Your Garage';
  const ownerName = ownerUser?.username || 'Garage Manager';
  const html = createHtmlEmailLayout({
    title: `Application Received: ${garageName}`,
    badgeText: 'Under Verification',
    badgeColor: '#D97706',
    contentHtml: `
      <p class="text">Dear ${ownerName},</p>
      <p class="text">Thank you for registering <strong>${garageName}</strong> on the Multiple MOT UK testing network. Your application is currently under compliance review.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Garage Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">VTS Number:</span><span class="info-val">${garage.vtsNumber || 'Provided in documents'}</span></div>
        <div class="info-row"><span class="info-label">Location:</span><span class="info-val">${garage.city || 'United Kingdom'} (${garage.postcode || ''})</span></div>
        <div class="info-row"><span class="info-label">Verification:</span><span class="info-val" style="color: #D97706;">Pending Compliance Audit</span></div>
      </div>
      <p class="text">Our compliance team is verifying your testing station credentials. You will receive an email confirmation as soon as your account is activated.</p>
    `,
    ctaText: 'Access Garage Dashboard',
    ctaUrl: 'https://multiplemot.co.uk/admin',
    secondaryActions: [
      { label: 'Garage Portal', url: 'https://multiplemot.co.uk/admin' },
      { label: 'Contact Support', url: 'mailto:support@multiplemot.co.uk' },
    ]
  });

  return sendEmail({
    to: garage.email || ownerUser?.email,
    subject: `Garage Registration Received: ${garageName}`,
    html,
    text: `Your garage registration for ${garageName} has been received and is pending compliance audit.`
  });
}

async function sendSuperAdminNewGarageAlert(garage) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@gmail.com';
  const garageName = garage.name || 'New MOT Station';
  const html = createHtmlEmailLayout({
    title: `New Station Application: ${garageName}`,
    badgeText: 'Admin Action Required',
    badgeColor: '#DC2626',
    contentHtml: `
      <p class="text">A new vehicle testing station has submitted registration documents and is waiting for compliance authorization.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Station Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Contact Email:</span><span class="info-val">${garage.email || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Phone:</span><span class="info-val">${garage.phone || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">VTS Identifier:</span><span class="info-val">${garage.vtsNumber || 'See Uploaded Docs'}</span></div>
        <div class="info-row"><span class="info-label">Address:</span><span class="info-val">${garage.address || ''} ${garage.city || ''} (${garage.postcode || ''})</span></div>
      </div>
    `,
    ctaText: 'Review Garage Application',
    ctaUrl: 'https://multiplemot.co.uk/super-admin',
    secondaryActions: [
      { label: 'Super Admin Console', url: 'https://multiplemot.co.uk/super-admin' },
      { label: 'Pending Queue', url: 'https://multiplemot.co.uk/super-admin' },
    ]
  });

  return sendEmail({
    to: superAdminEmail,
    subject: `[Admin Alert] New Garage Registration: ${garageName}`,
    html,
    text: `A new garage (${garageName}) has registered and requires compliance review.`
  });
}

async function sendGarageStatusEmail(garage, status, reason = '') {
  const isApproved = status === 'Approved';
  const garageName = garage.name || 'Your Garage';
  const html = createHtmlEmailLayout({
    title: isApproved ? `Station Approved: ${garageName}` : `Application Update: ${garageName}`,
    badgeText: isApproved ? 'Station Live' : 'Application Unsuccessful',
    badgeColor: isApproved ? '#059669' : '#DC2626',
    contentHtml: `
      <p class="text">
        ${isApproved 
          ? `Your MOT testing station <strong>${garageName}</strong> has been verified and activated on Multiple MOT UK. Motorists can now view your testing bays and book appointment slots.` 
          : `Your registration application for <strong>${garageName}</strong> could not be approved at this time.`}
      </p>
      ${!isApproved && reason ? `
        <div class="card-box" style="border-left: 4px solid #DC2626;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Reason for Decision:</div>
          <div style="font-size: 13px; color: #334155;">${reason}</div>
        </div>
      ` : ''}
      <div class="card-box">
        <div class="info-row"><span class="info-label">Station Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Status:</span><span class="info-val" style="color: ${isApproved ? '#059669' : '#DC2626'};">${status}</span></div>
        <div class="info-row"><span class="info-label">Location:</span><span class="info-val">${garage.city || ''} (${garage.postcode || ''})</span></div>
      </div>
    `,
    ctaText: isApproved ? 'Open Garage Dashboard' : 'Contact Support',
    ctaUrl: isApproved ? 'https://multiplemot.co.uk/admin' : 'mailto:support@multiplemot.co.uk',
    secondaryActions: [
      { label: 'Garage Dashboard', url: 'https://multiplemot.co.uk/admin' },
      { label: 'Manage Slot Schedule', url: 'https://multiplemot.co.uk/admin' },
    ]
  });

  return sendEmail({
    to: garage.email,
    subject: isApproved ? `[Approved] ${garageName} is now active on Multiple MOT UK` : `[Application Update] ${garageName}`,
    html,
    text: isApproved ? `Your garage ${garageName} has been approved and is active.` : `Your garage application for ${garageName} was not approved: ${reason}`
  });
}

// =========================================================================
// 2. MOT BOOKING LIFECYCLE NOTIFICATIONS
// =========================================================================

async function sendBookingRequestEmailCustomer(booking, customer, garage) {
  const reg = booking.registrationNumber || 'Vehicle';
  const makeModel = booking.makeModel || '';
  const garageName = garage?.name || 'Selected Garage';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Scheduled Date';
  const slotTime = booking.slotTime || 'Selected Slot';

  const html = createHtmlEmailLayout({
    title: 'MOT Booking Request Logged',
    badgeText: 'Awaiting Garage Confirmation',
    badgeColor: '#D97706',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text">Your MOT appointment request has been submitted to <strong>${garageName}</strong>. The testing station staff will review and confirm your reserved slot shortly.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Vehicle Registration:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${makeModel}</span></div>
        <div class="info-row"><span class="info-label">Testing Station:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Requested Date:</span><span class="info-val">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Slot Time:</span><span class="info-val">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Service Fee:</span><span class="info-val">${booking.serviceName || 'MOT Test'} (£${booking.price || 45})</span></div>
      </div>
      <p class="text">You will receive an instant email confirmation as soon as the station accepts your booking.</p>
    `,
    ctaText: 'View My Bookings',
    ctaUrl: 'https://multiplemot.co.uk/portal',
    secondaryActions: [
      { label: 'My Bookings History', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Find Other Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'Vehicle Dashboard', url: 'https://multiplemot.co.uk/portal' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `Booking Request: MOT for ${reg} at ${garageName}`,
    html,
    text: `Your MOT booking request for ${reg} on ${bookingDate} at ${garageName} has been submitted.`
  });
}

async function sendBookingRequestEmailGarage(booking, customer, garage) {
  const reg = booking.registrationNumber || 'Vehicle';
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || booking.customerName || 'Customer';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Scheduled Date';
  const slotTime = booking.slotTime || 'Selected Slot';

  const html = createHtmlEmailLayout({
    title: 'New MOT Appointment Request',
    badgeText: 'Action Required',
    badgeColor: '#1677FF',
    contentHtml: `
      <p class="text">A new MOT booking request has been submitted for your testing bays.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Motorist:</span><span class="info-val">${customerName}</span></div>
        <div class="info-row"><span class="info-label">Contact Number:</span><span class="info-val">${customer.mobile || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Vehicle Mark:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">Requested Date:</span><span class="info-val">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Requested Slot:</span><span class="info-val">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Service Type:</span><span class="info-val">${booking.serviceName || 'MOT Test'}</span></div>
      </div>
      <p class="text">Please confirm or reschedule this booking in your garage management console.</p>
    `,
    ctaText: 'Review in Garage Portal',
    ctaUrl: 'https://multiplemot.co.uk/admin',
    secondaryActions: [
      { label: 'Confirm Appointment', url: 'https://multiplemot.co.uk/admin' },
      { label: 'Garage Calendar', url: 'https://multiplemot.co.uk/admin' },
    ]
  });

  return sendEmail({
    to: garage.email,
    subject: `[Booking Request] MOT for ${reg} on ${bookingDate} (${slotTime})`,
    html,
    text: `New MOT booking request from ${customerName} for ${reg} on ${bookingDate} at ${slotTime}.`
  });
}

async function sendBookingConfirmedEmail(booking, customer, garage) {
  const reg = booking.registrationNumber || 'Vehicle';
  const garageName = garage?.name || 'Your Garage';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Scheduled Date';
  const slotTime = booking.slotTime || 'Selected Slot';

  const html = createHtmlEmailLayout({
    title: 'MOT Appointment Confirmed',
    badgeText: 'Booking Confirmed',
    badgeColor: '#059669',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text">Your MOT appointment with <strong>${garageName}</strong> has been confirmed.</p>
      <div class="card-box" style="border: 2px solid #059669;">
        <div class="info-row"><span class="info-label">Vehicle Registration:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">Appointment Date:</span><span class="info-val" style="color: #059669; font-size: 14px;">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Confirmed Slot:</span><span class="info-val" style="color: #059669; font-size: 14px;">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Testing Station:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Station Address:</span><span class="info-val">${garage.address || ''}, ${garage.city || ''} (${garage.postcode || ''})</span></div>
        <div class="info-row"><span class="info-label">Station Telephone:</span><span class="info-val">${garage.phone || 'N/A'}</span></div>
      </div>
      <div class="notice-box">
        <div class="notice-title">Arrival Instructions</div>
        <div>Please arrive at least 10 minutes prior to your testing slot. Bring your vehicle registration document (V5C) if available.</div>
      </div>
    `,
    ctaText: 'View Driving Directions',
    ctaUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${garage.name} ${garage.address} ${garage.postcode}`)}`,
    secondaryActions: [
      { label: 'View in My Portal', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Reschedule Slot', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Approved Garages', url: 'https://multiplemot.co.uk/garages' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `Confirmed: MOT for ${reg} at ${garageName} on ${bookingDate}`,
    html,
    text: `Your MOT appointment for ${reg} has been confirmed at ${garageName} for ${bookingDate} at ${slotTime}.`
  });
}

async function sendBookingRejectedEmail(booking, customer, garage, reason = '') {
  const reg = booking.registrationNumber || 'Vehicle';
  const garageName = garage?.name || 'Selected Garage';
  const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'Scheduled Date';

  const html = createHtmlEmailLayout({
    title: 'MOT Booking Update: Slot Unavailable',
    badgeText: 'Slot Cancelled',
    badgeColor: '#DC2626',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text"><strong>${garageName}</strong> was unable to accommodate your MOT booking request for <strong>${reg}</strong> on ${bookingDate}.</p>
      ${reason ? `
        <div class="card-box" style="border-left: 4px solid #DC2626;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Station Note:</div>
          <div style="font-size: 13px; color: #334155;">${reason}</div>
        </div>
      ` : ''}
      <p class="text">You can select another available slot or choose from certified alternative garages in your area.</p>
    `,
    ctaText: 'Browse Available Slots',
    ctaUrl: 'https://multiplemot.co.uk/garages',
    secondaryActions: [
      { label: 'Find Nearby Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'My Vehicles', url: 'https://multiplemot.co.uk/portal' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: `Update on MOT Booking for ${reg} at ${garageName}`,
    html,
    text: `Your MOT booking for ${reg} on ${bookingDate} could not be confirmed by ${garageName}. ${reason ? `Reason: ${reason}` : ''}`
  });
}

// =========================================================================
// 3. VEHICLE APPROVAL & REMINDER NOTIFICATIONS
// =========================================================================

async function sendVehicleApprovalEmail(customer, vehicle, status, reason = '') {
  const isApproved = status === 'Approved' || status === 'Active';
  const reg = vehicle.registrationNumber || 'Vehicle';

  const html = createHtmlEmailLayout({
    title: isApproved ? `Vehicle Verified: ${reg}` : `Vehicle Status: ${reg}`,
    badgeText: isApproved ? 'Vehicle Active' : 'Verification Issue',
    badgeColor: isApproved ? '#059669' : '#DC2626',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text">
        ${isApproved 
          ? `Your vehicle <span class="plate-badge">${reg}</span> (${vehicle.make || ''} ${vehicle.model || ''}) has been verified and registered on your motorist account.` 
          : `Your vehicle registration request for <span class="plate-badge">${reg}</span> could not be verified.`}
      </p>
      ${!isApproved && reason ? `
        <div class="card-box" style="border-left: 4px solid #DC2626;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Reason:</div>
          <div style="font-size: 13px; color: #334155;">${reason}</div>
        </div>
      ` : ''}
      <div class="card-box">
        <div class="info-row"><span class="info-label">Registration Mark:</span><span class="info-val"><span class="plate-badge">${reg}</span></span></div>
        <div class="info-row"><span class="info-label">Make & Model:</span><span class="info-val">${vehicle.make || ''} ${vehicle.model || ''}</span></div>
        <div class="info-row"><span class="info-label">MOT Expiry Date:</span><span class="info-val">${vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB') : 'N/A'}</span></div>
      </div>
    `,
    ctaText: 'Manage Vehicle in Portal',
    ctaUrl: 'https://multiplemot.co.uk/portal',
    secondaryActions: [
      { label: 'Book MOT Test', url: 'https://multiplemot.co.uk/portal' },
      { label: 'Find Approved Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'Check MOT History', url: 'https://multiplemot.co.uk' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject: isApproved ? `Vehicle Verified: ${reg} (${vehicle.make || ''} ${vehicle.model || ''})` : `Vehicle Status Update: ${reg}`,
    html,
    text: isApproved ? `Your vehicle ${reg} has been verified.` : `Your vehicle ${reg} was not verified: ${reason}`
  });
}

async function sendMotDueReminderEmail(customer, vehicle, daysLeft, expiryDateFormatted, serviceLink, stage = '') {
  const reg = vehicle.registrationNumber || 'Vehicle';
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Motorist';
  const vehicleDesc = `${vehicle.make || ''} ${vehicle.model || ''}`.trim();

  let badgeText = 'DVSA Renewal Reminder';
  let badgeColor = '#1677FF';
  let title = `MOT Due in ${daysLeft} Days: ${reg}`;
  let subject = `MOT Reminder: ${reg} expires in ${daysLeft} days (${expiryDateFormatted})`;
  let tipHtml = `
    <div class="notice-box">
      <div class="notice-title">DVSA 30-Day Early Renewal Framework</div>
      <div>You can test your vehicle up to one month (minus a day) before the expiry date and preserve your renewal anniversary date.</div>
    </div>
  `;

  if (daysLeft > 30) {
    // 45 Days Pre-Booking Alert
    badgeText = '45-Day Advance Notice';
    badgeColor = '#1677FF';
    title = `Advance Notice: MOT Due in ${daysLeft} Days (${reg})`;
    subject = `Advance Alert: ${reg} MOT expires on ${expiryDateFormatted} (${daysLeft} days left)`;
    tipHtml = `
      <div class="notice-box">
        <div class="notice-title">Pre-Booking Available</div>
        <div>You can plan ahead and reserve your test slot now. Selecting a slot within the 30-day window ensures you secure your preferred garage while keeping your annual anniversary date.</div>
      </div>
    `;
  } else if (daysLeft > 15) {
    // 30 Days DVSA Window Opened
    badgeText = 'DVSA 30-Day Window Open';
    badgeColor = '#D97706';
    title = `30 Days Remaining: MOT Renewal Window Active (${reg})`;
    subject = `30-Day Notice: MOT for ${reg} expires on ${expiryDateFormatted} (Book Now)`;
    tipHtml = `
      <div class="notice-box">
        <div class="notice-title">Official Early Renewal Window Open</div>
        <div>Your vehicle is now eligible for early MOT renewal without losing any days on your existing certificate.</div>
      </div>
    `;
  } else if (daysLeft > 7) {
    // 15 Days Reminder
    badgeText = '15-Day Urgent Notice';
    badgeColor = '#EA580C';
    title = `Urgent Notice: MOT Expires in ${daysLeft} Days (${reg})`;
    subject = `Urgent 15-Day Alert: ${reg} MOT expires on ${expiryDateFormatted}`;
    tipHtml = `
      <div class="notice-box" style="border-left-color: #EA580C; background-color: #FFF7ED; color: #9A3412;">
        <div class="notice-title">Avoid Booking Delays</div>
        <div>Testing stations often fill slots days in advance. We recommend booking your MOT test now to ensure valid certification.</div>
      </div>
    `;
  } else if (daysLeft >= 0) {
    // 7 Days / Final Week Reminder
    badgeText = 'Final Notice - 7 Days Remaining';
    badgeColor = '#DC2626';
    title = `Final Notice: MOT Expires in ${daysLeft} Days (${reg})`;
    subject = `Final Notice: ${reg} MOT expires on ${expiryDateFormatted} (${daysLeft} days left)`;
    tipHtml = `
      <div class="notice-box" style="border-left-color: #DC2626; background-color: #FEF2F2; color: #991B1B;">
        <div class="notice-title">Immediate Action Required</div>
        <div>Driving on UK roads without a valid MOT certificate is unlawful and may invalidate your motor insurance.</div>
      </div>
    `;
  } else {
    // Expired
    badgeText = 'Certificate Expired';
    badgeColor = '#991B1B';
    title = `Expired: MOT Certificate Lapsed for ${reg}`;
    subject = `Urgent Notice: MOT for ${reg} has EXPIRED (${expiryDateFormatted})`;
    tipHtml = `
      <div class="notice-box" style="border-left-color: #991B1B; background-color: #FEF2F2; color: #991B1B;">
        <div class="notice-title">Uncertified Vehicle Warning</div>
        <div>It is illegal to drive an uncertified vehicle on public roads except when driving directly to a pre-booked MOT test appointment.</div>
      </div>
    `;
  }

  const html = createHtmlEmailLayout({
    title,
    badgeText,
    badgeColor,
    contentHtml: `
      <p class="text">Dear ${customerName},</p>
      <p class="text">This is an automated MOT status notification for your registered vehicle <strong>${vehicleDesc}</strong> (<span class="plate-badge">${reg}</span>).</p>
      <div class="card-box" style="border: 2px solid ${badgeColor};">
        <div class="info-row"><span class="info-label">Registration Mark:</span><span class="info-val"><span class="plate-badge">${reg}</span></span></div>
        <div class="info-row"><span class="info-label">Vehicle Make & Model:</span><span class="info-val">${vehicleDesc}</span></div>
        <div class="info-row"><span class="info-label">MOT Expiry Date:</span><span class="info-val" style="color: ${badgeColor}; font-size: 14px; font-weight: 800;">${expiryDateFormatted}</span></div>
        <div class="info-row"><span class="info-label">Time Remaining:</span><span class="info-val" style="color: ${badgeColor}; font-weight: 800;">${daysLeft >= 0 ? `${daysLeft} Days Left` : `Expired (${Math.abs(daysLeft)} days ago)`}</span></div>
      </div>
      ${tipHtml}
    `,
    ctaText: daysLeft < 0 ? 'Book Urgent MOT Test' : 'Book MOT Test Slot',
    ctaUrl: serviceLink || 'https://multiplemot.co.uk/garages',
    secondaryActions: [
      { label: 'Book MOT in Portal', url: serviceLink || 'https://multiplemot.co.uk/portal' },
      { label: 'Find Approved Garages', url: 'https://multiplemot.co.uk/garages' },
      { label: 'Check Vehicle History', url: 'https://multiplemot.co.uk' },
    ]
  });

  return sendEmail({
    to: customer.email,
    subject,
    html,
    text: `Dear ${customerName}, your vehicle ${reg} (${vehicleDesc}) MOT expires on ${expiryDateFormatted} (${daysLeft >= 0 ? `${daysLeft} days left` : 'EXPIRED'}). Book your test slot: ${serviceLink || 'https://multiplemot.co.uk'}`
  });
}

module.exports = {
  sendEmail,
  sendCustomerWelcomeEmail,
  sendGarageRegistrationEmail,
  sendSuperAdminNewGarageAlert,
  sendGarageStatusEmail,
  sendBookingRequestEmailCustomer,
  sendBookingRequestEmailGarage,
  sendBookingConfirmedEmail,
  sendBookingRejectedEmail,
  sendVehicleApprovalEmail,
  sendMotDueReminderEmail
};
