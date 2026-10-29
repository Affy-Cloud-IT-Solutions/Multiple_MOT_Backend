const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Garage = require('../models/Garage');
const Audit = require('../models/Audit');
const { sendCustomerWelcomeEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'mot_app_secure_secret_token_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mot_app_secure_refresh_secret_2026';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
// After a rotation the replaced refresh token keeps working this long, so two near-simultaneous refreshes
// (or a refresh whose response was lost on a flaky mobile connection) don't log the user out
const REFRESH_TOKEN_REUSE_GRACE_MS = 2 * 60 * 1000;

const buildTokenPayload = (user, customerId, garageId) => ({
  userId: user._id,
  email: user.email,
  role: user.role,
  customerId: customerId || user.customerId,
  garageId: garageId || user.garageId
});

const signAccessToken = (user, customerId, garageId) =>
  jwt.sign(buildTokenPayload(user, customerId, garageId), JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

/** True when `token` is the refresh token replaced by the most recent rotation and that rotation is recent. */
function isWithinRotationGrace(user, token, now = Date.now()) {
  return Boolean(
    token &&
    user.previousRefreshToken === token &&
    user.refreshTokenRotatedAt &&
    now - new Date(user.refreshTokenRotatedAt).getTime() <= REFRESH_TOKEN_REUSE_GRACE_MS
  );
}

async function generateTokens(user, customerId, garageId) {
  const payload = buildTokenPayload(user, customerId, garageId);

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  user.previousRefreshToken = user.refreshToken || null;
  user.refreshTokenRotatedAt = new Date();
  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken, token: accessToken };
}

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

    // Ensure customer record is linked or auto-created
    let cust = null;
    if (user.customerId) {
      try {
        cust = await Customer.findById(user.customerId);
      } catch (e) {
        cust = null;
      }
    }
    if (!cust) {
      cust = await Customer.findOne({ email: user.email.toLowerCase().trim() });
    }
    if (!cust) {
      const parts = (user.username || 'Customer').trim().split(' ');
      cust = await Customer.create({
        firstName: parts[0] || 'Customer',
        lastName: parts.slice(1).join(' ') || '',
        email: user.email.toLowerCase().trim(),
        mobile: 'N/A',
        preferredContact: 'Email'
      });
    }

    if (!user.customerId || String(user.customerId) !== String(cust._id)) {
      user.customerId = cust._id;
      await user.save();
    }

    // Create Access & Refresh Tokens with verified customerId
    const tokens = await generateTokens(user, cust._id, user.garageId);

    // Create Audit Log in MongoDB
    await Audit.create({
      activity: 'Customer Login',
      details: `${user.username} logged in successfully as customer.`
    });

    // Resolve customer full name
    const displayName = `${cust.firstName} ${cust.lastName}`.trim() || user.username;

    res.json({
      message: 'Login successful.',
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        name: displayName,
        email: user.email,
        role: user.role,
        customerId: cust._id,
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
    const user = await User.findOne({ email: email.toLowerCase().trim() });
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

    // For garage admins and staff, verify garage approval status
    if (user.role === 'garage_admin' || user.role === 'staff') {
      if (!user.garageId) {
        return res.status(403).json({ error: 'No associated garage record found for this account.' });
      }
      const garage = await Garage.findById(user.garageId);
      if (!garage) {
        return res.status(403).json({ error: 'Associated garage not found. Please register or contact support.' });
      }

      if (garage.status === 'Blacklisted') {
        return res.status(403).json({ 
          error: 'This garage account is currently suspended. Please contact platform support.',
          status: 'Blacklisted',
          garageName: garage.name
        });
      }
    }

    // Create Access & Refresh Tokens
    const tokens = await generateTokens(user, user.customerId, user.garageId);

    // Create Audit Log in MongoDB
    await Audit.create({
      activity: 'Admin/Staff Login',
      details: `${user.username} logged in successfully as ${user.role}.`
    });

    res.json({
      message: 'Login successful.',
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
        garageId: user.garageId
      },
      garage: typeof garage !== 'undefined' && garage ? {
        id: garage._id,
        name: garage.name,
        status: garage.status,
        verificationStatus: garage.verificationStatus,
        verificationDocuments: garage.verificationDocuments,
        rejectionReason: garage.rejectionReason
      } : null
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

async function signup(req, res) {
  try {
    const { name, email, password, mobile, garageConsent } = req.body;
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
    const consentAgreed = Boolean(garageConsent);
    const consentDate = consentAgreed ? new Date() : null;

    let createdCustomer = null;
    // Create Customer profile
    if (finalRole === 'customer') {
      const parts = name.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      createdCustomer = await Customer.create({
        firstName,
        lastName,
        email: emailLower,
        mobile: mobile || 'N/A',
        preferredContact: 'Email', // default
        garageConsent: consentAgreed,
        garageConsentDate: consentDate
      });
      customerId = createdCustomer._id;
    }

    const newUser = await User.create({
      username: name,
      email: emailLower,
      password, // hooks will hash
      role: finalRole,
      customerId,
      garageConsent: consentAgreed,
      garageConsentDate: consentDate
    });

    if (createdCustomer) {
      sendCustomerWelcomeEmail(createdCustomer).catch(err => 
        console.error('[authController] Failed to send customer welcome email:', err.message)
      );
    }

    await Audit.create({
      activity: 'User Signup',
      details: `New user registered: ${name} (${emailLower}) as ${finalRole} (Garage Data Sharing Consent: ${consentAgreed ? 'Granted' : 'Declined'})`
    });

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: newUser._id,
        name: newUser.username,
        email: newUser.email,
        role: newUser.role,
        customerId: newUser.customerId,
        garageConsent: newUser.garageConsent,
        garageConsentDate: newUser.garageConsentDate
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
    
    let displayName = user.username;
    if (user.customerId) {
      const cust = await Customer.findById(user.customerId);
      if (cust) {
        displayName = `${cust.firstName} ${cust.lastName}`.trim();
      }
    }

    res.json({
      id: user._id.toString(),
      name: displayName || user.username,
      email: user.email,
      role: user.role,
      ...(user.customerId && { customerId: user.customerId.toString() })
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message || 'Internal server error retrieving profile.' });
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        error: 'Refresh token expired or invalid. Please log in again.',
        tokenExpired: true,
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.', code: 'USER_NOT_FOUND' });
    }

    const isCurrentToken = user.refreshToken === refreshToken;
    const isGraceReuse = !isCurrentToken && isWithinRotationGrace(user, refreshToken);
    if (!isCurrentToken && !isGraceReuse) {
      return res.status(403).json({
        error: 'Refresh token is no longer valid or has been revoked. Please log in again.',
        tokenExpired: true,
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }

    let customerId = user.customerId;
    let displayName = user.username;
    if (user.role === 'customer') {
      let cust = null;
      if (customerId) {
        cust = await Customer.findById(customerId);
      }
      if (!cust) {
        cust = await Customer.findOne({ email: user.email.toLowerCase().trim() });
      }
      if (cust) {
        customerId = cust._id;
        displayName = `${cust.firstName} ${cust.lastName}`.trim() || user.username;
      }
    }

    // A just-replaced token gets a fresh access token plus the CURRENT refresh token (no second rotation),
    // so every caller converges on the same latest refresh token
    const tokens = isGraceReuse
      ? (() => {
          const accessToken = signAccessToken(user, customerId, user.garageId);
          return { accessToken, refreshToken: user.refreshToken, token: accessToken };
        })()
      : await generateTokens(user, customerId, user.garageId);

    res.json({
      message: 'Token refreshed successfully.',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.token,
      user: {
        id: user._id,
        name: displayName,
        email: user.email,
        role: user.role,
        customerId,
        garageId: user.garageId
      }
    });
  } catch (error) {
    console.error('Refresh token endpoint error:', error);
    res.status(500).json({ error: 'Internal server error while refreshing token.' });
  }
}

async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.userId;

    if (userId) {
      await User.findByIdAndUpdate(userId, { refreshToken: null, previousRefreshToken: null });
    } else if (refreshToken) {
      await User.findOneAndUpdate(
        { $or: [{ refreshToken }, { previousRefreshToken: refreshToken }] },
        { refreshToken: null, previousRefreshToken: null }
      );
    }

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout.' });
  }
}

module.exports = {
  customerLogin,
  adminLogin,
  signup,
  createStaff,
  getStaffList,
  deleteStaff,
  getProfile,
  generateTokens,
  isWithinRotationGrace,
  refreshToken,
  logout
};
