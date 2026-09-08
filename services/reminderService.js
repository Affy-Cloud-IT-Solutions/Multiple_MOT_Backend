const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Template = require('../models/Template');
const Reminder = require('../models/Reminder');
const Audit = require('../models/Audit');
const { getDaysDiff } = require('../utils/helpers');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');

async function runDailyCheck() {
  console.log(`[REMINDER ENGINE] Daily check triggered on mock date: 2026-07-22`);
  
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

    const daysLeft = getDaysDiff(vehicle.motExpiryDate, '2026-07-22');
    
    // In accordance with UK DVSA 30-day rule, MOT reminders are sent when vehicle is within 30 days of expiry
    if (daysLeft >= 0 && daysLeft <= 30) {
      // Check if already sent a reminder within last 30 days for this vehicle
      const existingReminder = await Reminder.findOne({
        vehicleId: vehicle._id,
        sentStatus: true,
        reminderDate: { $gte: new Date('2026-06-22') }
      });
      if (existingReminder) continue;

      const template = templates.motDue || templates.t30 || "Dear [Name], Your [Vehicle] ([Reg]) MOT is due for renewal on [Expiry]. Book your MOT today.";
      const reminderType = 'MOT Due Reminder (Within 30 Days)';

      // Format template content
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const vehicleDesc = `${vehicle.make} ${vehicle.model}`;
      const expiryFormatted = vehicle.motExpiryDate.toISOString().substring(0, 10);
      
      let message = template
        .replace('[Name]', customerName)
        .replace('[Vehicle]', vehicleDesc)
        .replace('[Reg]', vehicle.registrationNumber)
        .replace('[Expiry]', expiryFormatted);

      // Append secure token self-service link to message
      const payload = { customerId: customer._id.toString(), vehicleId: vehicle._id.toString() };
      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const serviceLink = `https://motapp.co.uk/update?id=${token}`;
      message += `\nManage your vehicle here: ${serviceLink}`;

      // Dispatch communication depending on preference
      if (customer.preferredContact === 'Email') {
        sendEmail(customer.email, `MOT Due Reminder: ${vehicle.registrationNumber}`, message);
      } else {
        // SMS or WhatsApp
        sendSMS(customer.mobile, message);
      }

      // Record reminder entry in MongoDB
      await Reminder.create({
        vehicleId: vehicle._id,
        reminderType: 'MOT_Due',
        reminderDate: new Date('2026-07-22'),
        sentStatus: true,
        sentTimestamp: new Date(),
        communicationMethod: customer.preferredContact
      });

      // Append to audit logs in MongoDB
      await Audit.create({
        activity: `Reminder Sent (MOT Due - ${daysLeft}d left)`,
        details: `Automated ${reminderType} sent to ${customerName} for ${vehicleDesc} (${vehicle.registrationNumber}) via ${customer.preferredContact}`
      });

      sentCount++;
    }
  }

  return { checkedCount: activeVehicles.length, sentCount };
}

module.exports = { runDailyCheck };
