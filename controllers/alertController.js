const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Audit = require('../models/Audit');
const Garage = require('../models/Garage');
const {
  sendBookingRequestEmailCustomer,
  sendBookingRequestEmailGarage,
  sendBookingRescheduledEmailCustomer,
  sendBookingRescheduledEmailGarage,
  sendBookingCancelledEmailCustomer,
  sendBookingCancelledEmailGarage,
  sendBookingConfirmedEmail,
  sendBookingRejectedEmail,
  sendVehiclePendingEmail,
  sendVehicleApprovalEmail
} = require('../services/emailService');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const id = obj._id.toString();

  let garageInfo = {};
  if (obj.garageId && typeof obj.garageId === 'object' && obj.garageId._id) {
    const g = obj.garageId;
    garageInfo = {
      garageId: g._id.toString(),
      garageName: g.name || g.garageName || obj.stationName || 'MOT Testing Station',
      garageAddress: g.address || '',
      garageCity: g.city || '',
      garagePostcode: g.postcode || '',
      garagePhone: g.phone || '',
      garageEmail: g.email || '',
      garageLatitude: g.latitude || (g.location && g.location.coordinates ? g.location.coordinates[1] : null),
      garageLongitude: g.longitude || (g.location && g.location.coordinates ? g.location.coordinates[0] : null),
      garage: {
        id: g._id.toString(),
        name: g.name || g.garageName,
        address: g.address,
        city: g.city,
        postcode: g.postcode,
        phone: g.phone,
        email: g.email,
        latitude: g.latitude || (g.location && g.location.coordinates ? g.location.coordinates[1] : null),
        longitude: g.longitude || (g.location && g.location.coordinates ? g.location.coordinates[0] : null),
        logoUrl: g.logoUrl,
        rating: g.rating
      }
    };
  }

  return { ...obj, id, ...garageInfo };
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
      query.type = { $ne: 'GARAGE_REGISTRATION' }; // Garage owners should never see platform garage registration approval alerts
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

    // Auto-complete any past MOT bookings whose date has elapsed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Alert.updateMany(
      {
        type: 'BOOKED',
        date: { $lt: today },
        status: { $in: ['Pending', 'Approved'] }
      },
      { $set: { status: 'Completed' } }
    );

    const alerts = await Alert.find(query)
      .populate('garageId', 'name garageName address city postcode phone email latitude longitude location logoUrl rating')
      .sort({ createdAt: -1 });
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
      customerEmail,
      customerMobile,
      registrationNumber,
      makeModel,
      status,
      date,
      garageId,
      serviceName,
      services,
      price,
      duration,
      slotTime,
      stationId,
      stationName
    } = req.body;
    const targetGarageId = garageId || req.user?.garageId;

    if (type === 'BOOKED' && !targetGarageId) {
      return res.status(400).json({ error: 'A garage must be selected for bookings.' });
    }

    // Determine multiple services and whether MOT is included
    const reqServices = Array.isArray(services) && services.length > 0 
      ? services 
      : (req.body.selectedServices && Array.isArray(req.body.selectedServices) ? req.body.selectedServices : []);

    let isBookingHasMot = false;
    if (reqServices.length > 0) {
      isBookingHasMot = reqServices.some(s => {
        const cat = (s.category || '').toUpperCase();
        const n = (s.name || '').toUpperCase();
        return cat === 'MOT' || n.includes('MOT');
      });
    } else {
      const cat = (req.body.serviceCategory || '').toUpperCase();
      const n = (serviceName || '').toUpperCase();
      isBookingHasMot = cat === 'MOT' || n.includes('MOT');
    }
    const isBookingDateOnly = !isBookingHasMot;

    let finalServiceName = serviceName;
    if (reqServices.length > 0) {
      finalServiceName = reqServices.map(s => s.name).join(', ');
    } else if (!finalServiceName) {
      finalServiceName = isBookingHasMot ? 'MOT Test' : 'Vehicle Service';
    }

    let finalPrice = price !== undefined 
      ? Number(price) 
      : (reqServices.length > 0 ? reqServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0) : 45.00);

    let finalDuration = duration !== undefined 
      ? Number(duration) 
      : (reqServices.length > 0 ? reqServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0) : 45);

    let finalCategory = req.body.serviceCategory || (isBookingHasMot ? 'MOT' : (reqServices[0]?.category || 'Servicing'));

    let assignedStationId = stationId;
    let assignedStationName = stationName;
    let normalizedSlotTime = '';

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
      const garage = await Garage.findById(targetGarageId);
      if (garage && garage.status !== 'Approved') {
        return res.status(400).json({ error: 'This garage is currently under review and cannot accept bookings yet.' });
      }

      // Check if the entire date is closed/blocked by the garage for workshop intake
      if (garage && isoDateStr) {
        const [y, m, d] = isoDateStr.split('-');
        const ddmmDate = `${d}-${m}-${y}`;
        const isDateBlocked = (garage.blockedSlots || []).some(
          s => (s.date === isoDateStr || s.date === ddmmDate || s.date === date) &&
               (s.slot === 'FULL_DAY' || s.slot === 'ALL_SERVICES' || (reqServices.some(sv => s.slot === `SERVICE_DATE_${sv.name}`)) || s.slot === `SERVICE_DATE_${serviceName}`)
        );
        if (isDateBlocked) {
          return res.status(400).json({ error: `The date ${ddmmDate} is blocked / closed for workshop intake by the garage.` });
        }
      }

      if (isBookingHasMot) {
        // MOT booking requires time slot selection and station capacity check
        let timeToken = '';
        if (slotTime) {
          timeToken = slotTime.split(' - ')[0].trim();
        } else if (makeModel && makeModel.includes('Slot:')) {
          const match = makeModel.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
          if (match) timeToken = match[1].trim();
        }
        normalizedSlotTime = timeToken;

        if (!normalizedSlotTime) {
          return res.status(400).json({ error: 'A time slot must be selected for MOT tests.' });
        }

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
            // Date-only bookings don't consume MOT bay capacity
            if (b.hasMot === false && !b.slotTime) return false;

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
      } else {
        // Date-only booking (non-MOT service: Servicing, Repairs, Brakes, Diagnostics, etc.)
        // No time slots exist for non-MOT services!
        normalizedSlotTime = slotTime || '';
        assignedStationId = undefined;
        assignedStationName = undefined;
      }

      let computedSlotNumber = req.body.slotNumber;
      if (!computedSlotNumber && normalizedSlotTime && isBookingHasMot) {
        const standardSlots = [
          '08:30', '09:15', '10:00', '10:45',
          '11:30', '12:15', '13:00', '13:45',
          '14:30', '15:15', '16:00', '16:45'
        ];
        const slotIndex = standardSlots.indexOf(normalizedSlotTime);
        if (slotIndex !== -1) {
          computedSlotNumber = slotIndex + 1;
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
        existingAlert.serviceName = finalServiceName;
        existingAlert.services = reqServices.length > 0 ? reqServices : existingAlert.services;
        existingAlert.hasMot = isBookingHasMot;
        existingAlert.isDateOnly = isBookingDateOnly;
        existingAlert.serviceCategory = finalCategory;
        existingAlert.price = finalPrice;
        existingAlert.duration = finalDuration;
        existingAlert.status = status || 'Pending';
        existingAlert.slotTime = normalizedSlotTime || '';
        if (computedSlotNumber) existingAlert.slotNumber = computedSlotNumber;
        if (assignedStationId) existingAlert.stationId = assignedStationId;
        if (assignedStationName) existingAlert.stationName = assignedStationName;
        existingAlert.date = bookingDate;
        await existingAlert.save();

        let detailsStr = `${customerName} rescheduled booking for ${makeModel} (${registrationNumber}) via portal.`;
        if (status === 'Approved') {
          detailsStr = `Garage staff rescheduled booking for ${customerName}'s ${makeModel} (${registrationNumber}).`;
        }

        await Audit.create({
          activity: isBookingHasMot ? 'MOT Booking Rescheduled' : 'Service Booking Rescheduled',
          details: detailsStr
        });

        if (customerId && targetGarageId) {
          await Customer.findByIdAndUpdate(customerId, {
            $addToSet: { garageIds: targetGarageId }
          }).catch(err => console.error('[alertController] failed to link customer to garage:', err));
        }

        await existingAlert.populate('garageId', 'name garageName address city postcode phone email latitude longitude location logoUrl rating');

        // Dispatch Reschedule Notification Emails to Customer and Garage
        (async () => {
          try {
            let cust = null;
            if (customerId) {
              try { cust = await Customer.findById(customerId); } catch (e) {}
            }
            if (!cust && (customerEmail || req.body.customerEmail)) {
              const emailToFind = (customerEmail || req.body.customerEmail).trim().toLowerCase();
              cust = await Customer.findOne({ email: emailToFind });
            }
            if (!cust && (customerEmail || req.body.customerEmail)) {
              cust = {
                email: (customerEmail || req.body.customerEmail).trim().toLowerCase(),
                firstName: customerName?.split(' ')[0] || customerName || 'Customer',
                lastName: customerName?.split(' ').slice(1).join(' ') || '',
                mobile: customerMobile || req.body.customerMobile || ''
              };
            }
            const gar = existingAlert.garageId;
            if (cust && cust.email && gar) {
              sendBookingRescheduledEmailCustomer(existingAlert, cust, gar, status === 'Approved').catch(err =>
                console.error('[alertController] Failed to send customer reschedule email:', err.message)
              );
              if (status !== 'Approved') {
                sendBookingRescheduledEmailGarage(existingAlert, cust, gar).catch(err =>
                  console.error('[alertController] Failed to send garage reschedule email:', err.message)
                );
              }
            }
          } catch (e) {
            console.error('[alertController] Error dispatching reschedule emails:', e.message);
          }
        })();

        return res.status(200).json({ message: 'Alert rescheduled successfully.', alert: formatDoc(existingAlert) });
      }
    }

    let computedSlotNumber = req.body.slotNumber;
    if (!computedSlotNumber && normalizedSlotTime && isBookingHasMot) {
      const standardSlots = [
        '08:30', '09:15', '10:00', '10:45',
        '11:30', '12:15', '13:00', '13:45',
        '14:30', '15:15', '16:00', '16:45'
      ];
      const slotIndex = standardSlots.indexOf(normalizedSlotTime);
      if (slotIndex !== -1) {
        computedSlotNumber = slotIndex + 1;
      }
    }

    const newAlert = await Alert.create({
      type,
      customerName,
      customerId,
      customerEmail: customerEmail || req.body.email || undefined,
      customerMobile: customerMobile || req.body.mobile || undefined,
      garageId: targetGarageId,
      stationId: assignedStationId,
      stationName: assignedStationName,
      slotTime: normalizedSlotTime,
      slotNumber: computedSlotNumber,
      registrationNumber,
      makeModel,
      serviceName: finalServiceName,
      services: reqServices,
      hasMot: isBookingHasMot,
      isDateOnly: isBookingDateOnly,
      serviceCategory: finalCategory,
      price: finalPrice,
      duration: finalDuration,
      status: status || 'Pending',
      date: bookingDate
    });

    if (customerId && targetGarageId) {
      await Customer.findByIdAndUpdate(customerId, {
        $addToSet: { garageIds: targetGarageId }
      }).catch(err => console.error('[alertController] failed to link customer to garage:', err));
    }

    let auditActivity = 'Notification Received';
    let auditDetails = `Received alert of type ${type} for customer ${customerName}`;
    
    if (type === 'BOOKED') {
      if (status === 'Approved') {
        auditActivity = `${serviceName || 'Service'} Booked`;
        auditDetails = `Confirmed ${serviceName || 'Service'} booking approval for ${makeModel} (${registrationNumber})`;
      } else {
        auditActivity = `${serviceName || 'Service'} Booking Requested`;
        auditDetails = `${customerName} requested ${serviceName || 'Service'} booking for ${makeModel} (${registrationNumber}) via portal.`;
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

    await newAlert.populate('garageId', 'name garageName address city postcode phone email latitude longitude location logoUrl rating');

    // Async Email Notifications for MOT & Service Bookings & New Vehicle Registrations
    if (type === 'BOOKED') {
      (async () => {
        try {
          let cust = null;
          if (customerId) {
            try { cust = await Customer.findById(customerId); } catch (e) {}
          }
          if (!cust && (customerEmail || req.body.email)) {
            const emailToFind = (customerEmail || req.body.email).trim().toLowerCase();
            cust = await Customer.findOne({ email: emailToFind });
          }
          if (!cust && (customerEmail || req.body.email)) {
            cust = {
              email: (customerEmail || req.body.email).trim().toLowerCase(),
              firstName: customerName?.split(' ')[0] || customerName || 'Customer',
              lastName: customerName?.split(' ').slice(1).join(' ') || '',
              mobile: customerMobile || req.body.mobile || ''
            };
          }
          const gar = newAlert.garageId;
          if (cust && cust.email && gar) {
            if (status === 'Approved') {
              // Direct staff booking is already approved -> send confirmation email to customer
              sendBookingConfirmedEmail(newAlert, cust, gar).catch(err =>
                console.error('[alertController] Failed to send customer booking confirmed email:', err.message)
              );
            } else {
              // Online customer request pending garage approval
              sendBookingRequestEmailCustomer(newAlert, cust, gar).catch(err =>
                console.error('[alertController] Failed to send customer booking request email:', err.message)
              );
              sendBookingRequestEmailGarage(newAlert, cust, gar).catch(err =>
                console.error('[alertController] Failed to send garage booking request email:', err.message)
              );
            }
          }
        } catch (e) {
          console.error('[alertController] Error dispatching booking creation emails:', e.message);
        }
      })();
    } else if (type === 'NEW_VEHICLE') {
      (async () => {
        try {
          const cust = customerId ? await Customer.findById(customerId) : null;
          if (cust) {
            if (status === 'Approved' || status === 'Active') {
              sendVehicleApprovalEmail(cust, {
                registrationNumber: newAlert.registrationNumber,
                makeModel: newAlert.makeModel,
                motExpiryDate: newAlert.date
              }, 'Approved').catch(err =>
                console.error('[alertController] Failed to send vehicle approved email:', err.message)
              );
            } else {
              sendVehiclePendingEmail(cust, {
                registrationNumber: newAlert.registrationNumber,
                makeModel: newAlert.makeModel,
                motExpiryDate: newAlert.date
              }).catch(err =>
                console.error('[alertController] Failed to send vehicle pending email:', err.message)
              );
            }
          }
        } catch (e) {
          console.error('[alertController] Error dispatching vehicle registration email:', e.message);
        }
      })();
    }

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

      // Email notification to customer about vehicle approval
      if (alert.customerId) {
        Customer.findById(alert.customerId).then(customer => {
          if (customer) {
            sendVehicleApprovalEmail(customer, {
              registrationNumber: alert.registrationNumber,
              make: make.toUpperCase(),
              model: model.toUpperCase(),
              motExpiryDate: alert.motExpiryDate
            }, 'Approved').catch(err => console.error('[alertController] Error sending vehicle approval email:', err.message));
          }
        }).catch(err => console.error('[alertController] Customer lookup failed for vehicle approval email:', err.message));
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

      // Email notification to customer about booking confirmation
      (async () => {
        try {
          const cust = alert.customerId ? await Customer.findById(alert.customerId) : null;
          const gar = alert.garageId ? await Garage.findById(alert.garageId) : null;
          if (cust) {
            sendBookingConfirmedEmail(alert, cust, gar).catch(err =>
              console.error('[alertController] Failed to send booking confirmation email:', err.message)
            );
          }
        } catch (e) {
          console.error('[alertController] Error dispatching booking confirmation email:', e.message);
        }
      })();
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

        if (alert.customerId) {
          Customer.findById(alert.customerId).then(customer => {
            if (customer) {
              sendVehicleApprovalEmail(customer, vehicle, 'Rejected', 'Vehicle verification rejected by garage').catch(err =>
                console.error('[alertController] Error sending vehicle rejection email:', err.message)
              );
            }
          }).catch(err => console.error('[alertController] Customer lookup failed for rejection email:', err.message));
        }
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

      if (alert.customerId) {
        Customer.findById(alert.customerId).then(customer => {
          if (customer) {
            sendVehicleApprovalEmail(customer, {
              registrationNumber: alert.registrationNumber,
              makeModel: alert.makeModel
            }, 'Rejected', alert.rejectionReason).catch(err =>
              console.error('[alertController] Error sending vehicle rejection email:', err.message)
            );
          }
        }).catch(err => console.error('[alertController] Customer lookup failed for rejection email:', err.message));
      }
    } else if (alert.type === 'BOOKED') {
      await Audit.create({
        activity: 'MOT Booking Rejected',
        details: `Rejected booking request for ${alert.makeModel} (${alert.registrationNumber}). Reason: ${reason || 'None provided'}`
      });

      (async () => {
        try {
          const cust = alert.customerId ? await Customer.findById(alert.customerId) : null;
          const gar = alert.garageId ? await Garage.findById(alert.garageId) : null;
          if (cust) {
            sendBookingRejectedEmail(alert, cust, gar, alert.rejectionReason).catch(err =>
              console.error('[alertController] Failed to send booking rejection email:', err.message)
            );
          }
        } catch (e) {
          console.error('[alertController] Error dispatching booking rejection email:', e.message);
        }
      })();
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
      return res.status(400).json({ error: 'Only booking requests can be rescheduled.' });
    }

    const { date, slot } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date is required for rescheduling.' });
    }

    const isBookingMot = alert.hasMot !== false && (
      alert.hasMot === true ||
      (alert.serviceName && alert.serviceName.toLowerCase().includes('mot')) ||
      Boolean(alert.slotTime)
    );

    if (isBookingMot && !slot) {
      return res.status(400).json({ error: 'Time slot is required for MOT booking reschedule.' });
    }

    const vehiclePart = alert.makeModel ? alert.makeModel.split(' - Slot: ')[0].split(' - ')[0] : (alert.registrationNumber || 'Vehicle');
    const oldDetails = `Date: ${alert.date}, ${alert.makeModel}`;

    // Conflict checking for block slots and bookings
    const dateStr = new Date(date).toISOString().split('T')[0];
    const garage = await Garage.findById(alert.garageId);
    if (garage) {
      const isDateBlocked = (garage.blockedSlots || []).some(
        s => s.date === dateStr && (s.slot === 'FULL_DAY' || s.slot === 'ALL_SERVICES' || s.slot === `SERVICE_DATE_${alert.serviceName}`)
      );
      if (isDateBlocked) {
        return res.status(400).json({ error: 'This date is blocked / closed by the garage.' });
      }

      if (isBookingMot && slot) {
        const isBlocked = garage.blockedSlots.some(s => s.date === dateStr && s.slot === slot);
        if (isBlocked) {
          return res.status(400).json({ error: 'This time slot is blocked by the garage.' });
        }
      }
    }

    if (isBookingMot && slot) {
      const alreadyBooked = await Alert.findOne({
        type: 'BOOKED',
        garageId: alert.garageId,
        date: new Date(date),
        slotTime: slot,
        status: { $in: ['Pending', 'Approved'] },
        _id: { $ne: alert._id }
      });
      if (alreadyBooked) {
        return res.status(400).json({ error: 'This time slot has already been booked. Please choose another slot.' });
      }

      alert.slotTime = slot;
      alert.makeModel = `${vehiclePart} - Slot: ${slot}`;
    } else {
      // Date-only service booking
      alert.slotTime = '';
      alert.makeModel = `${vehiclePart} - ${alert.serviceName || 'Service'}`;
    }
  
    alert.date = new Date(date);
    alert.rescheduled = true;
    await alert.save();

    await Audit.create({
      activity: isBookingMot ? 'MOT Booking Rescheduled' : 'Service Booking Rescheduled',
      details: `Rescheduled booking for ${vehiclePart} (${alert.registrationNumber}). Old: ${oldDetails}. New: Date: ${date}${isBookingMot && slot ? `, Slot: ${slot}` : ' (Full Day Drop-off)'}`
    });

    await alert.populate('garageId', 'name garageName address city postcode phone email latitude longitude location logoUrl rating');

    // Dispatch Reschedule Notification Emails
    (async () => {
      try {
        const cust = alert.customerId ? await Customer.findById(alert.customerId) : null;
        const gar = alert.garageId;
        if (cust && gar) {
          sendBookingRescheduledEmailCustomer(alert, cust, gar, alert.status === 'Approved').catch(err =>
            console.error('[alertController] Failed to send customer reschedule email:', err.message)
          );
          sendBookingRescheduledEmailGarage(alert, cust, gar).catch(err =>
            console.error('[alertController] Failed to send garage reschedule email:', err.message)
          );
        }
      } catch (e) {
        console.error('[alertController] Error dispatching reschedule emails:', e.message);
      }
    })();

    res.json({ message: 'Booking rescheduled successfully.', alert: formatDoc(alert) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function cancelAlert(req, res) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert / Booking not found.' });
    }

    const userRole = req.user?.role;
    let cancelledBy = 'Customer';
    if ((userRole === 'garage_admin' || userRole === 'staff') && alert.garageId) {
      if (String(alert.garageId) !== String(req.user.garageId)) {
        return res.status(403).json({ error: 'Access denied. You can only manage bookings for your own garage.' });
      }
      cancelledBy = 'Garage';
    } else if (userRole === 'customer') {
      if (alert.customerId && String(alert.customerId) !== String(req.user.customerId)) {
        return res.status(403).json({ error: 'Access denied. You can only cancel your own bookings.' });
      }
      cancelledBy = 'Customer';
    } else if (userRole === 'admin') {
      cancelledBy = 'Admin';
    }

    if (alert.type !== 'BOOKED') {
      return res.status(400).json({ error: 'Only bookings can be cancelled.' });
    }

    if (alert.status === 'Cancelled') {
      return res.status(400).json({ error: 'This booking has already been cancelled.' });
    }

    const cancellationReason = req.body?.reason || req.body?.cancellationReason || '';

    alert.status = 'Cancelled';
    alert.cancellationReason = cancellationReason;
    alert.cancelledBy = cancelledBy;
    alert.cancelledAt = new Date();
    await alert.save();

    const vehiclePart = alert.makeModel ? alert.makeModel.split(' - Slot: ')[0] : 'Vehicle';
    const bookingDateStr = alert.date ? new Date(alert.date).toLocaleDateString('en-GB') : '';
    const slotStr = alert.slotTime || (alert.makeModel && alert.makeModel.includes(' - Slot: ') ? alert.makeModel.split(' - Slot: ')[1] : '');

    await Audit.create({
      activity: 'MOT Booking Cancelled',
      details: `${cancelledBy} cancelled booking for ${vehiclePart} (${alert.registrationNumber || ''}) on ${bookingDateStr} at ${slotStr}.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`
    });

    // 1. Resolve Customer Details
    let cust = null;
    try {
      if (alert.customerId) {
        cust = await Customer.findById(alert.customerId);
      }
      if (!cust && req.user?.customerId) {
        cust = await Customer.findById(req.user.customerId);
      }
      if (!cust && req.user?.email) {
        cust = {
          email: req.user.email,
          firstName: alert.customerName || req.user.username || 'Customer'
        };
      }
    } catch (custErr) {
      console.error('[alertController] Customer resolution error:', custErr.message);
    }

    // 2. Resolve Garage Details
    let gar = null;
    try {
      if (alert.garageId) {
        gar = await Garage.findById(alert.garageId._id || alert.garageId);
      }
      if (!gar && alert.stationId) {
        gar = await Garage.findById(alert.stationId);
      }
    } catch (garErr) {
      console.error('[alertController] Garage resolution error:', garErr.message);
    }

    console.log(`[alertController] Dispatching cancellation emails -> Customer: ${cust?.email || 'N/A'}, Garage: ${gar?.email || 'N/A'}`);

    // 3. Dispatch Cancellation Emails to Customer and Garage
    const emailTasks = [];
    if (gar && gar.email) {
      emailTasks.push(
        sendBookingCancelledEmailGarage(alert, cust || { firstName: alert.customerName }, gar, cancelledBy, cancellationReason)
          .then(res => console.log(`[alertController] Garage cancellation email sent: ${res}`))
          .catch(err => console.error('[alertController] Failed to send garage cancellation email:', err.message))
      );
    } else {
      console.warn('[alertController] Skipping garage email: No garage email found for alert', alert._id);
    }

    if (cust && cust.email) {
      emailTasks.push(
        sendBookingCancelledEmailCustomer(alert, cust, gar || {}, cancelledBy, cancellationReason)
          .then(res => console.log(`[alertController] Customer cancellation email sent: ${res}`))
          .catch(err => console.error('[alertController] Failed to send customer cancellation email:', err.message))
      );
    } else {
      console.warn('[alertController] Skipping customer email: No customer email found for alert', alert._id);
    }

    // Await delivery before completing response to ensure emails are sent
    if (emailTasks.length > 0) {
      try {
        await Promise.allSettled(emailTasks);
      } catch (waitErr) {
        console.error('[alertController] Error waiting for email dispatch:', waitErr.message);
      }
    }

    res.json({ message: 'Booking cancelled successfully.', alert: formatDoc(alert) });
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
  rescheduleAlert,
  cancelAlert
};

