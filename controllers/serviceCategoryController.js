const ServiceCategory = require('../models/ServiceCategory');

const DEFAULT_CATEGORIES = [
  {
    name: 'MOT',
    description: 'Annual DVSA Class 4 vehicle safety & roadworthiness inspection',
    icon: 'shield-check',
    iconBg: '#10B98115',
    iconColor: '#10B981',
    sortOrder: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Servicing',
    description: 'Full, interim and major scheduled vehicle servicing and oil replacement',
    icon: 'car-cog',
    iconBg: '#1677FF15',
    iconColor: '#1677FF',
    sortOrder: 2,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Tyres',
    description: 'Tyre fitting, puncture repairs, computerized wheel balancing and alignment',
    icon: 'tire',
    iconBg: '#F59E0B15',
    iconColor: '#F59E0B',
    sortOrder: 3,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Repairs',
    description: 'Mechanical diagnostics, brakes, suspension, exhaust and engine repairs',
    icon: 'hammer-wrench',
    iconBg: '#EC489915',
    iconColor: '#EC4899',
    sortOrder: 4,
    isActive: true,
    isDefault: true,
  },
];

function resolveCategoryDesign(name = '') {
  const s = name.toLowerCase().trim();
  if (/\bmot\b/i.test(s)) return { icon: 'shield-check', iconColor: '#10B981', iconBg: '#10B98115' };
  if (s.includes('service') || s.includes('oil')) return { icon: 'car-cog', iconColor: '#1677FF', iconBg: '#1677FF15' };
  if (s.includes('tyre') || s.includes('tire') || s.includes('wheel')) return { icon: 'tire', iconColor: '#F59E0B', iconBg: '#F59E0B15' };
  if (s.includes('repair') || s.includes('wrench')) return { icon: 'hammer-wrench', iconColor: '#EC4899', iconBg: '#EC489915' };
  if (s.includes('brake')) return { icon: 'car-brake-alert', iconColor: '#EF4444', iconBg: '#EF444415' };
  if (s.includes('diag') || s.includes('scan')) return { icon: 'engine', iconColor: '#06B6D4', iconBg: '#06B6D415' };
  if (s.includes('battery') || s.includes('electric')) return { icon: 'car-battery', iconColor: '#EAB308', iconBg: '#EAB30815' };
  if (s.includes('air') || s.includes('ac') || s.includes('regas')) return { icon: 'snowflake', iconColor: '#3B82F6', iconBg: '#3B82F615' };
  if (s.includes('exhaust')) return { icon: 'pipe', iconColor: '#6366F1', iconBg: '#6366F115' };
  return { icon: 'wrench', iconColor: '#8B5CF6', iconBg: '#8B5CF615' };
}

// Helper to ensure initial default 4 categories exist
async function ensureDefaultCategories() {
  try {
    const count = await ServiceCategory.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial default service categories (MOT, Servicing, Tyres, Repairs)...');
      await ServiceCategory.insertMany(DEFAULT_CATEGORIES);
    }
  } catch (err) {
    console.error('Error ensuring default service categories:', err);
  }
}

// 1. GET /api/service-categories - Fetch all active categories (open to customers, garage admins, staff & guests)
async function getServiceCategories(req, res) {
  try {
    await ensureDefaultCategories();

    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };

    const categories = await ServiceCategory.find(filter).sort({ sortOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service categories.',
      categories: DEFAULT_CATEGORIES,
    });
  }
}

// 2. POST /api/service-categories - Create category (Super Admin Only)
async function createServiceCategory(req, res) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Super Admin can create service categories.',
      });
    }

    const { name, description, icon, iconBg, iconColor, sortOrder } = req.body;
    const cleanName = (name || '').trim();

    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    // Check duplicate
    const existing = await ServiceCategory.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Category "${cleanName}" already exists.`,
      });
    }

    const design = resolveCategoryDesign(cleanName);

    const category = await ServiceCategory.create({
      name: cleanName,
      description: (description || '').trim(),
      icon: icon || design.icon,
      iconBg: iconBg || design.iconBg,
      iconColor: iconColor || design.iconColor,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : (await ServiceCategory.countDocuments()) + 1,
      isActive: true,
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      message: `Category "${cleanName}" created successfully!`,
      category,
    });
  } catch (error) {
    console.error('Error creating service category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// 3. PUT /api/service-categories/:id - Update category (Super Admin Only)
async function updateServiceCategory(req, res) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Super Admin can update service categories.',
      });
    }

    const { id } = req.params;
    const updates = req.body;

    if (updates.name) {
      const cleanName = updates.name.trim();
      const existing = await ServiceCategory.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Category "${cleanName}" already exists.`,
        });
      }
      updates.name = cleanName;
    }

    const category = await ServiceCategory.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }

    res.json({
      success: true,
      message: 'Category updated successfully.',
      category,
    });
  } catch (error) {
    console.error('Error updating service category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// 4. DELETE /api/service-categories/:id - Delete category (Super Admin Only)
async function deleteServiceCategory(req, res) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Super Admin can delete service categories.',
      });
    }

    const { id } = req.params;
    const category = await ServiceCategory.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }

    await ServiceCategory.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Category "${category.name}" removed successfully.`,
      deletedCategory: category,
    });
  } catch (error) {
    console.error('Error deleting service category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  ensureDefaultCategories,
  DEFAULT_CATEGORIES,
};
