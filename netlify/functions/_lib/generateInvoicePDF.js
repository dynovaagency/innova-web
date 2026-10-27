/**
 * Generador del PDF de la factura electrónica (o nota de crédito).
 *
 * Arma la representación impresa del comprobante con los datos que
 * exige ARCA: letra y código, datos del emisor y del receptor, período
 * facturado, detalle, totales, CAE con su vencimiento y el código QR.
 *
 * Usa los datos guardados en la fila de `facturas` al emitir (incluida
 * la foto del emisor en emisor_snapshot), así el PDF sale igual aunque
 * el emisor cambie después sus datos.
 *
 * Los comprobantes de homologación llevan una marca de agua
 * "SIN VALIDEZ FISCAL".
 */

import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

const COLORS = {
  primary: rgb(21 / 255, 63 / 255, 113 / 255),
  text: rgb(30 / 255, 30 / 255, 30 / 255),
  muted: rgb(100 / 255, 100 / 255, 100 / 255),
  border: rgb(170 / 255, 170 / 255, 170 / 255),
  fill: rgb(242 / 255, 242 / 255, 242 / 255),
  watermark: rgb(240 / 255, 72 / 255, 71 / 255),
};

const PAGE = { width: 595, height: 842, margin: 40 };

const LETRAS = { 1: 'A', 3: 'A', 6: 'B', 8: 'B', 11: 'C', 13: 'C' };
const TITULOS = { 1: 'FACTURA', 6: 'FACTURA', 11: 'FACTURA', 3: 'NOTA DE CRÉDITO', 8: 'NOTA DE CRÉDITO', 13: 'NOTA DE CRÉDITO' };
const NOMBRES = { 1: 'Factura A', 3: 'Nota de crédito A', 6: 'Factura B', 8: 'Nota de crédito B', 11: 'Factura C', 13: 'Nota de crédito C' };

const CONDICION_IVA = {
  monotributo: 'Responsable Monotributo',
  responsable_inscripto: 'IVA Responsable Inscripto',
  exento: 'IVA Sujeto Exento',
};

const DOC_LABELS = { 80: 'CUIT', 86: 'CUIL', 96: 'DNI', 99: 'Doc.' };

const pad = (n, len) => String(n ?? '').padStart(len, '0');

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
const formatDay = (day) => {
  if (!day) return '—';
  const [y, m, d] = String(day).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const money = (n) =>
  `$ ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)}`;

const formatCuit = (cuit) => {
  const c = String(cuit || '');
  return c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c || '—';
};

/**
 * Las fuentes estándar de PDF solo tienen caracteres latinos (WinAnsi).
 * Cualquier otro (emojis, comillas raras) rompería el PDF: se reemplaza.
 */
const safe = (value) =>
  String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013]/g, '-')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2014\u20AC]/g, '');

