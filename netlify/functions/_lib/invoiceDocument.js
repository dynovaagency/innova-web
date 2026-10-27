/**
 * PDF y mail de los comprobantes emitidos.
 *
 *   buildInvoiceFile(factura)  → { filename, content } con el PDF.
 *   sendInvoiceToBuyer(factura) → manda el PDF por mail al comprador y
 *                                 deja registro en la fila (email_enviado_at
 *                                 o email_error). Nunca lanza.
 *
 * Lo usan la emisión (mail automático al emitir), el panel admin
 * (descargar y reenviar) y el panel del alumno (descargar).
 */

import { getSupabase } from './fiscal.js';
import * as paymentsRepo from './repositories/payments.js';
import * as productsRepo from './repositories/products.js';
import { generateInvoicePDF, invoiceFilename } from './generateInvoicePDF.js';
import { sendInvoiceEmail } from './email.js';
import { CBTE_LABELS } from './arca/wsfe.js';

const DESCRIPCION_DEFAULT = 'Curso de formación - Innova Trabajo Social';

const pad = (n, len) => String(n ?? '').padStart(len, '0');

/** Título del curso del pago, para el detalle del comprobante. */
const loadCursoTitle = async (paymentRef) => {
  try {
    const payment = await paymentsRepo.findByReference(paymentRef);
    if (!payment?.cursoSlug) return null;
    const product = await productsRepo.findBySlug(payment.cursoSlug, { activeOnly: false });
    return product?.title || payment.productTitle || null;
  } catch (err) {
    console.warn('[invoiceDocument] no se pudo leer el curso del pago:', err.message);
    return null;
  }
};

const loadAsociada = async (factura) => {
  if (factura.tipo !== 'nota_credito' || !factura.factura_asociada_id) return null;
  const { data } = await getSupabase()
    .from('facturas')
    .select('cbte_tipo, punto_venta, numero, fecha')
    .eq('id', factura.factura_asociada_id)
    .maybeSingle();
  return data || null;
};

/** Ej.: "Factura C 00003-00000042" */
export const comprobanteLabel = (factura) =>
  `${CBTE_LABELS[factura.cbte_tipo] || 'Comprobante'} ${pad(factura.punto_venta, 5)}-${pad(factura.numero, 8)}`;

/**
 * Genera el PDF de un comprobante con CAE (emitido o ya anulado).
 * @returns {Promise<{ filename: string, content: Buffer, cursoTitle: string|null }>}
 */
export const buildInvoiceFile = async (factura) => {
  if (!factura?.cae) throw new Error('El comprobante todavía no está emitido.');
  const [cursoTitle, asociada] = await Promise.all([
    loadCursoTitle(factura.payment_ref),
    loadAsociada(factura),
  ]);
  const bytes = await generateInvoicePDF({
    factura,
    descripcion: cursoTitle ? `Curso: ${cursoTitle}` : DESCRIPCION_DEFAULT,
    asociada,
  });
  return { filename: invoiceFilename(factura), content: Buffer.from(bytes), cursoTitle };
};

/**
 * Manda el comprobante por mail al comprador y registra el resultado.
 * Nunca lanza: un problema con el mail no afecta la factura.
 *
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export const sendInvoiceToBuyer = async (factura) => {
  const record = async (patch) => {
    try {
      await getSupabase().from('facturas').update(patch).eq('id', factura.id);
    } catch (err) {
      console.error('[invoiceDocument] no se pudo registrar el envío:', err);
    }
  };

  try {
    if (!factura?.receptor_email) {
      await record({ email_error: 'El pago no tiene email del comprador.' });
      return { sent: false, error: 'no_email' };
    }

    const file = await buildInvoiceFile(factura);
    const result = await sendInvoiceEmail({
      to: factura.receptor_email,
      isCreditNote: factura.tipo === 'nota_credito',
      comprobante: comprobanteLabel(factura),
      cursoTitle: file.cursoTitle || 'tu curso',
      emisorNombre: factura.emisor_snapshot?.razonSocial || null,
      pdfAttachment: { filename: file.filename, content: file.content },
      isTest: factura.ambiente !== 'produccion',
    });

    if (result.sent) {
      await record({ email_enviado_at: new Date().toISOString(), email_error: null });
      return { sent: true };
    }
    await record({ email_error: `No se pudo enviar el mail: ${result.error || 'sin detalle'}` });
    return { sent: false, error: result.error };
  } catch (err) {
    console.error('[invoiceDocument] error enviando comprobante:', err);
    await record({ email_error: `No se pudo enviar el mail: ${err.message}` });
    return { sent: false, error: err.message };
  }
};