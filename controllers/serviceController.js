const Service = require('../models/Service');

const DEFAULT_SERVICES = [
  {
    name: 'MOT Test (Class 4)',
    title: 'MOT Test',
    category: 'MOT',
    price: 45,
    duration: 45,
    icon: 'shield-check',
    iconBg: '#10B98115',
    iconColor: '#10B981',
    searchQuery: 'MOT',
    description: 'Official DVSA Class 4 MOT Test for cars, light vans, and taxis (up to 8 passenger seats).',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Full Service',
    title: 'Full Service',
    category: 'Servicing',
    price: 125,
    duration: 120,
    icon: 'car-cog',
    iconBg: '#1677FF15',
    iconColor: '#1677FF',
    searchQuery: 'Full Service',
    description: 'Comprehensive 50+ point vehicle inspection with oil, air filter, and vital fluid replacement.',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Interim Service',
    title: 'Interim Service',
    category: 'Servicing',
    price: 79,
    duration: 60,
    icon: 'oil',
    iconBg: '#8B5CF615',
    iconColor: '#8B5CF6',
    searchQuery: 'Interim Service',
    description: '6-month / 6,000 miles oil & filter change and 25-point visual safety check.',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Brakes & Discs',
    title: 'Brakes & Discs',
    category: 'Brakes',
    price: 65,
    duration: 60,
    icon: 'car-brake-alert',
    iconBg: '#EF444415',
    iconColor: '#EF4444',
    searchQuery: 'Brake',
    description: 'Supply and precision fitting of high-quality OEM brake pads and discs.',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Tyres & Tracking',
    title: 'Tyres & Tracking',
    category: 'Tyre replacement',
    price: 65,
    duration: 45,
    icon: 'tire',
    iconBg: '#F59E0B15',
    iconColor: '#F59E0B',
    searchQuery: 'Tyre',
    description: 'Supply & fitment of premium tyres, computerized 4-wheel laser alignment and balancing.',
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'Diagnostics Scan',
    title: 'Diagnostics Scan',
    category: 'Diagnostics',
    price: 45,
    duration: 45,
    icon: 'engine',
    iconBg: '#06B6D415',
    iconColor: '#06B6D4',
    searchQuery: 'Diagnostic',
    description: 'Full computerized OBD2 scan of engine, ABS, airbag, and transmission fault codes.',
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'Air Con Regas',
    title: 'Air Con Regas',
    category: 'Air Conditioning',
    price: 55,
    duration: 45,
    icon: 'snowflake',
    iconBg: '#3B82F615',
    iconColor: '#3B82F6',
    searchQuery: 'Air Conditioning',
    description: 'Evacuation of old refrigerant, vacuum leak test, lubrication, and fresh gas recharge.',
    sortOrder: 7,
    isActive: true,
  },
  {
    name: 'General Repairs',
    title: 'General Repairs',
    category: 'Repairs',
    price: 65,
    duration: 60,
    icon: 'wrench',
    iconBg: '#EC489915',
    iconColor: '#EC4899',
    searchQuery: 'Repair',
    description: 'Professional mechanical repairs and inspections for suspension, steering, and drivetrain.',
    sortOrder: 8,
    isActive: true,
  },
];

const Garage = require('../models/Garage');

function resolveServiceIcon(name = '', category = '') {
  const s = `${name} ${category}`.toLowerCase();
  if (/\bmot\b/i.test(s)) return { icon: 'shield-check', iconColor: '#10B981', iconBg: '#10B98115' };
  if (s.includes('full')) return { icon: 'car-cog', iconColor: '#1677FF', iconBg: '#1677FF15' };
  if (s.includes('interim') || s.includes('oil')) return { icon: 'oil', iconColor: '#8B5CF6', iconBg: '#8B5CF615' };
  if (s.includes('major')) return { icon: 'car-wrench', iconColor: '#D97706', iconBg: '#F59E0B15' };
  if (s.includes('brake') || s.includes('pad') || s.includes('disc')) return { icon: 'car-brake-alert', iconColor: '#EF4444', iconBg: '#EF444415' };
  if (s.includes('tyre') || s.includes('tire') || s.includes('track') || s.includes('wheel') || s.includes('align')) return { icon: 'tire', iconColor: '#F59E0B', iconBg: '#F59E0B15' };
  if (s.includes('diag') || s.includes('scan') || s.includes('fault') || s.includes('ecu')) return { icon: 'engine', iconColor: '#06B6D4', iconBg: '#06B6D415' };
  if (s.includes('air') || s.includes('ac') || s.includes('regas') || s.includes('condit')) return { icon: 'snowflake', iconColor: '#3B82F6', iconBg: '#3B82F615' };
  if (s.includes('exhaust') || s.includes('dpf') || s.includes('emission') || s.includes('pipe')) return { icon: 'pipe', iconColor: '#6366F1', iconBg: '#6366F115' };
  if (s.includes('battery') || s.includes('electric') || s.includes('alternator')) return { icon: 'car-battery', iconColor: '#EAB308', iconBg: '#EAB30815' };
  if (s.includes('clutch') || s.includes('gear') || s.includes('flywheel') || s.includes('transmiss')) return { icon: 'cog-sync', iconColor: '#9333EA', iconBg: '#9333EA15' };
  if (s.includes('suspension') || s.includes('spring') || s.includes('shock') || s.includes('strut')) return { icon: 'car-traction-control', iconColor: '#4F46E5', iconBg: '#4F46E515' };
  return { icon: 'wrench', iconColor: '#EC4899', iconBg: '#EC489915' };
}

