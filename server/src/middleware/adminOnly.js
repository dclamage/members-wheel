const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'local-admin-token';

export const getAdminToken = () => ADMIN_TOKEN;

const adminOnly = (req, res, next) => {
  const headerToken = req.headers['x-admin-token'];
  if (!headerToken || headerToken !== ADMIN_TOKEN) {
    return res.status(403).json({ message: 'Forbidden: invalid or missing admin token' });
  }
  return next();
};

export default adminOnly;
