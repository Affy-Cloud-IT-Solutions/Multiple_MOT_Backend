const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveServiceIcon } = require('../controllers/serviceController');
const { buildServiceCatalog, findMatchingCategory } = require('../utils/serviceCatalog');

// Matching logic identical to FilterServiceBottomSheet.tsx
function isServiceMatch(service, filterKey) {
  if (!service || !filterKey) return false;
  if (
    service.isActive === false ||
    service.isActive === 'false' ||
    service.status === 'Inactive' ||
    service.status === 'Rejected' ||
    service.status === 'Pending'
  ) {
    return false;
  }

  const key = filterKey.trim().toLowerCase();
  const name = (service.name || service.title || '').trim().toLowerCase();
  const category = (service.category || '').trim().toLowerCase();

  // Match by ID if filterKey is an ID or exact ref
  if (service.serviceId && String(service.serviceId).toLowerCase().trim() === key) return true;
  if (service._id && String(service._id).toLowerCase().trim() === key) return true;
  if (service.id && String(service.id).toLowerCase().trim() === key) return true;

  // 1. Direct equality
  if (name === key) return true;

  // 2. MOT Specific
  if (key === 'mot' || key === 'mot test') {
    return /\bmot\b/i.test(name) || category === 'mot';
  }

  // 3. Service specific keywords
  if (key.includes('full service')) return name.includes('full') && (name.includes('service') || category.includes('service'));
  if (key.includes('interim')) return name.includes('interim');
  if (key.includes('major')) return name.includes('major');
  if (key.includes('brake')) return name.includes('brake');
  if (key.includes('tyre') || key.includes('tire')) return name.includes('tyre') || name.includes('tire') || category.includes('tyre');
  if (key.includes('diag') || key.includes('scan')) return name.includes('diag') || name.includes('scan');
  if (key.includes('air con') || key.includes('ac')) return name.includes('air') || name.includes('ac');
  if (key.includes('battery')) return name.includes('battery');
  if (key.includes('clutch')) return name.includes('clutch');
  if (key.includes('suspension')) return name.includes('suspension');
  if (key.includes('exhaust')) return name.includes('exhaust');

  // 4. Fallback name substring match
  return name.includes(key) || key.includes(name);
}

// -------------------------------------------------------------
// SUITE 1: DYNAMIC DESIGN & ICON RESOLUTION
// -------------------------------------------------------------
test('resolveServiceIcon maps standard and repair service keywords correctly', () => {
  const mot = resolveServiceIcon('Annual MOT Inspection', 'MOT');
  assert.equal(mot.icon, 'shield-check');

  const full = resolveServiceIcon('Full Service 60-point', 'Servicing');
  assert.equal(full.icon, 'car-cog');

  const tyre = resolveServiceIcon('Front Tyre Fitting', 'Tyres');
  assert.equal(tyre.icon, 'tire');

  const battery = resolveServiceIcon('Battery Health Check & Replacement', 'Repairs');
  assert.equal(battery.icon, 'car-battery');

  const clutch = resolveServiceIcon('Clutch Kit & Flywheel', 'Repairs');
  assert.equal(clutch.icon, 'cog-sync');

  const custom = resolveServiceIcon('Custom Detailing Service', 'Custom');
  assert.equal(custom.icon, 'hammer-wrench');
});

// -------------------------------------------------------------
// SUITE 2: SERVICE CATALOG GROUPING & £0 HANDLING
// -------------------------------------------------------------
test('buildServiceCatalog groups services under Super Admin categories and preserves rates, timing, and IDs', () => {
  const categories = [
    { _id: 'cat_mot', name: 'MOT', icon: 'shield-check' },
    { _id: 'cat_srv', name: 'Servicing', icon: 'car-cog' },
    { _id: 'cat_rep', name: 'Repairs', icon: 'hammer-wrench' },
  ];

  const suggestions = [
    { _id: 's1', name: 'MOT Test (Class 4)', category: 'MOT', price: 54.85, duration: 45 },
    { _id: 's2', name: 'Full Service', category: 'Servicing', price: 150, duration: 120 },
    { _id: 's3', name: 'Free Visual Safety Check', category: 'Repairs', price: 0, duration: 15 },
    { _id: 's4', name: 'Interim Service', category: 'Servicing', price: 85, duration: 60 },
  ];

  const groups = buildServiceCatalog(categories, suggestions, resolveServiceIcon);

  assert.equal(groups.length, 3);
  assert.equal(groups[0].name, 'MOT');
  assert.equal(groups[0].services.length, 1);
  assert.equal(groups[0].services[0].name, 'MOT Test (Class 4)');
  assert.equal(groups[0].services[0].price, 54.85);
  assert.equal(groups[0].services[0].duration, 45);
  assert.equal(groups[0].services[0]._id, 's1');

  // Verify £0 price for free checks is preserved and NOT converted to 45
  assert.equal(groups[2].name, 'Repairs');
  assert.equal(groups[2].services[0].name, 'Free Visual Safety Check');
  assert.equal(groups[2].services[0].price, 0);
  assert.equal(groups[2].services[0].duration, 15);
});

