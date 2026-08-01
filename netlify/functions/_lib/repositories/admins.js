/**
 * Repositorio de admins.
 *
 * Un admin tiene:
 *   - email (único, sirve como identificador primario).
 *   - name (opcional, para mostrar en el panel).
 *   - createdAt (auditoría).
 *   - active (soft delete).
 *
 * Whitelist inicial: mientras no exista el panel de admins-de-admins
 * (previsto para Fase 3), la lista de admins válidos está hardcodeada
 * en INITIAL_ADMINS. Al arrancar la Entrega 5 (auth), el sistema
 * autopoblará el store con estos admins la primera vez que uno intente
 * loguearse.
 *
 * En Fase 3 con Aiven, esto pasa a ser una tabla `admins` normal y la
 * whitelist se gestiona desde el panel de superadmin.
 */

import { storeClient, normalizeEmail } from './_base.js';

/**
 * Whitelist inicial de admins. Editar este array para sumar/quitar
 * admins mientras no exista panel de gestión.
 *
 * IMPORTANTE: los emails van normalizados (lowercase, sin espacios).
 */
const INITIAL_ADMINS = [
  {
    email: 'felix@gmail.com',
    name: 'Felix Doura',
    role: 'superadmin',
  },
  // Cuando Innova pase los emails, sumar acá:
  // { email: 'paola@...', name: 'Paola ...', role: 'admin' },
  // { email: 'esteban@...', name: 'Esteban ...', role: 'admin' },
  // { email: 'lorena@...', name: 'Lorena ...', role: 'admin' },
  // { email: 'jesica@...', name: 'Jesica ...', role: 'admin' },
];

const store = storeClient('admins');

/**
 * Busca un admin por email (case-insensitive).
 * Si no existe en el store pero está en INITIAL_ADMINS, lo autopoblará.
 * Devuelve null si no está autorizado.
 */
export const findByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  // 1. Buscar en el store.
  const stored = await store.get(normalized);
  if (stored && stored.active !== false) return stored;

  // 2. Si no está en el store, buscar en la whitelist inicial y autopoblar.
  const fromInitial = INITIAL_ADMINS.find((a) => normalizeEmail(a.email) === normalized);
  if (fromInitial) {
    const admin = {
      email: normalized,
      name: fromInitial.name,
      role: fromInitial.role || 'admin',
      active: true,
      createdAt: new Date().toISOString(),
      source: 'initial_whitelist',
    };
    await store.set(normalized, admin);
    return admin;
  }

  return null;
};

/**
 * Lista todos los admins. Para el panel admin (Sprint 2).
 */
export const findAll = async ({ activeOnly = true } = {}) => {
  const all = await store.list();
  if (activeOnly) return all.filter((a) => a.active !== false);
  return all;
};

/**
 * Devuelve true si el email es admin válido y activo.
 * Wrapper conveniente para el middleware de auth.
 */
export const isAuthorized = async (email) => {
  const admin = await findByEmail(email);
  return admin !== null;
};