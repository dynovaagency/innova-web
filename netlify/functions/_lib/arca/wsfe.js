/**
 * WSFEv1 — Factura electrónica de ARCA (comprobantes sin detalle de ítems).
 *
 * Este módulo expone:
 *   - Consultas para verificar la conexión y numerar comprobantes.
 *   - solicitarCAE: emisión de un comprobante (FECAESolicitar).
 *   - consultarComprobante: lectura de un comprobante ya emitido, para
 *     recuperarnos si se cortó la conexión justo después de emitir.
 *
 * Tipos de comprobante (códigos de ARCA):
 *   Factura A = 1, Nota de crédito A = 3
 *   Factura B = 6, Nota de crédito B = 8
 *   Factura C = 11, Nota de crédito C = 13
 */

import { ARCA_ENV } from '../fiscal.js';
import { escapeXml, getAllTags, getTag, soapRequest } from './soap.js';

const WSFE_URLS = {
  homologacion: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  produccion: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

const NS = 'http://ar.gov.afip.dif.FEV1/';

export const CBTE_TIPOS = Object.freeze({
  FACTURA_A: 1,
  NOTA_CREDITO_A: 3,
  FACTURA_B: 6,
  NOTA_CREDITO_B: 8,
  FACTURA_C: 11,
  NOTA_CREDITO_C: 13,
});

export const CBTE_LABELS = Object.freeze({
  1: 'Factura A',
  3: 'Nota de crédito A',
  6: 'Factura B',
  8: 'Nota de crédito B',
  11: 'Factura C',
  13: 'Nota de crédito C',
});

/**
 * Tipos de comprobante según la condición fiscal del emisor, para ventas
 * a consumidor final (el caso de la plataforma):
 *   - Monotributo y exento → Factura C / Nota de crédito C.
 *   - Responsable inscripto → Factura B / Nota de crédito B.
 *     (Factura A solo si el comprador es responsable inscripto; se suma
 *      cuando se pidan los datos fiscales del comprador.)
 */
export const getComprobanteTipos = (condicionFiscal) => {
  if (condicionFiscal === 'responsable_inscripto') {
    return { factura: CBTE_TIPOS.FACTURA_B, notaCredito: CBTE_TIPOS.NOTA_CREDITO_B };
  }
  return { factura: CBTE_TIPOS.FACTURA_C, notaCredito: CBTE_TIPOS.NOTA_CREDITO_C };
};

const authXml = ({ token, sign, cuit }) =>
  '<ar:Auth>' +
  `<ar:Token>${escapeXml(token)}</ar:Token>` +
  `<ar:Sign>${escapeXml(sign)}</ar:Sign>` +
  `<ar:Cuit>${escapeXml(cuit)}</ar:Cuit>` +
  '</ar:Auth>';

const call = async (method, innerXml) => {
  const envelope =
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    `xmlns:ar="${NS}">` +
    '<soapenv:Header/><soapenv:Body>' +
    `<ar:${method}>${innerXml}</ar:${method}>` +
    '</soapenv:Body></soapenv:Envelope>';
  return soapRequest(WSFE_URLS[ARCA_ENV], { envelope, soapAction: `${NS}${method}` });
};

/** Lista de errores de ARCA en una respuesta: [{ code, msg }]. */
export const parseErrors = (xml) => {
  const errorsBlock = getTag(xml, 'Errors');
  if (!errorsBlock) return [];
  return getAllTags(errorsBlock, 'Err').map((err) => ({
    code: Number(getTag(err, 'Code')),
    msg: getTag(err, 'Msg'),
  }));
};

/** Estado de los servidores de ARCA (no requiere autenticación). */
export const dummy = async () => {
  const xml = await call('FEDummy', '');
  return {
    appServer: getTag(xml, 'AppServer'),
    dbServer: getTag(xml, 'DbServer'),
    authServer: getTag(xml, 'AuthServer'),
  };
};

/**
 * Puntos de venta habilitados para web services.
 * En homologación ARCA suele responder "sin resultados" (código 602):
 * ahí cualquier número de punto de venta es válido.
 */
export const getPuntosVenta = async (auth) => {
  const xml = await call('FEParamGetPtosVenta', authXml(auth));
  const errors = parseErrors(xml);
  const puntos = getAllTags(xml, 'PtoVenta').map((pv) => {
    // ARCA informa "NULL" (como texto) cuando el punto de venta no tiene baja.
    const baja = getTag(pv, 'FchBaja');
    return {
      nro: Number(getTag(pv, 'Nro')),
      emisionTipo: getTag(pv, 'EmisionTipo'),
      bloqueado: getTag(pv, 'Bloqueado') === 'S',
      fechaBaja: baja && baja.toUpperCase() !== 'NULL' ? baja : null,
    };
  });
  return { puntos, errors };
};

/** Último número de comprobante autorizado para un punto de venta y tipo. */
export const getUltimoComprobante = async (auth, { puntoVenta, cbteTipo }) => {
  const xml = await call(
    'FECompUltimoAutorizado',
    `${authXml(auth)}<ar:PtoVta>${Number(puntoVenta)}</ar:PtoVta><ar:CbteTipo>${Number(cbteTipo)}</ar:CbteTipo>`
  );
  const errors = parseErrors(xml);
  const nro = getTag(xml, 'CbteNro');
  return { numero: nro === null ? null : Number(nro), errors };
};

// ---------------------------------------------------------------------
// Emisión
// ---------------------------------------------------------------------

/** Tipos de documento del receptor (códigos de ARCA). */
export const DOC_TIPOS = Object.freeze({
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  SIN_IDENTIFICAR: 99,
});

/** Condición frente al IVA del receptor (RG 5616). 5 = Consumidor final. */
export const CONDICION_IVA_CONSUMIDOR_FINAL = 5;

/** Concepto 2 = Servicios (cursos y cápsulas). */
const CONCEPTO_SERVICIOS = 2;

const money = (n) => Number(n).toFixed(2);

/** Date → 'yyyymmdd' en hora argentina. */
export const toArcaDate = (date) => {
  const local = new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10).replace(/-/g, '');
};

