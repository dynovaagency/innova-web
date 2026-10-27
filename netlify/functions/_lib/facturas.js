/**
 * Facturas — lectura y acciones manuales del panel admin.
 *
 * La emisión en sí vive en invoicing.js. Acá está lo que usa el detalle
 * del pago: convertir filas para la API, listar los comprobantes de un
 * pago y las acciones que hace Innova a mano (crear, cambiar emisor,
 * descartar, anular con nota de crédito).
 */

import { ARCA_ENV, findEmisorById, getSupabase } from './fiscal.js';
import { CBTE_LABELS, fromArcaDate, toArcaDate } from './arca/wsfe.js';
import { resolveEmisorForPayment } from './invoicing.js';

const DOC_TIPO_LABELS = { 80: 'CUIT', 86: 'CUIL', 96: 'DNI', 99: 'Consumidor final' };

const pad = (n, len) => String(n).padStart(len, '0');

/** Fila de Postgres → objeto de la API. */
export const toApiFactura = (row, emisoresById = {}) => {
  const emisor = emisoresById[row.emisor_id] || null;
  const snapshot = row.emisor_snapshot || null;
  return {
    id: row.id,
    tipo: row.tipo,
    estado: row.estado,
    facturaAsociadaId: row.factura_asociada_id,
    emisorId: row.emisor_id,
    emisor: snapshot
      ? { razonSocial: snapshot.razonSocial, cuit: snapshot.cuit, condicionFiscal: snapshot.condicionFiscal }
      : emisor
        ? { razonSocial: emisor.razon_social, cuit: emisor.cuit, condicionFiscal: emisor.condicion_fiscal }
        : null,
    cbteTipo: row.cbte_tipo,
    cbteLabel: row.cbte_tipo ? CBTE_LABELS[row.cbte_tipo] || `Tipo ${row.cbte_tipo}` : null,
    puntoVenta: row.punto_venta,
    numero: row.numero,
    numeroFormateado:
      row.punto_venta && row.numero ? `${pad(row.punto_venta, 5)}-${pad(row.numero, 8)}` : null,
    cae: row.cae,
    caeVto: row.cae_vto,
    fecha: row.fecha,
    importe: Number(row.importe),
    importeNeto: row.importe_neto === null ? null : Number(row.importe_neto),
    importeIva: row.importe_iva === null ? null : Number(row.importe_iva),
    receptor: {
      email: row.receptor_email,
      nombre: row.receptor_nombre,
      docTipo: row.receptor_doc_tipo,
      docTipoLabel: DOC_TIPO_LABELS[row.receptor_doc_tipo] || null,
      docNro: row.receptor_doc_nro,
    },
    fechaServicio: row.fecha_servicio,
    programadaPara: row.programada_para,
    intentos: row.intentos,
    errorMessage: row.error_message,
    ambiente: row.ambiente,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    emitidaAt: row.emitida_at,
    emailEnviadoAt: row.email_enviado_at || null,
    emailError: row.email_error || null,
  };
};

/** Comprobantes de un pago (facturas y notas de crédito), más nuevos primero. */
export const listFacturasForPayment = async (ref) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .eq('payment_ref', ref)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const ids = [...new Set(rows.map((r) => r.emisor_id).filter(Boolean))];
  let emisoresById = {};
  if (ids.length > 0) {
    const { data: emisores, error: emisoresError } = await supabase
      .from('emisores')
      .select('id, razon_social, cuit, condicion_fiscal')
      .in('id', ids);
    if (emisoresError) throw emisoresError;
    emisoresById = Object.fromEntries((emisores || []).map((e) => [e.id, e]));
  }
  return rows.map((row) => toApiFactura(row, emisoresById));
};

export const findFacturaById = async (id) => {
  const { data, error } = await getSupabase()
    .from('facturas')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
};

/**
 * Emisor activo, o lanza un error con mensaje claro. No exige que esté
 * completo: si le falta algo, la emisión falla con el detalle y se puede
 * reintentar cuando lo complete.
 */
export const requireActiveEmisor = async (emisorId) => {
  const emisor = await findEmisorById(emisorId);
  if (!emisor || !emisor.active) throw new UserError('El emisor elegido no existe o está desactivado.');
  return emisor;
};

/** Error con mensaje para mostrar al admin (responde 400, no 500). */
export class UserError extends Error {}

