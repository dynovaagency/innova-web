/**
 * GET /.netlify/functions/admin-invoice-pdf?id=<facturaId>
 *
 * Devuelve el PDF de un comprobante emitido (factura o nota de crédito)
 * para descargarlo desde el detalle del pago. Protegido con requireAdmin.
 *
 * Response:
 *   200 application/pdf
 *   400 si el comprobante todavía no tiene CAE
 *   404 si no existe
 */

import { error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { findFacturaById } from './_lib/facturas.js';
import { buildInvoiceFile } from './_lib/invoiceDocument.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const id = event.queryStringParameters?.id;
  if (!id) return error(400, 'id es requerido');

  try {
    const factura = await findFacturaById(id);
    if (!factura) return error(404, 'Comprobante no encontrado');
    if (!factura.cae) return error(400, 'El comprobante todavía no está emitido');

    const file = await buildInvoiceFile(factura);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'no-store',
      },
      body: file.content.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('[admin-invoice-pdf] error:', err);
    return error(500, 'No se pudo generar el PDF', { details: err.message });
  }
};