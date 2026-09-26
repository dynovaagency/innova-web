/**
 * Generador de PDF del comprobante de compra.
 *
 * Recibe los datos del pago + producto + comprador y devuelve
 * el PDF como Uint8Array (para escribir en HTTP response o adjuntar
 * en email).
 *
 * No es una factura fiscal. Es un comprobante de compra interno.
 * La factura electrónica AFIP/ARCA viene aparte (Módulo 3).
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const COLORS = {
  primary: rgb(21 / 255, 63 / 255, 113 / 255),      // Azul marino Innova
  secondary: rgb(130 / 255, 198 / 255, 197 / 255),  // Sage
  accent: rgb(240 / 255, 72 / 255, 71 / 255),       // Coral
  text: rgb(30 / 255, 30 / 255, 30 / 255),
  textMuted: rgb(100 / 255, 100 / 255, 100 / 255),
  border: rgb(220 / 255, 220 / 255, 220 / 255),
};

/**
 * Genera el PDF del comprobante.
 *
 * @param {Object} params
 * @param {Object} params.payment - Datos del pago
 * @param {Object|null} params.product - Datos del producto (puede ser null)
 * @param {Object|null} params.profile - Datos del profile del usuario
 * @param {string} params.buyerEmail - Email del comprador
 * @returns {Promise<Uint8Array>}
 */
