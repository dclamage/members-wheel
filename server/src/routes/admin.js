import express from 'express';
import {
  createAdminSession,
  deleteAdminSession,
  pruneExpiredAdminSessions,
  touchAdminSession,
} from '../services/adminSessions.js';
import { getAdminToken } from '../middleware/adminOnly.js';

const router = express.Router();

const extractSessionId = (req) => req.headers['x-admin-session'];

router.post('/session', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Admin token is required' });
    }

    if (token !== getAdminToken()) {
      return res.status(403).json({ message: 'Invalid admin token' });
    }

    await pruneExpiredAdminSessions();
    const session = await createAdminSession();
    return res.status(201).json(session);
  } catch (error) {
    return next(error);
  }
});

router.post('/session/refresh', async (req, res, next) => {
  try {
    const sessionId = extractSessionId(req);
    if (!sessionId) {
      return res.status(401).json({ message: 'Missing admin session' });
    }

    const session = await touchAdminSession(sessionId);
    if (!session) {
      return res.status(401).json({ message: 'Admin session expired' });
    }

    return res.json(session);
  } catch (error) {
    return next(error);
  }
});

router.delete('/session', async (req, res, next) => {
  try {
    const sessionId = extractSessionId(req);
    if (sessionId) {
      await deleteAdminSession(sessionId);
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