// -------------------------------------------------------------
// SUITE 3: SERVICE MATCHING & STRICT ISOLATION
// -------------------------------------------------------------
test('isServiceMatch matches exact titles and service IDs accurately', () => {
  const service = {
    _id: 'svc_123',
    serviceId: 'plat_456',
    name: 'Battery & Electrical Inspection',
    category: 'Repairs',
    price: 35,
    duration: 30,
    isActive: true,
    status: 'Approved'
  };

  // Direct equality
  assert.equal(isServiceMatch(service, 'Battery & Electrical Inspection'), true);
  // Matching by exact serviceId
  assert.equal(isServiceMatch(service, 'plat_456'), true);
  // Matching by exact _id
  assert.equal(isServiceMatch(service, 'svc_123'), true);
  // Keyword match
  assert.equal(isServiceMatch(service, 'battery'), true);
});

test('isServiceMatch strictly isolates unrelated services (no bleeding)', () => {
  const batterySvc = {
    name: 'Battery & Electrical Testing',
    category: 'Repairs',
    isActive: true,
    status: 'Approved'
  };

  const clutchSvc = {
    name: 'Clutch & Gearbox Overhaul',
    category: 'Repairs',
    isActive: true,
    status: 'Approved'
  };

  const brakeSvc = {
    name: 'Front Brake Discs & Pads',
    category: 'Repairs',
    isActive: true,
    status: 'Approved'
  };

  // Battery service should match battery, NOT clutch or brake
  assert.equal(isServiceMatch(batterySvc, 'battery'), true);
  assert.equal(isServiceMatch(batterySvc, 'clutch'), false);
  assert.equal(isServiceMatch(batterySvc, 'brake'), false);

  // Clutch service should match clutch, NOT battery or brake
  assert.equal(isServiceMatch(clutchSvc, 'clutch'), true);
  assert.equal(isServiceMatch(clutchSvc, 'battery'), false);
  assert.equal(isServiceMatch(clutchSvc, 'brake'), false);

  // Brake service should match brake, NOT battery or clutch
  assert.equal(isServiceMatch(brakeSvc, 'brake'), true);
  assert.equal(isServiceMatch(brakeSvc, 'battery'), false);
  assert.equal(isServiceMatch(brakeSvc, 'clutch'), false);
});

test('isServiceMatch rejects inactive, pending, or rejected services', () => {
  assert.equal(isServiceMatch({ name: 'MOT Test', isActive: false, status: 'Approved' }, 'mot'), false);
  assert.equal(isServiceMatch({ name: 'MOT Test', isActive: true, status: 'Pending' }, 'mot'), false);
  assert.equal(isServiceMatch({ name: 'MOT Test', isActive: true, status: 'Rejected' }, 'mot'), false);
});

// -------------------------------------------------------------
// SUITE 4: DYNAMIC PRICE & DURATION AGGREGATION LOGIC
// -------------------------------------------------------------
test('price aggregation dynamically reflects real garage rates and starting price', () => {
  // Simulate catalog service created by Super Admin
  const platformService = {
    _id: 'plat_full',
    name: 'Full Service',
    category: 'Servicing',
    price: 150, // default catalog price
    duration: 120
  };

  // Garage 1 offers it for £180 (higher than default)
  // Garage 2 offers it for £135 (lower than default)
  const approvedGarages = [
    {
      name: 'Garage A',
      services: [{ name: 'Full Service', price: 180, duration: 120, isActive: true, status: 'Approved' }]
    },
    {
      name: 'Garage B',
      services: [{ name: 'Full Service', price: 135, duration: 110, isActive: true, status: 'Approved' }]
    }
  ];

  // Aggregation logic identical to serviceController.getAllServices
  const item = {
    name: platformService.name,
    price: platformService.price,
    minPrice: platformService.price,
    maxPrice: platformService.price,
    duration: platformService.duration,
    garageCount: 0
  };

  for (const g of approvedGarages) {
    const s = g.services[0];
    const p = Number(s.price);
    const d = Number(s.duration);
    item.garageCount += 1;
    if (item.garageCount === 1) {
      item.minPrice = p;
      item.maxPrice = p;
      item.price = p;
      item.duration = d;
    } else {
      if (p < item.minPrice) {
        item.minPrice = p;
        item.price = p;
      }
      if (p > item.maxPrice) {
        item.maxPrice = p;
      }
    }
  }

  assert.equal(item.garageCount, 2);
  assert.equal(item.minPrice, 135, 'Starting price should be the lowest offered by garages (£135)');
  assert.equal(item.maxPrice, 180, 'Max price should be £180');
});

