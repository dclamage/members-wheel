import { touchAdminSession } from '../services/adminSessions.js';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'local-admin-token';

export const getAdminToken = () => ADMIN_TOKEN;

const adminOnly = async (req, res, next) => {
  try {
    const headerToken = req.headers['x-admin-token'];
    if (headerToken && headerToken === ADMIN_TOKEN) {
      return next();
    }

    const sessionId = req.headers['x-admin-session'];
    if (sessionId) {
      const session = await touchAdminSession(sessionId);
      if (session) {
        req.adminSession = session;
        return next();
      }
    }

    return res.status(403).json({ message: 'Forbidden: invalid or missing admin credentials' });
  } catch (error) {
    return next(error);
  }
};

export default adminOnly;
