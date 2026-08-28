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

const dvsaService = require('../services/dvsaService');

// Live DVLA Lookup Integration
async function lookupDVLA(req, res) {
  const vrn = req.params.vrn.toUpperCase().trim();
  
  if (!isValidVRN(vrn)) {
    return res.status(400).json({ error: 'Invalid UK registration mark.' });
  }

  try {
    const rawData = await dvsaService.getVehicleMotHistory(vrn);
    if (!rawData) {
      return res.status(404).json({ found: false, error: 'Vehicle details not found in DVSA registry.' });
    }

    // Map raw DVSA data to the frontend structure
    const motTests = rawData.motTests || [];
    const latestTest = motTests[0] || null;

    let advisories = [];
    let failures = [];
    if (latestTest && latestTest.defects) {
      latestTest.defects.forEach(defect => {
        const type = (defect.type || '').toUpperCase();
        if (type === 'ADVISORY' || type === 'MINOR') {
          advisories.push(defect.text);
        } else if (type === 'FAIL' || type === 'MAJOR' || type === 'DANGEROUS') {
          failures.push(defect.text);
        }
      });
    }

    const mappedVehicle = {
      registrationNumber: rawData.registration,
      make: rawData.make,
      model: rawData.model,
      year: rawData.firstUsedDate ? new Date(rawData.firstUsedDate).getFullYear() : 2018,
      color: rawData.primaryColour || 'Grey',
      fuelType: rawData.fuelType || 'Petrol',
      engineSize: rawData.engineSize ? `${rawData.engineSize}cc` : '1500cc',
      motStatus: latestTest ? (latestTest.testResult === 'PASSED' ? 'Valid' : 'Expired') : 'No History',
      motExpiryDate: latestTest ? latestTest.expiryDate : '',
      lastServiceDate: latestTest ? latestTest.completedDate : '',
      testNumber: latestTest ? latestTest.motTestNumber : '',
      mileage: latestTest ? (latestTest.odometerValue ? `${latestTest.odometerValue} ${latestTest.odometerUnit === 'MI' ? 'miles' : 'km'}` : 'N/A') : 'N/A',
      advisories,
      failures,
      motTests: motTests // Include full list for the history tab
    };

    res.json({ source: 'DVSA LIVE API', found: true, vehicle: mappedVehicle });
  } catch (error) {
    console.error('[vehicleController] lookupDVLA error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle history from DVSA.' });
  }
}

const FALLBACK_MAKES = [
  'ALFA ROMEO', 'ASTON MARTIN', 'AUDI', 'BENTLEY', 'BMW', 'CITROEN', 'CUPRA', 'DACIA', 
  'DS', 'FERRARI', 'FIAT', 'FORD', 'HONDA', 'HYUNDAI', 'JAGUAR', 'JEEP', 'KIA', 
  'LAMBORGHINI', 'LAND ROVER', 'LEXUS', 'LOTUS', 'MASERATI', 'MAZDA', 'MCLAREN', 
  'MERCEDES-BENZ', 'MG', 'MINI', 'MITSUBISHI', 'NISSAN', 'PEUGEOT', 'PORSCHE', 
  'RENAULT', 'ROLLS-ROYCE', 'SEAT', 'SKODA', 'SMART', 'SSANGYONG', 'SUBARU', 
  'SUZUKI', 'TESLA', 'TOYOTA', 'VAUXHALL', 'VOLKSWAGEN', 'VOLVO'
];

