import jwt from 'jsonwebtoken';

const JWT_EXPIRY = '8h';

export const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

/**
 * Express middleware — requires a valid Bearer JWT.
 * Attaches the decoded payload to req.adminUser.
 */
export const requireAuth = (req, res, next) => {
  const header = req.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.adminUser = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
};
