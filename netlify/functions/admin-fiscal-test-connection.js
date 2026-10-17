/**
 * POST /.netlify/functions/admin-fiscal-test-connection
 *
 * Prueba la conexión con ARCA usando el certificado del admin logueado,
 * sin emitir ningún comprobante. Protegido con requireAdmin; cada admin
 * prueba SU emisor.
 *
 * Pasos (se corta en el primero que falla):
 *   1. servidores  → ARCA está en línea (FEDummy).
 *   2. acceso      → el certificado sirve para autenticarse (WSAA).
 *   3. puntoVenta  → el punto de venta existe y está habilitado para
 *                    web services (en homologación se omite: ARCA no
 *                    lista puntos de venta de prueba).
 *   4. numeracion  → se puede consultar el último comprobante emitido
 *                    del tipo que corresponde a la condición fiscal.
 *
 * Response:
 *   200 { ok, steps: [{ id, label, ok, detail }], emisor }
 *   400 si faltan datos o certificado.
 *
 * El resultado se guarda en emisores.arca_check para mostrar en el panel
 * "Conexión con ARCA verificada" hasta que cambie el certificado, el
 * punto de venta o el ambiente.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import {
  ARCA_ENV,
  certFingerprint,
  findEmisorByUsuario,
  getSupabase,
  isEncryptionConfigured,
  toApiEmisor,
} from './_lib/fiscal.js';
import { getAccessTicket } from './_lib/arca/wsaa.js';
import {
  CBTE_LABELS,
  dummy,
  getComprobanteTipos,
  getPuntosVenta,
  getUltimoComprobante,
} from './_lib/arca/wsfe.js';

const STEP_LABELS = {
  servidores: 'Servidores de ARCA',
  acceso: 'Autenticación con tu certificado',
  puntoVenta: 'Punto de venta',
  numeracion: 'Consulta de comprobantes',
};

const formatErrors = (errors) => errors.map((e) => `${e.msg} (código ${e.code})`).join(' · ');

const runChecks = async (emisor) => {
  const steps = [];
  const pass = (id, detail) => steps.push({ id, label: STEP_LABELS[id], ok: true, detail });
  const fail = (id, detail) => {
    steps.push({ id, label: STEP_LABELS[id], ok: false, detail });
    return steps;
  };

  // 1. Servidores
  try {
    const status = await dummy();
    const allOk = [status.appServer, status.dbServer, status.authServer].every((s) => s === 'OK');
    if (!allOk) {
      return fail(
        'servidores',
        `ARCA informa problemas en sus servidores (app: ${status.appServer}, base: ${status.dbServer}, autenticación: ${status.authServer}). Probá más tarde.`
      );
    }
    pass('servidores', 'En línea.');
  } catch (err) {
    return fail('servidores', `No se pudo conectar con ARCA: ${err.message}`);
  }

  // 2. Autenticación
  let ticket;
  try {
    ticket = await getAccessTicket(emisor, 'wsfe');
    pass(
      'acceso',
      ticket.reused
        ? 'Certificado válido (se reutilizó el permiso vigente).'
        : 'Certificado válido. ARCA otorgó el permiso de acceso.'
    );
  } catch (err) {
    return fail('acceso', err.message);
  }

  const auth = { token: ticket.token, sign: ticket.sign, cuit: emisor.cuit };

  // 3. Punto de venta
  if (ARCA_ENV === 'homologacion') {
    pass('puntoVenta', `Ambiente de prueba: ARCA acepta cualquier número (se usa el ${emisor.punto_venta}).`);
  } else {
    try {
      const { puntos, errors } = await getPuntosVenta(auth);
      if (puntos.length === 0 && errors.length > 0) {
        return fail('puntoVenta', `ARCA no devolvió puntos de venta: ${formatErrors(errors)}`);
      }
      const pv = puntos.find((p) => p.nro === Number(emisor.punto_venta));
      if (!pv) {
        const disponibles = puntos.filter((p) => !p.bloqueado && !p.fechaBaja).map((p) => p.nro);
        return fail(
          'puntoVenta',
          `El punto de venta ${emisor.punto_venta} no existe o no es de tipo Web Services.` +
            (disponibles.length ? ` Los habilitados son: ${disponibles.join(', ')}.` : '')
        );
      }
      if (pv.bloqueado || pv.fechaBaja) {
        return fail('puntoVenta', `El punto de venta ${pv.nro} está bloqueado o dado de baja en ARCA.`);
      }
      pass('puntoVenta', `Punto de venta ${pv.nro} habilitado (${pv.emisionTipo}).`);
    } catch (err) {
      return fail('puntoVenta', `No se pudo consultar: ${err.message}`);
    }
  }

  // 4. Numeración
  try {
    const { factura } = getComprobanteTipos(emisor.condicion_fiscal);
    const { numero, errors } = await getUltimoComprobante(auth, {
      puntoVenta: emisor.punto_venta,
      cbteTipo: factura,
    });
    // Con errores ARCA igual puede devolver CbteNro = 0: los errores mandan.
    if (errors.length > 0 || numero === null) {
      return fail('numeracion', `ARCA rechazó la consulta: ${formatErrors(errors) || 'sin detalle'}`);
    }
    pass(
      'numeracion',
      numero === 0
        ? `Todavía no hay ${CBTE_LABELS[factura]} emitidas en el punto de venta ${emisor.punto_venta}. La primera va a ser la número 1.`
        : `Última ${CBTE_LABELS[factura]} emitida: número ${numero}.`
    );
  } catch (err) {
    return fail('numeracion', `No se pudo consultar: ${err.message}`);
  }

  return steps;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  if (!isEncryptionConfigured()) {
    return error(503, 'La facturación todavía no está habilitada en este ambiente. Avisale a Dynova.');
  }

  try {
    const emisor = await findEmisorByUsuario(auth.admin.id);
    if (!emisor) return error(400, 'Primero guardá tus datos de facturación.');
    if (!emisor.cert_pem) return error(400, 'Primero subí tu certificado de ARCA.');
    if (!emisor.punto_venta) return error(400, 'Cargá el punto de venta antes de probar la conexión.');

    const steps = await runChecks(emisor);
    const allOk = steps.length === Object.keys(STEP_LABELS).length && steps.every((s) => s.ok);
    const failed = steps.find((s) => !s.ok);

    const arcaCheck = {
      ok: allOk,
      at: new Date().toISOString(),
      message: allOk ? 'Conexión con ARCA verificada.' : `${failed.label}: ${failed.detail}`,
      certFp: certFingerprint(emisor.cert_pem),
      puntoVenta: emisor.punto_venta,
      env: ARCA_ENV,
    };

    // Releemos la fila: getAccessTicket pudo haber guardado un TA nuevo.
    const { data, error: updateError } = await getSupabase()
      .from('emisores')
      .update({ arca_check: arcaCheck })
      .eq('id', emisor.id)
      .select()
      .single();
    if (updateError) throw updateError;

    console.log('[admin-fiscal-test-connection]', {
      admin: auth.admin.email,
      cuit: emisor.cuit,
      env: ARCA_ENV,
      ok: allOk,
      failedStep: failed?.id || null,
    });

    return ok({ ok: allOk, steps, emisor: toApiEmisor(data, { includeCsr: true }) });
  } catch (err) {
    console.error('[admin-fiscal-test-connection] error:', err);
    return error(500, 'No se pudo completar la prueba', { details: err.message });
  }
};