// Caches for vehicle makes
let cachedMakes = [...FALLBACK_MAKES];
let lastFetchedMakes = 0;
const MAKES_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper to map legal manufacturer names to trade names
function cleanMakeName(make) {
  if (!make) return '';
  let name = make.toUpperCase().trim();

  // Specific mappings
  if (name.includes('BAYERISCHE MOTOREN WERKE') || name.startsWith('BMW')) {
    return 'BMW';
  }
  if (name.startsWith('TESLA')) {
    return 'TESLA';
  }
  if (name.startsWith('FORD')) {
    return 'FORD';
  }
  if (name.startsWith('TOYOTA')) {
    return 'TOYOTA';
  }
  if (name.startsWith('HONDA')) {
    return 'HONDA';
  }
  if (name.startsWith('NISSAN')) {
    return 'NISSAN';
  }
  if (name.startsWith('VOLKSWAGEN')) {
    return 'VOLKSWAGEN';
  }
  if (name.startsWith('HYUNDAI')) {
    return 'HYUNDAI';
  }
  if (name.startsWith('MERCEDES-BENZ') || name.includes('MERCEDES')) {
    return 'MERCEDES-BENZ';
  }
  if (name.startsWith('CHEVROLET')) {
    return 'CHEVROLET';
  }
  if (name.startsWith('PORSCHE')) {
    return 'PORSCHE';
  }
  if (name.startsWith('AUDI')) {
    return 'AUDI';
  }
  if (name.startsWith('LEXUS')) {
    return 'LEXUS';
  }
  if (name.startsWith('MAZDA')) {
    return 'MAZDA';
  }
  if (name.startsWith('SUBARU')) {
    return 'SUBARU';
  }
  if (name.startsWith('JAGUAR')) {
    return 'JAGUAR';
  }
  if (name.startsWith('LAND ROVER')) {
    return 'LAND ROVER';
  }

  // Remove common suffixes
  name = name
    .replace(/,\s*INC\.?$/g, '')
    .replace(/,\s*LLC$/g, '')
    .replace(/\s*LLC$/g, '')
    .replace(/\s*INC\.?$/g, '')
    .replace(/\s*CORP\.?$/g, '')
    .replace(/\s*CORPORATION$/g, '')
    .replace(/\s*CO\.?,\s*LTD\.?$/g, '')
    .replace(/\s*LTD\.?$/g, '')
    .replace(/\s*LIMITED$/g, '')
    .replace(/\s*MOTOR\s+COMPANY$/g, '')
    .replace(/\s*MOTOR\s+CO\.?$/g, '')
    .replace(/\s*MOTORS$/g, '')
    .replace(/\s*GROUP$/g, '')
    .replace(/\s*OF\s+NORTH\s+AMERICA$/g, '')
    .replace(/\s*OF\s+AMERICA$/g, '');

  return name.trim();
}

// Helper to fetch makes from NHTSA API with caching
async function fetchOnlineMakes() {
  const now = Date.now();
  // If we have successfully fetched makes within the cache duration, return cache
  if (lastFetchedMakes > 0 && (now - lastFetchedMakes < MAKES_CACHE_DURATION)) {
    return cachedMakes;
  }

  try {
    const urls = [
      'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json',
      'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/truck?format=json',
      'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/motorcycle?format=json'
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    const fetchPromises = urls.map(url =>
      fetch(url, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && data.Results) {
            return data.Results.map(r => r.MakeName ? r.MakeName.trim().toUpperCase() : '').filter(Boolean);
          }
          return [];
        })
        .catch(err => {
          console.error(`Error fetching makes from ${url}:`, err.message);
          return [];
        })
    );

    const results = await Promise.all(fetchPromises);
    clearTimeout(timeoutId);

    const merged = new Set(FALLBACK_MAKES);
    // Add cleaned results from the API
    results.flat().forEach(make => {
      const cleaned = cleanMakeName(make);
      if (cleaned) {
        merged.add(cleaned);
      }
    });

    if (merged.size > 0) {
      cachedMakes = Array.from(merged).sort();
      lastFetchedMakes = now;
      console.log(`[fetchOnlineMakes] Cached ${cachedMakes.length} vehicle makes from live API.`);
    }
  } catch (error) {
    console.error('Failed to fetch vehicle makes from live API:', error.message);
    // On failure, set last fetched to retry in 10 minutes so we don't spam the failed server
    lastFetchedMakes = now - MAKES_CACHE_DURATION + (10 * 60 * 1000);
  }

  return cachedMakes;
}

async function getMakes(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = (req.query.search || '').trim().toUpperCase();

    // Trigger online fetch in the background asynchronously (never blocks the API request)
    const now = Date.now();
    if (lastFetchedMakes === 0 || (now - lastFetchedMakes > MAKES_CACHE_DURATION)) {
      // Set to now temporarily to avoid triggering duplicate parallel requests
      lastFetchedMakes = now;
      fetchOnlineMakes().catch(err => console.error('[Background Fetch Makes] Failed:', err.message));
    }

    const allMakes = cachedMakes;

    let filtered = allMakes;
    if (search) {
      filtered = allMakes.filter(m => m.includes(search));
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
    console.error('Error in getMakes endpoint:', error);
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

    // 1. Call external NHTSA API
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch models from NHTSA API: ${response.statusText}`);
    }
    const data = await response.json();
    
    let models = [];
    if (data && data.Results) {
      // 2. Map and extract unique model names, clean whitespace, and capitalize
      models = data.Results.map(r => r.Model_Name ? r.Model_Name.trim().toUpperCase() : '');
      models = models.filter(m => m !== '');
      
      // 3. Remove duplicates
      models = [...new Set(models)].sort();
    }

    // 4. Filter by optional search term
    if (search) {
      models = models.filter(m => m.toLowerCase().includes(search));
    }

    // 5. Paginate results
    const total = models.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = models.slice(start, start + limit);

    // 6. Return response containing models and pagination details
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
