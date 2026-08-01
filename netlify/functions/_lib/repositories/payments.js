/**
 * Repositorio de pagos.
 *
 * Ver documentación completa en la definición original (Entrega 2).
 *
 * Refactor: store lazy para evitar MissingBlobsEnvironmentError al import.
 */

import { storeClient, normalizeEmail } from './_base.js';

let _store = null;
const getStore = () => {
  if (!_store) _store = storeClient('payments');
  return _store;
};

export const insert = async (payment) => {
  if (!payment.externalReference) {
    throw new Error('payment.externalReference es requerido');
  }
  await getStore().set(payment.externalReference, {
    ...payment,
    updatedAt: new Date().toISOString(),
  });
  return payment;
};

export const findByReference = async (externalReference) => {
  if (!externalReference) return null;
  return await getStore().get(externalReference);
};

export const findApprovedByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const all = await getStore().list();
  return all
    .filter(
      (p) =>
        p.status === 'approved' &&
        normalizeEmail(p.buyerEmail) === normalized
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const updateStatus = async (externalReference, patch) => {
  const existing = await getStore().get(externalReference);
  if (!existing) {
    throw new Error(`Payment no encontrado: ${externalReference}`);
  }
  const updated = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await getStore().set(externalReference, updated);
  return updated;
};

export const findAll = async ({
  status = null,
  cursoSlug = null,
  fromDate = null,
  toDate = null,
} = {}) => {
  let all = await getStore().list();
  if (status) all = all.filter((p) => p.status === status);
  if (cursoSlug) all = all.filter((p) => p.cursoSlug === cursoSlug);
  if (fromDate) all = all.filter((p) => new Date(p.createdAt) >= new Date(fromDate));
  if (toDate) all = all.filter((p) => new Date(p.createdAt) <= new Date(toDate));
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};