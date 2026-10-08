/**
 * Lógica central del módulo de facturación — emisores.
 *
 * Un emisor es un admin que puede emitir facturas a su nombre. Cada
 * admin carga sus datos fiscales y gestiona su certificado de ARCA
 * desde Configuración, sin intervención de Dynova.
 *
 * Certificado digital (flujo autogestionado):
 *   1. El backend genera el par de claves RSA y el pedido de
 *      certificado (CSR). La clave privada se guarda cifrada y NUNCA
 *      sale del backend.
 *   2. El admin descarga el CSR, lo sube a ARCA y descarga el .crt.
 *   3. El admin sube el .crt. Verificamos que corresponda a la clave
 *      privada guardada y al CUIT del emisor.
 *
 * Env vars:
 *   FISCAL_ENCRYPTION_KEY → 64 caracteres hex (32 bytes). Cifra las
 *                           claves privadas. Generarla con:
 *                           openssl rand -hex 32
 *   ARCA_ENV              → 'produccion' | 'homologacion' (default).
 */

import crypto from 'node:crypto';
import forge from 'node-forge';
import { createClient } from '@supabase/supabase-js';

export const CONDICIONES_FISCALES = ['monotributo', 'responsable_inscripto', 'exento'];

export const ARCA_ENV = process.env.ARCA_ENV === 'produccion' ? 'produccion' : 'homologacion';

let _supabase = null;
export const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return _supabase;
};

// ---------------------------------------------------------------------
// CUIT
// ---------------------------------------------------------------------

export const normalizeCuit = (value) => String(value || '').replace(/[\s-]/g, '');

export const isValidCuit = (value) => {
  const cuit = normalizeCuit(value);
  if (!/^\d{11}$/.test(cuit)) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = cuit.split('').map(Number);
  const sum = mult.reduce((acc, m, i) => acc + m * digits[i], 0);
  const mod = sum % 11;
  const check = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  return check === digits[10];
};

// ---------------------------------------------------------------------
// Cifrado de la clave privada (AES-256-GCM)
// ---------------------------------------------------------------------

export const isEncryptionConfigured = () =>
  /^[0-9a-fA-F]{64}$/.test(process.env.FISCAL_ENCRYPTION_KEY || '');

const getEncryptionKey = () => {
  if (!isEncryptionConfigured()) {
    throw new Error('FISCAL_ENCRYPTION_KEY no está configurada (64 caracteres hex)');
  }
  return Buffer.from(process.env.FISCAL_ENCRYPTION_KEY, 'hex');
};

export const encryptSecret = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
};

export const decryptSecret = (payload) => {
  const [version, iv, tag, data] = String(payload || '').split(':');
  if (version !== 'v1' || !iv || !tag || !data) {
    throw new Error('Formato de secreto cifrado inválido');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

// ---------------------------------------------------------------------
// Clave privada + CSR
// ---------------------------------------------------------------------

// ARCA no acepta caracteres especiales en el subject del CSR.
const toAscii = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .trim();

/**
 * Genera un par de claves RSA 2048 y el CSR que pide ARCA:
 *   subject = C=AR, O=<razón social>, CN=innova-web, serialNumber=CUIT <cuit>
 *
 * Devuelve { privateKeyPem, csrPem }.
 */
export const generateKeyAndCsr = ({ cuit, razonSocial }) => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = forge.pki.publicKeyFromPem(publicKey);
  csr.setSubject([
    { shortName: 'C', value: 'AR' },
    { shortName: 'O', value: toAscii(razonSocial) || 'Innova' },
    { shortName: 'CN', value: 'innova-web' },
    { name: 'serialNumber', value: `CUIT ${cuit}` },
  ]);
  csr.sign(forge.pki.privateKeyFromPem(privateKey), forge.md.sha256.create());

  return {
    privateKeyPem: privateKey,
    csrPem: forge.pki.certificationRequestToPem(csr),
  };
};

/**
 * Valida un certificado subido por el admin contra la clave privada
 * guardada y el CUIT del emisor.
 *
 * Devuelve { valid: true, expiresAt } o { valid: false, reason }.
 */
export const inspectCertificate = ({ certPem, privateKeyPem, cuit }) => {
  let cert;
  try {
    cert = new crypto.X509Certificate(String(certPem || '').trim());
  } catch {
    return {
      valid: false,
      reason: 'El archivo no es un certificado válido. Tiene que ser el .crt que descargaste de ARCA.',
    };
  }

  const matchesKey = cert.checkPrivateKey(crypto.createPrivateKey(privateKeyPem));
  if (!matchesKey) {
    return {
      valid: false,
      reason:
        'El certificado no corresponde al último pedido generado. Subí el .crt que ARCA te dio para ese pedido, o generá uno nuevo.',
    };
  }

  if (!cert.subject.includes(cuit)) {
    return {
      valid: false,
      reason: `El certificado no corresponde al CUIT ${cuit}.`,
    };
  }

  const expiresAt = new Date(cert.validTo);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return { valid: false, reason: 'El certificado está vencido.' };
  }

  return { valid: true, expiresAt: expiresAt.toISOString() };
};

// ---------------------------------------------------------------------
// Estado y mapeo a la API
// ---------------------------------------------------------------------

const FIELD_LABELS = {
  razon_social: 'Nombre o razón social',
  cuit: 'CUIT',
  condicion_fiscal: 'Condición fiscal',
  punto_venta: 'Punto de venta',
  domicilio_fiscal: 'Domicilio fiscal',
  inicio_actividades: 'Inicio de actividades',
};

/**
 * Qué le falta a un emisor para poder facturar.
 * Devuelve un array de strings (vacío = listo).
 */
export const getMissing = (row) => {
  const missing = [];
  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    if (row[field] === null || row[field] === undefined || row[field] === '') {
      missing.push(label);
    }
  }
  if (!row.cert_pem) {
    missing.push('Certificado digital');
  } else if (row.cert_expires_at && new Date(row.cert_expires_at) <= new Date()) {
    missing.push('Certificado digital vigente (el actual venció)');
  }
  return missing;
};

/**
 * Fila de Postgres → objeto de la API.
 * NUNCA incluye la clave privada. El CSR solo va en el perfil propio.
 */
export const toApiEmisor = (row, { includeCsr = false } = {}) => {
  if (!row) return null;
  const missing = getMissing(row);
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    razonSocial: row.razon_social,
    cuit: row.cuit,
    condicionFiscal: row.condicion_fiscal,
    puntoVenta: row.punto_venta,
    domicilioFiscal: row.domicilio_fiscal,
    inicioActividades: row.inicio_actividades,
    isDefault: row.is_default,
    active: row.active,
    hasCsr: Boolean(row.csr_pem),
    csrGeneratedAt: row.csr_generated_at,
    hasCert: Boolean(row.cert_pem),
    certExpiresAt: row.cert_expires_at,
    certUploadedAt: row.cert_uploaded_at,
    ready: row.active && missing.length === 0,
    missing,
    ...(includeCsr ? { csrPem: row.csr_pem || null } : {}),
  };
};

export const findEmisorByUsuario = async (usuarioId) => {
  const { data, error } = await getSupabase()
    .from('emisores')
    .select('*')
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const findEmisorById = async (id) => {
  const { data, error } = await getSupabase()
    .from('emisores')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
};
