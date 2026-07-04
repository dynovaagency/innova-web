/**
 * Persistencia de pagos.
 *
 * En producción:  Netlify Blobs (KV store gratuito de Netlify).
 * En modo mock:   archivo JSON en .netlify/mock-payments.json
 *
 * Por qué no un Map en memoria en modo mock: Netlify Dev inicia cada function
 * en su propio contexto/proceso, así que un Map global no se comparte entre
 * create-preference y mock-approve. El archivo JSON garantiza que todas las
 * functions lean/escriban la misma info.
 *
 * Estructura de un registro de pago:
 *   {
 *     externalReference: "inv_abc123",
 *     status: "approved" | "pending" | "rejected",
 *     amount: 28000,
 *     currency: "ARS",
 *     mpPaymentId: "12345",
 *     mpPreferenceId: "999-abc",
 *     buyerEmail: "usuario@example.com",
 *     cursoSlug: "vulnerabilidad-social",
 *     createdAt: "2026-07-03T15:00:00Z",
 *     updatedAt: "2026-07-03T15:00:30Z"
 *   }
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { MOCK_MODE } from './config.js';

const STORE_NAME = 'innova-payments';
const MOCK_FILE = join(process.cwd(), '.netlify', 'mock-payments.json');

// --- Filesystem storage (solo modo mock) ---------------------------
async function readMockDb() {
  try {
    const raw = await readFile(MOCK_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    console.error('[mock store] read error:', err);
    return {};
  }
}

async function writeMockDb(db) {
  try {
    await mkdir(dirname(MOCK_FILE), { recursive: true });
    await writeFile(MOCK_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[mock store] write error:', err);
    throw err;
  }
}

// --- Netlify Blobs (producción) ------------------------------------
async function getBlobStore() {
  // Import dinámico para que si @netlify/blobs no está instalado en dev,
  // no rompa. Solo se resuelve cuando MOCK_MODE es false.
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// --- API pública ---------------------------------------------------
export async function savePayment(record) {
  const key = record.externalReference;
  if (!key) throw new Error('externalReference is required');
  const stamped = { ...record, updatedAt: new Date().toISOString() };

  if (MOCK_MODE) {
    const db = await readMockDb();
    db[key] = stamped;
    await writeMockDb(db);
    return;
  }

  const store = await getBlobStore();
  await store.setJSON(key, stamped);
}

export async function getPayment(externalReference) {
  if (!externalReference) return null;

  if (MOCK_MODE) {
    const db = await readMockDb();
    return db[externalReference] || null;
  }

  const store = await getBlobStore();
  return await store.get(externalReference, { type: 'json' });
}

export async function updatePaymentStatus(externalReference, updates) {
  const existing = await getPayment(externalReference);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await savePayment(updated);
  return updated;
}
