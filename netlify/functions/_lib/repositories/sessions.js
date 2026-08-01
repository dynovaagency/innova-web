/**
 * Repositorio de sesiones de admin.
 *
 * Una sesión tiene:
 *   - token (único, es el ID; también es lo que va en la cookie).
 *   - adminEmail (a quién pertenece).
 *   - createdAt / expiresAt (control de vida).
 *   - purpose ('login' para sesión activa, 'magic_link' para link pendiente).
 *   - used (para magic links: se marca al canjear, evita reuso).
 *
 * Hay dos tipos de sesión distintos que se manejan acá para simplificar:
 *
 * 1. Magic link: purpose='magic_link', vida corta (15 min), un solo uso.
 *    Se crea en admin-request-link, se consume en admin-verify-link.
 *
 * 2. Sesión activa: purpose='login', vida de 24 hs.
 *    Se crea en admin-verify-link tras canjear un magic link.
 *    Se valida en cada request del panel vía middleware.
 *
 * En Fase 3 con Aiven serían dos tablas separadas (magic_links y sessions)
 * porque los patrones de acceso son distintos. En Blobs, dado el volumen
 * bajo (4-5 admins), un solo namespace alcanza.
 */

import { storeClient, generateId } from './_base.js';

const store = storeClient('sessions');

// Constantes de vida — centralizadas para poder cambiar fácil.
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;      // 15 minutos
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;    // 24 horas

/**
 * Crea un magic link. Devuelve el token que va en el link enviado por email.
 */
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
  await store.set(token, session);
  return session;
};

/**
 * Crea una sesión activa. Se llama después de canjear exitosamente un
 * magic link.
 */
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
  await store.set(token, session);
  return session;
};

/**
 * Busca una sesión por token. Devuelve null si:
 *   - No existe.
 *   - Está expirada.
 *   - Es un magic link ya usado.
 *
 * Los checks de expiración se hacen en aplicación, no en el store, porque
 * Blobs no tiene TTL nativo. La cleanup periódica se hace en cleanupExpired().
 */
export const findByToken = async (token) => {
  if (!token) return null;
  const session = await store.get(token);
  if (!session) return null;

  // Expiración.
  if (new Date(session.expiresAt) < new Date()) return null;

  // Magic link ya usado.
  if (session.purpose === 'magic_link' && session.used) return null;

  return session;
};

/**
 * Marca un magic link como usado. Se llama en admin-verify-link tras
 * validar el token, antes de crear la sesión activa.
 * Evita que el mismo link se pueda reutilizar.
 */
export const markMagicLinkAsUsed = async (token) => {
  const session = await store.get(token);
  if (!session || session.purpose !== 'magic_link') return;
  session.used = true;
  session.usedAt = new Date().toISOString();
  await store.set(token, session);
};

/**
 * Revoca una sesión (logout).
 */
export const revoke = async (token) => {
  await store.delete(token);
};

/**
 * Elimina sesiones expiradas. Se puede correr manualmente o vía cron.
 * Devuelve el número de sesiones eliminadas.
 */
export const cleanupExpired = async () => {
  const all = await store.list();
  const now = new Date();
  let deleted = 0;
  for (const session of all) {
    if (new Date(session.expiresAt) < now) {
      await store.delete(session.token);
      deleted++;
    }
  }
  return deleted;
};