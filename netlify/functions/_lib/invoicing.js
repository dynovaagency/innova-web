/**
 * Facturación electrónica — programación y emisión de comprobantes.
 *
 * Flujo:
 *   1. Al aprobarse un pago, scheduleInvoice() crea la factura en estado
 *      'pendiente', programada para INVOICING_DELAY_HOURS después. En ese
 *      margen Innova puede cambiar el emisor desde el detalle del pago.
 *   2. La función programada invoices-process llama a processDueInvoices()
 *      cada 15 minutos y emite las que ya vencieron su margen.
 *   3. emitInvoice() pide el CAE a ARCA, guarda el resultado y le manda
 *      el PDF por mail al comprador.
 *
 * Seguridad contra duplicados:
 *   - Índice único: un pago tiene como máximo una factura vigente.
 *   - Antes de emitir, la factura pasa a 'emitiendo' con un update
 *     condicional: si dos procesos la toman a la vez, solo uno gana.
 *   - El número se reserva en la fila ANTES de llamar a ARCA. Si la
 *     conexión se corta después de que ARCA aprobó, en el reintento se
 *     consulta ese número y se recupera el CAE en vez de emitir otra.
 *
 * Env vars:
 *   INVOICING_START_AT     → fecha de corte (YYYY-MM-DD). Solo se facturan
 *                            los pagos aprobados desde ese día. Si falta,
 *                            la facturación automática está apagada.
 *   INVOICING_DELAY_HOURS  → margen antes de emitir. Default 24.
 */

import {
  ARCA_ENV,
  findEmisorById,
  getMissing,
  getSupabase,
  isEncryptionConfigured,
  normalizeCuit,
  isValidCuit,
} from './fiscal.js';
import { getAccessTicket } from './arca/wsaa.js';
import {
  DOC_TIPOS,
  consultarComprobante,
  fromArcaDate,
  getComprobanteTipos,
  getUltimoComprobante,
  solicitarCAE,
  toArcaDate,
} from './arca/wsfe.js';
import * as productsRepo from './repositories/products.js';
import { sendInvoiceToBuyer } from './invoiceDocument.js';

const MAX_AUTO_RETRIES = 3;
const RETRY_AFTER_MS = 60 * 60 * 1000; // 1 hora entre reintentos automáticos
const STUCK_AFTER_MS = 15 * 60 * 1000; // 'emitiendo' por más de 15 min = colgada

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------

