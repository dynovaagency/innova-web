/**
 * Helpers compartidos entre repositorios.
 *
 * Cada repo tiene un "namespace" (equivalente a una tabla en SQL) que se usa
 * como prefijo/store name en Netlify Blobs. Ejemplo:
 *   - admins → getStore('admins')
 *   - payments → getStore('payments')
 *
 * En Fase 3 (Aiven Postgres), este archivo se reemplaza por un cliente SQL
 * compartido (pg pool) y los repos pasan a hacer queries en vez de get/set
 * en blobs. La interfaz pública de cada repo NO cambia — por eso las
 * functions no necesitan tocarse.
 */

import { getStore } from '@netlify/blobs';
import { IS_LOCAL_DEV } from '../config.js';

// Path del "store" local para desarrollo con netlify dev.
// Se calcula lazy (solo cuando se necesita) para evitar que el bundler de
// Netlify Functions rompa por import.meta.url siendo undefined en runtime.
let _localDbDir = null;
const getLocalDbDir = async () => {
  if (_localDbDir) return _localDbDir;
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  _localDbDir = path.resolve(__dirname, '../../.mock-db');
  return _localDbDir;
};

/**
 * Cliente de store para un namespace. Devuelve un objeto con métodos
 * uniformes independientemente de si corre en Netlify o en local.
 *
 * @param {string} namespace - ej: 'admins', 'payments', 'products', 'sessions'
 */
export const storeClient = (namespace) => {
  if (IS_LOCAL_DEV) {
    return localFilesystemClient(namespace);
  }
  return netlifyBlobsClient(namespace);
};

/**
 * Cliente para producción: usa Netlify Blobs.
 */
const netlifyBlobsClient = (namespace) => {
  const store = getStore(namespace);
  return {
    async get(key) {
      const raw = await store.get(key, { type: 'json' });
      return raw ?? null;
    },
    async set(key, value) {
      await store.setJSON(key, value);
    },
    async delete(key) {
      await store.delete(key);
    },
    async list() {
      const { blobs } = await store.list();
      const items = await Promise.all(
        blobs.map(async (b) => await store.get(b.key, { type: 'json' }))
      );
      return items.filter(Boolean);
    },
    async listKeys() {
      const { blobs } = await store.list();
      return blobs.map((b) => b.key);
    },
  };
};

/**
 * Cliente para desarrollo local: usa filesystem JSON.
 * Cada namespace es un archivo `.mock-db/<namespace>.json` con un objeto
 * { key: value, ... }.
 *
 * En local, netlify dev NO expone Blobs por default, así que este fallback
 * permite iterar sin depender de una cuenta de Netlify en cada corrida.
 */
const localFilesystemClient = (namespace) => {
  const readAll = async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const dbDir = await getLocalDbDir();
    const filePath = path.join(dbDir, `${namespace}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  };

  const writeAll = async (data) => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const dbDir = await getLocalDbDir();
    const filePath = path.join(dbDir, `${namespace}.json`);
    await fs.mkdir(dbDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  };

  return {
    async get(key) {
      const all = await readAll();
      return all[key] ?? null;
    },
    async set(key, value) {
      const all = await readAll();
      all[key] = value;
      await writeAll(all);
    },
    async delete(key) {
      const all = await readAll();
      delete all[key];
      await writeAll(all);
    },
    async list() {
      const all = await readAll();
      return Object.values(all);
    },
    async listKeys() {
      const all = await readAll();
      return Object.keys(all);
    },
  };
};

/**
 * Genera un ID único con formato `<prefix>_<timestamp>_<random>`.
 * Estilo consistente con lo que ya se usa para externalReference.
 */
export const generateId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Normaliza un email para comparación case-insensitive y sin espacios.
 * Se usa como key en los repos que indexan por email.
 */
export const normalizeEmail = (email) => {
  if (typeof email !== 'string') return null;
  return email.trim().toLowerCase();
};