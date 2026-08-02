/**
 * Firma y verificación de JWT para sesiones de admin.
 *
 * Usamos la librería `jose` porque es la standard moderna para JWT en JS,
 * funciona en Node y en Netlify Edge, y es más chica que jsonwebtoken.
 *
 * El JWT contiene el mínimo indispensable para identificar la sesión:
 *   - sub: el email del admin (identificador principal)
 *   - sid: el token de la sesión guardada en sessionsRepo (para revocar)
 *   - iat, exp: emitido y expiración (manejo automático por jose)
 *
 * El secret HMAC vive en process.env.AUTH_JWT_SECRET. Nunca hardcodearlo.
 */

import { SignJWT, jwtVerify } from 'jose';

const ALGORITHM = 'HS256';
const ISSUER = 'innova-trabajosocial';

/**
 * Devuelve el secret como Uint8Array (formato que espera jose).
 * Lazy: se crea solo cuando se necesita.
 */
let _secretKey = null;
const getSecretKey = () => {
  if (_secretKey) return _secretKey;
  const raw = process.env.AUTH_JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'AUTH_JWT_SECRET no configurado o demasiado corto (mínimo 32 caracteres)'
    );
  }
  _secretKey = new TextEncoder().encode(raw);
  return _secretKey;
};

/**
 * Firma un JWT para la sesión indicada.
 *
 * @param {Object} params
 * @param {string} params.email - identificador del admin (subject).
 * @param {string} params.sessionToken - token de la sesión en el store.
 * @param {number} params.expiresAtMs - timestamp en ms de expiración.
 * @returns {Promise<string>} el JWT como string.
 */
export const signSessionJwt = async ({ email, sessionToken, expiresAtMs }) => {
  const key = getSecretKey();
  const expSeconds = Math.floor(expiresAtMs / 1000);
  return await new SignJWT({ sid: sessionToken })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(email)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(key);
};

/**
 * Verifica un JWT y devuelve su payload.
 * Tira error si el token es inválido, expirado, o firmado con otro secret.
 *
 * @param {string} token - el JWT a verificar.
 * @returns {Promise<{ email: string, sessionToken: string, exp: number }>}
 */
export const verifySessionJwt = async (token) => {
  const key = getSecretKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    algorithms: [ALGORITHM],
  });
  return {
    email: payload.sub,
    sessionToken: payload.sid,
    exp: payload.exp,
  };
};