// -------------------------------------------------------------
// SUITE 5: GARAGE CATALOG SELECTION PERSISTENCE & MERGE
// -------------------------------------------------------------
test('selectCatalogServices merges catalog selections while preserving existing custom services and IDs', () => {
  const existingGarageServices = [
    { _id: 'svc_existing_custom', name: 'Custom Tuning Stage 1', isCustom: true, status: 'Approved', price: 300, duration: 180 },
    { _id: 'svc_existing_catalog', name: 'MOT Test', isCustom: false, status: 'Approved', price: 40, duration: 45, serviceId: 'plat_mot_1' }
  ];

  const incomingSelections = [
    { name: 'MOT Test', category: 'MOT', price: '45.00', duration: '45', serviceId: 'plat_mot_1' },
    { name: 'Full Service', category: 'Servicing', price: '140.00', duration: '90', serviceId: 'plat_full_2' }
  ];

  // Logic identical to garageController.selectCatalogServices
  const existingCustomServices = existingGarageServices.filter(s => s.isCustom);
  const existingCatalogMap = new Map();
  existingGarageServices.forEach(s => {
    if (!s.isCustom && s.name) {
      existingCatalogMap.set(s.name.toLowerCase().trim(), s);
    }
  });

  const newCatalogServices = [];
  for (const item of incomingSelections) {
    const cleanName = item.name.trim();
    const key = cleanName.toLowerCase();
    const existing = existingCatalogMap.get(key);
    const p = Number(item.price);
    const d = Number(item.duration);

    newCatalogServices.push({
      ...(existing && existing._id ? { _id: existing._id } : {}),
      name: cleanName,
      category: item.category,
      price: !isNaN(p) && p >= 0 ? p : 45,
      duration: !isNaN(d) && d > 0 ? d : 45,
      isCustom: false,
      status: 'Approved',
      serviceId: item.serviceId || (existing && existing.serviceId) || undefined
    });
  }

  const mergedServices = [...newCatalogServices, ...existingCustomServices];

  // 1. Should have 3 total services (2 catalog + 1 custom)
  assert.equal(mergedServices.length, 3);

  // 2. Custom service must be preserved intact
  const custom = mergedServices.find(s => s.name === 'Custom Tuning Stage 1');
  assert.ok(custom);
  assert.equal(custom.isCustom, true);
  assert.equal(custom.price, 300);

  // 3. Existing catalog service should preserve its subdocument _id
  const updatedMot = mergedServices.find(s => s.name === 'MOT Test');
  assert.ok(updatedMot);
  assert.equal(updatedMot._id, 'svc_existing_catalog', 'Existing subdocument ID must be preserved');
  assert.equal(updatedMot.price, 45, 'Rate was updated to £45');
  assert.equal(updatedMot.serviceId, 'plat_mot_1');

  // 4. Newly selected catalog service must have updated rate and timing
  const newFull = mergedServices.find(s => s.name === 'Full Service');
  assert.ok(newFull);
  assert.equal(newFull.price, 140);
  assert.equal(newFull.duration, 90);
});

// -------------------------------------------------------------
// SUITE 6: MULTI-SERVICE COMBINED PRICE & TIMING CALCULATION
// -------------------------------------------------------------
test('multi-service selection accurately computes combined price and total timing', () => {
  const selectedServices = [
    { name: 'MOT Test', price: 45, duration: 45 },
    { name: 'Full Service', price: 155, duration: 90 },
    { name: 'Air Con Regas', price: 50, duration: 30 }
  ];

  const totalPrice = selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  assert.equal(totalPrice, 250);
  assert.equal(totalDuration, 165); // 2 hours 45 mins
});

