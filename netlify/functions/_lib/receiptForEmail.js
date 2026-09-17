/**
 * Helper para generar el PDF del comprobante cuando se va a adjuntar
 * a un email de acceso.
 *
 * A diferencia del endpoint /download-receipt (que autentica al usuario),
 * este helper corre en contexto server-side ya autorizado (webhook de MP
 * o admin aprobando manualmente), así que no requiere validación.
 *
 * Devuelve { filename, content } listo para pasar a sendAccessEmail(),
 * o null si algo falla (para que el email se mande igual sin adjunto).
 */

import { createClient } from '@supabase/supabase-js';
import * as productsRepo from './repositories/products.js';
import { generateReceiptPDF } from './generateReceiptPDF.js';

export async function buildReceiptAttachment(payment) {
  try {
    if (!payment || !payment.externalReference) {
      console.warn('[receiptForEmail] payment inválido, salteamos adjunto');
      return null;
    }

    // Obtener datos del producto (para el título en el PDF)
    let product = null;
    if (payment.cursoSlug) {
      product = await productsRepo.findBySlug(payment.cursoSlug, { activeOnly: false });
    }

    // Obtener profile del comprador desde Supabase (best effort).
    // Si el comprador no tiene cuenta Supabase (guest checkout), profile
    // queda null y el PDF muestra "—" en los campos personales.
    let profile = null;
    if (payment.buyerEmail && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await supabase
        .from('usuarios')
        .select('nombre, apellido, documento_tipo, documento_numero')
        .eq('email', payment.buyerEmail.toLowerCase())
        .maybeSingle();
      profile = data || null;
    }

    // Generar el PDF
    const pdfBytes = await generateReceiptPDF({
      payment,
      product,
      profile,
      buyerEmail: payment.buyerEmail,
    });

    // Convertir a Buffer para Resend
    const content = Buffer.from(pdfBytes);
    const filename = `comprobante-${payment.externalReference}.pdf`;

    return { filename, content };
  } catch (err) {
    // Si algo falla, devolvemos null y el email se manda sin adjunto.
    // No queremos que un problema con el PDF impida que el usuario
    // reciba su acceso al curso.
    console.error('[receiptForEmail] error generando adjunto:', err);
    return null;
  }
}