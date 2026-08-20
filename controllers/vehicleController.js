const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Audit = require('../models/Audit');
const { isValidVRN } = require('../utils/validators');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id.toString() };
};

async function getAllVehicles(req, res) {
  try {
    const vehicles = await Vehicle.find({});
    res.json(vehicles.map(formatDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getVehicleById(req, res) {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }
    res.json(formatDoc(vehicle));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createVehicle(req, res) {
  try {
    const { customerId, registrationNumber, make, model, year, motExpiryDate, lastServiceDate } = req.body;

    if (!customerId || !registrationNumber || !make || !model || !motExpiryDate) {
      return res.status(400).json({ error: 'Customer ID, registration plate, make, model, and MOT expiry date are required.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(400).json({ error: 'Customer record does not exist.' });
    }

    if (!isValidVRN(registrationNumber)) {
      return res.status(400).json({ error: 'Invalid UK registration format.' });
    }

    // Check if vehicle plate already exists
    const regUpper = registrationNumber.toUpperCase().trim();
    const existingVehicle = await Vehicle.findOne({ registrationNumber: regUpper });
    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle with this registration number is already registered.' });
    }

    const dateReg = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateReg.test(motExpiryDate)) {
      return res.status(400).json({ error: 'MOT Expiry Date must be in YYYY-MM-DD format.' });
    }
    const parsedMotDate = new Date(motExpiryDate);
    if (isNaN(parsedMotDate.getTime())) {
      return res.status(400).json({ error: 'Invalid MOT Expiry Date.' });
    }

    if (lastServiceDate) {
      if (!dateReg.test(lastServiceDate)) {
        return res.status(400).json({ error: 'Last Service Date must be in YYYY-MM-DD format.' });
      }
      const parsedServiceDate = new Date(lastServiceDate);
      if (isNaN(parsedServiceDate.getTime())) {
        return res.status(400).json({ error: 'Invalid Last Service Date.' });
      }
    }

    const newVehicle = await Vehicle.create({
      customerId: customer._id,
      registrationNumber: regUpper,
      make: make.toUpperCase().trim(),
      model: model.toUpperCase().trim(),
      year: year || 2018,
      motExpiryDate: new Date(motExpiryDate),
      lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : undefined,
      status: req.body.status || 'Active'
    });

    await Audit.create({
      activity: 'Vehicle Added',
      details: `Added vehicle ${newVehicle.make} ${newVehicle.model} (${newVehicle.registrationNumber}) for customer ${customer.firstName} ${customer.lastName}`
    });

    res.status(201).json({
      message: 'Vehicle added successfully.',
      vehicle: formatDoc(newVehicle)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateVehicle(req, res) {
  try {
    const { make, model, year, motExpiryDate, lastServiceDate, status } = req.body;

    if (status && !['Active', 'Sold', 'Scrapped', 'Pending', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid vehicle status.' });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    if (make) vehicle.make = make.toUpperCase().trim();
    if (model) vehicle.model = model.toUpperCase().trim();
    if (year) vehicle.year = year;
    if (motExpiryDate) vehicle.motExpiryDate = new Date(motExpiryDate);
    if (lastServiceDate !== undefined) vehicle.lastServiceDate = lastServiceDate ? new Date(lastServiceDate) : undefined;
    if (status) vehicle.status = status;

    await vehicle.save();

    await Audit.create({
      activity: 'Vehicle Updated',
      details: `Updated details for vehicle ${vehicle.registrationNumber}`
    });

    res.json({
      message: 'Vehicle details updated.',
      vehicle: formatDoc(vehicle)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteVehicle(req, res) {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    await Audit.create({
      activity: 'Vehicle Deleted',
      details: `Removed vehicle ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
    });

    res.json({ message: 'Vehicle record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Mock DVLA Lookup Integration
function lookupDVLA(req, res) {
  const vrn = req.params.vrn.toUpperCase().trim();
  
  if (!isValidVRN(vrn)) {
    return res.status(400).json({ error: 'Invalid UK registration mark.' });
  }

  // Predefined mock database of DVLA profiles
  const MOCK_DVLA_PROFILES = {
    'AB18 CDE': {
      registrationNumber: 'AB18 CDE',
      make: 'FORD',
      model: 'FOCUS TDCI',
      year: '2018',
      color: 'Grey',
      fuelType: 'Diesel',
      engineSize: '1499cc',
      motStatus: 'Valid',
      motExpiryDate: '2027-07-12',
      taxStatus: 'Taxed'
    },
    'LD65 XYZ': {
      registrationNumber: 'LD65 XYZ',
      make: 'VAUXHALL',
      model: 'CORSA ECOFLEX',
      year: '2015',
      color: 'Red',
      fuelType: 'Petrol',
      engineSize: '1398cc',
      motStatus: 'Expired',
      motExpiryDate: '2026-01-14',
      taxStatus: 'Untaxed'
    },
    'MH07 KKK': {
      registrationNumber: 'MH07 KKK',
      make: 'BMW',
      model: '320D M SPORT',
      year: '2019',
      color: 'White',
      fuelType: 'Diesel',
      engineSize: '1995cc',
      motStatus: 'Valid',
      motExpiryDate: '2026-10-28',
      taxStatus: 'Taxed'
    }
  };

  const profile = MOCK_DVLA_PROFILES[vrn];
  if (profile) {
    return res.json({ source: 'DVLA API (MOCK)', found: true, vehicle: profile });
  }

  // Generate generic mock response on the fly
  const isPass = vrn.charCodeAt(0) % 2 === 0;
  const genericProfile = {
    registrationNumber: vrn,
    make: 'VOLKSWAGEN',
    model: 'GOLF TSI',
    year: '2017',
    color: 'Blue',
    fuelType: 'Petrol',
    engineSize: '1395cc',
    motStatus: isPass ? 'Valid' : 'Expired',
    motExpiryDate: isPass ? '2026-09-18' : '2026-05-10',
    taxStatus: isPass ? 'Taxed' : 'SORN'
  };

  res.json({ source: 'DVLA API (GENERATED MOCK)', found: true, vehicle: genericProfile });
}

// Curated list of popular makes in the UK
const POPULAR_MAKES = [
  'ALFA ROMEO', 'ASTON MARTIN', 'AUDI', 'BENTLEY', 'BMW', 'CADILLAC', 'CHEVROLET',
  'CHRYSLER', 'CITROEN', 'DACIA', 'DODGE', 'FERRARI', 'FIAT', 'FORD', 'GMC',
  'HONDA', 'HYUNDAI', 'INFINITI', 'JAGUAR', 'JEEP', 'KIA', 'LAMBORGHINI', 'LAND ROVER',
  'LEXUS', 'LOTUS', 'MASERATI', 'MAZDA', 'MCLAREN', 'MERCEDES-BENZ', 'MG', 'MINI',
  'MITSUBISHI', 'NISSAN', 'PEUGEOT', 'PORSCHE', 'RAM', 'RENAULT', 'ROLLS-ROYCE',
  'SEAT', 'SKODA', 'SUBARU', 'SUZUKI', 'TESLA', 'TOYOTA', 'VAUXHALL', 'VOLKSWAGEN', 'VOLVO'
];

async function getMakes(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = (req.query.search || '').trim().toUpperCase();

    let filtered = POPULAR_MAKES;
    if (search) {
      filtered = POPULAR_MAKES.filter(m => m.includes(search));
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json({
      makes: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getModels(req, res) {
  try {
    const make = (req.query.make || '').trim();
    if (!make) {
      return res.status(400).json({ error: 'Make query parameter is required.' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = (req.query.search || '').trim().toLowerCase();

    // Call external NHTSA API
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch models from NHTSA API: ${response.statusText}`);
    }
    const data = await response.json();
    
    let models = [];
    if (data && data.Results) {
      // Map and extract unique model names, and clean them up
      models = data.Results.map(r => r.Model_Name ? r.Model_Name.trim().toUpperCase() : '');
      models = models.filter(m => m !== '');
      // Remove duplicates
      models = [...new Set(models)].sort();
    }

    if (search) {
      models = models.filter(m => m.toLowerCase().includes(search));
    }

    const total = models.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = models.slice(start, start + limit);

    res.json({
      models: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  lookupDVLA,
  getMakes,
  getModels
};