export async function generateReceiptPDF({ payment, product, profile, buyerEmail }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 en puntos
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ========== HEADER ==========
  const headerY = height - 60;

  // Título INNOVA
  page.drawText('INNOVA', {
    x: 50,
    y: headerY,
    size: 28,
    font: helveticaBold,
    color: COLORS.primary,
  });

  page.drawText('TRABAJO SOCIAL', {
    x: 50,
    y: headerY - 22,
    size: 10,
    font: helvetica,
    color: COLORS.textMuted,
  });

  // "Comprobante de compra" a la derecha
  const rightLabel = 'COMPROBANTE DE COMPRA';
  const rightLabelWidth = helveticaBold.widthOfTextAtSize(rightLabel, 12);
  page.drawText(rightLabel, {
    x: width - 50 - rightLabelWidth,
    y: headerY,
    size: 12,
    font: helveticaBold,
    color: COLORS.primary,
  });

  const refText = `Ref: ${payment.externalReference}`;
  const refWidth = helvetica.widthOfTextAtSize(refText, 9);
  page.drawText(refText, {
    x: width - 50 - refWidth,
    y: headerY - 18,
    size: 9,
    font: helvetica,
    color: COLORS.textMuted,
  });

  // Línea divisora
  page.drawLine({
    start: { x: 50, y: headerY - 50 },
    end: { x: width - 50, y: headerY - 50 },
    thickness: 2,
    color: COLORS.secondary,
  });

  // ========== FECHA ==========
  const dateY = headerY - 80;
  const fechaEmision = new Date(payment.approvedAt || payment.createdAt);
  const fechaStr = fechaEmision.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  page.drawText('FECHA DE COMPRA', {
    x: 50,
    y: dateY,
    size: 8,
    font: helveticaBold,
    color: COLORS.textMuted,
  });
  page.drawText(fechaStr, {
    x: 50,
    y: dateY - 14,
    size: 11,
    font: helvetica,
    color: COLORS.text,
  });

  // ========== COMPRADOR ==========
  const buyerY = dateY - 55;
  drawSectionTitle(page, 'DATOS DEL COMPRADOR', 50, buyerY, helveticaBold);

  const buyerName = profile
    ? `${profile.nombre || ''} ${profile.apellido || ''}`.trim() || '—'
    : '—';
  const buyerDoc = profile?.documento_numero
    ? `${profile.documento_tipo || 'DNI'} ${profile.documento_numero}`
    : '—';

  drawKeyValue(page, 'Nombre', buyerName, 50, buyerY - 25, helvetica, helveticaBold);
  drawKeyValue(page, 'Email', buyerEmail, 50, buyerY - 50, helvetica, helveticaBold);
  drawKeyValue(page, 'Documento', buyerDoc, 50, buyerY - 75, helvetica, helveticaBold);

  // ========== PRODUCTO ==========
  const productY = buyerY - 130;
  drawSectionTitle(page, 'PRODUCTO ADQUIRIDO', 50, productY, helveticaBold);

  const productTitle = product?.title || payment.cursoSlug || '—';
  const productModalidad = product?.modalidad === 'capsula' ? 'Cápsula' : product?.modalidad === 'curso' ? 'Curso' : '—';

  drawKeyValue(page, 'Producto', productTitle, 50, productY - 25, helvetica, helveticaBold);
  drawKeyValue(page, 'Modalidad', productModalidad, 50, productY - 50, helvetica, helveticaBold);

  // ========== PAGO ==========
  const payY = productY - 105;
  drawSectionTitle(page, 'DETALLE DEL PAGO', 50, payY, helveticaBold);

  const methodLabels = {
    mercadopago: 'Mercado Pago',
    transferencia: 'Transferencia bancaria',
    gocuotas: 'Go Cuotas',
    payway: 'Payway',
  };
  const methodLabel = methodLabels[payment.provider] || payment.provider || '—';

  const amountStr = `${payment.currency || 'ARS'} ${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(payment.amount || 0)}`;

  drawKeyValue(page, 'Método de pago', methodLabel, 50, payY - 25, helvetica, helveticaBold);
  drawKeyValue(page, 'Monto', amountStr, 50, payY - 50, helvetica, helveticaBold);
  drawKeyValue(page, 'Estado', 'APROBADO', 50, payY - 75, helvetica, helveticaBold);
  drawKeyValue(page, 'Referencia externa', payment.externalReference, 50, payY - 100, helvetica, helveticaBold);

  // Cupón de descuento (si hubo)
  if (payment.couponCode) {
    const fmt = (n) =>
      `${payment.currency || 'ARS'} ${new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n || 0)}`;

    drawKeyValue(
      page,
      'Cupón de descuento',
      `${payment.couponCode} · − ${fmt(payment.discountApplied)} (precio original ${fmt(payment.originalAmount)})`,
      50,
      payY - 125,
      helvetica,
      helveticaBold
    );
  }

  // ========== NOTA ==========
  const noteY = 180;

  // Caja con la nota
  page.drawRectangle({
    x: 50,
    y: noteY - 40,
    width: width - 100,
    height: 55,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  page.drawText('Este comprobante no constituye factura fiscal.', {
    x: 60,
    y: noteY - 5,
    size: 9,
    font: helveticaBold,
    color: COLORS.text,
  });
  page.drawText(
    'La factura correspondiente se emite por separado a través de facturación electrónica.',
    {
      x: 60,
      y: noteY - 20,
      size: 8,
      font: helvetica,
      color: COLORS.textMuted,
    }
  );

  // ========== FOOTER ==========
  page.drawLine({
    start: { x: 50, y: 90 },
    end: { x: width - 50, y: 90 },
    thickness: 1,
    color: COLORS.border,
  });

  page.drawText('Innova Trabajo Social', {
    x: 50,
    y: 70,
    size: 9,
    font: helveticaBold,
    color: COLORS.text,
  });
  page.drawText('innovatrabajosocial@trabajosocial.ar', {
    x: 50,
    y: 55,
    size: 8,
    font: helvetica,
    color: COLORS.textMuted,
  });
  page.drawText('innovatrabajosocial.com.ar', {
    x: 50,
    y: 43,
    size: 8,
    font: helvetica,
    color: COLORS.textMuted,
  });

  const genLabel = `Generado el ${new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`;
  const genWidth = helvetica.widthOfTextAtSize(genLabel, 8);
  page.drawText(genLabel, {
    x: width - 50 - genWidth,
    y: 55,
    size: 8,
    font: helvetica,
    color: COLORS.textMuted,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Helpers de dibujo
 */
function drawSectionTitle(page, text, x, y, boldFont) {
  page.drawText(text, {
    x,
    y,
    size: 9,
    font: boldFont,
    color: COLORS.primary,
  });
  // Subrayado sutil
  const textWidth = boldFont.widthOfTextAtSize(text, 9);
  page.drawLine({
    start: { x, y: y - 3 },
    end: { x: x + textWidth, y: y - 3 },
    thickness: 1,
    color: COLORS.secondary,
  });
}

function drawKeyValue(page, label, value, x, y, font, boldFont) {
  page.drawText(label, {
    x,
    y,
    size: 8,
    font: boldFont,
    color: COLORS.textMuted,
  });
  page.drawText(String(value), {
    x,
    y: y - 12,
    size: 11,
    font,
    color: COLORS.text,
  });
}