/**
 * Crea la factura de un pago, programada para ahora (sin margen).
 * Se usa para facturar a mano un pago que no tiene factura (por ejemplo,
 * uno anterior a la fecha de corte) y para refacturar después de anular.
 */
export const createManualFactura = async (payment, { emisorId, createdBy }) => {
  if (payment.status !== 'approved') throw new UserError('Solo se pueden facturar pagos aprobados.');
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new UserError('El pago no tiene un monto a facturar.');
  }

  let emisor;
  if (emisorId) {
    emisor = await requireActiveEmisor(emisorId);
  } else {
    emisor = await resolveEmisorForPayment(payment);
    if (!emisor) throw new UserError('No hay emisor por defecto: elegí uno.');
  }

  const approvedAt = new Date(payment.approvedAt || payment.createdAt || Date.now());

  const { data, error } = await getSupabase()
    .from('facturas')
    .insert({
      payment_ref: payment.externalReference,
      tipo: 'factura',
      emisor_id: emisor.id,
      estado: 'pendiente',
      programada_para: new Date().toISOString(),
      importe: Math.round(amount * 100) / 100,
      receptor_email: payment.buyerEmail || null,
      fecha_servicio: fromArcaDate(toArcaDate(approvedAt)),
      ambiente: ARCA_ENV,
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') throw new UserError('Este pago ya tiene una factura vigente.');
    throw error;
  }
  return data;
};

/**
 * Crea la nota de crédito que anula una factura emitida. La emite el
 * mismo emisor que hizo la factura, por el mismo importe.
 */
export const createNotaCredito = async (factura, { createdBy }) => {
  if (factura.tipo !== 'factura' || factura.estado !== 'emitida') {
    throw new UserError('Solo se pueden anular facturas emitidas.');
  }
  if (factura.ambiente !== ARCA_ENV) {
    throw new UserError(
      `Esta factura se emitió en ${factura.ambiente} y el sistema está en ${ARCA_ENV}: no se puede anular desde acá.`
    );
  }

  const supabase = getSupabase();
  const { data: abierta, error: abiertaError } = await supabase
    .from('facturas')
    .select('id, estado')
    .eq('factura_asociada_id', factura.id)
    .eq('tipo', 'nota_credito')
    .in('estado', ['pendiente', 'emitiendo', 'error', 'emitida'])
    .limit(1)
    .maybeSingle();
  if (abiertaError) throw abiertaError;
  if (abierta) return { row: await findFacturaById(abierta.id), existed: true };

  const { data, error } = await supabase
    .from('facturas')
    .insert({
      payment_ref: factura.payment_ref,
      tipo: 'nota_credito',
      factura_asociada_id: factura.id,
      emisor_id: factura.emisor_id,
      estado: 'pendiente',
      programada_para: new Date().toISOString(),
      importe: factura.importe,
      receptor_email: factura.receptor_email,
      fecha_servicio: factura.fecha_servicio,
      ambiente: factura.ambiente,
      created_by: createdBy,
    })
    .select('*')
    .single();
  if (error) throw error;
  return { row: data, existed: false };
};

/** ¿La factura nunca llegó a ARCA? (sin número reservado) */
export const neverReachedArca = (row) =>
  ['pendiente', 'error'].includes(row.estado) && !row.numero;

/**
 * Borra las facturas de un pago que todavía no llegaron a ARCA.
 * Se llama al eliminar un pago, para que no se facture algo que ya no
 * existe. Las que tienen número reservado se dejan (pueden estar
 * emitidas en ARCA) y se avisa en el log.
 */
export const discardPendingForPayments = async (refs) => {
  if (!refs || refs.length === 0) return { discarded: 0 };
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('facturas')
    .select('id, payment_ref, estado, numero')
    .in('payment_ref', refs)
    .in('estado', ['pendiente', 'error', 'emitiendo', 'emitida']);
  if (error) throw error;

  const rows = data || [];
  const toDelete = rows.filter(neverReachedArca).map((r) => r.id);
  const kept = rows.filter((r) => !neverReachedArca(r));
  if (kept.length > 0) {
    console.warn('[facturas] se eliminó un pago que tiene comprobantes en ARCA; quedan en la tabla:', kept);
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from('facturas').delete().in('id', toDelete);
    if (deleteError) throw deleteError;
  }
  return { discarded: toDelete.length, kept: kept.length };
};