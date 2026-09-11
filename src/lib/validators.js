/**
 * Utilidades de validación reutilizables.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Normaliza un CUIL/CUIT quitando guiones y espacios.
 * "20-12345678-3" → "20123456783"
 */
export const normalizeCuitCuil = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[\s-]/g, '');
};

/**
 * Valida un CUIL/CUIT con checksum matemático.
 *
 * Formato: 11 dígitos. Los primeros 2 identifican el tipo (20/23/24/27/30/33/34).
 * El último dígito es un check calculado con multiplicadores fijos.
 *
 * Referencia: algoritmo estándar de AFIP.
 * https://www.afip.gob.ar/genericos/cInscripcion/documentos/InstructivoCUITCUIL.pdf
 */
export const isValidCuitCuil = (value) => {
  const normalized = normalizeCuitCuil(value);
  if (!/^\d{11}$/.test(normalized)) return false;

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = normalized.split('').map(Number);
  const expectedCheck = digits[10];

  const sum = multipliers.reduce((acc, mult, i) => acc + mult * digits[i], 0);
  const mod = sum % 11;
  let calculatedCheck;

  if (mod === 0) calculatedCheck = 0;
  else if (mod === 1) calculatedCheck = 9;
  else calculatedCheck = 11 - mod;

  return calculatedCheck === expectedCheck;
};

/**
 * Devuelve un score 0-4 según la fuerza del password.
 *   0: vacío
 *   1: débil
 *   2: media
 *   3: buena
 *   4: fuerte
 *
 * Criterios:
 *   - +1: longitud >= 8
 *   - +1: tiene mayúscula y minúscula
 *   - +1: tiene número
 *   - +1: tiene símbolo o longitud >= 12
 */
export const getPasswordStrength = (password) => {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score++;

  return score;
};

export const getPasswordStrengthLabel = (score) => {
  const labels = ['', 'Débil', 'Media', 'Buena', 'Fuerte'];
  return labels[score] || '';
};