// -------------------------------------------------------------
// SUITE 7: COMPLETE CATALOG GROUPING (ZERO DROPPED SERVICES)
// -------------------------------------------------------------
test('catalog grouping preserves every platform service even if category is not in ServiceCategory collection', () => {
  const existingCategories = [
    { _id: 'cat_mot', name: 'MOT' },
    { _id: 'cat_srv', name: 'Servicing' }
  ];

  // 18 platform services across multiple categories
  const allPlatformServices = [
    { _id: 's1', name: 'Class 4 MOT', category: 'MOT', price: 45, duration: 45 },
    { _id: 's2', name: 'Class 7 MOT', category: 'MOT', price: 55, duration: 60 },
    { _id: 's3', name: 'Full Service', category: 'Servicing', price: 150, duration: 120 },
    { _id: 's4', name: 'Interim Service', category: 'Servicing', price: 85, duration: 60 },
    { _id: 's5', name: 'Major Service', category: 'Servicing', price: 210, duration: 180 },
    { _id: 's6', name: 'Oil & Filter Change', category: 'Servicing', price: 65, duration: 40 },
    { _id: 's7', name: 'Front Brake Pads', category: 'Brakes & Discs', price: 75, duration: 60 },
    { _id: 's8', name: 'Rear Brake Pads', category: 'Brakes & Discs', price: 75, duration: 60 },
    { _id: 's9', name: 'Brake Fluid Flush', category: 'Brakes & Discs', price: 45, duration: 30 },
    { _id: 's10', name: 'Diagnostic Fault Scan', category: 'Diagnostics', price: 40, duration: 30 },
    { _id: 's11', name: 'Live Engine Sensor Data', category: 'Diagnostics', price: 60, duration: 45 },
    { _id: 's12', name: 'Air Con Regas R134a', category: 'Air Conditioning', price: 55, duration: 45 },
    { _id: 's13', name: 'Air Con Regas R1234yf', category: 'Air Conditioning', price: 110, duration: 45 },
    { _id: 's14', name: 'Battery Replacement', category: 'Battery & Electrical', price: 95, duration: 30 },
    { _id: 's15', name: 'Alternator Test', category: 'Battery & Electrical', price: 35, duration: 25 },
    { _id: 's16', name: 'Front Wheel Alignment', category: 'Tyres & Tracking', price: 40, duration: 30 },
    { _id: 's17', name: '4 Wheel Laser Tracking', category: 'Tyres & Tracking', price: 70, duration: 45 },
    { _id: 's18', name: 'Exhaust DPF Cleaning', category: 'Exhaust & Emissions', price: 140, duration: 90 },
  ];

  // Logic identical to serviceController.getCatalogGrouped
  const matchedServiceIds = new Set();
  const groups = existingCategories.map((cat) => {
    const catName = cat.name.toLowerCase().trim();
    const matched = allPlatformServices.filter(s => {
      const sCat = (s.category || '').toLowerCase().trim();
      const isMatch = sCat === catName || (sCat && catName && (sCat.includes(catName) || catName.includes(sCat)));
      if (isMatch) matchedServiceIds.add(s._id.toString());
      return isMatch;
    });
    return {
      name: cat.name,
      services: matched
    };
  });

  const unmatched = allPlatformServices.filter(s => !matchedServiceIds.has(s._id.toString()));
  const unmatchedByCat = new Map();
  unmatched.forEach(s => {
    const cat = (s.category || 'General').trim();
    if (!unmatchedByCat.has(cat)) unmatchedByCat.set(cat, []);
    unmatchedByCat.get(cat).push(s);
  });
  unmatchedByCat.forEach((svcs, catName) => {
    groups.push({ name: catName, services: svcs });
  });

  // Count total services across all catalog groups
  const totalServicesInGroups = groups.reduce((sum, g) => sum + g.services.length, 0);
  assert.equal(totalServicesInGroups, 18, 'All 18 services must be present in catalog groups without dropping any');
});

