/**
 * POST /.netlify/functions/download-certificate
 *
 * Descarga el certificado del usuario autenticado.
 * Valida que el certificado pertenezca al usuario.
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
 *   403 si el certificado no pertenece al usuario
 *   404 si el pago o el certificado no existen
 */

import { error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'certificates';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  // Verificar auth
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(401, 'No autenticado');
  }
  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    console.error('[download-certificate] auth error:', userError);
    return error(401, 'Token inválido');
  }
  const authenticatedEmail = userData.user.email;

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
    const payment = await paymentsRepo.findByReference(externalReference);
    if (!payment) return error(404, 'Pago no encontrado');

    // Validar que sea del usuario
    if (payment.buyerEmail?.toLowerCase() !== authenticatedEmail.toLowerCase()) {
      console.warn(
        `[download-certificate] intento no autorizado: user=${authenticatedEmail} pago=${payment.buyerEmail}`
      );
      return error(403, 'No autorizado');
    }

    if (!payment.certificateUrl) {
      return error(404, 'Este pago no tiene certificado asociado');
    }

    // Descargar el certificado desde Storage
    const { data, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(payment.certificateUrl);

    if (downloadError || !data) {
      console.error('[download-certificate] storage error:', downloadError);
      return error(500, 'No pudimos obtener el certificado', {
        details: downloadError?.message,
      });
    }

    // Convertir Blob a Buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${externalReference}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('[download-certificate] error:', err);
    return error(500, 'No pudimos descargar el certificado', {
      details: err.message,
    });
  }
};