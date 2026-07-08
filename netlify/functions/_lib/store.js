/**
 * Persistencia de pagos.
 *
 * Estrategia por entorno:
 *   - Local dev + mock:  archivo JSON en .netlify/mock-payments.json (filesystem)
 *   - Producción:        Netlify Blobs (KV store)
 *
 * Por qué el filesystem solo local: Netlify Functions en producción tienen
 * filesystem read-only (excepto /tmp que no persiste). En cambio, Blobs
 * funciona en cualquier entorno del propio Netlify, incluso con MOCK_MODE=true.
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
import { IS_LOCAL_DEV } from './config.js';

const STORE_NAME = 'innova-payments';
const MOCK_FILE = join(process.cwd(), '.netlify', 'mock-payments.json');

// Solo usamos filesystem local en `netlify dev`. En producción siempre Blobs.
const USE_LOCAL_FILE = IS_LOCAL_DEV;

// --- Filesystem storage (solo local dev) ---------------------------
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

// --- Netlify Blobs (producción y cualquier no-local) ---------------
async function getBlobStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore({
    name: STORE_NAME,
    consistency: 'strong',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN,
  });
}

// --- API pública ---------------------------------------------------
export async function savePayment(record) {
  const key = record.externalReference;
  if (!key) throw new Error('externalReference is required');
  const stamped = { ...record, updatedAt: new Date().toISOString() };

  if (USE_LOCAL_FILE) {
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

  if (USE_LOCAL_FILE) {
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
