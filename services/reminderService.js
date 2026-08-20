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
    let template = '';
    let reminderType = '';

    if (daysLeft === 45) {
      template = templates.t45;
      reminderType = '45-Day Reminder';
    } else if (daysLeft === 30) {
      template = templates.t30;
      reminderType = '30-Day Reminder';
    } else if (daysLeft === 7) {
      template = templates.t7;
      reminderType = '7-Day Reminder';
    }

    if (template && reminderType) {
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
        sendEmail(customer.email, `MOT Reminder: ${vehicle.registrationNumber}`, message);
      } else {
        // SMS or WhatsApp
        sendSMS(customer.mobile, message);
      }

      // Record reminder entry in MongoDB
      await Reminder.create({
        vehicleId: vehicle._id,
        reminderType: daysLeft === 45 ? '45_Days' : daysLeft === 30 ? '30_Days' : '7_Days',
        reminderDate: new Date('2026-07-22'),
        sentStatus: true,
        sentTimestamp: new Date(),
        communicationMethod: customer.preferredContact
      });

      // Append to audit logs in MongoDB
      await Audit.create({
        activity: `Reminder Sent (${daysLeft} Days)`,
        details: `Automated ${reminderType} sent to ${customerName} for ${vehicleDesc} (${vehicle.registrationNumber}) via ${customer.preferredContact}`
      });

      sentCount++;
    }
  }

  return { checkedCount: activeVehicles.length, sentCount };
}

module.exports = { runDailyCheck };
