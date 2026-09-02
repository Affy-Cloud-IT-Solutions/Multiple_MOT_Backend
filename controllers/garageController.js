const Garage = require('../models/Garage');
const User = require('../models/User');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');
const jwt = require('jsonwebtoken');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: (obj._id || obj.id || '').toString() };
};

// 1. Register a new garage and its owner account in one step
async function registerGarage(req, res) {
  try {
    const { name, address, phone, email, description, ownerName, ownerEmail, ownerPassword } = req.body;

    if (!name || !address || !ownerName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({ error: 'Garage details and owner account information are required.' });
    }

    // Check if user email already exists
    const existingUser = await User.findOne({ email: ownerEmail.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'A user account with this email already exists.' });
    }

    // Create Garage
    const newGarage = await Garage.create({
      name,
      address,
      phone: phone || '',
      email: email ? email.toLowerCase() : ownerEmail.toLowerCase(),
      description: description || '',
      status: 'Pending', // requires superadmin approval
      verificationStatus: 'Pending',
      rating: 5.0, // default rating
      distance: parseFloat((Math.random() * 8 + 1).toFixed(1)) // mock distance between 1-9 miles
    });

    // Create User (Garage Admin / Owner)
    const newOwner = await User.create({
      username: ownerName,
      email: ownerEmail.toLowerCase().trim(),
      password: ownerPassword,
      role: 'garage_admin',
      garageId: newGarage._id
    });

    // Create JWT Token for the newly registered garage admin
    const token = jwt.sign(
      { userId: newOwner._id, email: newOwner.email, role: newOwner.role, garageId: newGarage._id },
      process.env.JWT_SECRET || 'mot_app_secure_secret_token_2026',
      { expiresIn: '24h' }
    );

    await Audit.create({
      activity: 'Garage Registered',
      details: `Garage owner registered "${name}" and owner account "${ownerEmail}"`
    });

    res.status(201).json({
      message: 'Garage registered successfully and pending Platform Admin approval.',
      token,
      user: {
        id: newOwner._id,
        name: newOwner.username,
        email: newOwner.email,
        role: newOwner.role,
        garageId: newGarage._id
      },
      garage: formatDoc(newGarage)
    });
  } catch (error) {
    console.error('Garage registration error:', error);
    res.status(500).json({ error: error.message });
  }
}

