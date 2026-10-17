/**
 * GET /.netlify/functions/admin-payment-invoices?ref=inv_...
 *
 * Comprobantes de un pago (facturas y notas de crédito) para el bloque
 * "Factura" del detalle del pago. Protegido con requireAdmin.
 *
 * Response:
 *   200 {
 *     facturas: [...],   ← más nuevas primero
 *     emisores: [...],   ← activos, para elegir quién factura
 *     config: { enabled, env, delayHours, startAt }
 *   }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { getSupabase, toApiEmisor } from './_lib/fiscal.js';
import { getInvoicingConfig } from './_lib/invoicing.js';
import { listFacturasForPayment } from './_lib/facturas.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const ref = event.queryStringParameters?.ref;
  if (!ref) return error(400, 'ref es requerido');

  try {
    const [facturas, emisoresResult] = await Promise.all([
      listFacturasForPayment(ref),
      getSupabase()
        .from('emisores')
        .select('*')
        .eq('active', true)
        .order('razon_social', { ascending: true }),
    ]);
    if (emisoresResult.error) throw emisoresResult.error;

    const config = getInvoicingConfig();
    return ok({
      facturas,
      emisores: (emisoresResult.data || []).map((row) => {
        const e = toApiEmisor(row);
        return {
          id: e.id,
          razonSocial: e.razonSocial,
          cuit: e.cuit,
          condicionFiscal: e.condicionFiscal,
          isDefault: e.isDefault,
          ready: e.ready,
          missing: e.missing,
        };
      }),
      config: {
        enabled: config.enabled,
        env: config.env,
        delayHours: config.delayHours,
        startAt: config.startAt ? config.startAt.toISOString() : null,
      },
    });
  } catch (err) {
    console.error('[admin-payment-invoices] error:', err);
    return error(500, 'No se pudieron cargar las facturas', { details: err.message });
  }
};