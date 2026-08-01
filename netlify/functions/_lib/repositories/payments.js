/**
 * Repositorio de pagos.
 *
 * Un payment tiene la estructura documentada en el sistema V1.0 más
 * campos derivados del provider (mp*, y en el futuro paypal*, payway*, etc.).
 *
 * Migra la lógica que hoy vive dispersa en:
 *   - store.js (helpers savePayment / getPayment / updatePaymentStatus / listPayments).
 *   - recuperar-acceso.js (iteración manual y filtrado por email).
 *
 * La interfaz pública está pensada como si fuera una tabla SQL: findByX,
 * insert, update. Cuando migremos a Postgres, esta interfaz no cambia.
 */

import { storeClient, normalizeEmail } from './_base.js';

const store = storeClient('payments');

/**
 * Inserta un pago nuevo. El caller define externalReference como PK.
 */
export const insert = async (payment) => {
  if (!payment.externalReference) {
    throw new Error('payment.externalReference es requerido');
  }
  await store.set(payment.externalReference, {
    ...payment,
    updatedAt: new Date().toISOString(),
  });
  return payment;
};

/**
 * Busca por externalReference (PK).
 */
export const findByReference = async (externalReference) => {
  if (!externalReference) return null;
  return await store.get(externalReference);
};

/**
 * Busca todos los pagos aprobados de un email dado. Case-insensitive.
 * Ordenados por createdAt descendente.
 *
 * Se usa en recuperar-acceso.js.
 *
 * NOTA: escanea todos los pagos. Aceptable para el volumen actual (MVP).
 * En Fase 3 con Postgres, esto es un SELECT con índice en (buyer_email, status).
 */
export const findApprovedByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const all = await store.list();
  return all
    .filter(
      (p) =>
        p.status === 'approved' &&
        normalizeEmail(p.buyerEmail) === normalized
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Actualiza el estado y metadata de un pago.
 * Merge con lo existente; los campos no incluidos en `patch` quedan intactos.
 */
export const updateStatus = async (externalReference, patch) => {
  const existing = await store.get(externalReference);
  if (!existing) {
    throw new Error(`Payment no encontrado: ${externalReference}`);
  }
  const updated = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await store.set(externalReference, updated);
  return updated;
};

/**
 * Lista todos los pagos con filtros opcionales.
 * Para el panel admin (Sprint 2).
 */
export const findAll = async ({
  status = null,
  cursoSlug = null,
  fromDate = null,
  toDate = null,
} = {}) => {
  let all = await store.list();
  if (status) all = all.filter((p) => p.status === status);
  if (cursoSlug) all = all.filter((p) => p.cursoSlug === cursoSlug);
  if (fromDate) all = all.filter((p) => new Date(p.createdAt) >= new Date(fromDate));
  if (toDate) all = all.filter((p) => new Date(p.createdAt) <= new Date(toDate));
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};