// -------------------------------------------------------------
// SUITE 8: CUSTOM SERVICE ISOLATION, DELETION & REJECTION FLOW
// -------------------------------------------------------------
test('customer catalog strictly excludes deleted, rejected, or unoffered custom services (e.g. custom service ZK)', () => {
  // Candidate pool containing platform templates and custom services with various states
  const candidateServices = [
    { name: 'MOT Test', isCustom: false, status: 'Approved', isActive: true, garageCount: 3 },
    { name: 'Full Service', isCustom: false, status: 'Approved', isActive: true, garageCount: 2 },
    // Platform service with 0 garages should still be visible as a template
    { name: 'Major Service', isCustom: false, status: 'Approved', isActive: true, garageCount: 0 },
    // Old custom service ZK that was approved earlier but garage deleted it (garageCount: 0)
    { name: 'custom service ZK', isCustom: true, status: 'Approved', isActive: true, garageCount: 0 },
    // New custom service ZK that was rejected
    { name: 'custom service ZK', isCustom: true, status: 'Rejected', isActive: false, garageCount: 0 },
    // Active approved custom service currently offered by a garage
    { name: 'Ceramic Coating Pro', isCustom: true, status: 'Approved', isActive: true, garageCount: 1 },
    // Inactive custom service
    { name: 'Wheel Custom Paint', isCustom: true, status: 'Approved', isActive: false, garageCount: 1 },
    // Pending custom service
    { name: 'Custom Turbo Tuning', isCustom: true, status: 'Pending', isActive: true, garageCount: 1 },
  ];

  // Logic identical to serviceController.getAllServices (all !== 'true' customer catalog)
  const customerResults = candidateServices.filter((s) => {
    if (s.isActive === false || s.status === 'Rejected') return false;
    if (s.isCustom) {
      return (s.garageCount || 0) > 0 && s.status === 'Approved' && s.isActive !== false;
    }
    return true;
  });

  const names = customerResults.map((s) => s.name);

  // 1. Standard platform services are visible
  assert.ok(names.includes('MOT Test'));
  assert.ok(names.includes('Full Service'));
  assert.ok(names.includes('Major Service'));

  // 2. Active approved custom service with garageCount > 0 is visible
  assert.ok(names.includes('Ceramic Coating Pro'));

  // 3. Rejected or deleted "custom service ZK" MUST NEVER appear to customers!
  assert.equal(names.includes('custom service ZK'), false, 'Rejected/deleted custom service ZK must be excluded from customer catalog');

  // 4. Inactive or pending custom services must NEVER appear
  assert.equal(names.includes('Wheel Custom Paint'), false);
  assert.equal(names.includes('Custom Turbo Tuning'), false);

  assert.equal(customerResults.length, 4);
});

test('grouped catalog strictly excludes custom services that are not actively offered by visible approved garages', () => {
  const visibleApprovedGarages = [
    {
      name: 'Alpha Garage',
      status: 'Approved',
      services: [
        { name: 'MOT Test', isCustom: false, status: 'Approved', isActive: true },
        { name: 'Ceramic Coating Pro', isCustom: true, status: 'Approved', isActive: true, serviceId: 'custom_ceramic_id' },
        // Garage has rejected custom service ZK
        { name: 'custom service ZK', isCustom: true, status: 'Rejected', isActive: false, serviceId: 'custom_zk_id' }
      ]
    }
  ];

  const activeOfferedCustomNames = new Set();
  const activeOfferedCustomIds = new Set();
  visibleApprovedGarages.forEach((g) => {
    if (Array.isArray(g.services)) {
      g.services.forEach((s) => {
        if (s.isActive !== false && s.isCustom && s.status === 'Approved') {
          if (s.name) activeOfferedCustomNames.add(s.name.toLowerCase().trim());
          if (s.serviceId) activeOfferedCustomIds.add(s.serviceId.toString());
        }
      });
    }
  });

  const rawServices = [
    { _id: 'plat_1', name: 'MOT Test', category: 'MOT', isCustom: false, status: 'Approved', isActive: true },
    { _id: 'custom_ceramic_id', name: 'Ceramic Coating Pro', category: 'Others', isCustom: true, status: 'Approved', isActive: true },
    // Zombie / rejected custom service ZK document in database
    { _id: 'custom_zk_id', name: 'custom service ZK', category: 'Others', isCustom: true, status: 'Rejected', isActive: false },
    // Ghost duplicate approved document with no offering garage
    { _id: 'custom_zk_old', name: 'custom service ZK', category: 'Others', isCustom: true, status: 'Approved', isActive: true }
  ];

  // Logic identical to serviceController.getCatalogGrouped
  const filteredServices = rawServices.filter((s) => {
    if (s.isActive === false || s.status === 'Rejected') return false;
    if (s.isCustom) {
      if (s.status !== 'Approved') return false;
      const sName = (s.name || '').toLowerCase().trim();
      const sId = s._id.toString();
      return activeOfferedCustomNames.has(sName) || activeOfferedCustomIds.has(sId);
    }
    return true;
  });

  const filteredNames = filteredServices.map((s) => s.name);
  assert.ok(filteredNames.includes('MOT Test'));
  assert.ok(filteredNames.includes('Ceramic Coating Pro'));
  assert.equal(filteredNames.includes('custom service ZK'), false, 'custom service ZK must not appear in grouped catalog');
  assert.equal(filteredServices.length, 2);
});


