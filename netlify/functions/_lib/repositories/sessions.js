/**
 * Repositorio de sesiones de admin.
 *
 * Ver documentación completa en la definición original (Entrega 2).
 *
 * Refactor: store lazy para evitar MissingBlobsEnvironmentError al import.
 */

import { storeClient, generateId } from './_base.js';

let _store = null;
const getStore = () => {
  if (!_store) _store = storeClient('sessions');
  return _store;
};

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;      // 15 minutos
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;    // 24 horas

export const createMagicLink = async (adminEmail) => {
  const token = generateId('mlk');
  const now = new Date();
  const session = {
    token,
    adminEmail,
    purpose: 'magic_link',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS).toISOString(),
    used: false,
  };
  await getStore().set(token, session);
  return session;
};

export const createSession = async (adminEmail) => {
  const token = generateId('ses');
  const now = new Date();
  const session = {
    token,
    adminEmail,
    purpose: 'login',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  };
  await getStore().set(token, session);
  return session;
};

export const findByToken = async (token) => {
  if (!token) return null;
  const session = await getStore().get(token);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) return null;
  if (session.purpose === 'magic_link' && session.used) return null;

  return session;
};

export const markMagicLinkAsUsed = async (token) => {
  const session = await getStore().get(token);
  if (!session || session.purpose !== 'magic_link') return;
  session.used = true;
  session.usedAt = new Date().toISOString();
  await getStore().set(token, session);
};

export const revoke = async (token) => {
  await getStore().delete(token);
};

export const cleanupExpired = async () => {
  const all = await getStore().list();
  const now = new Date();
  let deleted = 0;
  for (const session of all) {
    if (new Date(session.expiresAt) < now) {
      await getStore().delete(session.token);
      deleted++;
    }
  }
  return deleted;
};