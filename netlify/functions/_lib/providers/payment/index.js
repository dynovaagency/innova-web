/**
 * Registry de payment providers.
 *
 * Uso:
 *   import { getProvider } from './_lib/providers/payment/index.js';
 *   const mp = getProvider('mercadopago');
 *   const { checkoutUrl } = await mp.createCheckout({ ... });
 *
 * Cuando en Etapa 3 sumemos PayPal, Payway o GoCuotas, este archivo se
 * vuelve el único lugar donde hay que registrarlos.
 */

import mercadopago from './mercadopago.js';
// Futuros:
// import paypal from './paypal.js';
// import payway from './payway.js';
// import gocuotas from './gocuotas.js';

const providers = {
  mercadopago,
  // paypal,
  // payway,
  // gocuotas,
};

/**
 * Devuelve el provider por nombre.
 * Tira error si el nombre no está registrado (fail loud).
 */
export const getProvider = (name) => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `Payment provider desconocido: ${name}. Disponibles: ${Object.keys(providers).join(', ')}`
    );
  }
  return provider;
};

/**
 * Lista los nombres de providers registrados.
 * Útil para el panel admin (dropdown de "método de pago" al crear un producto).
 */
export const getAvailableProviders = () => Object.keys(providers);