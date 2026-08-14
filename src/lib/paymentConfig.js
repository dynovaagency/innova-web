/**
 * Configuración de métodos de pago manuales (transferencia, Go Cuotas).
 *
 * Los datos bancarios están hardcodeados por decisión de Etapa 2. En Fase 3
 * se moverán a la sección Configuración del panel admin para que Innova
 * pueda editarlos sin necesitar deploy.
 *
 * El link de Go Cuotas es un placeholder al home del servicio hasta que
 * Innova genere el link específico de comercio. Cuando lo tengan:
 *   1. Reemplazar GOCUOTAS_URL con el link real.
 *   2. Push a develop, verificar, mergear a prod.
 *
 * Ningún dato acá es sensible en sí mismo — los datos bancarios son
 * los mismos que Innova pone en flyers públicos y en whatsapp para
 * recibir transferencias. Igual, mantenerlos centralizados ayuda a
 * cuidar consistencia visual y a rotar valores rápido si hace falta.
 */

export const BANK_DETAILS = {
  titular: 'Paola Andrea Quiroga',
  sucursal: '4033',
  cuenta: '538948-8',
  tipoCuenta: 'Caja de ahorros en pesos',
  cbu: '0140147503403353894886',
  alias: 'innova.ts.2026',
};

/**
 * Link de Go Cuotas. Por ahora placeholder al home del servicio hasta
 * que Innova genere el link específico de comercio.
 */
export const GOCUOTAS_URL = 'https://www.gocuotas.com/';

/**
 * Métodos de pago disponibles en el checkout.
 *
 * - id: identificador interno, matchea el valor de paymentMethod en
 *   create-manual-payment.js (o 'mercadopago' para el flujo automático).
 * - label: nombre mostrado al usuario.
 * - description: subtítulo corto explicativo.
 * - handler: 'automatic' (MP) | 'transferencia' | 'gocuotas'.
 */
export const PAYMENT_METHODS = [
  {
    id: 'mercadopago',
    label: 'Mercado Pago',
    description: 'Tarjetas, transferencia o efectivo',
    handler: 'automatic',
  },
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    description: 'Directo a la cuenta de Innova',
    handler: 'transferencia',
  },
  {
    id: 'gocuotas',
    label: 'Go Cuotas',
    description: 'Financiación en cuotas sin tarjeta',
    handler: 'gocuotas',
  },
];