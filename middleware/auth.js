const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access Denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'mot_app_secure_secret_token_2026');
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid authentication token.' });
  }
}

module.exports = authMiddleware;
