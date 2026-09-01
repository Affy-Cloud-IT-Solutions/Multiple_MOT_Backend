const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Audit = require('../models/Audit');

async function customerLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user in MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'No user found with this email, please signup first' });
    }

    // Check if the user is a customer
    if (user.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied. This login is strictly for customers.' });
    }

    // Check hashed password using schema method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, customerId: user.customerId, garageId: user.garageId },
      process.env.JWT_SECRET || 'mot_app_secure_secret_token_2026',
      { expiresIn: '24h' }
    );

    // Create Audit Log in MongoDB
    await Audit.create({
      activity: 'Customer Login',
      details: `${user.username} logged in successfully as customer.`
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
        garageId: user.garageId
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user in MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'No user found with this email.' });
    }

    // Check if the user has admin/staff role
    if (user.role !== 'admin' && user.role !== 'garage_admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Access denied. This login is strictly for staff and admins.' });
    }

    // Check hashed password using schema method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, customerId: user.customerId, garageId: user.garageId },
      process.env.JWT_SECRET || 'mot_app_secure_secret_token_2026',
      { expiresIn: '24h' }
    );

    // Create Audit Log in MongoDB
    await Audit.create({
      activity: 'Admin/Staff Login',
      details: `${user.username} logged in successfully as ${user.role}.`
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
        garageId: user.garageId
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

async function signup(req, res) {
  try {
    const { name, email, password, mobile } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Public signup is strictly for customers only
    const finalRole = 'customer';
    let customerId = null;

    // Create Customer profile
    if (finalRole === 'customer') {
      const parts = name.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      const customer = await Customer.create({
        firstName,
        lastName,
        email: emailLower,
        mobile: mobile || 'N/A',
        preferredContact: 'Email' // default
      });
      customerId = customer._id;
    }

    const newUser = await User.create({
      username: name,
      email: emailLower,
      password, // hooks will hash
      role: finalRole,
      customerId
    });

    await Audit.create({
      activity: 'User Signup',
      details: `New user registered: ${name} (${emailLower}) as ${finalRole}`
    });

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: newUser._id,
        name: newUser.username,
        email: newUser.email,
        role: newUser.role,
        customerId: newUser.customerId
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during signup.' });
  }
}

async function createStaff(req, res) {
  try {
    // Only Garage Admin can register staff for their garage
    if (req.user?.role !== 'garage_admin') {
      return res.status(403).json({ error: 'Access Denied. Only Garage Admins can register staff accounts.' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const newStaff = await User.create({
      username: name,
      email: emailLower,
      password, // Pre-save hooks will bcrypt hash
      role: 'staff',
      garageId: req.user?.garageId
    });

    await Audit.create({
      activity: 'Staff Account Created',
      details: `Garage Admin created new staff account for ${name} (${emailLower})`
    });

    res.status(201).json({
      message: 'Garage Staff account registered successfully.',
      user: {
        id: newStaff._id,
        name: newStaff.username,
        email: newStaff.email,
        role: newStaff.role
      }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during staff creation.' });
  }
}

async function getStaffList(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'garage_admin') {
      return res.status(403).json({ error: 'Access Denied. You do not have permissions to view the staff list.' });
    }

    let query = { role: 'staff' };
    if (req.user?.role === 'garage_admin') {
      query.garageId = req.user.garageId;
    }

    const staffMembers = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(staffMembers);
  } catch (error) {
    console.error('Get staff list error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during staff list retrieval.' });
  }
}

async function deleteStaff(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'garage_admin') {
      return res.status(403).json({ error: 'Access Denied. You do not have permissions to delete staff accounts.' });
    }

    let query = { _id: req.params.id, role: 'staff' };
    if (req.user?.role === 'garage_admin') {
      query.garageId = req.user.garageId;
    }

    const staff = await User.findOneAndDelete(query);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    await Audit.create({
      activity: 'Staff Account Deleted',
      details: `Super Admin deleted staff account for ${staff.username} (${staff.email})`
    });

    res.json({ message: 'Staff member deleted successfully.' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during staff deletion.' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    
    res.json({
      id: user._id.toString(),
      name: user.username,
      email: user.email,
      role: user.role,
      ...(user.customerId && { customerId: user.customerId.toString() })
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message || 'Internal server error retrieving profile.' });
  }
}

module.exports = {
  customerLogin,
  adminLogin,
  signup,
  createStaff,
  getStaffList,
  deleteStaff,
  getProfile
};
