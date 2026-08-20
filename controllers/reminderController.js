const Reminder = require('../models/Reminder');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Template = require('../models/Template');
const Audit = require('../models/Audit');
const { runDailyCheck } = require('../services/reminderService');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id.toString() };
};

async function getReminderLogs(req, res) {
  try {
    const reminders = await Reminder.find({}).sort({ createdAt: -1 });
    
    // Fetch all vehicles and customers to map in memory for efficiency, or do it on-the-fly
    const vehicles = await Vehicle.find({});
    const customers = await Customer.find({});

    const logs = reminders.map(rem => {
      const vehicle = vehicles.find(v => v._id.toString() === rem.vehicleId.toString());
      const customer = vehicle ? customers.find(c => c._id.toString() === vehicle.customerId.toString()) : null;
      return {
        ...formatDoc(rem),
        vehicle: vehicle ? { make: vehicle.make, model: vehicle.model, registrationNumber: vehicle.registrationNumber } : null,
        customer: customer ? { firstName: customer.firstName, lastName: customer.lastName } : null
      };
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getTemplates(req, res) {
  try {
    let template = await Template.findOne({});
    if (!template) {
      template = await Template.create({});
    }
    res.json(formatDoc(template));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateTemplate(req, res) {
  try {
    const { t45, t30, t7 } = req.body;

    let template = await Template.findOne({});
    if (!template) {
      template = new Template({});
    }

    if (t45 !== undefined) template.t45 = t45;
    if (t30 !== undefined) template.t30 = t30;
    if (t7 !== undefined) template.t7 = t7;

    await template.save();

    await Audit.create({
      activity: 'Templates Updated',
      details: 'Garage administrator updated reminder scheduling templates.'
    });

    res.json({
      message: 'Templates updated successfully.',
      templates: formatDoc(template)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function triggerReminderCron(req, res) {
  try {
    const result = await runDailyCheck();
    res.json({
      message: 'Reminder cron scanning completed successfully.',
      ...result
    });
  } catch (error) {
    console.error('Trigger reminder cron error:', error);
    res.status(500).json({ error: 'Failed to run automated reminder engine.' });
  }
}

module.exports = {
  getReminderLogs,
  getTemplates,
  updateTemplate,
  triggerReminderCron
};