export const getInvoicingConfig = () => {
  const raw = process.env.INVOICING_START_AT || '';
  const startAt = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00-03:00`) : null;
  const delayHours = Number(process.env.INVOICING_DELAY_HOURS);
  return {
    enabled: Boolean(startAt) && isEncryptionConfigured(),
    startAt,
    delayHours: Number.isFinite(delayHours) && delayHours >= 0 ? delayHours : 24,
    env: ARCA_ENV,
  };
};

const round2 = (n) => Math.round(Number(n) * 100) / 100;

// ---------------------------------------------------------------------
// Emisor
// ---------------------------------------------------------------------

/** Emisor del producto, o el emisor por defecto. Devuelve la fila o null. */
export const resolveEmisorForPayment = async (payment) => {
  const supabase = getSupabase();

  try {
    const product = await productsRepo.findBySlug(payment.cursoSlug, { activeOnly: false });
    if (product?.emisorId) {
      const emisor = await findEmisorById(product.emisorId);
      if (emisor?.active) return emisor;
    }
  } catch (err) {
    console.warn('[invoicing] no se pudo leer el producto para elegir emisor:', err.message);
  }

  const { data, error } = await supabase
    .from('emisores')
    .select('*')
    .eq('is_default', true)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------
// Programación
// ---------------------------------------------------------------------

/**
 * Programa la factura de un pago aprobado. Idempotente: si el pago ya
 * tiene factura vigente, no hace nada.
 *
 * Nunca lanza: devuelve { scheduled, reason }.
 */
export const scheduleInvoice = async (payment) => {
  try {
    const config = getInvoicingConfig();
    if (!config.enabled) return { scheduled: false, reason: 'disabled' };

    const approvedAt = new Date(payment.approvedAt || Date.now());
    if (approvedAt < config.startAt) return { scheduled: false, reason: 'before_start' };

    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { scheduled: false, reason: 'no_amount' };
    }

    const supabase = getSupabase();

    const { data: existing, error: existingError } = await supabase
      .from('facturas')
      .select('id')
      .eq('payment_ref', payment.externalReference)
      .eq('tipo', 'factura')
      .neq('estado', 'anulada')
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { scheduled: false, reason: 'exists', facturaId: existing.id };

    const emisor = await resolveEmisorForPayment(payment);

    const { data, error } = await supabase
      .from('facturas')
      .insert({
        payment_ref: payment.externalReference,
        tipo: 'factura',
        emisor_id: emisor?.id || null,
        estado: 'pendiente',
        programada_para: new Date(Date.now() + config.delayHours * 3600 * 1000).toISOString(),
        importe: round2(amount),
        receptor_email: payment.buyerEmail || null,
        fecha_servicio: fromArcaDate(toArcaDate(approvedAt)),
        ambiente: config.env,
        created_by: 'sistema',
      })
      .select('id')
      .single();

    if (error) {
      // 23505 = ya existe (otro proceso la creó al mismo tiempo)
      if (error.code === '23505') return { scheduled: false, reason: 'exists' };
      throw error;
    }

    console.log('[invoicing] factura programada', {
      ref: payment.externalReference,
      facturaId: data.id,
      emisor: emisor?.cuit || null,
    });
    return { scheduled: true, facturaId: data.id };
  } catch (err) {
    console.error('[invoicing] no se pudo programar la factura:', err);
    return { scheduled: false, reason: 'error', error: err.message };
  }
};

// ---------------------------------------------------------------------
// Emisión
// ---------------------------------------------------------------------

/** Datos del comprador: si tiene cuenta con CUIL/CUIT, se informa. */
const resolveReceptor = async (email) => {
  const fallback = { nombre: null, docTipo: DOC_TIPOS.SIN_IDENTIFICAR, docNro: '0' };
  if (!email) return fallback;

  const { data } = await getSupabase()
    .from('usuarios')
    .select('nombre, apellido, documento_tipo, documento_numero')
    .eq('email', String(email).trim().toLowerCase())
    .maybeSingle();
  if (!data) return fallback;

  const nombre = `${data.nombre || ''} ${data.apellido || ''}`.trim() || null;
  const doc = normalizeCuit(data.documento_numero);
  if (!isValidCuit(doc) || doc === '00000000000') return { ...fallback, nombre };

  return {
    nombre,
    docTipo: data.documento_tipo === 'CUIT' ? DOC_TIPOS.CUIT : DOC_TIPOS.CUIL,
    docNro: doc,
  };
};

/** Importes según el tipo: B discrimina IVA 21 %; C no. */
const calcImportes = (total, condicionFiscal) => {
  if (condicionFiscal === 'responsable_inscripto') {
    const neto = round2(total / 1.21);
    return { neto, iva: round2(total - neto) };
  }
  return { neto: round2(total), iva: null };
};

const emisorSnapshot = (emisor) => ({
  razonSocial: emisor.razon_social,
  cuit: emisor.cuit,
  condicionFiscal: emisor.condicion_fiscal,
  domicilioFiscal: emisor.domicilio_fiscal,
  inicioActividades: emisor.inicio_actividades,
  puntoVenta: emisor.punto_venta,
});

const formatArcaMessages = (list) =>
  list.map((e) => `${e.msg} (código ${e.code})`).join(' · ');

/**
 * Toma la factura para emitirla (update condicional). Devuelve la fila
 * o null si otro proceso ya la tomó / ya está emitida.
 */
const lockFactura = async (facturaId) => {
  const stuckBefore = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const { data, error } = await getSupabase()
    .from('facturas')
    .update({ estado: 'emitiendo', error_message: null })
    .eq('id', facturaId)
    .or(`estado.in.(pendiente,error),and(estado.eq.emitiendo,updated_at.lt.${stuckBefore})`)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
};

const saveFactura = async (id, patch) => {
  const { data, error } = await getSupabase()
    .from('facturas')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

const failFactura = (factura, message, extra = {}) =>
  saveFactura(factura.id, {
    estado: 'error',
    error_message: message,
    intentos: (factura.intentos || 0) + 1,
    ...extra,
  });

/**
 * Emite un comprobante (factura o nota de crédito) ya creado en la tabla.
 *
 * @returns {Promise<{ ok: boolean, factura, message? }>}
 */
export const emitInvoice = async (facturaId) => {
  const factura = await lockFactura(facturaId);
  if (!factura) {
    return { ok: false, factura: null, message: 'La factura ya fue emitida o se está emitiendo.' };
  }

  try {
    if (!factura.emisor_id) {
      const updated = await failFactura(
        factura,
        'No hay emisor asignado: elegí uno en el producto o marcá un emisor por defecto.'
      );
      return { ok: false, factura: updated, message: updated.error_message };
    }

    const emisor = await findEmisorById(factura.emisor_id);
    const missing = emisor ? getMissing(emisor) : ['Emisor inexistente'];
    if (!emisor || !emisor.active || missing.length > 0) {
      const updated = await failFactura(
        factura,
        `El emisor no está listo para facturar. Falta: ${missing.join(', ') || 'activarlo'}.`
      );
      return { ok: false, factura: updated, message: updated.error_message };
    }

    const tipos = getComprobanteTipos(emisor.condicion_fiscal);
    const cbteTipo = factura.tipo === 'nota_credito' ? tipos.notaCredito : tipos.factura;
    const puntoVenta = emisor.punto_venta;

    const ticket = await getAccessTicket(emisor, 'wsfe');
    const auth = { token: ticket.token, sign: ticket.sign, cuit: emisor.cuit };

    // Recuperación: un intento anterior reservó número y pudo haber
    // quedado emitido en ARCA sin que lo registráramos.
    if (factura.numero && factura.cbte_tipo === cbteTipo && factura.punto_venta === puntoVenta) {
      const previo = await consultarComprobante(auth, {
        cbteTipo,
        puntoVenta,
        numero: factura.numero,
      });
      if (previo?.cae && Math.abs(previo.importeTotal - Number(factura.importe)) < 0.01) {
        const recovered = await saveFactura(factura.id, {
          estado: 'emitida',
          cae: previo.cae,
          cae_vto: previo.caeVto,
          fecha: previo.fecha,
          emisor_snapshot: emisorSnapshot(emisor),
          emitida_at: new Date().toISOString(),
          intentos: (factura.intentos || 0) + 1,
        });
        console.log('[invoicing] CAE recuperado de un intento anterior', { id: factura.id });
        if (factura.tipo === 'nota_credito' && factura.factura_asociada_id) {
          await saveFactura(factura.factura_asociada_id, { estado: 'anulada' });
        }
        await sendInvoiceToBuyer(recovered);
        return { ok: true, factura: recovered };
      }
    }

    const ultimo = await getUltimoComprobante(auth, { puntoVenta, cbteTipo });
    if (ultimo.errors.length > 0 || ultimo.numero === null) {
      const updated = await failFactura(
        factura,
        `ARCA no informó la numeración: ${formatArcaMessages(ultimo.errors) || 'sin detalle'}`
      );
      return { ok: false, factura: updated, message: updated.error_message };
    }
    const numero = ultimo.numero + 1;

    const receptor = await resolveReceptor(factura.receptor_email);
    const importes = calcImportes(Number(factura.importe), emisor.condicion_fiscal);
    const fecha = new Date();

    let asociado = null;
    if (factura.tipo === 'nota_credito') {
      const { data: original, error } = await getSupabase()
        .from('facturas')
        .select('*')
        .eq('id', factura.factura_asociada_id)
        .single();
      if (error || !original?.cae) {
        const updated = await failFactura(factura, 'No se encontró la factura emitida que anula esta nota de crédito.');
        return { ok: false, factura: updated, message: updated.error_message };
      }
      asociado = {
        cbteTipo: original.cbte_tipo,
        puntoVenta: original.punto_venta,
        numero: original.numero,
        cuit: original.emisor_snapshot?.cuit || emisor.cuit,
        fecha: new Date(`${original.fecha}T12:00:00-03:00`),
      };
    }

    // Reservamos el número antes de llamar a ARCA (ver recuperación arriba).
    await saveFactura(factura.id, {
      cbte_tipo: cbteTipo,
      punto_venta: puntoVenta,
      numero,
      importe_neto: importes.neto,
      importe_iva: importes.iva,
      receptor_nombre: receptor.nombre,
      receptor_doc_tipo: receptor.docTipo,
      receptor_doc_nro: receptor.docNro,
    });

    const result = await solicitarCAE(auth, {
      puntoVenta,
      cbteTipo,
      numero,
      fecha,
      fechaServicio: factura.fecha_servicio ? new Date(`${factura.fecha_servicio}T12:00:00-03:00`) : fecha,
      importeTotal: Number(factura.importe),
      importeNeto: importes.neto,
      importeIva: importes.iva,
      docTipo: receptor.docTipo,
      docNro: receptor.docNro,
      asociado,
    });

    if (result.resultado === 'A' && result.cae) {
      const emitida = await saveFactura(factura.id, {
        estado: 'emitida',
        cae: result.cae,
        cae_vto: result.caeVto,
        // Misma fecha (hora argentina) que se informó a ARCA.
        fecha: fromArcaDate(toArcaDate(fecha)),
        emisor_snapshot: emisorSnapshot(emisor),
        emitida_at: new Date().toISOString(),
        intentos: (factura.intentos || 0) + 1,
        error_message: result.observaciones.length ? formatArcaMessages(result.observaciones) : null,
      });

      // La nota de crédito deja anulada a la factura original.
      if (factura.tipo === 'nota_credito' && factura.factura_asociada_id) {
        await saveFactura(factura.factura_asociada_id, { estado: 'anulada' });
      }

      console.log('[invoicing] comprobante emitido', {
        id: factura.id,
        ref: factura.payment_ref,
        tipo: cbteTipo,
        numero: `${puntoVenta}-${numero}`,
        cae: result.cae,
      });

      // Mail al comprador con el PDF. Nunca lanza: si falla, queda
      // registrado en la fila y se puede reenviar desde el panel.
      await sendInvoiceToBuyer(emitida);

      return { ok: true, factura: emitida };
    }

    const motivo =
      formatArcaMessages([...result.errors, ...result.observaciones]) || 'ARCA rechazó el comprobante sin detalle.';
    // Rechazado: el número no se usó, se libera.
    const updated = await failFactura(factura, `ARCA rechazó el comprobante: ${motivo}`, {
      numero: null,
      cbte_tipo: null,
      punto_venta: null,
    });
    return { ok: false, factura: updated, message: updated.error_message };
  } catch (err) {
    console.error('[invoicing] error emitiendo', { id: factura.id, err });
    // Se conserva el número reservado: el próximo intento lo consulta.
    const updated = await failFactura(factura, err.message || 'Error inesperado al emitir.');
    return { ok: false, factura: updated, message: updated.error_message };
  }
};

// ---------------------------------------------------------------------
// Proceso programado
// ---------------------------------------------------------------------

/**
 * Emite las facturas cuyo margen ya venció y reintenta las que fallaron
 * (hasta MAX_AUTO_RETRIES veces, con una hora entre intentos).
 */
export const processDueInvoices = async ({ limit = 5 } = {}) => {
  const config = getInvoicingConfig();
  if (!config.enabled) return { processed: 0, reason: 'disabled' };

  const now = new Date();
  const retryBefore = new Date(now.getTime() - RETRY_AFTER_MS).toISOString();

  const { data, error } = await getSupabase()
    .from('facturas')
    .select('id, estado, intentos')
    .or(
      `and(estado.eq.pendiente,programada_para.lte.${now.toISOString()}),` +
        `and(estado.eq.error,intentos.lt.${MAX_AUTO_RETRIES},updated_at.lt.${retryBefore})`
    )
    .order('programada_para', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const results = [];
  for (const row of data || []) {
    // Secuencial a propósito: dos emisiones simultáneas del mismo emisor
    // pedirían el mismo número a ARCA.
    const r = await emitInvoice(row.id);
    results.push({ id: row.id, ok: r.ok, message: r.message || null });
  }
  return { processed: results.length, results };
};