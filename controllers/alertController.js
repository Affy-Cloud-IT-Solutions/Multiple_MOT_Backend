const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');
const Audit = require('../models/Audit');
const Garage = require('../models/Garage');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id.toString() };
};

async function getAllAlerts(req, res) {
  try {
    let query = {};
    const role = req.user?.role;
    if (role === 'garage_admin' || role === 'staff') {
      if (!req.user?.garageId) {
        return res.json([]);
      }
      query.garageId = req.user.garageId;
    } else if (role === 'customer') {
      if (!req.user?.customerId) {
        return res.json([]);
      }
      query.customerId = req.user.customerId;
    } else if (role === 'admin') {
      if (req.query.garageId) {
        query.garageId = req.query.garageId;
      }
    }
    const alerts = await Alert.find(query).sort({ createdAt: -1 });
    res.json(alerts.map(formatDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createAlert(req, res) {
  try {
    const {
      type,
      customerName,
      customerId,
      registrationNumber,
      makeModel,
      status,
      date,
      garageId,
      serviceName,
      price,
      duration,
      slotTime,
      stationId,
      stationName
    } = req.body;
    const targetGarageId = garageId || req.user?.garageId;

    if (type === 'BOOKED' && !targetGarageId) {
      return res.status(400).json({ error: 'A garage must be selected for MOT bookings.' });
    }

    let assignedStationId = stationId;
    let assignedStationName = stationName;
    let normalizedSlotTime = slotTime || '';

    // Normalize date (convert DD-MM-YYYY to YYYY-MM-DD if needed)
    let isoDateStr = '';
    if (date) {
      if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [d, m, y] = date.split('-');
        isoDateStr = `${y}-${m}-${d}`;
      } else {
        try {
          isoDateStr = new Date(date).toISOString().split('T')[0];
        } catch (e) {
          isoDateStr = String(date);
        }
      }
    }
    const bookingDate = isoDateStr ? new Date(isoDateStr) : new Date();

    if (type === 'BOOKED') {
      // Extract time token from slotTime or makeModel
      let timeToken = '';
      if (slotTime) {
        timeToken = slotTime.split(' - ')[0].trim();
      } else if (makeModel && makeModel.includes('Slot:')) {
        const match = makeModel.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
        if (match) timeToken = match[1].trim();
      }
      normalizedSlotTime = timeToken;

      const garage = await Garage.findById(targetGarageId);
      if (garage && date && timeToken) {
        const [y, m, d] = isoDateStr.split('-');
        const ddmmDate = `${d}-${m}-${y}`;

        // Check if slot is blocked
        const isBlocked = (garage.blockedSlots || []).some(
          s => (s.date === isoDateStr || s.date === ddmmDate || s.date === date) && s.slot === timeToken
        );
        if (isBlocked) {
          return res.status(400).json({ error: `Slot ${timeToken} is blocked by the garage on ${ddmmDate}.` });
        }

        // Approved active stations
        const approvedStations = (garage.stations || []).filter(
          s => s.status === 'Approved' && s.isActive !== false
        );
        const approvedCapacity = Math.max(1, approvedStations.length);

        const dayStart = new Date(isoDateStr);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(isoDateStr);
        dayEnd.setHours(23, 59, 59, 999);

        // Find existing active bookings for this slot on this day
        const existingBookings = await Alert.find({
          type: 'BOOKED',
          garageId: targetGarageId,
          date: { $gte: dayStart, $lte: dayEnd },
          status: { $in: ['Pending', 'Approved'] }
        });

        const slotBookings = existingBookings.filter(b => {
          if (registrationNumber && b.registrationNumber === registrationNumber.toUpperCase().trim()) {
            return false; // exclude current vehicle if rebooking/rescheduling
          }
          if (b.slotTime) {
            const bStart = b.slotTime.split(' - ')[0].trim();
            return bStart === timeToken;
          }
          if (b.makeModel) {
            const slotMatch = b.makeModel.match(/Slot:\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i) ||
                              b.makeModel.match(/at\s+(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
            if (slotMatch) {
              return slotMatch[1].trim() === timeToken;
            }
          }
          return false;
        });

        if (slotBookings.length >= approvedCapacity) {
          return res.status(400).json({
            error: `Slot ${timeToken} is fully booked across all ${approvedCapacity} station(s). Please choose another slot.`
          });
        }

        // Auto-assign bay to the next free station
        if (approvedStations.length > 0 && !assignedStationName) {
          const occupiedStationIds = new Set(slotBookings.map(b => b.stationId?.toString()).filter(Boolean));
          const freeStation = approvedStations.find(st => !occupiedStationIds.has(st._id?.toString() || st.id));
          const selectedSt = freeStation || approvedStations[slotBookings.length % approvedStations.length];
          assignedStationId = selectedSt._id || selectedSt.id;
          assignedStationName = selectedSt.name;
        }
      }

      const existingAlert = await Alert.findOne({
        type: 'BOOKED',
        registrationNumber: registrationNumber.toUpperCase().trim(),
        garageId: targetGarageId,
        status: { $in: ['Pending', 'Approved'] }
      });
      if (existingAlert) {
        existingAlert.customerId = customerId;
        existingAlert.customerName = customerName;
        existingAlert.makeModel = makeModel;
        existingAlert.serviceName = serviceName || existingAlert.serviceName;
        existingAlert.price = price || existingAlert.price;
        existingAlert.duration = duration || existingAlert.duration;
        existingAlert.status = status || 'Pending';
        existingAlert.slotTime = normalizedSlotTime || existingAlert.slotTime;
        if (assignedStationId) existingAlert.stationId = assignedStationId;
        if (assignedStationName) existingAlert.stationName = assignedStationName;
        existingAlert.date = bookingDate;
        await existingAlert.save();

        let detailsStr = `${customerName} rescheduled MOT booking slot for ${makeModel} (${registrationNumber}) via portal.`;
        if (status === 'Approved') {
          detailsStr = `Garage staff rescheduled MOT booking slot for ${customerName}'s ${makeModel} (${registrationNumber}).`;
        }

        await Audit.create({
          activity: 'MOT Booking Rescheduled',
          details: detailsStr
        });

        return res.status(200).json({ message: 'Alert rescheduled successfully.', alert: formatDoc(existingAlert) });
      }
    }

    const newAlert = await Alert.create({
      type,
      customerName,
      customerId,
      garageId: targetGarageId,
      stationId: assignedStationId,
      stationName: assignedStationName,
      slotTime: normalizedSlotTime,
      registrationNumber,
      makeModel,
      serviceName,
      price,
      duration,
      status: status || 'Pending',
      date: bookingDate
    });

    let auditActivity = 'Notification Received';
    let auditDetails = `Received alert of type ${type} for customer ${customerName}`;
    
    if (type === 'BOOKED') {
      if (status === 'Approved') {
        auditActivity = 'MOT Booked';
        auditDetails = `Confirmed MOT booking approval for ${makeModel} (${registrationNumber})`;
      } else {
        auditActivity = 'MOT Booking Requested';
        auditDetails = `${customerName} requested MOT booking for ${makeModel} (${registrationNumber}) via portal.`;
      }
    } else if (type === 'SOLD') {
      auditActivity = 'Vehicle Marked Sold';
      auditDetails = `${customerName} reported vehicle sold: ${makeModel} (${registrationNumber})`;
    } else if (type === 'NEW_VEHICLE') {
      auditActivity = 'New Vehicle Registered';
      auditDetails = `${customerName} registered vehicle ${makeModel} (${registrationNumber})`;
    }

    await Audit.create({
      activity: auditActivity,
      details: auditDetails
    });

    res.status(201).json({ message: 'Alert created successfully.', alert: formatDoc(newAlert) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function approveAlert(req, res) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    const userRole = req.user?.role;
    if (userRole === 'customer') {
      return res.status(403).json({ error: 'Access denied. Customers cannot approve alerts.' });
    }
    if ((userRole === 'garage_admin' || userRole === 'staff') && alert.garageId) {
      if (String(alert.garageId) !== String(req.user.garageId)) {
        return res.status(403).json({ error: 'Access denied. You can only manage alerts for your own garage.' });
      }
    }

    alert.status = 'Approved';
    await alert.save();

    // Act on approval
    if (alert.type === 'NEW_VEHICLE') {
      const parts = alert.makeModel.split(' ');
      const make = parts[0] || 'UNKNOWN';
      const model = parts.slice(1).join(' ') || 'VEHICLE';

      // Check if vehicle already exists in database
      const existingVehicle = await Vehicle.findOne({ registrationNumber: alert.registrationNumber });
      
      if (existingVehicle) {
        // Transfer ownership and activate
        existingVehicle.customerId = alert.customerId;
        existingVehicle.make = make.toUpperCase();
        existingVehicle.model = model.toUpperCase();
        if (alert.year) existingVehicle.year = alert.year;
        if (alert.motExpiryDate) existingVehicle.motExpiryDate = alert.motExpiryDate;
        existingVehicle.status = 'Active';
        await existingVehicle.save();

        await Audit.create({
          activity: 'Vehicle Transferred',
          details: `Approved vehicle registration for existing plate ${alert.registrationNumber}. Ownership updated/transferred to customer ID ${alert.customerId}.`
        });
      } else {
        // Create new vehicle in database
        const newVehicle = await Vehicle.create({
          customerId: alert.customerId,
          registrationNumber: alert.registrationNumber,
          make: make.toUpperCase(),
          model: model.toUpperCase(),
          year: alert.year || 2018,
          motExpiryDate: alert.motExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year expiry
          status: 'Active'
        });

        await Audit.create({
          activity: 'Vehicle Added',
          details: `Approved & registered new vehicle ${newVehicle.make} ${newVehicle.model} (${newVehicle.registrationNumber})`
        });
      }
    } else if (alert.type === 'SOLD') {
      // Find vehicle by registration and mark as Sold
      const vehicle = await Vehicle.findOne({ registrationNumber: alert.registrationNumber });
      if (vehicle) {
        vehicle.status = 'Sold';
        await vehicle.save();
        await Audit.create({
          activity: 'Vehicle Status Changed',
          details: `Approved vehicle sold alert: ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber}) status changed to Sold`
        });
      }
    } else if (alert.type === 'BOOKED') {
      await Audit.create({
        activity: 'MOT Booked',
        details: `Confirmed MOT booking approval for ${alert.makeModel} (${alert.registrationNumber})`
      });
    }

    res.json({ message: 'Alert approved successfully.', alert: formatDoc(alert) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function acknowledgeAlert(req, res) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    const userRole = req.user?.role;
    if (userRole === 'customer') {
      return res.status(403).json({ error: 'Access denied. Customers cannot acknowledge alerts.' });
    }
    if ((userRole === 'garage_admin' || userRole === 'staff') && alert.garageId) {
      if (String(alert.garageId) !== String(req.user.garageId)) {
        return res.status(403).json({ error: 'Access denied. You can only manage alerts for your own garage.' });
      }
    }

    alert.status = 'Acknowledged';
    await alert.save();

    // If it is a NEW_VEHICLE alert, mark the pending vehicle as Rejected!
    if (alert.type === 'NEW_VEHICLE') {
      const vehicle = await Vehicle.findOne({ registrationNumber: alert.registrationNumber, status: 'Pending' });
      if (vehicle) {
        vehicle.status = 'Rejected';
        await vehicle.save();
        await Audit.create({
          activity: 'Vehicle Registration Rejected',
          details: `Rejected vehicle registration request for ${alert.makeModel} (${alert.registrationNumber})`
        });
      }
    }

    res.json({ message: 'Alert acknowledged successfully.', alert: formatDoc(alert) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function rejectAlert(req, res) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    const userRole = req.user?.role;
    if (userRole === 'customer') {
      return res.status(403).json({ error: 'Access denied. Customers cannot reject alerts.' });
    }
    if ((userRole === 'garage_admin' || userRole === 'staff') && alert.garageId) {
      if (String(alert.garageId) !== String(req.user.garageId)) {
        return res.status(403).json({ error: 'Access denied. You can only manage alerts for your own garage.' });
      }
    }

    const { reason } = req.body;
    alert.status = 'Rejected';
    const defaultReason = alert.type === 'NEW_VEHICLE' 
      ? 'Vehicle registration rejected by garage' 
      : 'Booking request rejected by garage';
    alert.rejectionReason = reason || defaultReason;
    await alert.save();

    if (alert.type === 'NEW_VEHICLE') {
      const vehicle = await Vehicle.findOne({ registrationNumber: alert.registrationNumber, status: 'Pending' });
      if (vehicle) {
        vehicle.status = 'Rejected';
        vehicle.rejectionReason = reason || defaultReason;
        await vehicle.save();
        await Audit.create({
          activity: 'Vehicle Registration Rejected',
          details: `Rejected vehicle registration request for ${alert.makeModel} (${alert.registrationNumber}). Reason: ${reason || 'None provided'}`
        });
      }
    } else {
      await Audit.create({
        activity: 'MOT Booking Rejected',
        details: `Rejected booking request for ${alert.makeModel} (${alert.registrationNumber}). Reason: ${reason || 'None provided'}`
      });
    }

    res.json({ message: 'Alert rejected successfully.', alert: formatDoc(alert) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function rescheduleAlert(req, res) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    const userRole = req.user?.role;
    if ((userRole === 'garage_admin' || userRole === 'staff') && alert.garageId) {
      if (String(alert.garageId) !== String(req.user.garageId)) {
        return res.status(403).json({ error: 'Access denied. You can only manage alerts for your own garage.' });
      }
    } else if (userRole === 'customer') {
      if (alert.customerId && String(alert.customerId) !== String(req.user.customerId)) {
        return res.status(403).json({ error: 'Access denied. You can only reschedule your own bookings.' });
      }
    }

    if (alert.type !== 'BOOKED') {
      return res.status(400).json({ error: 'Only MOT Booking requests can be rescheduled.' });
    }

    const { date, slot } = req.body;
    if (!date || !slot) {
      return res.status(400).json({ error: 'Date and slot are required.' });
    }

    const vehiclePart = alert.makeModel.split(' - Slot: ')[0];
    const oldDetails = `Date: ${alert.date}, ${alert.makeModel}`;

    // Conflict checking for block slots and bookings
    const dateStr = new Date(date).toISOString().split('T')[0];
    const garage = await Garage.findById(alert.garageId);
    if (garage) {
      const isBlocked = garage.blockedSlots.some(s => s.date === dateStr && s.slot === slot);
      if (isBlocked) {
        return res.status(400).json({ error: 'This time slot is blocked by the garage.' });
      }
    }

    const alreadyBooked = await Alert.findOne({
      type: 'BOOKED',
      garageId: alert.garageId,
      date: new Date(date),
      makeModel: `${vehiclePart} - Slot: ${slot}`,
      status: { $in: ['Pending', 'Approved'] },
      _id: { $ne: alert._id }
    });
    if (alreadyBooked) {
      return res.status(400).json({ error: 'This time slot has already been booked. Please choose another slot.' });
    }
  
    alert.date = new Date(date);
    alert.makeModel = `${vehiclePart} - Slot: ${slot}`;
    alert.rescheduled = true;
    await alert.save();

    await Audit.create({
      activity: 'MOT Booking Rescheduled',
      details: `Rescheduled booking for ${vehiclePart} (${alert.registrationNumber}). Old: ${oldDetails}. New: Date: ${date}, Slot: ${slot}`
    });

    res.json({ message: 'Booking rescheduled successfully.', alert: formatDoc(alert) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllAlerts,
  createAlert,
  approveAlert,
  acknowledgeAlert,
  rejectAlert,
  rescheduleAlert
};
