const Audit = require('../models/Audit');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id.toString() };
};

async function getAuditTrail(req, res) {
  try {
    const audits = await Audit.find({}).sort({ date: -1 });
    res.json(audits.map(formatDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createAuditLog(req, res) {
  try {
    const { activity, details } = req.body;
    if (!activity || !details) {
      return res.status(400).json({ error: 'Activity and details are required.' });
    }

    const log = await Audit.create({ activity, details });
    res.status(201).json(formatDoc(log));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAuditTrail,
  createAuditLog
};
