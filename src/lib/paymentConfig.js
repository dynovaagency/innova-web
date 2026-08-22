/**
 * Configuración de métodos de pago manuales (transferencia, Go Cuotas, Payway).
 *
 * Los datos bancarios están hardcodeados por decisión de Etapa 2. En Fase 3
 * se moverán a la sección Configuración del panel admin para que Innova
 * pueda editarlos sin necesitar deploy.
 *
 * El link de Go Cuotas y la imagen de Payway son placeholders/estáticos.
 * Cuando cambien, requieren editar este archivo o el asset y push.
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
 * Link de Go Cuotas. Por ahora placeholder al home del servicio si el
 * producto no tiene su gocuotasUrl configurado (raro, dado que en la
 * práctica todos los cursos tienen link específico).
 */
export const GOCUOTAS_URL = 'https://www.gocuotas.com/';

/**
 * QR de Payway. Imagen estática hosteada en el mismo dominio.
 * Si el QR cambia (los QR de Payway pueden vencer), reemplazar el archivo
 * en public/imagenes/payway-qr.jpeg y hacer push.
 */
export const PAYWAY_QR_URL = '/imagenes/payway-qr.jpeg';

/**
 * Métodos de pago disponibles en el checkout.
 *
 * - id: identificador interno, matchea el valor de paymentMethod en
 *   create-manual-payment.js (o 'mercadopago' para el flujo automático).
 * - label: nombre mostrado al usuario.
 * - description: subtítulo corto explicativo.
 * - handler: 'automatic' (MP) | 'transferencia' | 'gocuotas' | 'payway'.
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
  {
    id: 'payway',
    label: 'Payway (QR)',
    description: 'Escaneá con Modo, Mercado Pago, Cuenta DNI o NaranjaX',
    handler: 'payway',
  },
];