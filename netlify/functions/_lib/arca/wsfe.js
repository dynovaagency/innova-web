/**
 * WSFEv1 — Factura electrónica de ARCA (comprobantes sin detalle de ítems).
 *
 * Este módulo expone las consultas que necesitamos para verificar la
 * conexión y para numerar comprobantes. La emisión (FECAESolicitar) se
 * suma en el paso siguiente.
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