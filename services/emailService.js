const nodemailer = require('nodemailer');

// Initialize Transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || '465', 10);
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

    if (user && pass) {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: { rejectUnauthorized: false }
      });
      console.log(`📧 [EMAIL SERVICE] Configured SMTP Transport via smtp.gmail.com:465 (${user})`);
    } else {
      console.log('ℹ️ [EMAIL SERVICE] No live SMTP credentials found in .env (EMAIL_USER / EMAIL_PASS). Running in preview/log mode.');
    }
  }
  return transporter;
}



/**
 * Base Email Wrapper generating responsive, high-aesthetic HTML templates
 */
function createHtmlEmailLayout({ title, badgeText, badgeColor = '#3B82F6', contentHtml, ctaText, ctaUrl }) {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F172A; margin: 0; padding: 0; color: #334155; }
    .wrapper { width: 100%; background-color: #0F172A; padding: 30px 15px; box-sizing: border-box; }
    .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #3B82F6; }
    .logo-text { font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; margin: 0; }
    .logo-sub { font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .body { padding: 32px 28px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .card-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #EDF2F7; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748B; font-weight: 500; }
    .info-val { color: #0F172A; font-weight: 700; text-align: right; }
    .plate-badge { display: inline-block; background-color: #FFD200; color: #000000; font-family: monospace, sans-serif; font-weight: 900; padding: 4px 10px; border-radius: 6px; border: 1.5px solid #000000; font-size: 13px; letter-spacing: 1px; }
    .btn-container { text-align: center; margin: 28px 0 12px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
    .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94A3B8; line-height: 1.5; }
    .footer a { color: #3B82F6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo-text">MULTIPLE MOT <span style="color: #3B82F6;">UK</span></h1>
        <div class="logo-sub">DVSA Smart Reminder & Testing Marketplace</div>
      </div>
      <div class="body">
        ${badgeText ? `<span class="badge" style="background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}30;">${badgeText}</span>` : ''}
        <h2 class="title">${title}</h2>
        ${contentHtml}
        ${ctaText && ctaUrl ? `
          <div class="btn-container">
            <a href="${ctaUrl}" class="btn" target="_blank">${ctaText}</a>
          </div>
        ` : ''}
      </div>
      <div class="footer">
        <p>This is an official automated notification from Multiple MOT UK.<br>© ${currentYear} Multiple MOT Network. All rights reserved.</p>
        <p>Operating in strict compliance with the DVSA 30-Day Early Renewal MOT Framework.</p>
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
    console.warn('⚠️ [EMAIL SERVICE] Skipping dispatch: No recipient email provided.');
    return false;
  }

  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || '"Multiple MOT UK" <no-reply@multiplemot.co.uk>';

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
      console.log(`✅ [EMAIL DISPATCHED VIA SMTP] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ [EMAIL SMTP NOTICE] Direct SMTP delivery note (${err.message}). Logging formatted email preview:`);
      console.log(`\n======================================================`);
      console.log(`📨 [MOCK EMAIL DISPATCH RECORD]`);
      console.log(`📤 FROM:    ${from}`);
      console.log(`📥 TO:      ${to}`);
      console.log(`🏷️ SUBJECT: ${subject}`);
      console.log(`📄 PREVIEW: ${text || subject}`);
      console.log(`======================================================\n`);
      return true;
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`📨 [MOCK EMAIL PREVIEW] (Add EMAIL_USER & EMAIL_PASS to .env for real delivery)`);
    console.log(`📤 FROM:    ${from}`);
    console.log(`📥 TO:      ${to}`);
    console.log(`🏷️ SUBJECT: ${subject}`);
    console.log(`📄 PREVIEW: ${text || subject}`);
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
    title: `Welcome to Multiple MOT UK, ${customerName}!`,
    badgeText: 'Account Created',
    badgeColor: '#10B981',
    contentHtml: `
      <p class="text">Welcome to the UK's premier automated MOT reminder & certified testing network.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Account Name:</span><span class="info-val">${customerName}</span></div>
        <div class="info-row"><span class="info-label">Email Address:</span><span class="info-val">${customer.email}</span></div>
        <div class="info-row"><span class="info-label">Preferred Channel:</span><span class="info-val">${customer.preferredContact || 'Email'}</span></div>
      </div>
      <p class="text">You can now search vehicle records directly from DVSA, manage testing dates, and book certified MOT bays near you.</p>
    `,
    ctaText: 'Access Motorist Portal',
    ctaUrl: 'https://multiplemot.co.uk'
  });

  return sendEmail({
    to: customer.email,
    subject: 'Welcome to Multiple MOT UK - Your MOT Management Account',
    html,
    text: `Welcome to Multiple MOT UK, ${customerName}! Your account (${customer.email}) is ready to use.`
  });
}

async function sendGarageRegistrationEmail(garage, ownerUser) {
  const garageName = garage.name || 'Your Garage';
  const ownerName = ownerUser?.username || 'Garage Manager';
  const html = createHtmlEmailLayout({
    title: `Registration Received: ${garageName}`,
    badgeText: 'Pending DVSA Verification',
    badgeColor: '#F59E0B',
    contentHtml: `
      <p class="text">Dear ${ownerName},</p>
      <p class="text">Thank you for registering <strong>${garageName}</strong> on Multiple MOT UK. Your application has been logged and queued for Super Admin review.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Garage Trade Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">VTS Number:</span><span class="info-val">${garage.vtsNumber || 'Provided in documents'}</span></div>
        <div class="info-row"><span class="info-label">Location / City:</span><span class="info-val">${garage.city || 'United Kingdom'} (${garage.postcode || ''})</span></div>
        <div class="info-row"><span class="info-label">Status:</span><span class="info-val" style="color: #D97706;">Pending Verification</span></div>
      </div>
      <p class="text">Our compliance team is verifying your MOT testing authorization documents. We will notify you via email as soon as your testing station is active.</p>
    `,
    ctaText: 'View Admin Portal',
    ctaUrl: 'https://multiplemot.co.uk/admin'
  });

  return sendEmail({
    to: garage.email || ownerUser?.email,
    subject: `Garage Registration Received - ${garageName}`,
    html,
    text: `Your garage registration for ${garageName} has been received and is pending authorization.`
  });
}

async function sendSuperAdminNewGarageAlert(garage) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@gmail.com';
  const garageName = garage.name || 'New MOT Station';
  const html = createHtmlEmailLayout({
    title: `New Garage Pending Review: ${garageName}`,
    badgeText: 'Super Admin Action Required',
    badgeColor: '#EF4444',
    contentHtml: `
      <p class="text">A new vehicle testing station has submitted their onboarding details and uploaded compliance certificates.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Garage Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Contact Email:</span><span class="info-val">${garage.email || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Phone:</span><span class="info-val">${garage.phone || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">VTS / Examiner No:</span><span class="info-val">${garage.vtsNumber || 'Check Docs'}</span></div>
        <div class="info-row"><span class="info-label">Address:</span><span class="info-val">${garage.address || ''} ${garage.city || ''} (${garage.postcode || ''})</span></div>
      </div>
      <p class="text">Please log into the Super Admin console to verify certificates and approve the testing station.</p>
    `,
    ctaText: 'Review Garage Application',
    ctaUrl: 'https://multiplemot.co.uk/super-admin'
  });

  return sendEmail({
    to: superAdminEmail,
    subject: `[ADMIN ALERT] New Garage Registration: ${garageName}`,
    html,
    text: `A new garage (${garageName}) has registered and requires compliance review.`
  });
}

async function sendGarageStatusEmail(garage, status, reason = '') {
  const isApproved = status === 'Approved';
  const garageName = garage.name || 'Your Garage';
  const html = createHtmlEmailLayout({
    title: isApproved ? `Congratulations! ${garageName} is Approved` : `Application Update: ${garageName}`,
    badgeText: isApproved ? 'Station Verified' : 'Application Rejected',
    badgeColor: isApproved ? '#10B981' : '#EF4444',
    contentHtml: `
      <p class="text">
        ${isApproved 
          ? `Your MOT testing station <strong>${garageName}</strong> has been officially approved on Multiple MOT UK. Your MOT bays are now live on the marketplace for motorists to book appointments.` 
          : `We regret to inform you that your registration application for <strong>${garageName}</strong> could not be approved at this time.`}
      </p>
      ${!isApproved && reason ? `
        <div class="card-box" style="border-left: 4px solid #EF4444;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Reason for Rejection:</div>
          <div style="font-size: 13px; color: #475569;">${reason}</div>
        </div>
      ` : ''}
      <div class="card-box">
        <div class="info-row"><span class="info-label">Station Name:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Verification Status:</span><span class="info-val" style="color: ${isApproved ? '#10B981' : '#EF4444'};">${status}</span></div>
        <div class="info-row"><span class="info-label">City / Postcode:</span><span class="info-val">${garage.city || ''} (${garage.postcode || ''})</span></div>
      </div>
    `,
    ctaText: isApproved ? 'Open Garage Dashboard' : 'Contact Support',
    ctaUrl: isApproved ? 'https://multiplemot.co.uk/admin' : 'mailto:support@multiplemot.co.uk'
  });

  return sendEmail({
    to: garage.email,
    subject: isApproved ? `[Approved] ${garageName} is now live on Multiple MOT UK` : `[Update] ${garageName} Application Status`,
    html,
    text: isApproved ? `Your garage ${garageName} has been approved.` : `Your garage application for ${garageName} was rejected: ${reason}`
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
    title: 'MOT Booking Request Received',
    badgeText: 'Booking Pending Confirmation',
    badgeColor: '#F59E0B',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text">Your MOT appointment request has been submitted to <strong>${garageName}</strong>. The testing station is reviewing your slot and will confirm shortly.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Vehicle:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${makeModel}</span></div>
        <div class="info-row"><span class="info-label">Testing Station:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Appointment Date:</span><span class="info-val">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Slot Time:</span><span class="info-val">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Service / Price:</span><span class="info-val">${booking.serviceName || 'MOT Test'} (£${booking.price || 45})</span></div>
      </div>
      <p class="text">You will receive an instant email notification as soon as the garage approves your booking.</p>
    `,
    ctaText: 'View My Bookings',
    ctaUrl: 'https://multiplemot.co.uk/portal'
  });

  return sendEmail({
    to: customer.email,
    subject: `Booking Request Received: MOT for ${reg} at ${garageName}`,
    html,
    text: `Your MOT booking request for ${reg} on ${bookingDate} at ${garageName} has been received.`
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
    badgeColor: '#3B82F6',
    contentHtml: `
      <p class="text">A new MOT booking request has been placed at your testing bay.</p>
      <div class="card-box">
        <div class="info-row"><span class="info-label">Motorist Name:</span><span class="info-val">${customerName}</span></div>
        <div class="info-row"><span class="info-label">Contact Phone:</span><span class="info-val">${customer.mobile || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">Vehicle Mark:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">Requested Date:</span><span class="info-val">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Requested Slot:</span><span class="info-val">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Test Type:</span><span class="info-val">${booking.serviceName || 'MOT Test'}</span></div>
      </div>
      <p class="text">Please confirm or reschedule this appointment in your garage terminal.</p>
    `,
    ctaText: 'Confirm / Manage Slot',
    ctaUrl: 'https://multiplemot.co.uk/admin'
  });

  return sendEmail({
    to: garage.email,
    subject: `[New Booking Alert] MOT Request for ${reg} on ${bookingDate} (${slotTime})`,
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
    title: '🎉 MOT Appointment Confirmed!',
    badgeText: 'Booking Confirmed',
    badgeColor: '#10B981',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text">Good news! <strong>${garageName}</strong> has approved and confirmed your MOT appointment.</p>
      <div class="card-box" style="border: 2px solid #10B981;">
        <div class="info-row"><span class="info-label">Vehicle:</span><span class="info-val"><span class="plate-badge">${reg}</span> ${booking.makeModel || ''}</span></div>
        <div class="info-row"><span class="info-label">Date:</span><span class="info-val" style="color: #10B981; font-size: 14px;">${bookingDate}</span></div>
        <div class="info-row"><span class="info-label">Time:</span><span class="info-val" style="color: #10B981; font-size: 14px;">${slotTime}</span></div>
        <div class="info-row"><span class="info-label">Testing Station:</span><span class="info-val">${garageName}</span></div>
        <div class="info-row"><span class="info-label">Station Address:</span><span class="info-val">${garage.address || ''}, ${garage.city || ''} (${garage.postcode || ''})</span></div>
        <div class="info-row"><span class="info-label">Station Phone:</span><span class="info-val">${garage.phone || 'N/A'}</span></div>
      </div>
      <p class="text"><strong>Important:</strong> Please arrive 10 minutes prior to your testing slot with your vehicle logbook (V5C) if applicable.</p>
    `,
    ctaText: 'Get Driving Directions',
    ctaUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${garage.name} ${garage.address} ${garage.postcode}`)}`
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
    badgeText: 'Booking Cancelled / Rejected',
    badgeColor: '#EF4444',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text"><strong>${garageName}</strong> was unable to accept your MOT appointment request for <strong>${reg}</strong> on ${bookingDate}.</p>
      ${reason ? `
        <div class="card-box" style="border-left: 4px solid #EF4444;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Reason from Garage:</div>
          <div style="font-size: 13px; color: #475569;">${reason}</div>
        </div>
      ` : ''}
      <p class="text">You can easily choose another available time slot or book with another approved DVSA testing centre nearby.</p>
    `,
    ctaText: 'Explore Alternative Slots',
    ctaUrl: 'https://multiplemot.co.uk/garages'
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
    title: isApproved ? `Vehicle Approved: ${reg}` : `Vehicle Update: ${reg}`,
    badgeText: isApproved ? 'Vehicle Verified' : 'Vehicle Rejected',
    badgeColor: isApproved ? '#10B981' : '#EF4444',
    contentHtml: `
      <p class="text">Dear ${customer.firstName || 'Customer'},</p>
      <p class="text">
        ${isApproved 
          ? `Your vehicle <span class="plate-badge">${reg}</span> (${vehicle.make || ''} ${vehicle.model || ''}) has been approved and linked to your garage profile.` 
          : `Your vehicle request for <span class="plate-badge">${reg}</span> could not be verified.`}
      </p>
      ${!isApproved && reason ? `
        <div class="card-box" style="border-left: 4px solid #EF4444;">
          <div style="font-size: 13px; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Reason:</div>
          <div style="font-size: 13px; color: #475569;">${reason}</div>
        </div>
      ` : ''}
      <div class="card-box">
        <div class="info-row"><span class="info-label">Registration Mark:</span><span class="info-val"><span class="plate-badge">${reg}</span></span></div>
        <div class="info-row"><span class="info-label">Make & Model:</span><span class="info-val">${vehicle.make || ''} ${vehicle.model || ''}</span></div>
        <div class="info-row"><span class="info-label">MOT Expiry:</span><span class="info-val">${vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB') : 'N/A'}</span></div>
      </div>
    `,
    ctaText: 'View Vehicle in Portal',
    ctaUrl: 'https://multiplemot.co.uk/portal'
  });

  return sendEmail({
    to: customer.email,
    subject: isApproved ? `Vehicle Verified: ${reg} (${vehicle.make || ''} ${vehicle.model || ''})` : `Vehicle Update: ${reg}`,
    html,
    text: isApproved ? `Your vehicle ${reg} has been approved.` : `Your vehicle ${reg} was rejected: ${reason}`
  });
}

async function sendMotDueReminderEmail(customer, vehicle, daysLeft, expiryDateFormatted, serviceLink, stage = '') {
  const reg = vehicle.registrationNumber || 'Vehicle';
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Motorist';
  const vehicleDesc = `${vehicle.make || ''} ${vehicle.model || ''}`.trim();

  let badgeText = 'DVSA Renewal Reminder';
  let badgeColor = '#3B82F6';
  let title = `MOT Due in ${daysLeft} Days: ${reg}`;
  let subject = `📅 MOT Reminder: ${reg} expires in ${daysLeft} days (${expiryDateFormatted})`;
  let tipHtml = `<p class="text"><strong>💡 DVSA 30-Day Rule Tip:</strong> You can book your MOT test within one month (minus a day) of the expiry date to preserve your current renewal anniversary date.</p>`;

  if (daysLeft > 30) {
    // 45 Days Pre-Booking Alert
    badgeText = '45 Days Advance Notice';
    badgeColor = '#3B82F6';
    title = `Advance Notice: MOT Due in ${daysLeft} Days for ${reg}`;
    subject = `📅 45-Day Advance Alert: ${reg} MOT expires on ${expiryDateFormatted}`;
    tipHtml = `<p class="text"><strong>💡 Pre-Booking Available:</strong> You can plan ahead and pre-book your test slot. Early booking within the official 30-day window ensures you get your preferred garage and time slot while keeping your renewal anniversary.</p>`;
  } else if (daysLeft > 15) {
    // 30 Days DVSA Window Opened
    badgeText = 'DVSA 30-Day Window Now Open';
    badgeColor = '#F59E0B';
    title = `30 Days Left: MOT Renewal Window Open for ${reg}`;
    subject = `🚨 30-Day Notice: MOT for ${reg} expires on ${expiryDateFormatted} (Book Now)`;
    tipHtml = `<p class="text"><strong>💡 Official 30-Day Window:</strong> Your vehicle is now in the official 1-month renewal window. Testing now will keep your existing expiry anniversary date for next year!</p>`;
  } else if (daysLeft > 7) {
    // 15 Days Reminder
    badgeText = '15 Days Remaining - Action Required';
    badgeColor = '#F97316';
    title = `⚠️ Urgent: MOT Expires in ${daysLeft} Days (${reg})`;
    subject = `⚠️ Urgent 15-Day Alert: ${reg} MOT expires on ${expiryDateFormatted}`;
    tipHtml = `<p class="text"><strong>⚠️ Slots Fill Fast:</strong> Many garages get fully booked weeks in advance. We recommend booking your testing bay today to avoid driving without valid MOT certification.</p>`;
  } else if (daysLeft >= 0) {
    // 7 Days / Final Week Reminder
    badgeText = 'Final Notice - 7 Days Left';
    badgeColor = '#EF4444';
    title = `🔥 Final Week Notice: MOT Expires on ${expiryDateFormatted} (${reg})`;
    subject = `🔥 FINAL NOTICE: ${reg} MOT expires in ${daysLeft} days!`;
    tipHtml = `<p class="text"><strong>🚨 Urgent Action Required:</strong> Driving on UK roads without an MOT after ${expiryDateFormatted} carries a fine of up to £1,000 and invalidates insurance.</p>`;
  } else {
    // Expired
    badgeText = 'MOT Expired';
    badgeColor = '#DC2626';
    title = `⛔ EXPIRED: MOT Certificate Lapsed for ${reg}`;
    subject = `⛔ URGENT: MOT for ${reg} has EXPIRED (${expiryDateFormatted})`;
    tipHtml = `<p class="text"><strong>⛔ Important:</strong> Driving an uncertified vehicle is illegal unless driving directly to a pre-booked MOT test. Book an immediate slot below.</p>`;
  }

  const html = createHtmlEmailLayout({
    title,
    badgeText,
    badgeColor,
    contentHtml: `
      <p class="text">Dear ${customerName},</p>
      <p class="text">This is an automated notification regarding the annual MOT status for your <strong>${vehicleDesc}</strong> (<span class="plate-badge">${reg}</span>).</p>
      <div class="card-box" style="border: 2px solid ${badgeColor};">
        <div class="info-row"><span class="info-label">Vehicle Registration:</span><span class="info-val"><span class="plate-badge">${reg}</span></span></div>
        <div class="info-row"><span class="info-label">Make & Model:</span><span class="info-val">${vehicleDesc}</span></div>
        <div class="info-row"><span class="info-label">MOT Expiry Date:</span><span class="info-val" style="color: ${badgeColor}; font-size: 14px; font-weight: 800;">${expiryDateFormatted}</span></div>
        <div class="info-row"><span class="info-label">Current Status:</span><span class="info-val" style="color: ${badgeColor}; font-weight: 700;">${daysLeft >= 0 ? `${daysLeft} Days Remaining` : `Expired (${Math.abs(daysLeft)} days ago)`}</span></div>
      </div>
      ${tipHtml}
    `,
    ctaText: daysLeft < 0 ? 'Book Immediate MOT Test' : 'Book MOT Appointment',
    ctaUrl: serviceLink || 'https://multiplemot.co.uk/garages'
  });

  return sendEmail({
    to: customer.email,
    subject,
    html,
    text: `Dear ${customerName}, your vehicle ${reg} (${vehicleDesc}) MOT expires on ${expiryDateFormatted} (${daysLeft >= 0 ? `${daysLeft} days remaining` : 'EXPIRED'}). Book your test slot: ${serviceLink || 'https://multiplemot.co.uk'}`
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
