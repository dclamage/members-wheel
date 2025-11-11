import { randomUUID } from 'crypto';
import { get, run } from '../db.js';

const DEFAULT_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 30);

const now = () => new Date();

const toISOString = (date) => date.toISOString();

const buildSessionResponse = (id, createdAt, lastUsedAt, expiresAt) => ({
  sessionId: id,
  createdAt,
  lastUsedAt,
  expiresAt,
});

const removeIfExpired = async (session) => {
  if (!session) {
    return null;
  }

  const expiresAt = new Date(session.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now()) {
    await run('DELETE FROM admin_sessions WHERE id = ?', [session.id]);
    return null;
  }

  return session;
};

export const createAdminSession = async () => {
  const id = randomUUID();
  const createdAt = now();
  const expiresAt = new Date(createdAt.getTime() + DEFAULT_TTL_MS);
  const isoCreatedAt = toISOString(createdAt);
  const isoExpiresAt = toISOString(expiresAt);

  await run(
    `INSERT INTO admin_sessions (id, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?)`,
    [id, isoCreatedAt, isoCreatedAt, isoExpiresAt],
  );

  return buildSessionResponse(id, isoCreatedAt, isoCreatedAt, isoExpiresAt);
};

export const findAdminSession = async (sessionId) => {
  const session = await get('SELECT * FROM admin_sessions WHERE id = ?', [sessionId]);
  return removeIfExpired(session);
};

export const touchAdminSession = async (sessionId) => {
  const session = await findAdminSession(sessionId);
  if (!session) {
    return null;
  }

  const usedAt = now();
  const expiresAt = new Date(usedAt.getTime() + DEFAULT_TTL_MS);
  const isoUsedAt = toISOString(usedAt);
  const isoExpiresAt = toISOString(expiresAt);

  await run('UPDATE admin_sessions SET last_used_at = ?, expires_at = ? WHERE id = ?', [
    isoUsedAt,
    isoExpiresAt,
    sessionId,
  ]);

  return buildSessionResponse(sessionId, session.created_at, isoUsedAt, isoExpiresAt);
};

export const deleteAdminSession = async (sessionId) => {
  await run('DELETE FROM admin_sessions WHERE id = ?', [sessionId]);
};

export const pruneExpiredAdminSessions = async () => {
  await run('DELETE FROM admin_sessions WHERE expires_at <= ?', [toISOString(now())]);
};

export default {
  createAdminSession,
  findAdminSession,
  touchAdminSession,
  deleteAdminSession,
  pruneExpiredAdminSessions,
};
