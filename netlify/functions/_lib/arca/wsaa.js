/**
 * WSAA — autenticación con ARCA.
 *
 * Para usar cualquier web service de ARCA hay que presentar un "ticket de
 * acceso" (TA): un token + sign que el WSAA entrega a cambio de un pedido
 * firmado con el certificado del emisor. El TA dura 12 horas y ARCA NO
 * entrega uno nuevo mientras el anterior siga vigente, así que lo
 * guardamos (cifrado) en emisores.ta_enc y lo reusamos.
 *
 * El TA guardado se descarta si cambió el certificado o el ambiente.
 */

import forge from 'node-forge';
import {
  ARCA_ENV,
  certFingerprint,
  decryptSecret,
  encryptSecret,
  getSupabase,
} from '../fiscal.js';
import { getTag, soapRequest, unescapeXml } from './soap.js';

const WSAA_URLS = {
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  produccion: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

// Margen para no usar un TA que está por vencer.
const TA_SAFETY_MARGIN_MS = 10 * 60 * 1000;

// ARCA espera la hora con offset explícito. Usamos hora argentina (-03:00).
const toArcaDateTime = (date) => {
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
};

/** Pedido de ticket (TRA) para un servicio. */
export const buildTra = (service, now = new Date()) => {
  const from = new Date(now.getTime() - 10 * 60 * 1000);
  const to = new Date(now.getTime() + 10 * 60 * 1000);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<loginTicketRequest version="1.0">' +
    '<header>' +
    `<uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId>` +
    `<generationTime>${toArcaDateTime(from)}</generationTime>` +
    `<expirationTime>${toArcaDateTime(to)}</expirationTime>` +
    '</header>' +
    `<service>${service}</service>` +
    '</loginTicketRequest>'
  );
};

/** Firma el TRA como CMS (PKCS#7 SignedData con el contenido adjunto), en base64. */
export const signTra = (tra, { certPem, privateKeyPem }) => {
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(privateKeyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
};

const loginCms = async (cms) => {
  const envelope =
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">' +
    '<soapenv:Header/><soapenv:Body><wsaa:loginCms>' +
    `<wsaa:in0>${cms}</wsaa:in0>` +
    '</wsaa:loginCms></soapenv:Body></soapenv:Envelope>';

  let response;
  try {
    response = await soapRequest(WSAA_URLS[ARCA_ENV], { envelope });
  } catch (err) {
    throw translateWsaaError(err);
  }

  const ticketXml = unescapeXml(getTag(response, 'loginCmsReturn') || '');
  const token = getTag(ticketXml, 'token');
  const sign = getTag(ticketXml, 'sign');
  const expiresAt = getTag(ticketXml, 'expirationTime');
  if (!token || !sign) {
    throw new Error('ARCA no devolvió un ticket de acceso válido.');
  }
  return { token, sign, expiresAt: new Date(expiresAt).toISOString() };
};

// Mensajes de WSAA → explicación para el admin.
const translateWsaaError = (err) => {
  const fault = String(err.fault || err.message || '');
  let message = `ARCA rechazó la autenticación: ${fault}`;

  if (/alreadyAuthenticated|ya posee un TA valido/i.test(fault)) {
    message =
      'ARCA ya entregó un permiso de acceso para este certificado hace menos de 12 horas y no da otro hasta que venza. Probá de nuevo más tarde.';
  } else if (/cms\.cert\.untrusted|cms\.cert\.invalid|certificado.*no.*valido/i.test(fault)) {
    message =
      'ARCA no reconoce el certificado. Verificá que lo hayas creado en el ambiente correcto (prueba o producción) y que sea el último que subiste.';
  } else if (/coe\.notAuthorized|no autorizado|Computador no autorizado/i.test(fault)) {
    message =
      'El certificado no está autorizado para Facturación Electrónica. Falta asociarlo al servicio "wsfe" en ARCA.';
  } else if (/cms\.cert\.expired|expirado/i.test(fault)) {
    message = 'El certificado está vencido. Generá un pedido nuevo y subí el certificado nuevo.';
  } else if (/generationTime|expirationTime/i.test(fault)) {
    message = 'ARCA rechazó la hora del pedido. Probá de nuevo en unos minutos.';
  }

  const wrapped = new Error(message);
  wrapped.cause = err;
  wrapped.arcaFault = fault;
  return wrapped;
};

/**
 * Devuelve un ticket de acceso vigente para el emisor: el guardado si
 * sirve, o uno nuevo pedido a ARCA (y lo guarda).
 *
 * @param {object} emisor  Fila de `emisores` (con cert_pem, private_key_enc, ta_enc).
 * @param {string} service Servicio de ARCA. Default 'wsfe'.
 * @returns {Promise<{ token, sign, expiresAt, reused }>}
 */
export const getAccessTicket = async (emisor, service = 'wsfe') => {
  if (!emisor?.cert_pem || !emisor?.private_key_enc) {
    throw new Error('El emisor no tiene certificado cargado.');
  }

  const fp = certFingerprint(emisor.cert_pem);

  if (emisor.ta_enc) {
    try {
      const cached = JSON.parse(decryptSecret(emisor.ta_enc));
      const stillValid =
        cached.service === service &&
        cached.env === ARCA_ENV &&
        cached.certFp === fp &&
        new Date(cached.expiresAt).getTime() - Date.now() > TA_SAFETY_MARGIN_MS;
      if (stillValid) {
        return { token: cached.token, sign: cached.sign, expiresAt: cached.expiresAt, reused: true };
      }
    } catch (err) {
      console.warn('[wsaa] TA guardado ilegible, se pide uno nuevo:', err.message);
    }
  }

  const cms = signTra(buildTra(service), {
    certPem: emisor.cert_pem,
    privateKeyPem: decryptSecret(emisor.private_key_enc),
  });
  const ticket = await loginCms(cms);

  const { error } = await getSupabase()
    .from('emisores')
    .update({
      ta_enc: encryptSecret(
        JSON.stringify({ ...ticket, service, env: ARCA_ENV, certFp: fp })
      ),
    })
    .eq('id', emisor.id);
  if (error) {
    // No es fatal para esta operación, pero sin guardarlo ARCA no nos va a
    // dar otro por 12 horas: lo dejamos bien visible en los logs.
    console.error('[wsaa] No se pudo guardar el ticket de acceso:', error);
  }

  return { ...ticket, reused: false };
};