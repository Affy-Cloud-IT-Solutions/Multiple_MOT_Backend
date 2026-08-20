const Garage = require('../models/Garage');
const User = require('../models/User');
const Audit = require('../models/Audit');
const jwt = require('jsonwebtoken');

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id.toString() };
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
    res.json(garages.map(formatDoc));
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
    res.json(formatDoc(garage));
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

    // Check if slot already blocked
    const alreadyBlocked = garage.blockedSlots.some(s => s.date === date && s.slot === slot);
    if (!alreadyBlocked) {
      garage.blockedSlots.push({ date, slot });
      await garage.save();
    }

    res.json({ message: 'Slot blocked successfully.', garage: formatDoc(garage) });
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
  blockGarageSlot
};
