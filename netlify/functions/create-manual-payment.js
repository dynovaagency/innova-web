/**
 * POST /.netlify/functions/create-manual-payment
 *
 * Crea un pago pendiente para métodos de pago manuales (transferencia
 * bancaria, Go Cuotas). A diferencia de create-preference, no habla con
 * ningún provider externo — solo persiste el pago con status='pending'
 * para que Innova lo confirme después vía admin-payment-mark-approved.
 *
 * Body:
 *   {
 *     cursoSlug: string,
 *     buyerEmail: string,
 *     paymentMethod: 'transferencia' | 'gocuotas'
 *   }
 *
 * Response:
 *   200 {
 *     externalReference: string,
 *     paymentMethod: string,
 *     message: string  // texto explicativo para mostrar al usuario
 *   }
 *
 * Flujo desde el usuario:
 *   1. Elige "Transferencia bancaria" o "Go Cuotas" en el PaymentModal.
 *   2. El frontend llama a este endpoint con el método elegido.
 *   3. El backend crea el pago pending y devuelve el externalReference.
 *   4. El frontend muestra los datos bancarios / link de Go Cuotas + un mensaje
 *      "cuando confirmemos el pago te enviamos el link por email".
 *   5. Innova ve el pago pendiente en el panel admin, verifica que el pago
 *      llegó a su cuenta (por home banking, o email de Go Cuotas), y marca
 *      como aprobado.
 *   6. Al marcar aprobado, se dispara el email de acceso al comprador.
 */

import { ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_METHODS = ['transferencia', 'gocuotas'];

const generateExternalReference = () => {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { cursoSlug, buyerEmail, paymentMethod } = payload;

  // Validaciones
  if (!cursoSlug) {
    return error(400, 'cursoSlug es requerido');
  }

  if (!buyerEmail || typeof buyerEmail !== 'string') {
    return error(400, 'buyerEmail es requerido para enviar el acceso al curso');
  }
  const normalizedEmail = buyerEmail.trim();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return error(400, 'buyerEmail no tiene un formato válido');
  }

  if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
    return error(400, `paymentMethod debe ser uno de: ${VALID_METHODS.join(', ')}`);
  }

  // Verificar que el producto exista y esté activo
  const product = await productsRepo.findBySlug(cursoSlug, { activeOnly: true });
  if (!product) {
    return error(404, 'Producto no encontrado o inactivo', { cursoSlug });
  }

  const externalReference = generateExternalReference();

  try {
    await paymentsRepo.insert({
      externalReference,
      status: 'pending',
      amount: product.price,
      currency: product.currency || 'ARS',
      buyerEmail: normalizedEmail,
      cursoSlug,
      productTitle: product.title,
      provider: paymentMethod, // 'transferencia' | 'gocuotas'
      providerReference: null,
      providerMetadata: {
        method: paymentMethod,
        awaitingManualApproval: true,
      },
      mpPreferenceId: null,
      mpPaymentId: null,
      createdAt: new Date().toISOString(),
    });

    console.log(
      `[create-manual-payment] pago pendiente creado: ${externalReference}`,
      { paymentMethod, cursoSlug, buyerEmail: normalizedEmail }
    );

    const messages = {
      transferencia: 'Cuando confirmemos la transferencia, te enviamos el link de acceso por email.',
      gocuotas: 'Cuando confirmemos el pago desde Go Cuotas, te enviamos el link de acceso por email.',
    };

    return ok({
      externalReference,
      paymentMethod,
      message: messages[paymentMethod],
    });
  } catch (err) {
    console.error('[create-manual-payment] error:', err);
    return error(500, 'No se pudo registrar el pago', {
      details: err.message,
    });
  }
};