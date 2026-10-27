/**
 * POST /.netlify/functions/admin-invoice-action
 *
 * Acciones manuales sobre la factura de un pago, desde el detalle del
 * pago. Protegido con requireAdmin (admins y superadmins).
 *
 * Body: { action, ref, facturaId?, emisorId?, refacturar? }
 *
 * Acciones:
 *   create      → crea la factura de un pago aprobado que no tiene
 *                 (p. ej. anterior a la fecha de corte) y la emite ya.
 *                 emisorId opcional: si falta, usa el del producto o el
 *                 emisor por defecto.
 *   set_emisor  → cambia quién factura, mientras no haya llegado a ARCA.
 *   emit_now    → emite ya, sin esperar el margen (o reintenta un error).
 *   discard     → borra una factura que nunca llegó a ARCA (el pago no
 *                 se va a facturar).
 *   cancel      → anula una factura emitida con una nota de crédito.
 *                 Con refacturar: true, después crea y emite una factura
 *                 nueva con emisorId (o el mismo emisor si falta).
 *   resend_email → vuelve a mandar por mail el PDF de un comprobante
 *                 emitido (o anulado) al comprador.
 *
 * Response:
 *   200 { ok, message?, facturas }   ← lista actualizada del pago
 *   400 { error }                    ← acción no permitida, con el motivo
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { getSupabase } from './_lib/fiscal.js';
import { emitInvoice } from './_lib/invoicing.js';
import { sendInvoiceToBuyer } from './_lib/invoiceDocument.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import {
  UserError,
  createManualFactura,
  createNotaCredito,
  findFacturaById,
  listFacturasForPayment,
  neverReachedArca,
  requireActiveEmisor,
} from './_lib/facturas.js';

const ACTIONS = ['create', 'set_emisor', 'emit_now', 'discard', 'cancel', 'resend_email'];

/** Factura del pago indicado; evita operar sobre la de otro pago. */
const loadFactura = async (facturaId, ref) => {
  if (!facturaId) throw new UserError('facturaId es requerido');
  const factura = await findFacturaById(facturaId);
  if (!factura || factura.payment_ref !== ref) throw new UserError('La factura no existe para este pago.');
  return factura;
};

const run = async ({ action, ref, facturaId, emisorId, refacturar }, adminEmail) => {
  switch (action) {
    case 'create': {
      const payment = await paymentsRepo.findByReference(ref);
      if (!payment) throw new UserError('El pago no existe.');
      const factura = await createManualFactura(payment, { emisorId, createdBy: adminEmail });
      const result = await emitInvoice(factura.id);
      return {
        ok: result.ok,
        message: result.ok ? 'Factura emitida.' : `Se creó la factura pero no se pudo emitir: ${result.message}`,
      };
    }

    case 'set_emisor': {
      const factura = await loadFactura(facturaId, ref);
      if (factura.tipo !== 'factura' || !neverReachedArca(factura)) {
        throw new UserError('Solo se puede cambiar el emisor de una factura que todavía no se emitió.');
      }
      if (!emisorId) throw new UserError('emisorId es requerido');
      const emisor = await requireActiveEmisor(emisorId);

      // Condicional: si justo la tomó el proceso automático, no se pisa.
      const { data, error: updateError } = await getSupabase()
        .from('facturas')
        .update({ emisor_id: emisor.id })
        .eq('id', factura.id)
        .in('estado', ['pendiente', 'error'])
        .is('numero', null)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new UserError('La factura se empezó a emitir recién. Recargá la página.');
      return { ok: true, message: `La factura va a salir a nombre de ${emisor.razon_social}.` };
    }

    case 'emit_now': {
      const factura = await loadFactura(facturaId, ref);
      if (!['pendiente', 'error'].includes(factura.estado)) {
        throw new UserError('Esta factura no está pendiente de emisión.');
      }
      const result = await emitInvoice(factura.id);
      return {
        ok: result.ok,
        message: result.ok ? 'Comprobante emitido.' : result.message,
      };
    }

    case 'discard': {
      const factura = await loadFactura(facturaId, ref);
      if (!neverReachedArca(factura)) {
        throw new UserError(
          'Esta factura ya tiene número en ARCA y no se puede descartar. Si está emitida, anulala con una nota de crédito.'
        );
      }
      const { data, error: deleteError } = await getSupabase()
        .from('facturas')
        .delete()
        .eq('id', factura.id)
        .in('estado', ['pendiente', 'error'])
        .is('numero', null)
        .select('id');
      if (deleteError) throw deleteError;
      if (!data || data.length === 0) throw new UserError('La factura se empezó a emitir recién. Recargá la página.');
      return { ok: true, message: 'Factura descartada: este pago no se va a facturar.' };
    }

    case 'cancel': {
      const factura = await loadFactura(facturaId, ref);
      if (refacturar && emisorId) await requireActiveEmisor(emisorId);

      const { row: nc, existed } = await createNotaCredito(factura, { createdBy: adminEmail });
      let ncResult = { ok: nc.estado === 'emitida', message: null };
      if (nc.estado !== 'emitida') ncResult = await emitInvoice(nc.id);

      if (!ncResult.ok) {
        return {
          ok: false,
          message: `${existed ? 'Ya había una nota de crédito en curso' : 'Se creó la nota de crédito'} pero no se pudo emitir: ${ncResult.message}. La factura sigue vigente hasta que la nota de crédito se emita.`,
        };
      }

      if (!refacturar) return { ok: true, message: 'Factura anulada con nota de crédito.' };

      const payment = await paymentsRepo.findByReference(ref);
      if (!payment) {
        return { ok: true, message: 'Factura anulada. No se refacturó porque el pago ya no existe.' };
      }
      const nueva = await createManualFactura(payment, {
        emisorId: emisorId || factura.emisor_id,
        createdBy: adminEmail,
      });
      const nuevaResult = await emitInvoice(nueva.id);
      return {
        ok: nuevaResult.ok,
        message: nuevaResult.ok
          ? 'Factura anulada y emitida de nuevo.'
          : `Factura anulada. La nueva factura no se pudo emitir: ${nuevaResult.message}`,
      };
    }

    case 'resend_email': {
      const factura = await loadFactura(facturaId, ref);
      if (!factura.cae) throw new UserError('El comprobante todavía no está emitido.');
      if (!factura.receptor_email) throw new UserError('El pago no tiene email del comprador.');
      const result = await sendInvoiceToBuyer(factura);
      return {
        ok: result.sent,
        message: result.sent
          ? `Se envió el comprobante a ${factura.receptor_email}.`
          : `No se pudo enviar el mail: ${result.error || 'sin detalle'}`,
      };
    }

    default:
      throw new UserError(`Acción desconocida. Usá una de: ${ACTIONS.join(', ')}`);
  }
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }
  if (!body.ref || typeof body.ref !== 'string') return error(400, 'ref es requerido');

  try {
    const result = await run(body, auth.admin.email);
    console.log('[admin-invoice-action]', {
      action: body.action,
      ref: body.ref,
      facturaId: body.facturaId || null,
      ok: result.ok,
      admin: auth.admin.email,
    });
    const facturas = await listFacturasForPayment(body.ref);
    return ok({ ...result, facturas });
  } catch (err) {
    if (err instanceof UserError) return error(400, err.message);
    console.error('[admin-invoice-action] error:', err);
    return error(500, 'No se pudo completar la acción', { details: err.message });
  }
};