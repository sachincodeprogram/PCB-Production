const jwt = require('jsonwebtoken');

// Guards the owner-only device approval API. Owner tokens use their own secret,
// so no app user (including admins) can reach these routes.
const ownerAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.OWNER_JWT_SECRET);
    if (decoded.role !== 'owner') throw new Error('Not an owner token');
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

module.exports = ownerAuth;
