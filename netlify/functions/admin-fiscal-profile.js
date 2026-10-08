/**
 * /.netlify/functions/admin-fiscal-profile
 *
 * Datos de facturación del admin logueado. Protegido con requireAdmin.
 * Cada admin solo ve y edita SUS datos.
 *
 * GET  → { emisor | null, prefill: { razonSocial, cuit }, arcaEnv, encryptionConfigured }
 *
 * POST → guarda los datos fiscales (crea el emisor si no existía).
 *   Body: {
 *     razonSocial, cuit, condicionFiscal,
 *     puntoVenta?, domicilioFiscal?, inicioActividades?   (YYYY-MM-DD)
 *   }
 *   Response: { emisor, created, certificateReset }
 *
 * Reglas:
 *   - El CUIT se valida con dígito verificador y no puede repetirse
 *     entre emisores.
 *   - Si cambia el CUIT o la razón social y ya había un pedido de
 *     certificado, se descarta (el CSR lleva esos datos adentro) y hay
 *     que generar uno nuevo.
 *   - El primer emisor que se crea queda como emisor por defecto.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import {
  ARCA_ENV,
  CONDICIONES_FISCALES,
  findEmisorByUsuario,
  getSupabase,
  isEncryptionConfigured,
  isValidCuit,
  normalizeCuit,
  toApiEmisor,
} from './_lib/fiscal.js';

const isValidDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());

const handleGet = async (admin) => {
  const row = await findEmisorByUsuario(admin.id);

  // Sugerimos el CUIT/CUIL que el admin ya tiene cargado en su perfil.
  const { data: profile } = await getSupabase()
    .from('usuarios')
    .select('documento_numero')
    .eq('id', admin.id)
    .maybeSingle();

  const doc = normalizeCuit(profile?.documento_numero);

  return ok({
    emisor: toApiEmisor(row, { includeCsr: true }),
    prefill: {
      razonSocial: admin.name,
      cuit: isValidCuit(doc) && doc !== '00000000000' ? doc : '',
    },
    arcaEnv: ARCA_ENV,
    encryptionConfigured: isEncryptionConfigured(),
  });
};

const handlePost = async (admin, body) => {
  const razonSocial = String(body.razonSocial || '').trim();
  const cuit = normalizeCuit(body.cuit);
  const condicionFiscal = body.condicionFiscal;
  const domicilioFiscal = String(body.domicilioFiscal || '').trim() || null;
  const inicioActividades = body.inicioActividades || null;
  const puntoVenta =
    body.puntoVenta === '' || body.puntoVenta === null || body.puntoVenta === undefined
      ? null
      : Number(body.puntoVenta);

  const validation = [];
  if (razonSocial.length < 3) validation.push('razonSocial: Ingresá el nombre o razón social.');
  if (!isValidCuit(cuit)) validation.push('cuit: El CUIT no es válido.');
  if (!CONDICIONES_FISCALES.includes(condicionFiscal)) {
    validation.push('condicionFiscal: Elegí una condición fiscal.');
  }
  if (puntoVenta !== null && (!Number.isInteger(puntoVenta) || puntoVenta < 1 || puntoVenta > 99998)) {
    validation.push('puntoVenta: Tiene que ser un número entre 1 y 99998.');
  }
  if (inicioActividades && !isValidDate(inicioActividades)) {
    validation.push('inicioActividades: La fecha no es válida.');
  }
  if (validation.length > 0) {
    return error(400, 'Revisá los datos de facturación', { validation });
  }

  const supabase = getSupabase();

  // CUIT único entre emisores
  const { data: sameCuit, error: cuitError } = await supabase
    .from('emisores')
    .select('id, usuario_id')
    .eq('cuit', cuit)
    .maybeSingle();
  if (cuitError) throw cuitError;
  if (sameCuit && sameCuit.usuario_id !== admin.id) {
    return error(409, 'Ese CUIT ya está cargado por otro administrador', {
      validation: ['cuit: Ese CUIT ya está cargado por otro administrador.'],
    });
  }

  const existing = await findEmisorByUsuario(admin.id);

  const fields = {
    razon_social: razonSocial,
    cuit,
    condicion_fiscal: condicionFiscal,
    punto_venta: puntoVenta,
    domicilio_fiscal: domicilioFiscal,
    inicio_actividades: inicioActividades,
  };

  if (!existing) {
    // El primer emisor queda como default.
    const { count, error: countError } = await supabase
      .from('emisores')
      .select('id', { count: 'exact', head: true })
      .eq('is_default', true);
    if (countError) throw countError;

    const { data, error: insertError } = await supabase
      .from('emisores')
      .insert({ ...fields, usuario_id: admin.id, is_default: (count || 0) === 0 })
      .select()
      .single();
    if (insertError) throw insertError;

    console.log('[admin-fiscal-profile] emisor creado', { admin: admin.email, cuit });
    return ok({
      emisor: toApiEmisor(data, { includeCsr: true }),
      created: true,
      certificateReset: false,
    });
  }

  // El CSR lleva adentro el CUIT y la razón social: si cambian, el
  // pedido y el certificado anteriores dejan de servir.
  const identityChanged =
    existing.cuit !== cuit || existing.razon_social !== razonSocial;
  const certificateReset = identityChanged && Boolean(existing.csr_pem || existing.cert_pem);

  if (certificateReset) {
    Object.assign(fields, {
      private_key_enc: null,
      csr_pem: null,
      csr_generated_at: null,
      cert_pem: null,
      cert_expires_at: null,
      cert_uploaded_at: null,
    });
  }

  const { data, error: updateError } = await supabase
    .from('emisores')
    .update(fields)
    .eq('id', existing.id)
    .select()
    .single();
  if (updateError) throw updateError;

  console.log('[admin-fiscal-profile] emisor actualizado', {
    admin: admin.email,
    cuit,
    certificateReset,
  });
  return ok({
    emisor: toApiEmisor(data, { includeCsr: true }),
    created: false,
    certificateReset,
  });
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!['GET', 'POST'].includes(event.httpMethod)) return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  try {
    if (event.httpMethod === 'GET') return await handleGet(auth.admin);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return error(400, 'Invalid JSON body');
    }
    return await handlePost(auth.admin, body);
  } catch (err) {
    console.error('[admin-fiscal-profile] error:', err);
    return error(500, 'No se pudieron procesar los datos de facturación', {
      details: err.message,
    });
  }
};
