const Service = require('../models/Service');
const Garage = require('../models/Garage');
const User = require('../models/User');
const Audit = require('../models/Audit');
const Alert = require('../models/Alert');
const ServiceCategory = require('../models/ServiceCategory');
const { isGarageVisibleToCustomers } = require('../utils/garageProfile');
const {
  sendCustomServiceApprovedEmailGarage,
  sendCustomServiceRejectedEmailGarage,
} = require('../services/emailService');

function resolveServiceIcon(name = '', category = '') {
  const s = `${name} ${category}`.toLowerCase();
  if (/\bmot\b/i.test(s)) return { icon: 'shield-check', iconColor: '#10B981', iconBg: '#10B98115' };
  if (s.includes('full')) return { icon: 'car-cog', iconColor: '#1677FF', iconBg: '#1677FF15' };
  if (s.includes('interim') || /\boil\b/i.test(s)) return { icon: 'oil', iconColor: '#8B5CF6', iconBg: '#8B5CF615' };
  if (s.includes('major')) return { icon: 'car-wrench', iconColor: '#D97706', iconBg: '#F59E0B15' };
  if (s.includes('clutch') || s.includes('gear') || s.includes('flywheel') || s.includes('transmiss')) return { icon: 'cog-sync', iconColor: '#9333EA', iconBg: '#9333EA15' };
  if (s.includes('brake') || s.includes('pad') || s.includes('disc')) return { icon: 'car-brake-alert', iconColor: '#EF4444', iconBg: '#EF444415' };
  if (s.includes('battery') || s.includes('electric') || s.includes('alternator')) return { icon: 'car-battery', iconColor: '#EAB308', iconBg: '#EAB30815' };
  if (s.includes('suspension') || s.includes('spring') || s.includes('shock') || s.includes('strut')) return { icon: 'car-traction-control', iconColor: '#4F46E5', iconBg: '#4F46E515' };
  if (s.includes('tyre') || s.includes('tire') || s.includes('track') || (s.includes('wheel') && !s.includes('flywheel')) || s.includes('align')) return { icon: 'tire', iconColor: '#F59E0B', iconBg: '#F59E0B15' };
  if (s.includes('diag') || s.includes('scan') || s.includes('fault') || s.includes('ecu')) return { icon: 'engine', iconColor: '#06B6D4', iconBg: '#06B6D415' };
  if (/\b(air\s*con|aircon|air\s*conditioning|regas|ac)\b/i.test(s) || s.includes('condit')) return { icon: 'snowflake', iconColor: '#3B82F6', iconBg: '#3B82F615' };
  if (s.includes('exhaust') || s.includes('dpf') || s.includes('emission') || s.includes('pipe') || s.includes('silencer') || s.includes('muffler')) return { icon: 'pipe', iconColor: '#6366F1', iconBg: '#6366F115' };
  if (s.includes('wash') || s.includes('valet')) return { icon: 'car-wash', iconColor: '#06B6D4', iconBg: '#06B6D415' };
  if (s.includes('other')) return { icon: 'dots-horizontal-circle-outline', iconColor: '#8B5CF6', iconBg: '#8B5CF615' };
  return { icon: 'hammer-wrench', iconColor: '#EC4899', iconBg: '#EC489915' };
}

