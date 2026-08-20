const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');
const Audit = require('../models/Audit');
const { encryptToken, decryptToken } = require('../utils/helpers');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id.toString() };
};

// Generate secure link containing base64 token payload
function generateTokenLink(req, res) {
  const { customerId, vehicleId } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required.' });
  }

  const token = encryptToken({ customerId, vehicleId });
  const portalLink = `https://motapp.co.uk/update?id=${token}`;

  res.json({ token, link: portalLink });
}

// Verify base64 token and retrieve customer & vehicle status
async function verifyPortalToken(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }

    const payload = decryptToken(token);
    if (!payload || !payload.customerId) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    const customer = await Customer.findById(payload.customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Associated customer record not found.' });
    }

    // Get active vehicles for this customer
    const customerVehicles = await Vehicle.find({ customerId: customer._id, status: 'Active' });

    res.json({
      customer: {
        id: customer._id.toString(),
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email
      },
      vehicles: customerVehicles.map(formatDoc),
      targetVehicleId: payload.vehicleId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Execute self-service responses from token link actions
async function executeAction(req, res) {
  try {
    const { token, actionType, vehicleId, registrationNumber, make, model, year, motExpiryDate } = req.body;

    if (!token || !actionType) {
      return res.status(400).json({ error: 'Token and actionType are required.' });
    }

    const payload = decryptToken(token);
    if (!payload || !payload.customerId) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    const customer = await Customer.findById(payload.customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const customerName = `${customer.firstName} ${customer.lastName}`;

    if (actionType === 'BOOK_MOT') {
      const targetId = vehicleId || payload.vehicleId;
      const vehicle = await Vehicle.findById(targetId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle details not found.' });
      }

      // Create BOOKED Alert in MongoDB
      const makeModel = `${vehicle.make} ${vehicle.model}`;
      const newAlert = await Alert.create({
        type: 'BOOKED',
        customerName,
        customerId: customer._id,
        registrationNumber: vehicle.registrationNumber,
        makeModel,
        status: 'Pending'
      });

      await Audit.create({
        activity: 'MOT Booking Requested',
        details: `${customerName} requested MOT booking for ${makeModel} (${vehicle.registrationNumber}) via portal.`
      });

      return res.json({ message: 'MOT booking request successfully sent to garage.', alert: formatDoc(newAlert) });

    } else if (actionType === 'VEHICLE_SOLD') {
      const targetId = vehicleId || payload.vehicleId;
      const vehicle = await Vehicle.findById(targetId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found.' });
      }

      // Mark vehicle sold
      vehicle.status = 'Sold';
      await vehicle.save();

      // Create SOLD Alert in MongoDB
      const makeModel = `${vehicle.make} ${vehicle.model}`;
      const newAlert = await Alert.create({
        type: 'SOLD',
        customerName,
        customerId: customer._id,
        registrationNumber: vehicle.registrationNumber,
        makeModel,
        status: 'Pending'
      });

      await Audit.create({
        activity: 'Vehicle Marked Sold',
        details: `${customerName} reported vehicle sold: ${makeModel} (${vehicle.registrationNumber})`
      });

      return res.json({ message: 'Vehicle status updated to Sold. Reminders stopped.', alert: formatDoc(newAlert) });

    } else if (actionType === 'ADD_VEHICLE') {
      if (!registrationNumber || !make || !model || !motExpiryDate) {
        return res.status(400).json({ error: 'Registration number, make, model, and MOT expiry date are required to add a vehicle.' });
      }

      const regUpper = registrationNumber.toUpperCase().trim();
      const makeModel = `${make.toUpperCase().trim()} ${model.toUpperCase().trim()}`;

      // Create NEW_VEHICLE Alert for Admin approval
      const newAlert = await Alert.create({
        type: 'NEW_VEHICLE',
        customerName,
        customerId: customer._id,
        registrationNumber: regUpper,
        makeModel,
        year: year ? parseInt(year, 10) : undefined,
        motExpiryDate: motExpiryDate ? new Date(motExpiryDate) : undefined,
        status: 'Pending'
      });

      await Audit.create({
        activity: 'New Vehicle Requested',
        details: `${customerName} requested vehicle registration approval for ${makeModel} (${regUpper})`
      });

      return res.json({ message: 'New vehicle details submitted to garage for approval.', alert: formatDoc(newAlert) });
    }

    res.status(400).json({ error: 'Invalid action type requested.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  generateTokenLink,
  verifyPortalToken,
  executeAction
};