// Helper to ensure default services exist
async function ensureDefaultServices() {
  try {
    const count = await Service.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial dynamic automotive services...');
      await Service.insertMany(DEFAULT_SERVICES);
    }
  } catch (e) {
    console.error('Error ensuring default services:', e);
  }
}

// 1. Get all dynamic services (aggregated from active garages + standard catalog)
async function getAllServices(req, res) {
  try {
    await ensureDefaultServices();

    const { category, search } = req.query;

    // Fetch approved garages with their configured services
    const approvedGarages = await Garage.find({ status: 'Approved' }).select('name services');

    // Case-insensitive service aggregation map
    const serviceMap = new Map();

    // 1. Aggregate services actually offered by approved garages
    if (Array.isArray(approvedGarages) && approvedGarages.length > 0) {
      for (const garage of approvedGarages) {
        if (!Array.isArray(garage.services)) continue;
        for (const s of garage.services) {
          if (s.isActive === false) continue;
          const rawName = (s.name || '').trim();
          if (!rawName) continue;
          const key = rawName.toLowerCase();

          const price = Number(s.price) || 0;
          const duration = Number(s.duration) || 45;

          if (serviceMap.has(key)) {
            const item = serviceMap.get(key);
            item.garageCount += 1;
            if (price > 0 && (item.minPrice === 0 || price < item.minPrice)) {
              item.minPrice = price;
              item.price = price; // represent lowest starting price "From £..."
            }
            if (price > item.maxPrice) {
              item.maxPrice = price;
            }
            if (s.description && !item.description) {
              item.description = s.description;
            }
          } else {
            const iconDetails = resolveServiceIcon(rawName, s.category);
            serviceMap.set(key, {
              id: s._id ? s._id.toString() : `svc_${key.replace(/[^a-z0-9]/g, '_')}`,
              name: rawName,
              title: rawName,
              category: s.category || 'Servicing',
              price: price,
              minPrice: price,
              maxPrice: price,
              duration: duration,
              description: s.description || '',
              icon: iconDetails.icon,
              iconBg: iconDetails.iconBg,
              iconColor: iconDetails.iconColor,
              searchQuery: rawName,
              garageCount: 1,
              isActive: true,
              isFromGarage: true,
            });
          }
        }
      }
    }

    // 2. If no garages have configured services yet, or to fill essential default templates
    if (serviceMap.size === 0) {
      DEFAULT_SERVICES.forEach((s) => {
        const key = s.name.trim().toLowerCase();
        serviceMap.set(key, {
          ...s,
          id: s.id || `default_${s.sortOrder}`,
          minPrice: s.price,
          maxPrice: s.price,
          garageCount: 0,
          isFromGarage: false,
        });
      });
    }

    let results = Array.from(serviceMap.values());

    // 3. Optional category filter
    if (category && category !== 'All') {
      const catLower = category.toLowerCase();
      results = results.filter((s) => (s.category || '').toLowerCase().includes(catLower));
    }

    // 4. Optional text search filter
    if (search) {
      const sLower = search.toLowerCase();
      results = results.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(sLower) ||
          (s.title || '').toLowerCase().includes(sLower) ||
          (s.category || '').toLowerCase().includes(sLower) ||
          (s.description || '').toLowerCase().includes(sLower)
      );
    }

    // 5. Sort: services offered by more garages first, then by name
    results.sort((a, b) => {
      if ((b.garageCount || 0) !== (a.garageCount || 0)) {
        return (b.garageCount || 0) - (a.garageCount || 0);
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    res.json({
      success: true,
      count: results.length,
      services: results,
    });
  } catch (error) {
    console.error('Error in getAllServices:', error);
    // Graceful fallback
    res.json({
      success: true,
      count: DEFAULT_SERVICES.length,
      services: DEFAULT_SERVICES,
    });
  }
}

// 2. Get single service by ID
async function getServiceById(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Create new service (Admin)
async function createService(req, res) {
  try {
    const { name, title, category, price, duration, icon, iconBg, iconColor, searchQuery, description, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Service name is required.' });
    }

    const service = await Service.create({
      name,
      title: title || name,
      category: category || 'Servicing',
      price: price !== undefined ? price : 45,
      duration: duration || 45,
      icon: icon || 'wrench',
      iconBg: iconBg || '#1677FF15',
      iconColor: iconColor || '#1677FF',
      searchQuery: searchQuery || title || name,
      description: description || '',
      sortOrder: sortOrder || 0,
      isActive: true,
    });

    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Update service (Admin)
async function updateService(req, res) {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 5. Delete service (Admin)
async function deleteService(req, res) {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.json({ success: true, message: 'Service deactivated successfully.', service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 6. Reset & re-seed default services
async function seedDefaultServices(req, res) {
  try {
    await Service.deleteMany({});
    const services = await Service.insertMany(DEFAULT_SERVICES);
    res.json({
      success: true,
      message: 'Default services seeded successfully.',
      count: services.length,
      services,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  seedDefaultServices,
  DEFAULT_SERVICES,
};
