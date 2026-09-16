const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Template = require('../models/Template');
const Reminder = require('../models/Reminder');
const Audit = require('../models/Audit');
const { getDaysDiff } = require('../utils/helpers');
const { sendEmail, sendMotDueReminderEmail } = require('./emailService');
const { sendSMS } = require('./smsService');

async function runDailyCheck(referenceDate = null) {
  const checkDate = referenceDate ? new Date(referenceDate) : new Date();
  const dateISO = checkDate.toISOString().split('T')[0];
  console.log(`[REMINDER ENGINE] Daily check triggered on date: ${dateISO}`);
  
  let sentCount = 0;
  
  // Fetch templates or create default
  let templates = await Template.findOne({});
  if (!templates) {
    templates = await Template.create({});
  }

  const activeVehicles = await Vehicle.find({ status: 'Active' });

  for (const vehicle of activeVehicles) {
    const customer = await Customer.findById(vehicle.customerId);
    if (!customer) continue;

    const daysLeft = getDaysDiff(vehicle.motExpiryDate, dateISO);
    
    // Determine milestone category
    let milestone = null;
    let reminderLabel = '';

    if (daysLeft > 30 && daysLeft <= 45) {
      milestone = '45_Days';
      reminderLabel = '45-Day Advance MOT Reminder';
    } else if (daysLeft > 15 && daysLeft <= 30) {
      milestone = '30_Days';
      reminderLabel = '30-Day Official Renewal Window MOT Reminder';
    } else if (daysLeft > 7 && daysLeft <= 15) {
      milestone = '15_Days';
      reminderLabel = '15-Day Urgent MOT Reminder';
    } else if (daysLeft >= 0 && daysLeft <= 7) {
      milestone = '7_Days';
      reminderLabel = '7-Day Final Notice MOT Reminder';
    } else if (daysLeft < 0) {
      milestone = 'Expired';
      reminderLabel = 'MOT Expired Notice';
    }

    if (!milestone) continue;

    // Deduplication check: Check if this specific milestone reminder has already been sent
    const alreadySentMilestone = await Reminder.findOne({
      vehicleId: vehicle._id,
      reminderType: milestone,
      sentStatus: true
    });
    if (alreadySentMilestone) continue;

    const customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Motorist';
    const vehicleDesc = `${vehicle.make} ${vehicle.model}`.trim();
    const expiryFormatted = vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toISOString().substring(0, 10) : dateISO;

    // Build payload and token
    const payload = { customerId: customer._id.toString(), vehicleId: vehicle._id.toString(), milestone };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const serviceLink = `https://multiplemot.co.uk/update?id=${token}`;

    const template = templates.motDue || templates.t30 || "Dear [Name], Your [Vehicle] ([Reg]) MOT is due on [Expiry].";
    let message = template
      .replace('[Name]', customerName)
      .replace('[Vehicle]', vehicleDesc)
      .replace('[Reg]', vehicle.registrationNumber)
      .replace('[Expiry]', expiryFormatted);
    message += `\nManage & book MOT here: ${serviceLink}`;

    // Dispatch communication
    if (customer.preferredContact === 'Email' || !customer.preferredContact) {
      sendMotDueReminderEmail(customer, vehicle, daysLeft, expiryFormatted, serviceLink, milestone).catch(err =>
        console.error(`[reminderService] Failed to dispatch ${milestone} reminder email:`, err.message)
      );
    } else {
      sendSMS(customer.mobile, message);
    }

    // Record reminder entry in MongoDB
    await Reminder.create({
      vehicleId: vehicle._id,
      reminderType: milestone,
      reminderDate: checkDate,
      sentStatus: true,
      sentTimestamp: new Date(),
      communicationMethod: customer.preferredContact || 'Email'
    });

    // Append to audit logs in MongoDB
    await Audit.create({
      activity: `Reminder Sent (${reminderLabel} - ${daysLeft >= 0 ? `${daysLeft}d left` : 'Expired'})`,
      details: `Automated ${reminderLabel} sent to ${customerName} for ${vehicleDesc} (${vehicle.registrationNumber}) via ${customer.preferredContact || 'Email'}`
    });

    sentCount++;
  }

  return { checkedCount: activeVehicles.length, sentCount };
}

module.exports = { runDailyCheck };
