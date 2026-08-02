/**
 * Helpers de cookies para sesión de admin.
 *
 * La cookie de sesión se llama `admin_session`, contiene el JWT firmado,
 * y tiene estos flags:
 *   - HttpOnly:      no accesible desde JS del navegador (previene XSS).
 *   - Secure:        solo se manda por HTTPS.
 *   - SameSite=Lax:  se manda en navegaciones top-level pero no en cross-site
 *                    requests, previniendo CSRF básico.
 *   - Path=/:        disponible en todo el sitio.
 *   - Max-Age:       expiración en segundos.
 *
 * En desarrollo local (netlify dev), Secure se puede desactivar porque
 * localhost usa HTTP. Detectamos el entorno con IS_LOCAL_DEV.
 */

import { IS_LOCAL_DEV } from '../config.js';

const COOKIE_NAME = 'admin_session';

/**
 * Arma el header Set-Cookie para setear la cookie de sesión.
 *
 * @param {string} jwtToken - el JWT a guardar en la cookie.
 * @param {number} maxAgeSeconds - segundos hasta expiración.
 * @returns {string} el valor completo para el header Set-Cookie.
 */
export const buildSessionCookie = (jwtToken, maxAgeSeconds) => {
  const parts = [
    `${COOKIE_NAME}=${jwtToken}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];
  if (!IS_LOCAL_DEV) {
    parts.push('Secure');
  }
  return parts.join('; ');
};

/**
 * Arma el header Set-Cookie para BORRAR la cookie de sesión (logout).
 * Setea Max-Age=0 para que el browser la descarte inmediatamente.
 */
export const buildClearSessionCookie = () => {
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ];
  if (!IS_LOCAL_DEV) {
    parts.push('Secure');
  }
  return parts.join('; ');
};

/**
 * Extrae el JWT de sesión desde el header Cookie del request.
 * Devuelve null si no hay cookie o si el nombre no matchea.
 *
 * @param {Object} headers - event.headers de una Netlify Function.
 * @returns {string|null} el JWT o null.
 */
export const parseSessionCookie = (headers) => {
  const cookieHeader =
    headers?.cookie || headers?.Cookie || headers?.['Cookie'];
  if (!cookieHeader) return null;

  // Parseamos manualmente porque no queremos agregar otra dep.
  // Formato: "name1=value1; name2=value2; ..."
  const pairs = cookieHeader.split(';').map((p) => p.trim());
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const name = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    if (name === COOKIE_NAME) return value;
  }
  return null;
};