/** 'yyyymmdd' → 'yyyy-mm-dd'. */
export const fromArcaDate = (s) =>
  s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;

const parseObservaciones = (xml) => {
  const block = getTag(xml, 'Observaciones');
  if (!block) return [];
  return getAllTags(block, 'Obs').map((o) => ({
    code: Number(getTag(o, 'Code')),
    msg: getTag(o, 'Msg'),
  }));
};

/**
 * Pide el CAE para un comprobante.
 *
 * @param {object} auth  { token, sign, cuit }
 * @param {object} c
 *   puntoVenta, cbteTipo, numero,
 *   fecha (Date), fechaServicio (Date),
 *   importeTotal, importeNeto, importeIva (solo B),
 *   docTipo, docNro,
 *   asociado?: { cbteTipo, puntoVenta, numero, cuit, fecha (Date) }  ← notas de crédito
 *
 * @returns {Promise<{ resultado: 'A'|'R'|'P', cae, caeVto, errors, observaciones }>}
 */
export const solicitarCAE = async (auth, c) => {
  const cbteFch = toArcaDate(c.fecha);
  const servicio = toArcaDate(c.fechaServicio || c.fecha);
  const conIva = c.importeIva !== undefined && c.importeIva !== null && Number(c.importeIva) > 0;

  const asociado = c.asociado
    ? '<ar:CbtesAsoc><ar:CbteAsoc>' +
      `<ar:Tipo>${Number(c.asociado.cbteTipo)}</ar:Tipo>` +
      `<ar:PtoVta>${Number(c.asociado.puntoVenta)}</ar:PtoVta>` +
      `<ar:Nro>${Number(c.asociado.numero)}</ar:Nro>` +
      `<ar:Cuit>${escapeXml(c.asociado.cuit)}</ar:Cuit>` +
      `<ar:CbteFch>${toArcaDate(c.asociado.fecha)}</ar:CbteFch>` +
      '</ar:CbteAsoc></ar:CbtesAsoc>'
    : '';

  const iva = conIva
    ? '<ar:Iva><ar:AlicIva>' +
      '<ar:Id>5</ar:Id>' + // 21 %
      `<ar:BaseImp>${money(c.importeNeto)}</ar:BaseImp>` +
      `<ar:Importe>${money(c.importeIva)}</ar:Importe>` +
      '</ar:AlicIva></ar:Iva>'
    : '';

  const detalle =
    '<ar:FECAEDetRequest>' +
    `<ar:Concepto>${CONCEPTO_SERVICIOS}</ar:Concepto>` +
    `<ar:DocTipo>${Number(c.docTipo)}</ar:DocTipo>` +
    `<ar:DocNro>${escapeXml(c.docNro || '0')}</ar:DocNro>` +
    `<ar:CbteDesde>${Number(c.numero)}</ar:CbteDesde>` +
    `<ar:CbteHasta>${Number(c.numero)}</ar:CbteHasta>` +
    `<ar:CbteFch>${cbteFch}</ar:CbteFch>` +
    `<ar:ImpTotal>${money(c.importeTotal)}</ar:ImpTotal>` +
    '<ar:ImpTotConc>0.00</ar:ImpTotConc>' +
    `<ar:ImpNeto>${money(conIva ? c.importeNeto : c.importeTotal)}</ar:ImpNeto>` +
    '<ar:ImpOpEx>0.00</ar:ImpOpEx>' +
    '<ar:ImpTrib>0.00</ar:ImpTrib>' +
    `<ar:ImpIVA>${money(conIva ? c.importeIva : 0)}</ar:ImpIVA>` +
    `<ar:FchServDesde>${servicio}</ar:FchServDesde>` +
    `<ar:FchServHasta>${servicio}</ar:FchServHasta>` +
    `<ar:FchVtoPago>${cbteFch}</ar:FchVtoPago>` +
    '<ar:MonId>PES</ar:MonId>' +
    '<ar:MonCotiz>1</ar:MonCotiz>' +
    `<ar:CondicionIVAReceptorId>${CONDICION_IVA_CONSUMIDOR_FINAL}</ar:CondicionIVAReceptorId>` +
    asociado +
    iva +
    '</ar:FECAEDetRequest>';

  const xml = await call(
    'FECAESolicitar',
    authXml(auth) +
      '<ar:FeCAEReq>' +
      '<ar:FeCabReq>' +
      '<ar:CantReg>1</ar:CantReg>' +
      `<ar:PtoVta>${Number(c.puntoVenta)}</ar:PtoVta>` +
      `<ar:CbteTipo>${Number(c.cbteTipo)}</ar:CbteTipo>` +
      '</ar:FeCabReq>' +
      `<ar:FeDetReq>${detalle}</ar:FeDetReq>` +
      '</ar:FeCAEReq>'
  );

  const det = getTag(xml, 'FECAEDetResponse') || '';
  return {
    resultado: getTag(det, 'Resultado') || getTag(xml, 'Resultado'),
    cae: getTag(det, 'CAE') || null,
    caeVto: fromArcaDate(getTag(det, 'CAEFchVto')),
    errors: parseErrors(xml),
    observaciones: parseObservaciones(det),
  };
};

/**
 * Consulta un comprobante ya emitido. Devuelve null si no existe.
 * Sirve para recuperar el CAE si la emisión se cortó a mitad de camino.
 */
export const consultarComprobante = async (auth, { cbteTipo, puntoVenta, numero }) => {
  const xml = await call(
    'FECompConsultar',
    authXml(auth) +
      '<ar:FeCompConsReq>' +
      `<ar:CbteTipo>${Number(cbteTipo)}</ar:CbteTipo>` +
      `<ar:CbteNro>${Number(numero)}</ar:CbteNro>` +
      `<ar:PtoVta>${Number(puntoVenta)}</ar:PtoVta>` +
      '</ar:FeCompConsReq>'
  );
  const result = getTag(xml, 'ResultGet');
  if (!result) return null;
  return {
    cae: getTag(result, 'CodAutorizacion'),
    caeVto: fromArcaDate(getTag(result, 'FchVto')),
    fecha: fromArcaDate(getTag(result, 'CbteFch')),
    importeTotal: Number(getTag(result, 'ImpTotal')),
    docNro: getTag(result, 'DocNro'),
    resultado: getTag(result, 'Resultado'),
  };
};