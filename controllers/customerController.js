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
    let query = {};
    if (role === 'garage_admin' || role === 'staff') {
      const garageAlerts = await Alert.find({ garageId: req.user.garageId }).select('customerId');
      const customerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
      query._id = { $in: customerIds };
    }
    const customers = await Customer.find(query);
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

    if (!firstName || !email || !mobile) {
      return res.status(400).json({ error: 'First name, email, and mobile are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format.' });
    }

    // Check if email already registered as customer
    const existing = await Customer.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Customer with this email already exists.' });
    }

    const newCustomer = await Customer.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      mobile,
      preferredContact,
      address
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
    const { firstName, lastName, email, mobile, preferredContact, address } = req.body;

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
      const garageAlerts = await Alert.find({ garageId: req.user.garageId }).select('customerId');
      const customerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
      customerQuery._id = { $in: customerIds };
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