/** Corta un texto en líneas que entren en maxWidth. */
const wrap = (text, font, size, maxWidth) => {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

/**
 * Texto del QR según la especificación de ARCA:
 * https://www.afip.gob.ar/fe/qr/?p=<JSON en base64>
 */
export const buildQrUrl = (factura) => {
  const snapshot = factura.emisor_snapshot || {};
  const data = {
    ver: 1,
    fecha: String(factura.fecha).slice(0, 10),
    cuit: Number(snapshot.cuit),
    ptoVta: Number(factura.punto_venta),
    tipoCmp: Number(factura.cbte_tipo),
    nroCmp: Number(factura.numero),
    importe: Number(factura.importe),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: Number(factura.receptor_doc_tipo ?? 99),
    nroDocRec: Number(factura.receptor_doc_nro || 0),
    tipoCodAut: 'E',
    codAut: Number(factura.cae),
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${encoded}`;
};

/** Dibuja el QR como cuadrados vectoriales (sin imágenes). */
const drawQr = (page, text, x, y, size) => {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size;
  const cell = size / count;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.modules.get(row, col)) {
        page.drawRectangle({
          x: x + col * cell,
          y: y + size - (row + 1) * cell,
          width: cell + 0.1,
          height: cell + 0.1,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
};

/**
 * Genera el PDF.
 *
 * @param {object} params
 * @param {object} params.factura      Fila de la tabla facturas (emitida o anulada).
 * @param {string} params.descripcion  Detalle del ítem (título del curso).
 * @param {object|null} params.asociada Para notas de crédito: la factura que anula.
 * @returns {Promise<Uint8Array>}
 */
export async function generateInvoicePDF({ factura, descripcion, asociada = null }) {
  if (!factura?.cae) throw new Error('La factura no tiene CAE: no se puede generar el PDF.');

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE.width, PAGE.height]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const emisor = factura.emisor_snapshot || {};
  const tipo = Number(factura.cbte_tipo);
  const letra = LETRAS[tipo] || '';
  const titulo = TITULOS[tipo] || 'COMPROBANTE';
  const esB = letra === 'B';
  const L = PAGE.margin;
  const R = PAGE.width - PAGE.margin;
  const W = R - L;
  const mid = L + W / 2;

  pdf.setTitle(`${NOMBRES[tipo] || 'Comprobante'} ${pad(factura.punto_venta, 5)}-${pad(factura.numero, 8)}`);
  pdf.setAuthor(safe(emisor.razonSocial));

  const text = (str, x, y, { size = 9, f = font, color = COLORS.text } = {}) =>
    page.drawText(safe(str), { x, y, size, font: f, color });
  const textRight = (str, xRight, y, opts = {}) => {
    const size = opts.size || 9;
    const f = opts.f || font;
    text(str, xRight - f.widthOfTextAtSize(safe(str), size), y, opts);
  };
  const box = (x, y, w, h, { fill } = {}) =>
    page.drawRectangle({ x, y, width: w, height: h, borderColor: COLORS.border, borderWidth: 0.8, color: fill });
  const labelValue = (label, value, x, y, { size = 9 } = {}) => {
    text(label, x, y, { size, f: bold });
    text(value, x + bold.widthOfTextAtSize(safe(label), size) + 4, y, { size });
  };

  // ---------------- ORIGINAL ----------------
  let y = PAGE.height - L;
  box(L, y - 18, W, 18);
  const original = 'ORIGINAL';
  text(original, mid - bold.widthOfTextAtSize(original, 10) / 2, y - 13, { size: 10, f: bold });
  y -= 18;

  // ---------------- Cabecera ----------------
  const headH = 120;
  box(L, y - headH, W, headH);
  page.drawLine({ start: { x: mid, y: y - 46 }, end: { x: mid, y: y - headH }, thickness: 0.8, color: COLORS.border });

  // Letra y código, centrados sobre la línea divisoria
  const letterBox = 46;
  box(mid - letterBox / 2, y - letterBox, letterBox, letterBox, { fill: rgb(1, 1, 1) });
  text(letra, mid - bold.widthOfTextAtSize(letra, 26) / 2, y - 30, { size: 26, f: bold });
  const cod = `COD. ${pad(tipo, 3)}`;
  text(cod, mid - bold.widthOfTextAtSize(cod, 7) / 2, y - 41, { size: 7, f: bold });

  // Emisor (izquierda)
  let ly = y - 26;
  for (const line of wrap(emisor.razonSocial, bold, 15, W / 2 - letterBox / 2 - 20).slice(0, 2)) {
    text(line, L + 12, ly, { size: 15, f: bold, color: COLORS.primary });
    ly -= 18;
  }
  ly = Math.min(ly, y - 62) - 4;
  const leftW = W / 2 - 24;
  const domLines = wrap(`Domicilio comercial: ${emisor.domicilioFiscal || '—'}`, font, 8.5, leftW).slice(0, 3);
  domLines.forEach((line, i) => {
    if (i === 0) {
      labelValue('Domicilio comercial:', line.replace(/^Domicilio comercial:\s*/, ''), L + 12, ly, { size: 8.5 });
    } else {
      text(line, L + 12, ly, { size: 8.5 });
    }
    ly -= 12;
  });
  labelValue('Condición frente al IVA:', CONDICION_IVA[emisor.condicionFiscal] || '—', L + 12, ly - 2, { size: 8.5 });

  // Comprobante (derecha)
  const rx = mid + 16;
  text(titulo, rx + letterBox / 2 - 6, y - 26, { size: 16, f: bold, color: COLORS.primary });
  let ry = y - 62;
  labelValue('Punto de venta:', pad(factura.punto_venta, 5), rx, ry);
  labelValue('Comp. Nro:', pad(factura.numero, 8), rx + 120, ry);
  ry -= 14;
  labelValue('Fecha de emisión:', formatDay(factura.fecha), rx, ry);
  ry -= 14;
  labelValue('CUIT:', formatCuit(emisor.cuit), rx, ry);
  ry -= 14;
  labelValue('Inicio de actividades:', formatDay(emisor.inicioActividades), rx, ry);
  y -= headH;

  // ---------------- Período ----------------
  const perH = 22;
  box(L, y - perH, W, perH);
  const servicio = factura.fecha_servicio || factura.fecha;
  labelValue('Período facturado desde:', formatDay(servicio), L + 12, y - 14.5, { size: 8.5 });
  labelValue('Hasta:', formatDay(servicio), L + 205, y - 14.5, { size: 8.5 });
  labelValue('Fecha de vto. para el pago:', formatDay(factura.fecha), L + 320, y - 14.5, { size: 8.5 });
  y -= perH + 6;

  // ---------------- Receptor ----------------
  const recH = asociada ? 70 : 56;
  box(L, y - recH, W, recH);
  const docTipo = Number(factura.receptor_doc_tipo ?? 99);
  const docValue =
    docTipo === 99 || !factura.receptor_doc_nro || factura.receptor_doc_nro === '0'
      ? '—'
      : docTipo === 96
        ? factura.receptor_doc_nro
        : formatCuit(factura.receptor_doc_nro);
  let ky = y - 16;
  labelValue(`${DOC_LABELS[docTipo] || 'Doc.'}:`, docValue, L + 12, ky, { size: 8.5 });
  labelValue('Apellido y nombre / Razón social:', factura.receptor_nombre || 'Consumidor final', L + 150, ky, { size: 8.5 });
  ky -= 15;
  labelValue('Condición frente al IVA:', 'Consumidor Final', L + 12, ky, { size: 8.5 });
  labelValue('Email:', factura.receptor_email || '—', L + 250, ky, { size: 8.5 });
  ky -= 15;
  labelValue('Condición de venta:', 'Contado', L + 12, ky, { size: 8.5 });
  if (asociada) {
    ky -= 15;
    labelValue(
      'Comprobante asociado:',
      `${NOMBRES[asociada.cbte_tipo] || 'Factura'} ${pad(asociada.punto_venta, 5)}-${pad(asociada.numero, 8)} del ${formatDay(asociada.fecha)}`,
      L + 12,
      ky,
      { size: 8.5 }
    );
  }
  y -= recH + 10;

  // ---------------- Detalle ----------------
  const cols = [
    { label: 'Producto / Servicio', x: L + 8, w: 250, align: 'left' },
    { label: 'Cantidad', x: L + 300, align: 'right' },
    { label: 'U. medida', x: L + 360, align: 'right' },
    { label: 'Precio unit.', x: L + 440, align: 'right' },
    { label: 'Subtotal', x: R - 8, align: 'right' },
  ];
  const headRowH = 18;
  page.drawRectangle({ x: L, y: y - headRowH, width: W, height: headRowH, color: COLORS.fill, borderColor: COLORS.border, borderWidth: 0.8 });
  for (const c of cols) {
    if (c.align === 'right') textRight(c.label, c.x, y - 12.5, { size: 8.5, f: bold });
    else text(c.label, c.x, y - 12.5, { size: 8.5, f: bold });
  }
  y -= headRowH + 14;

  const descLines = wrap(descripcion || 'Curso de formación', font, 9, cols[0].w).slice(0, 4);
  descLines.forEach((line, i) => text(line, cols[0].x, y - i * 12, { size: 9 }));
  textRight('1,00', cols[1].x, y, { size: 9 });
  textRight('unidades', cols[2].x, y, { size: 9 });
  textRight(money(factura.importe), cols[3].x, y, { size: 9 });
  textRight(money(factura.importe), cols[4].x, y, { size: 9 });

  // ---------------- Totales (abajo) ----------------
  const footerTop = 200; // donde empieza el bloque de CAE / QR
  const totH = esB ? 98 : 70;
  const totY = footerTop + 12;
  box(L, totY, W, totH);
  const tx = R - 12;
  let ty = totY + totH - 18;
  textRight(money(factura.importe), tx, ty, { size: 9, f: bold });
  textRight('Subtotal:', tx - 110, ty, { size: 9, f: bold });
  ty -= 16;
  textRight(money(0), tx, ty, { size: 9, f: bold });
  textRight('Importe otros tributos:', tx - 110, ty, { size: 9, f: bold });
  ty -= 20;
  textRight(money(factura.importe), tx, ty, { size: 11, f: bold });
  textRight('Importe total:', tx - 110, ty, { size: 11, f: bold });

  if (esB) {
    const iva = factura.importe_iva ?? 0;
    text('Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)', L + 12, totY + 30, { size: 8, f: bold });
    text(`IVA contenido: ${money(iva)}`, L + 12, totY + 16, { size: 8 });
    text('Otros impuestos nacionales indirectos: $ 0,00', L + 170, totY + 16, { size: 8 });
  }

  // ---------------- CAE y QR ----------------
  const qrSize = 92;
  drawQr(page, buildQrUrl(factura), L, footerTop - qrSize - 8, qrSize);

  const cx = L + qrSize + 18;
  text('Comprobante autorizado', cx, footerTop - 26, { size: 11, f: bold, color: COLORS.primary });
  wrap(
    'Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación.',
    font,
    7,
    R - cx
  ).forEach((line, i) => text(line, cx, footerTop - 64 - i * 9, { size: 7, color: COLORS.muted }));
  textRight(String(factura.cae), R, footerTop - 26, { size: 10 });
  textRight('CAE Nº:', R - font.widthOfTextAtSize(String(factura.cae), 10) - 6, footerTop - 26, { size: 10, f: bold });
  textRight(formatDay(factura.cae_vto), R, footerTop - 42, { size: 10 });
  textRight('Fecha de vto. de CAE:', R - font.widthOfTextAtSize(formatDay(factura.cae_vto), 10) - 6, footerTop - 42, { size: 10, f: bold });

  text('Pág. 1/1', mid - font.widthOfTextAtSize('Pág. 1/1', 8) / 2, L - 10, { size: 8, color: COLORS.muted });

  // ---------------- Marca de agua (homologación) ----------------
  if (factura.ambiente !== 'produccion') {
    const mark = 'COMPROBANTE DE PRUEBA - SIN VALIDEZ FISCAL';
    page.drawText(mark, {
      x: 105,
      y: 250,
      size: 22,
      font: bold,
      color: COLORS.watermark,
      opacity: 0.18,
      rotate: degrees(35),
    });
  }

  return pdf.save();
}

/** Nombre de archivo: factura-C-00003-00000042.pdf */
export const invoiceFilename = (factura) => {
  const tipo = Number(factura.cbte_tipo);
  const prefijo = [3, 8, 13].includes(tipo) ? 'nota-de-credito' : 'factura';
  return `${prefijo}-${LETRAS[tipo] || ''}-${pad(factura.punto_venta, 5)}-${pad(factura.numero, 8)}.pdf`;
};