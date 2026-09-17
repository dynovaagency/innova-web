/**
 * POST /.netlify/functions/download-receipt
 *
 * Genera y devuelve el PDF del comprobante de compra.
 * Solo usuarios autenticados pueden descargar sus propios comprobantes.
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
 *   404 si el pago no existe o no está aprobado
 */

import { ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';
import { createClient } from '@supabase/supabase-js';
import { generateReceiptPDF } from './_lib/generateReceiptPDF.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  // Verificar auth
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(401, 'No autenticado');
  }
  const token = authHeader.replace('Bearer ', '');

  // Verificar el token con Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    console.error('[download-receipt] auth error:', userError);
    return error(401, 'Token inválido');
  }
  const authenticatedEmail = userData.user.email;

  // Parsear body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { externalReference } = payload;
  if (!externalReference) {
    return error(400, 'externalReference es requerido');
  }

  try {
    // Buscar el pago
    const payment = await paymentsRepo.findByExternalReference(externalReference);
    if (!payment) {
      return error(404, 'Pago no encontrado');
    }

    // Verificar que el pago pertenezca al usuario autenticado
    if (payment.buyerEmail?.toLowerCase() !== authenticatedEmail.toLowerCase()) {
      console.warn(
        `[download-receipt] intento no autorizado: user=${authenticatedEmail} pago=${payment.buyerEmail}`
      );
      return error(403, 'No autorizado');
    }

    // Verificar que el pago esté aprobado
    if (payment.status !== 'approved') {
      return error(404, 'Este pago aún no fue aprobado');
    }

    // Obtener datos del producto
    let product = null;
    if (payment.cursoSlug) {
      product = await productsRepo.findBySlug(payment.cursoSlug, { activeOnly: false });
    }

    // Obtener datos del profile del usuario (nombre, apellido, documento)
    const { data: profile } = await supabase
      .from('usuarios')
      .select('nombre, apellido, documento_tipo, documento_numero')
      .eq('id', userData.user.id)
      .single();

    // Generar el PDF
    const pdfBytes = await generateReceiptPDF({
      payment,
      product,
      profile,
      buyerEmail: authenticatedEmail,
    });

    // Devolver el PDF como binario
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprobante-${externalReference}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(pdfBytes).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('[download-receipt] error:', err);
    return error(500, 'No pudimos generar el comprobante', {
      details: err.message,
    });
  }
};