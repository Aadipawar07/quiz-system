import jwt from 'jsonwebtoken';

/**
 * Middleware: verify JWT from either:
 *   1. Authorization header:  Bearer <token>
 *   2. Query param:           ?token=<token>   (used by direct download links)
 */
const adminAuth = (req, res, next) => {
  let token = null;

  // 1. Try Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Fallback: query param (for <a href> export links)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default adminAuth;
