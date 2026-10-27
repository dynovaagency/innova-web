/**
 * POST /.netlify/functions/download-invoice
 *
 * Devuelve el PDF de la factura electrónica de una compra del alumno.
 * Solo usuarios autenticados pueden descargar sus propias facturas.
 *
 * Body:
 *   { externalReference: string }
 *
 * Headers:
 *   Authorization: Bearer <supabase_access_token>
 *
 * Response:
 *   200 application/pdf con el archivo binario
 *   401 si no está autenticado
 *   403 si el pago no pertenece al usuario
 *   404 si el pago no existe o todavía no tiene factura emitida
 */

import { error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { createClient } from '@supabase/supabase-js';
import { buildInvoiceFile } from './_lib/invoiceDocument.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(401, 'No autenticado');
  }
  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    return error(401, 'Sesión inválida o expirada');
  }
  const authenticatedEmail = userData.user.email;

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { externalReference } = payload;
  if (!externalReference) return error(400, 'externalReference es requerido');

  try {
    const payment = await paymentsRepo.findByReference(externalReference);
    if (!payment) return error(404, 'Pago no encontrado');

    if (payment.buyerEmail?.toLowerCase() !== authenticatedEmail.toLowerCase()) {
      console.warn(
        `[download-invoice] intento no autorizado: user=${authenticatedEmail} pago=${payment.buyerEmail}`
      );
      return error(403, 'No autorizado');
    }

    const { data: factura, error: queryError } = await supabase
      .from('facturas')
      .select('*')
      .eq('payment_ref', externalReference)
      .eq('tipo', 'factura')
      .eq('estado', 'emitida')
      .maybeSingle();
    if (queryError) throw queryError;
    if (!factura) return error(404, 'Esta compra todavía no tiene factura');

    const file = await buildInvoiceFile(factura);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
        'Cache-Control': 'no-store',
      },
      body: file.content.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('[download-invoice] error:', err);
    return error(500, 'No pudimos generar la factura', { details: err.message });
  }
};