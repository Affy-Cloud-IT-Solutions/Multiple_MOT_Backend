const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');
const { isValidEmail, isValidMobile } = require('../utils/validators');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id.toString() };
};

async function getAllCustomers(req, res) {
  try {
    const role = req.user?.role;
    const filterGarageId = req.query.garageId || (role === 'garage_admin' || role === 'staff' ? req.user?.garageId : null);
    let query = {};
    if (filterGarageId) {
      const garageAlerts = await Alert.find({ garageId: filterGarageId }).select('customerId');
      const alertCustomerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
      query.$or = [
        { garageId: filterGarageId },
        { garageIds: filterGarageId },
        { _id: { $in: alertCustomerIds } }
      ];
    }
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers.map(formatDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getCustomerById(req, res) {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    
    // Get customer vehicles
    const vehicles = await Vehicle.find({ customerId: customer._id });
    res.json({
      ...formatDoc(customer),
      vehicles: vehicles.map(formatDoc)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createCustomer(req, res) {
  try {
    const { firstName, lastName, email, mobile, preferredContact = 'SMS', address } = req.body;
    const role = req.user?.role;
    const garageId = req.body.garageId || (role === 'garage_admin' || role === 'staff' ? req.user?.garageId : null);

    if (!firstName || !email || !mobile) {
      return res.status(400).json({ error: 'First name, email, and mobile are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    // Check if email already registered as customer
    let existing = await Customer.findOne({ email: cleanEmail });
    if (existing) {
      if (garageId) {
        const gIdStr = garageId.toString();
        const hasGarage = (existing.garageIds && existing.garageIds.some(g => g.toString() === gIdStr)) ||
                          (existing.garageId && existing.garageId.toString() === gIdStr);
        if (!hasGarage) {
          if (!existing.garageIds) existing.garageIds = [];
          existing.garageIds.push(garageId);
          if (!existing.garageId) existing.garageId = garageId;
          await existing.save();
        }

        await Audit.create({
          activity: 'Customer Linked to Garage',
          details: `Linked existing customer ${existing.firstName} ${existing.lastName} (${cleanEmail}) to garage.`
        });

        return res.status(200).json({
          message: 'Existing customer profile linked to your garage successfully.',
          customer: formatDoc(existing)
        });
      }

      return res.status(400).json({ error: 'Customer with this email already exists.' });
    }

    const newCustomer = await Customer.create({
      firstName: firstName.trim(),
      lastName: (lastName || '').trim(),
      email: cleanEmail,
      mobile: mobile.trim(),
      preferredContact,
      address: address ? address.trim() : undefined,
      garageId: garageId || undefined,
      garageIds: garageId ? [garageId] : []
    });

    await Audit.create({
      activity: 'Customer Created',
      details: `Garage staff created customer profile for ${firstName} ${lastName}`
    });

    res.status(201).json({
      message: 'Customer profile created successfully.',
      customer: formatDoc(newCustomer)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateCustomer(req, res) {
  try {
    const { firstName, lastName, email, mobile, preferredContact, address, garageId } = req.body;

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (mobile && !isValidMobile(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile format.' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    if (firstName) customer.firstName = firstName;
    if (lastName) customer.lastName = lastName;
    if (email) customer.email = email.toLowerCase();
    if (mobile) customer.mobile = mobile;
    if (preferredContact) customer.preferredContact = preferredContact;
    if (address !== undefined) customer.address = address;
    if (garageId) {
      if (!customer.garageIds) customer.garageIds = [];
      if (!customer.garageIds.some(g => g.toString() === garageId.toString())) {
        customer.garageIds.push(garageId);
      }
      if (!customer.garageId) customer.garageId = garageId;
    }

    await customer.save();

    await Audit.create({
      activity: 'Customer Updated',
      details: `Updated customer details for ${customer.firstName} ${customer.lastName}`
    });

    res.json({
      message: 'Customer updated successfully.',
      customer: formatDoc(customer)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteCustomer(req, res) {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Clean up customer vehicles
    await Vehicle.deleteMany({ customerId: customer._id });

    await Audit.create({
      activity: 'Customer Deleted',
      details: `Deleted customer profile and vehicles for ${customer.firstName} ${customer.lastName}`
    });

    res.json({ message: 'Customer profile and associated vehicles deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Advanced Search with Filters
async function searchCustomers(req, res) {
  try {
    const { query, preferredContact, status } = req.query;
    const role = req.user?.role;

    let customerQuery = {};
    if (role === 'garage_admin' || role === 'staff') {
      const gId = req.user?.garageId;
      const garageAlerts = await Alert.find({ garageId: gId }).select('customerId');
      const alertCustomerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
      customerQuery.$or = [
        { garageId: gId },
        { garageIds: gId },
        { _id: { $in: alertCustomerIds } }
      ];
    }

    const customers = await Customer.find(customerQuery);
    const vehicles = await Vehicle.find({});

    let results = customers.map(c => {
      const customerVehicles = vehicles.filter(v => v.customerId.toString() === c._id.toString());
      return {
        ...formatDoc(c),
        vehicles: customerVehicles.map(formatDoc)
      };
    });

    // Apply search query match (searches name, mobile, email, plate)
    if (query) {
      const term = query.trim().toLowerCase();
      results = results.filter(c => {
        const nameMatch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(term);
        const emailMatch = c.email.toLowerCase().includes(term);
        const mobileMatch = c.mobile.toLowerCase().includes(term);
        const plateMatch = c.vehicles.some(v => v.registrationNumber.toLowerCase().includes(term));
        return nameMatch || emailMatch || mobileMatch || plateMatch;
      });
    }

    // Apply preferredContact filter
    if (preferredContact) {
      results = results.filter(c => c.preferredContact.toLowerCase() === preferredContact.toLowerCase());
    }

    // Apply status filter
    if (status) {
      results = results.filter(c => c.vehicles.some(v => v.status.toLowerCase() === status.toLowerCase()));
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers
};