function escapeRegex(str) {
  return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Sanitizer to clean up any existing orphaned/duplicate or rejected custom service records in the DB
let hasSanitized = false;
async function sanitizeCustomServices() {
  try {
    // 1. Any custom service marked Rejected should have isActive: false
    await Service.updateMany(
      { isCustom: true, status: 'Rejected', isActive: { $ne: false } },
      { $set: { isActive: false } }
    );

    // 2. Find all custom services that are Rejected
    const rejectedCustoms = await Service.find({ isCustom: true, status: 'Rejected' }).select('name');
    const rejectedNames = Array.from(new Set(
      rejectedCustoms
        .map((s) => (s.name || '').trim().toLowerCase())
        .filter(Boolean)
    ));

    if (rejectedNames.length > 0) {
      const nameRegexes = rejectedNames.map((n) => new RegExp('^' + escapeRegex(n) + '$', 'i'));

      // If any custom service doc has the same name as a rejected custom service, deactivate it
      await Service.updateMany(
        {
          isCustom: true,
          name: { $in: nameRegexes },
          status: { $ne: 'Rejected' },
        },
        { $set: { status: 'Rejected', isActive: false } }
      );

      // In garages: ensure any custom service with a rejected name is marked status: 'Rejected' and isActive: false
      const garages = await Garage.find({
        'services.name': { $in: nameRegexes },
      });

      for (const g of garages) {
        let changed = false;
        if (Array.isArray(g.services)) {
          g.services.forEach((s) => {
            const sName = (s.name || '').toLowerCase().trim();
            if (s.isCustom && rejectedNames.includes(sName)) {
              if (s.status !== 'Rejected' || s.isActive !== false) {
                s.status = 'Rejected';
                s.isActive = false;
                changed = true;
              }
            }
          });
          if (changed) {
            await g.save();
          }
        }
      }
    }

    // 3. Any custom service with isActive: false should have status: 'Rejected'
    await Service.updateMany(
      { isCustom: true, isActive: false, status: { $ne: 'Rejected' } },
      { $set: { status: 'Rejected' } }
    );
  } catch (err) {
    // ignore in disconnected / test environments
  }
}

// 1. Get all dynamic services (platform catalog + active approved garage services)
async function getAllServices(req, res) {
  try {
    const { category, search, all, status } = req.query;

    if (!hasSanitized) {
      hasSanitized = true;
      sanitizeCustomServices().catch(() => {});
    }

    // Platform catalog services created by Super Admin
    const platformFilter = {
      isActive: true,
      status: { $ne: 'Rejected' },
    };
    if (all === 'true') {
      // Super Admin managing platform services & approved custom services
      platformFilter.$or = [
        { isCustom: false },
        { isCustom: { $exists: false } },
        { isCustom: true, status: 'Approved' },
      ];
    } else {
      // Customer catalog: strictly master platform templates only!
      // Custom garage services will ONLY be injected if actively offered by an approved visible garage below.
      platformFilter.$or = [
        { isCustom: false },
        { isCustom: { $exists: false } },
      ];
    }
    if (status) {
      platformFilter.status = status;
    }
    const platformServices = await Service.find(platformFilter).sort({ sortOrder: 1, createdAt: 1 });

    // Fetch approved garages with their configured services
    const approvedGarages = (await Garage.find({ status: { $nin: ['Rejected', 'Blacklisted'] } })
      .select('name status services address postcode latitude longitude locationConfigured documentsConfigured verificationDocuments'))
      .filter(isGarageVisibleToCustomers);

    const serviceMap = new Map();

    // 1. Seed with platform catalog services so Super Admin created services always appear
    platformServices.forEach((s) => {
      const rawName = (s.name || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      const iconDetails = resolveServiceIcon(rawName, s.category);
      const defaultPrice = !isNaN(Number(s.price)) && Number(s.price) >= 0 ? Number(s.price) : 45;
      const defaultDuration = !isNaN(Number(s.duration)) && Number(s.duration) > 0 ? Number(s.duration) : 45;
      serviceMap.set(key, {
        id: s._id.toString(),
        _id: s._id,
        name: rawName,
        title: s.title || rawName,
        category: s.category || 'Servicing',
        price: defaultPrice,
        minPrice: defaultPrice,
        maxPrice: defaultPrice,
        duration: defaultDuration,
        description: s.description || '',
        icon: s.icon || iconDetails.icon,
        iconBg: s.iconBg || iconDetails.iconBg,
        iconColor: s.iconColor || iconDetails.iconColor,
        searchQuery: s.searchQuery || rawName,
        garageCount: 0,
        isActive: s.isActive !== false,
        isFromGarage: false,
        isCustom: s.isCustom || false,
        status: s.status || 'Approved',
        garageId: s.garageId,
        garageName: s.garageName,
      });
    });

    // 2. Aggregate services offered by approved garages
    // NOTE: When all === 'true' or platformOnly === 'true', Super Admin is viewing/managing master platform services.
    // Do NOT inject garage demo services into the Super Admin platform services list!
    if (all !== 'true' && req.query.platformOnly !== 'true' && Array.isArray(approvedGarages) && approvedGarages.length > 0) {
      for (const garage of approvedGarages) {
        if (!Array.isArray(garage.services)) continue;
        for (const s of garage.services) {
          if (s.isActive === false) continue;
          if (s.isCustom && s.status !== 'Approved') continue; // Don't expose pending/rejected custom services!
          const rawName = (s.name || '').trim();
          if (!rawName) continue;
          const key = rawName.toLowerCase();
          const price = !isNaN(Number(s.price)) && Number(s.price) >= 0 ? Number(s.price) : 45;
          const dur = !isNaN(Number(s.duration)) && Number(s.duration) > 0 ? Number(s.duration) : 45;

          let item = serviceMap.get(key);
          if (!item) {
            for (const [k, v] of serviceMap.entries()) {
              if (
                k === key ||
                (key.length >= 3 && k.includes(key)) ||
                (k.length >= 3 && key.includes(k)) ||
                (key.includes('mot') && k.includes('mot')) ||
                (key.includes('full') && k.includes('full')) ||
                (key.includes('interim') && k.includes('interim')) ||
                (key.includes('brake') && k.includes('brake')) ||
                (key.includes('tyre') && k.includes('tyre')) ||
                ((key.includes('air') || key.includes('aur')) && k.includes('air')) ||
                (key.includes('diag') && k.includes('diag'))
              ) {
                item = v;
                break;
              }
            }
          }

          if (item) {
            item.garageCount += 1;
            if (item.garageCount === 1) {
              // First garage offering this service: set real offered starting price & duration
              item.minPrice = price;
              item.maxPrice = price;
              item.price = price;
              item.duration = dur;
            } else {
              // Multiple garages offering: track minimum and maximum prices
              item.minPrice = Math.min(item.minPrice, price);
              item.maxPrice = Math.max(item.maxPrice, price);
              item.price = item.minPrice;
            }
            if (s.description && !item.description) {
              item.description = s.description;
            }
          } else if (s.isCustom && s.status === 'Approved' && s.isActive !== false) {
            // Live approved custom service from a garage
            const iconDetails = resolveServiceIcon(rawName, s.category);
            serviceMap.set(key, {
              id: s._id ? s._id.toString() : (s.serviceId ? s.serviceId.toString() : `svc_${key.replace(/[^a-z0-9]/g, '_')}`),
              _id: s._id || s.serviceId,
              name: rawName,
              title: rawName,
              category: s.category || 'Others',
              price: price,
              minPrice: price,
              maxPrice: price,
              duration: dur,
              description: s.description || '',
              icon: iconDetails.icon,
              iconBg: iconDetails.iconBg,
              iconColor: iconDetails.iconColor,
              searchQuery: rawName,
              garageCount: 1,
              isActive: true,
              isFromGarage: true,
              isCustom: true,
              status: 'Approved',
            });
          }
        }
      }
    }

    let results = Array.from(serviceMap.values());

    // Filter out inactive/rejected services, and ensure custom services MUST have at least 1 active garage offering them
    if (all !== 'true') {
      results = results.filter((s) => {
        if (s.isActive === false || s.status === 'Rejected') return false;
        if (s.isCustom) {
          return (s.garageCount || 0) > 0 && s.status === 'Approved' && s.isActive !== false;
        }
        return true;
      });
    }

    // 3. Optional category filter
    if (category && category !== 'All') {
      const catLower = category.toLowerCase().trim();
      results = results.filter((s) => (s.category || '').toLowerCase().trim() === catLower);
    }

    // 4. Optional text search filter
    if (search) {
      const sLower = search.toLowerCase().trim();
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
    res.json({
      success: true,
      count: 0,
      services: [],
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

// 3. Create new platform service under a category (Super Admin)
async function createService(req, res) {
  try {
    const { name, title, category, price, duration, icon, iconBg, iconColor, searchQuery, description, sortOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Service name is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Service category is required.' });
    }

    const cleanName = name.trim();
    const cleanCat = category.trim();

    // Check duplicate platform service
    const existing = await Service.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
      category: { $regex: new RegExp(`^${escapeRegex(cleanCat)}$`, 'i') },
      status: 'Approved'
    });
    if (existing) {
      return res.status(400).json({ error: `Service "${cleanName}" already exists under category "${cleanCat}".` });
    }

    const design = resolveServiceIcon(cleanName, cleanCat);

    const service = await Service.create({
      name: cleanName,
      title: (title || cleanName).trim(),
      category: cleanCat,
      price: price !== undefined && !isNaN(Number(price)) ? Number(price) : 45,
      duration: duration !== undefined && !isNaN(Number(duration)) ? Number(duration) : 45,
      icon: icon || design.icon,
      iconBg: iconBg || design.iconBg,
      iconColor: iconColor || design.iconColor,
      searchQuery: (searchQuery || title || cleanName).trim(),
      description: (description || '').trim(),
      sortOrder: sortOrder || 0,
      isActive: true,
      isCustom: false,
      status: 'Approved',
    });

    await Audit.create({
      activity: 'Platform Service Created',
      details: `Created new service "${service.name}" under category "${service.category}".`
    });

    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Update service (Super Admin)
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

// 5. Delete service (Super Admin)
async function deleteService(req, res) {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: 'Rejected' },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const cleanName = (service.name || '').trim();

    // If it is a custom service or has a name, also deactivate any duplicate Service documents with the same name
    if (cleanName) {
      await Service.updateMany(
        {
          _id: { $ne: service._id },
          name: { $regex: new RegExp('^' + escapeRegex(cleanName) + '$', 'i') },
          ...(service.isCustom ? { isCustom: true } : {}),
        },
        { $set: { isActive: false, status: 'Rejected' } }
      );
    }

    // Also pull / deactivate this service from all garages' services array
    try {
      await Garage.updateMany(
        {
          $or: [
            { 'services.serviceId': service._id },
            { 'services._id': service._id },
            { 'services.name': { $regex: new RegExp('^' + escapeRegex(cleanName) + '$', 'i') } },
          ],
        },
        {
          $pull: {
            services: {
              $or: [
                { serviceId: service._id },
                { _id: service._id },
                ...(service.isCustom ? [{ isCustom: true, name: { $regex: new RegExp('^' + escapeRegex(cleanName) + '$', 'i') } }] : []),
              ],
            },
          },
        }
      );
    } catch (gErr) {
      console.warn('[DELETE SERVICE] Error pulling service from garages:', gErr.message);
    }

    await Audit.create({
      activity: 'Platform Service Deleted',
      details: `Deleted service "${service.name}". Removed from catalog and garage profiles.`
    });

    res.json({ success: true, message: 'Service deactivated and removed successfully.', service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 7. Get pending custom services submitted by garages (Super Admin)
async function getPendingCustomServices(req, res) {
  try {
    const services = await Service.find({ isCustom: true, status: 'Pending', isActive: { $ne: false } })
      .populate('garageId', 'name email phone address')
      .sort({ createdAt: -1 });

    const formatted = services.map((s) => {
      const obj = s.toObject();
      const populatedGarage = obj.garageId && typeof obj.garageId === 'object' ? obj.garageId : null;
      const gName = populatedGarage?.name || obj.garageName;
      return {
        ...obj,
        garageName: gName || 'Unknown Garage',
      };
    });

    res.json({ success: true, count: formatted.length, services: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 8. Approve custom service (Super Admin)
async function approveCustomService(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    service.status = 'Approved';
    service.isActive = true;
    service.rejectionReason = '';
    await service.save();

    const cleanName = (service.name || '').trim();

    // If submitted by a garage, also mark approved in garage.services
    if (service.garageId) {
      const garage = await Garage.findById(service.garageId);
      if (garage && Array.isArray(garage.services)) {
        let changed = false;
        garage.services.forEach((garService) => {
          const matchesId = garService.serviceId && garService.serviceId.toString() === service._id.toString();
          const matchesName = (garService.name || '').toLowerCase().trim() === cleanName.toLowerCase();
          if (garService.isCustom && (matchesId || matchesName)) {
            garService.status = 'Approved';
            garService.isActive = true;
            garService.serviceId = service._id;
            garService.category = service.category || 'Others';
            garService.rejectionReason = '';
            changed = true;
          }
        });
        if (changed) {
          await garage.save();
        }
      }
    }

    await Alert.updateMany(
      { type: 'CUSTOM_SERVICE', serviceId: service._id },
      { status: 'Approved' }
    );

    await Audit.create({
      activity: 'Custom Service Approved',
      details: `Approved custom service "${service.name}" for category "${service.category}". Now live platform-wide.`
    });

    // Send email notification to garage admin (check garage.email, fallback to User account email)
    if (service.garageId) {
      try {
        const garage = await Garage.findById(service.garageId);
        let recipientEmail = garage?.email;
        if (!recipientEmail && garage?._id) {
          const userAccount = await User.findOne({ garageId: garage._id });
          if (userAccount?.email) recipientEmail = userAccount.email;
        }

        if (garage && recipientEmail) {
          sendCustomServiceApprovedEmailGarage({
            garage: { ...garage.toObject(), email: recipientEmail },
            service,
          }).catch((err) => {
            console.warn('[EMAIL] Failed to send service approval email:', err.message);
          });
        }
      } catch (err) {
        console.warn('[EMAIL] Error finding garage for approval email:', err.message);
      }
    }

    res.json({ success: true, message: `Custom service "${service.name}" approved successfully.`, service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 9. Reject custom service (Super Admin)
async function rejectCustomService(req, res) {
  try {
    const { reason } = req.body;
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const rejectionReason = reason || 'Does not meet platform service criteria';
    service.status = 'Rejected';
    service.isActive = false; // Mark inactive!
    service.rejectionReason = rejectionReason;
    await service.save();

    const cleanName = (service.name || '').trim();

    // 1. Deactivate & reject ANY duplicate Service documents with the same name
    if (cleanName) {
      await Service.updateMany(
        {
          _id: { $ne: service._id },
          isCustom: true,
          name: { $regex: new RegExp('^' + escapeRegex(cleanName) + '$', 'i') },
        },
        {
          $set: {
            status: 'Rejected',
            isActive: false,
            rejectionReason: rejectionReason,
          },
        }
      );
    }

    // 2. Mark matching services in all garages as Rejected and inactive
    try {
      const garages = await Garage.find({
        $or: [
          { 'services.serviceId': service._id },
          { 'services.name': { $regex: new RegExp('^' + escapeRegex(cleanName) + '$', 'i') } },
        ],
      });

      for (const garage of garages) {
        let changed = false;
        if (Array.isArray(garage.services)) {
          garage.services.forEach((s) => {
            const matchesId = s.serviceId && s.serviceId.toString() === service._id.toString();
            const matchesName = (s.name || '').toLowerCase().trim() === cleanName.toLowerCase();
            if (s.isCustom && (matchesId || matchesName)) {
              s.status = 'Rejected';
              s.isActive = false;
              s.rejectionReason = rejectionReason;
              changed = true;
            }
          });
          if (changed) {
            await garage.save();
          }
        }
      }
    } catch (gErr) {
      console.warn('[REJECT SERVICE] Error updating garage services:', gErr.message);
    }

    await Alert.updateMany(
      { type: 'CUSTOM_SERVICE', serviceId: service._id },
      { status: 'Rejected', rejectionReason: rejectionReason }
    );

    await Audit.create({
      activity: 'Custom Service Rejected',
      details: `Rejected custom service "${service.name}". Reason: ${service.rejectionReason}`
    });

    // Send email notification to garage admin with rejection reason
    if (service.garageId) {
      try {
        const garage = await Garage.findById(service.garageId);
        let recipientEmail = garage?.email;
        if (!recipientEmail && garage?._id) {
          const userAccount = await User.findOne({ garageId: garage._id });
          if (userAccount?.email) recipientEmail = userAccount.email;
        }

        if (garage && recipientEmail) {
          sendCustomServiceRejectedEmailGarage({
            garage: { ...garage.toObject(), email: recipientEmail },
            service,
            reason: service.rejectionReason,
          }).catch((err) => {
            console.warn('[EMAIL] Failed to send service rejection email:', err.message);
          });
        }
      } catch (err) {
        console.warn('[EMAIL] Error finding garage for rejection email:', err.message);
      }
    }

    res.json({ success: true, message: `Custom service "${service.name}" rejected.`, service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 10. Return active categories with their services grouped under each category
async function getCatalogGrouped(req, res) {
  try {
    if (!hasSanitized) {
      hasSanitized = true;
      sanitizeCustomServices().catch(() => {});
    }

    // Fetch approved visible garages to collect actively offered custom services
    const approvedGarages = (await Garage.find({ status: { $nin: ['Rejected', 'Blacklisted'] } })
      .select('name status services address postcode latitude longitude locationConfigured documentsConfigured verificationDocuments'))
      .filter(isGarageVisibleToCustomers);

    const activeOfferedCustomNames = new Set();
    const activeOfferedCustomIds = new Set();
    if (Array.isArray(approvedGarages)) {
      approvedGarages.forEach((g) => {
        if (Array.isArray(g.services)) {
          g.services.forEach((s) => {
            if (s.isActive !== false && s.isCustom && s.status === 'Approved') {
              if (s.name) activeOfferedCustomNames.add(s.name.toLowerCase().trim());
              if (s.serviceId) activeOfferedCustomIds.add(s.serviceId.toString());
              if (s._id) activeOfferedCustomIds.add(s._id.toString());
            }
          });
        }
      });
    }

    const serviceFilter = {
      isActive: true,
      status: { $ne: 'Rejected' },
      $or: [
        { isCustom: false },
        { isCustom: { $exists: false } },
        { isCustom: true, status: 'Approved' },
      ],
    };

    const [categories, rawServices] = await Promise.all([
      ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }),
      Service.find(serviceFilter).sort({ sortOrder: 1, createdAt: 1 }),
    ]);

    // Master platform templates are always included; custom services MUST be offered by at least one visible garage!
    const services = rawServices.filter((s) => {
      if (s.isActive === false || s.status === 'Rejected') return false;
      if (s.isCustom) {
        if (s.status !== 'Approved') return false;
        const sName = (s.name || '').toLowerCase().trim();
        const sId = s._id.toString();
        return activeOfferedCustomNames.has(sName) || activeOfferedCustomIds.has(sId);
      }
      return true;
    });

    const matchedServiceIds = new Set();
    const groups = categories.map((cat) => {
      const catName = cat.name.toLowerCase().trim();
      const matchedServices = services.filter((s) => {
        const sCat = (s.category || '').toLowerCase().trim();
        const isMatch = sCat === catName || (sCat && catName && (sCat.includes(catName) || catName.includes(sCat)));
        if (isMatch) matchedServiceIds.add(s._id.toString());
        return isMatch;
      });

      return {
        id: cat._id.toString(),
        name: cat.name,
        description: cat.description || '',
        icon: cat.icon || 'wrench',
        iconColor: cat.iconColor || '#1677FF',
        iconBg: cat.iconBg || '#1677FF15',
        sortOrder: cat.sortOrder || 0,
        services: matchedServices.map((s) => {
          const design = resolveServiceIcon(s.name, cat.name);
          return {
            id: s._id.toString(),
            _id: s._id,
            name: s.name,
            title: s.title || s.name,
            category: cat.name,
            price: !isNaN(Number(s.price)) && Number(s.price) >= 0 ? Number(s.price) : 45,
            duration: Number(s.duration) > 0 ? Number(s.duration) : 45,
            description: s.description || '',
            icon: s.icon || design.icon,
            iconColor: s.iconColor || design.iconColor,
            iconBg: s.iconBg || design.iconBg,
            isCustom: s.isCustom || false,
          };
        }),
      };
    });

    // Group any remaining services that weren't matched to existing categories
    const unmatched = services.filter((s) => !matchedServiceIds.has(s._id.toString()));
    if (unmatched.length > 0) {
      const unmatchedByCat = new Map();
      unmatched.forEach((s) => {
        const cat = (s.category || 'General').trim();
        if (!unmatchedByCat.has(cat)) unmatchedByCat.set(cat, []);
        unmatchedByCat.get(cat).push(s);
      });

      unmatchedByCat.forEach((svcs, catName) => {
        const catDesign = resolveServiceIcon(catName, catName);
        groups.push({
          id: `cat_${catName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: catName,
          description: `${catName} automotive services`,
          icon: catDesign.icon,
          iconColor: catDesign.iconColor,
          iconBg: catDesign.iconBg,
          sortOrder: 99,
          services: svcs.map((s) => {
            const design = resolveServiceIcon(s.name, catName);
            return {
              id: s._id.toString(),
              _id: s._id,
              name: s.name,
              title: s.title || s.name,
              category: catName,
              price: !isNaN(Number(s.price)) && Number(s.price) >= 0 ? Number(s.price) : 45,
              duration: Number(s.duration) > 0 ? Number(s.duration) : 45,
              description: s.description || '',
              icon: s.icon || design.icon,
              iconColor: s.iconColor || design.iconColor,
              iconBg: s.iconBg || design.iconBg,
              isCustom: s.isCustom || false,
            };
          }),
        });
      });
    }

    res.json({ success: true, categories: groups });
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
  getPendingCustomServices,
  approveCustomService,
  rejectCustomService,
  getCatalogGrouped,
  resolveServiceIcon,
  sanitizeCustomServices,
};
