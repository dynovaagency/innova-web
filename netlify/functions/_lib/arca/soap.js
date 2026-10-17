/**
 * Cliente SOAP mínimo para los web services de ARCA (ex AFIP).
 *
 * Por qué no usamos fetch:
 *   Los servidores de ARCA negocian TLS con parámetros que OpenSSL 3
 *   (Node 18+) rechaza por defecto ("dh key too small"). Con node:https
 *   podemos bajar el nivel de seguridad SOLO para estas conexiones.
 */

import https from 'node:https';

const TIMEOUT_MS = 20000;

const arcaAgent = new https.Agent({
  keepAlive: false,
  ciphers: 'DEFAULT@SECLEVEL=0',
});

/**
 * POST de un sobre SOAP 1.1.
 * Devuelve el body de la respuesta como string (también en errores HTTP:
 * ARCA responde los SOAP Fault con status 500 y el detalle en el body).
 */
export const soapRequest = (url, { envelope, soapAction = '' }) =>
  new Promise((resolve, reject) => {
    const body = Buffer.from(envelope, 'utf8');
    const req = https.request(
      url,
      {
        method: 'POST',
        agent: arcaAgent,
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': body.length,
          SOAPAction: `"${soapAction}"`,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(text);
          const fault = getTag(text, 'faultstring');
          const err = new Error(fault || `ARCA respondió HTTP ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.fault = fault;
          err.body = text;
          reject(err);
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('ARCA no respondió a tiempo. Puede estar caído; probá de nuevo en unos minutos.'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

// ---------------------------------------------------------------------
// Helpers de XML (las respuestas de ARCA son chicas y de estructura fija)
// ---------------------------------------------------------------------

export const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const unescapeXml = (value) =>
  String(value ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const tagRegex = (name, flags = '') =>
  new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`, flags);

/** Contenido del primer <name> (ignora el prefijo de namespace). */
export const getTag = (xml, name) => {
  const m = tagRegex(name).exec(xml || '');
  return m ? m[1].trim() : null;
};

/** Contenido de todos los <name>. */
export const getAllTags = (xml, name) => {
  const out = [];
  const re = tagRegex(name, 'g');
  let m;
  while ((m = re.exec(xml || '')) !== null) out.push(m[1].trim());
  return out;
};