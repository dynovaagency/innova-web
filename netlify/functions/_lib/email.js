/**
 * Helper de envío de emails transaccionales vía Resend.
 *
 * Config esperada (env vars):
 *   RESEND_API_KEY   → API key de Resend (re_...). Si falta, sendAccessEmail
 *                       loguea un warning y devuelve { sent: false } sin
 *                       romper. El pago igual queda aprobado en el store.
 *
 * Convenciones:
 *   - Enviamos desde no-reply@send.innovatrabajosocial.com.ar
 *   - El from-name humano es "Innova Trabajo Social"
 *   - El template incluye versión HTML y texto plano (para clients que no
 *     renderizan HTML: mejor deliverability y accesibilidad).
 */

import { Resend } from 'resend';
import { SITE_URL } from './config.js';

const FROM_ADDRESS = 'Innova Trabajo Social <no-reply@send.innovatrabajosocial.com.ar>';
const REPLY_TO = 'innovatrabajosocial@trabajosocial.ar';

/**
 * Devuelve el cliente de Resend si hay API key configurada.
 * Si no, devuelve null (modo "no-op" — no rompe el webhook).
 */
function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY no configurada. Emails deshabilitados.');
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Envía el mail de acceso al curso al comprador.
 *
 * @param {object} args
 * @param {string} args.to              Email del comprador
 * @param {string} args.cursoTitle      Título del curso (para asunto y cuerpo)
 * @param {string} args.cursoSlug       Slug del curso (para armar el link)
 * @param {string} args.externalReference   Token único del pago (para el link)
 * @returns {Promise<{sent: boolean, id?: string, error?: string}>}
 */
export async function sendAccessEmail({ to, cursoTitle, cursoSlug, externalReference }) {
  const client = getClient();
  if (!client) return { sent: false, error: 'no_api_key' };

  if (!to || !cursoSlug || !externalReference) {
    console.warn('[email] Datos incompletos para enviar mail:', {
      to: !!to,
      cursoSlug: !!cursoSlug,
      externalReference: !!externalReference,
    });
    return { sent: false, error: 'missing_data' };
  }

  const accessUrl = `${SITE_URL}/curso/${cursoSlug}?ref=${externalReference}`;
  const recoveryUrl = `${SITE_URL}/recuperar-acceso`;
  const subject = `Tu acceso a la cápsula: ${cursoTitle}`;

  const html = buildHtml({ cursoTitle, accessUrl, recoveryUrl });
  const text = buildText({ cursoTitle, accessUrl, recoveryUrl });

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { sent: false, error: error.message || 'resend_error' };
    }

    console.log('[email] Enviado OK:', { to, id: data?.id });
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[email] Excepción al enviar:', err);
    return { sent: false, error: err.message };
  }
}

// --- Templates -------------------------------------------------------

function buildHtml({ cursoTitle, accessUrl, recoveryUrl }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu acceso a la cápsula</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#153F71;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="padding: 32px 40px; background-color:#153F71; color:#ffffff;">
              <h1 style="margin:0; font-size:22px; font-weight:700; letter-spacing:0.02em;">Innova Trabajo Social</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin:0 0 16px; font-size:20px; color:#153F71;">¡Gracias por tu compra!</h2>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#333333;">
                Confirmamos tu pago para la cápsula:
              </p>
              <p style="margin:0 0 24px; font-size:16px; font-weight:600; color:#153F71;">
                ${escapeHtml(cursoTitle)}
              </p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#333333;">
                Podés acceder al contenido desde el siguiente botón:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td style="border-radius:24px; background-color:#153F71;">
                    <a href="${accessUrl}" style="display:inline-block; padding: 14px 28px; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px;">
                      Ir a la cápsula
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:13px; line-height:1.6; color:#666666;">
                Guardá este email para volver a acceder cuando quieras. Si preferís, podés copiar y pegar el link directamente en tu navegador:
              </p>
              <p style="margin:0 0 24px; font-size:12px; line-height:1.5; color:#0f2f56; word-break:break-all;">
                <a href="${accessUrl}" style="color:#0f2f56;">${accessUrl}</a>
              </p>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin: 24px 0;" />
              <p style="margin:0 0 8px; font-size:13px; line-height:1.6; color:#666666;">
                <strong>¿Perdiste este mail?</strong> Podés recuperar el link ingresando el mismo email con el que compraste en:
              </p>
              <p style="margin:0 0 16px; font-size:13px;">
                <a href="${recoveryUrl}" style="color:#153F71;">${recoveryUrl}</a>
              </p>
              <p style="margin:0; font-size:13px; line-height:1.6; color:#666666;">
                Ante cualquier consulta, respondé este mail o escribinos a
                <a href="mailto:${REPLY_TO}" style="color:#153F71;">${REPLY_TO}</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color:#f5f7fa; text-align:center; font-size:12px; color:#999999;">
              Innova Trabajo Social &middot; Este es un mail automático, no respondas a esta casilla.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText({ cursoTitle, accessUrl, recoveryUrl }) {
  return `¡Gracias por tu compra!

Confirmamos tu pago para la cápsula:
${cursoTitle}

Accedé al contenido desde este link:
${accessUrl}

Guardá este email para volver a acceder cuando quieras.

¿Perdiste este mail? Podés recuperar el link ingresando el mismo email con el que compraste en:
${recoveryUrl}

Ante cualquier consulta, escribinos a ${REPLY_TO}.

--
Innova Trabajo Social
Este es un mail automático, no respondas a esta casilla.
`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