// 2. Fetch list of garages
async function getGarages(req, res) {
  try {
    const role = req.user?.role;
    
    // Super Admins can see all garages. Customers/unauthenticated users only see Approved garages
    let query = { status: 'Approved' };
    if (role === 'admin') {
      query = {}; // return all garages
    }

    const garages = await Garage.find(query).sort({ rating: -1 });

    // Populate extra metrics for garages
    const enrichedGarages = await Promise.all(
      garages.map(async (g) => {
        const garageObj = formatDoc(g);
        const [staffCount, bookingsCount, garageAlerts] = await Promise.all([
          User.countDocuments({ garageId: g._id, role: { $in: ['staff', 'garage_admin'] } }),
          Alert.countDocuments({ garageId: g._id, type: 'BOOKED' }),
          Alert.find({ garageId: g._id }).select('customerId')
        ]);
        const customerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
        return {
          ...garageObj,
          staffCount,
          bookingsCount,
          customerCount: customerIds.length
        };
      })
    );

    res.json(enrichedGarages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Fetch single garage details
async function getGarageById(req, res) {
  try {
    const garage = await Garage.findById(req.params.id);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }
    const [staffList, bookingsCount, garageAlerts] = await Promise.all([
      User.find({ garageId: garage._id, role: { $in: ['staff', 'garage_admin'] } }).select('-password'),
      Alert.countDocuments({ garageId: garage._id, type: 'BOOKED' }),
      Alert.find({ garageId: garage._id }).select('customerId')
    ]);
    const customerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];

    res.json({
      ...formatDoc(garage),
      staffList: staffList.map(formatDoc),
      staffCount: staffList.length,
      bookingsCount,
      customerCount: customerIds.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Update garage services, slots, working hours, profile (Garage Owner)
async function updateGarage(req, res) {
  try {
    const { name, address, phone, email, description, services, workingDays, slots, blockedSlots } = req.body;
    const garageId = req.params.id;

    // Authorization check: Only Platform Admin or the specific Garage Owner can edit
    if (req.user?.role !== 'admin' && String(req.user?.garageId) !== String(garageId)) {
      return res.status(403).json({ error: 'Access Denied. You do not have permissions to manage this garage.' });
    }

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    if (name) garage.name = name;
    if (address) garage.address = address;
    if (phone !== undefined) garage.phone = phone;
    if (email) garage.email = email.toLowerCase();
    if (description !== undefined) garage.description = description;
    if (services) garage.services = services;
    if (workingDays) garage.workingDays = workingDays;
    if (slots) garage.slots = slots;
    if (blockedSlots) garage.blockedSlots = blockedSlots;

    await garage.save();

    await Audit.create({
      activity: 'Garage Profile Updated',
      details: `Updated profile details for garage "${garage.name}"`
    });

    res.json({
      message: 'Garage profile updated successfully.',
      garage: formatDoc(garage)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 5. Upload garage verification documents
async function uploadGarageDocs(req, res) {
  try {
    const { documentName, fileUrl } = req.body;
    const garageId = req.params.id;

    if (!documentName || !fileUrl) {
      return res.status(400).json({ error: 'Document name and file URL are required.' });
    }

    if (req.user?.role !== 'admin' && String(req.user?.garageId) !== String(garageId)) {
      return res.status(403).json({ error: 'Access Denied. You cannot manage documents for this garage.' });
    }

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    garage.verificationDocuments.push({
      name: documentName,
      fileUrl,
      uploadDate: new Date()
    });
    garage.verificationStatus = 'Pending'; // resets verification state upon document change
    await garage.save();

    await Audit.create({
      activity: 'Garage Document Uploaded',
      details: `Uploaded verification document "${documentName}" for garage "${garage.name}"`
    });

    res.json({
      message: 'Verification document uploaded successfully.',
      garage: formatDoc(garage)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 6. Approve, Reject, or Blacklist a garage (Super Admin only)
async function updateGarageStatus(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied. Only Platform Admin can approve or block garages.' });
    }

    const { status, verificationStatus } = req.body;
    const garage = await Garage.findById(req.params.id);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    if (status) {
      garage.status = status;
    }
    if (verificationStatus) {
      garage.verificationStatus = verificationStatus;
      if (verificationStatus === 'Verified') {
        garage.verificationDate = new Date();
      }
    }

    await garage.save();

    await Audit.create({
      activity: 'Garage Status Changed',
      details: `Garage "${garage.name}" status updated to: ${garage.status}, verification: ${garage.verificationStatus}`
    });

    res.json({
      message: 'Garage status updated successfully.',
      garage: formatDoc(garage)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Helper functions for date and time normalization
function timeToMinutes(t) {
  if (!t) return -1;
  const match12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const p = match12[3].toUpperCase();
    if (p === 'PM' && h !== 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = t.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  return -1;
}

function normalizeToISODate(input) {
  if (!input) return new Date().toISOString().split('T')[0];
  if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
    const [d, m, y] = input.split('-');
    return `${y}-${m}-${d}`;
  }
  return input;
}

function formatDateToDDMMYYYY(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, day] = dateInput.split('-');
      return `${day}-${m}-${y}`;
    }
    return dateInput;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

const FORTY_FIVE_MIN_SLOTS = [
  '08:30', '09:15', '10:00', '10:45',
  '11:30', '12:15', '13:00', '13:45',
  '14:30', '15:15', '16:00', '16:45'
];

function getSlotEndTime(startTimeStr) {
  const mins = timeToMinutes(startTimeStr);
  if (mins === -1) return '';
  const endMins = mins + 45;
  const endH = Math.floor(endMins / 60);
  const endM = endMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// 7. Block a booking slot for a date
async function blockGarageSlot(req, res) {
  try {
    const { date, slot } = req.body;
    const garageId = req.params.id;

    if (!date || !slot) {
      return res.status(400).json({ error: 'Date and slot are required.' });
    }

    if (req.user?.role !== 'admin' && String(req.user?.garageId) !== String(garageId)) {
      return res.status(403).json({ error: 'Access Denied.' });
    }

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    const isoDate = normalizeToISODate(date);
    const ddmmDate = formatDateToDDMMYYYY(date);

    // Check if slot already blocked
    const alreadyBlocked = garage.blockedSlots.some(
      s => (s.date === isoDate || s.date === ddmmDate || s.date === date) && s.slot === slot
    );
    if (!alreadyBlocked) {
      garage.blockedSlots.push({ date: isoDate, slot });
      await garage.save();
    }

    res.json({ message: 'Slot blocked successfully.', garage: formatDoc(garage) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 8. Unblock a booking slot for a date
async function unblockGarageSlot(req, res) {
  try {
    const { date, slot } = req.body;
    const garageId = req.params.id;

    if (!date || !slot) {
      return res.status(400).json({ error: 'Date and slot are required.' });
    }

    if (req.user?.role !== 'admin' && String(req.user?.garageId) !== String(garageId)) {
      return res.status(403).json({ error: 'Access Denied.' });
    }

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    const isoDate = normalizeToISODate(date);
    const ddmmDate = formatDateToDDMMYYYY(date);

    garage.blockedSlots = (garage.blockedSlots || []).filter(
      s => !((s.date === isoDate || s.date === ddmmDate || s.date === date) && s.slot === slot)
    );
    await garage.save();

    res.json({ message: 'Slot unblocked successfully.', garage: formatDoc(garage) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 9. Add new MOT Testing Station (Pending Super Admin approval)
async function addGarageStation(req, res) {
  try {
    const garageId = req.params.id;
    const { name, type = 'Class 4 MOT Bay', slotDuration = 40 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Station name is required.' });
    }

    if (req.user?.role !== 'admin' && String(req.user?.garageId) !== String(garageId)) {
      return res.status(403).json({ error: 'Access Denied. You can only manage stations for your own garage.' });
    }

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    // Create new station subdocument with Pending status
    const newStation = {
      name: name.trim(),
      type: type.trim(),
      slotDuration: Number(slotDuration) || 40,
      status: 'Pending',
      requestedAt: new Date(),
      isActive: true
    };

    garage.stations = garage.stations || [];
    garage.stations.push(newStation);
    await garage.save();

    const createdStation = garage.stations[garage.stations.length - 1];

    // Create alert for Super Admin
    await Alert.create({
      type: 'NEW_STATION',
      customerName: req.user?.username || 'Garage Admin',
      garageId: garage._id,
      stationId: createdStation._id,
      stationName: createdStation.name,
      status: 'Pending',
      makeModel: `${garage.name} - ${createdStation.name} (${createdStation.type})`
    });

    await Audit.create({
      activity: 'Station Addition Requested',
      details: `${req.user?.username || 'Garage Admin'} requested new station "${createdStation.name}" for "${garage.name}". Pending Super Admin approval.`
    });

    res.status(201).json({
      message: 'New station submitted successfully. Pending Platform Admin approval.',
      station: formatDoc(createdStation),
      garage: formatDoc(garage)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 10. Approve or Reject Station Addition (Super Admin only)
async function updateGarageStationStatus(req, res) {
  try {
    const { id: garageId, stationId } = req.params;
    const { status, rejectionReason } = req.body;

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied. Only Platform Admin can approve or reject station additions.' });
    }

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status ("Approved" or "Rejected") is required.' });
    }

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    const station = garage.stations.id(stationId);
    if (!station) {
      return res.status(404).json({ error: 'Station not found.' });
    }

    station.status = status;
    if (status === 'Approved') {
      station.approvedAt = new Date();
      station.rejectionReason = '';
    } else {
      station.rejectionReason = rejectionReason || 'Station request rejected by platform admin';
    }

    await garage.save();

    // Update corresponding Alert
    await Alert.updateMany(
      { type: 'NEW_STATION', stationId: station._id },
      { status: status === 'Approved' ? 'Approved' : 'Rejected', rejectionReason: station.rejectionReason }
    );

    await Audit.create({
      activity: status === 'Approved' ? 'Station Approved' : 'Station Rejected',
      details: `Platform Admin ${status.toLowerCase()} station "${station.name}" for garage "${garage.name}".`
    });

    res.json({
      message: `Station successfully ${status.toLowerCase()}.`,
      station: formatDoc(station),
      garage: formatDoc(garage)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 11. Get Daily Slots with Station Capacity
async function getGarageSlots(req, res) {
  try {
    const garageId = req.params.id;
    const rawDate = req.query.date;
    const isoDateStr = normalizeToISODate(rawDate);
    const formattedDateDDMMYYYY = formatDateToDDMMYYYY(isoDateStr);

    const garage = await Garage.findById(garageId);
    if (!garage) {
      return res.status(404).json({ error: 'Garage not found.' });
    }

    // Filter approved active stations
    let approvedStations = (garage.stations || []).filter(
      s => s.status === 'Approved' && s.isActive !== false
    );

    // If garage has no stations recorded yet, provide 1 default approved station
    if (approvedStations.length === 0) {
      approvedStations = [{
        id: 'default-station-1',
        name: 'Station 1 (Main MOT Bay)',
        type: 'Class 4 MOT Bay',
        slotDuration: 40,
        status: 'Approved'
      }];
    }

    // 45-minute slots over 9-hour workday (08:30 to 17:30)
    const standardSlots = (garage.slots && garage.slots.length >= 10)
      ? garage.slots
      : FORTY_FIVE_MIN_SLOTS;

    // Get bookings for this date
    const dayStart = new Date(isoDateStr);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(isoDateStr);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await Alert.find({
      type: 'BOOKED',
      garageId: garage._id,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['Pending', 'Approved'] }
    }).populate('customerId');

    const totalCapacityPerSlot = approvedStations.length;
    const todayBookingsSummary = [];

    const computedSlots = standardSlots.map(time => {
      const slotMins = timeToMinutes(time);

      // Check if slot is blocked in garage.blockedSlots
      const isBlocked = (garage.blockedSlots || []).some(
        b => (b.date === isoDateStr || b.date === formattedDateDDMMYYYY) && b.slot === time
      );

      // Count bookings matching this time slot (strictly by slot start time)
      const matchingBookings = bookings.filter(b => {
        // 1. Primary match: b.slotTime (extract only start time token)
        if (b.slotTime) {
          const bookingStart = b.slotTime.split(' - ')[0].trim();
          return bookingStart === time || timeToMinutes(bookingStart) === slotMins;
        }
        // 2. Fallback: Parse start time from makeModel strictly
        if (!b.makeModel) return false;
        const slotMatch = b.makeModel.match(/Slot:\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i) ||
                          b.makeModel.match(/at\s+(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
        if (slotMatch) {
          const matchedStart = slotMatch[1].trim();
          return matchedStart === time || timeToMinutes(matchedStart) === slotMins;
        }
        return false;
      });

      const bookedCount = matchingBookings.length;
      const availableCount = isBlocked ? 0 : Math.max(0, totalCapacityPerSlot - bookedCount);

      let slotStatus = 'Available';
      if (isBlocked) {
        slotStatus = 'Blocked';
      } else if (availableCount === 0) {
        slotStatus = 'Full';
      }

      const enrichedBookings = matchingBookings.map((b, idx) => {
        const assignedStationName = b.stationName || (approvedStations[idx % approvedStations.length]?.name) || `Bay ${idx + 1}`;
        const custObj = b.customerId && typeof b.customerId === 'object' ? b.customerId : null;
        const isApproved = b.status === 'Approved';
        const rawCustName = b.customerName || (custObj ? `${custObj.firstName} ${custObj.lastName}` : 'Customer');

        const bookingDetail = {
          id: b._id.toString(),
          slotTime: time,
          // Until approved by garage admin or staff, do NOT show name in slots
          customerName: isApproved ? rawCustName : 'Pending Approval',
          customerMobile: isApproved ? (custObj?.mobile || '') : '',
          customerEmail: isApproved ? (custObj?.email || '') : '',
          registrationNumber: b.registrationNumber || '',
          makeModel: b.makeModel || '',
          serviceName: b.serviceName || 'MOT Test',
          stationName: assignedStationName,
          status: b.status
        };
        todayBookingsSummary.push(bookingDetail);
        return bookingDetail;
      });

      const endTime = getSlotEndTime(time);

      return {
        time,
        endTime,
        slotLabel: `${time} - ${endTime}`,
        slotDuration: 45,
        totalCapacity: totalCapacityPerSlot,
        bookedCount,
        availableCount,
        isBlocked,
        status: slotStatus,
        bookings: enrichedBookings
      };
    });

    // Ensure all bookings for this day are captured in todayBookingsSummary with rich customer and station info
    const allBookingsTodaySummary = bookings.map((b, idx) => {
      let matchedSlot = '';
      if (b.slotTime) {
        matchedSlot = b.slotTime.split(' - ')[0].trim();
      } else if (b.makeModel) {
        const slotMatch = b.makeModel.match(/Slot:\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i) ||
                          b.makeModel.match(/at\s+(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
        if (slotMatch) {
          matchedSlot = slotMatch[1].trim();
        }
      }

      const assignedStationName = b.stationName || (approvedStations[idx % approvedStations.length]?.name) || `Bay ${(idx % Math.max(1, approvedStations.length)) + 1}`;
      const custObj = b.customerId && typeof b.customerId === 'object' ? b.customerId : null;
      const isApproved = b.status === 'Approved';
      const rawCustName = b.customerName || (custObj ? `${custObj.firstName} ${custObj.lastName}` : 'Customer');

      return {
        id: b._id.toString(),
        slotTime: matchedSlot || (b.date && b.date.getHours() ? new Date(b.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Flexible MOT Slot'),
        // Until approved by garage admin or staff, do NOT show name in slots
        customerName: isApproved ? rawCustName : 'Pending Approval',
        customerMobile: isApproved ? (custObj?.mobile || '') : '',
        customerEmail: isApproved ? (custObj?.email || '') : '',
        registrationNumber: b.registrationNumber || '',
        makeModel: b.makeModel || '',
        serviceName: b.serviceName || 'MOT Test',
        stationName: assignedStationName,
        status: b.status
      };
    });

    const totalSlots = standardSlots.length;
    const totalCapacityToday = totalSlots * approvedStations.length;
    const totalBookedToday = allBookingsTodaySummary.length;

    res.json({
      garageId: garage._id.toString(),
      garageName: garage.name,
      date: formattedDateDDMMYYYY, // Day-Month-Year format e.g. "02-09-2026"
      isoDate: isoDateStr,        // "2026-09-02"
      workingHours: '9 Hours (08:30 - 17:30)',
      slotDuration: 45,
      totalApprovedStations: approvedStations.length,
      totalSlots,
      totalCapacityToday,
      totalBookedToday,
      availableCapacityToday: Math.max(0, totalCapacityToday - totalBookedToday),
      todayBookingsSummary: allBookingsTodaySummary,
      stations: approvedStations.map(formatDoc),
      allStations: (garage.stations || []).map(formatDoc),
      slots: computedSlots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  registerGarage,
  getGarages,
  getGarageById,
  updateGarage,
  uploadGarageDocs,
  updateGarageStatus,
  blockGarageSlot,
  unblockGarageSlot,
  addGarageStation,
  updateGarageStationStatus,
  getGarageSlots
};
