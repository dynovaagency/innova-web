/**
 * Helpers compartidos entre repositorios.
 *
 * Cada repo tiene un "namespace" (equivalente a una tabla en SQL) que se usa
 * como prefijo/store name en Netlify Blobs.
 *
 * En Fase 3 (Aiven Postgres), este archivo se reemplaza por un cliente SQL
 * compartido (pg pool) y los repos pasan a hacer queries en vez de get/set
 * en blobs.
 */

import { getStore } from '@netlify/blobs';
import { IS_LOCAL_DEV } from '../config.js';

// Path del "store" local para desarrollo con netlify dev.
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
 * Construye las opciones de conexión a Blobs.
 *
 * Netlify normalmente auto-inyecta siteID y token en runtime, pero en algunos
 * escenarios (bundling con esbuild, deploys con cierta config) ese auto-inject
 * falla con MissingBlobsEnvironmentError. Como workaround pasamos esos valores
 * explícitos leyendo de env vars que sí llegan al runtime.
 *
 * Ver:
 *   https://github.com/netlify/blobs/issues/175
 *   https://answers.netlify.com/t/missingblobsenvironmenterror-in-production-despite-following-documentation/156201
 */
const buildBlobsOptions = () => {
  const options = {};
  if (process.env.NETLIFY_SITE_ID) {
    options.siteID = process.env.NETLIFY_SITE_ID;
  }
  if (process.env.NETLIFY_BLOBS_TOKEN) {
    options.token = process.env.NETLIFY_BLOBS_TOKEN;
  }
  return options;
};

export const storeClient = (namespace) => {
  if (IS_LOCAL_DEV) {
    return localFilesystemClient(namespace);
  }
  return netlifyBlobsClient(namespace);
};

const netlifyBlobsClient = (namespace) => {
  const options = buildBlobsOptions();
  // Si tenemos siteID y token, pasar el objeto explícito; si no, dejar que
  // Netlify use su auto-inject (funciona en la mayoría de los casos).
  const store =
    options.siteID && options.token
      ? getStore({ name: namespace, ...options })
      : getStore(namespace);

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

export const generateId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeEmail = (email) => {
  if (typeof email !== 'string') return null;
  return email.trim().toLowerCase();
};