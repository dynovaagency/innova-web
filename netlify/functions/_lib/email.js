/**
 * Helper de envío de emails transaccionales vía Resend.
 *
 * Config esperada (env vars):
 *   RESEND_API_KEY   → API key de Resend (re_...). Si falta, las funciones de
 *                       envío loguean un warning y devuelven { sent: false }
 *                       sin romper.
 *
 * Convenciones:
 *   - Enviamos desde no-reply@send.innovatrabajosocial.com.ar
 *   - El from-name humano es "Innova Trabajo Social"
 *   - Los templates incluyen versión HTML y texto plano (para clients que no
 *     renderizan HTML: mejor deliverability y accesibilidad).
 *
 * Emails que expone este módulo:
 *   - sendAccessEmail: post-pago, con link a la cápsula comprada.
 *   - sendMagicLink:   pre-login de admin, con link para autenticarse.
 */

import { Resend } from 'resend';
import { SITE_URL } from './config.js';

const FROM_ADDRESS = 'Innova Trabajo Social <no-reply@send.innovatrabajosocial.com.ar>';
const REPLY_TO = 'innovatrabajosocial@trabajosocial.ar';

/**
 * Devuelve el cliente de Resend si hay API key configurada.
 * Si no, devuelve null (modo "no-op" — no rompe el flujo).
 */
function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY no configurada. Emails deshabilitados.');
    return null;
  }
  return new Resend(apiKey);
}

// --- Email de acceso post-pago ---------------------------------------

/**
 * Envía el mail de acceso al curso al comprador.
 */
export async function sendAccessEmail({ to, cursoTitle, cursoSlug, externalReference }) {
  const client = getClient();
  if (!client) return { sent: false, error: 'no_api_key' };

  if (!to || !cursoSlug || !externalReference) {
    console.warn('[email] Datos incompletos para enviar mail de acceso:', {
      to: !!to,
      cursoSlug: !!cursoSlug,
      externalReference: !!externalReference,
    });
    return { sent: false, error: 'missing_data' };
  }

  const accessUrl = `${SITE_URL}/curso/${cursoSlug}?ref=${externalReference}`;
  const recoveryUrl = `${SITE_URL}/recuperar-acceso`;
  const subject = `Tu acceso a la cápsula: ${cursoTitle}`;

  const html = buildAccessHtml({ cursoTitle, accessUrl, recoveryUrl });
  const text = buildAccessText({ cursoTitle, accessUrl, recoveryUrl });

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
      console.error('[email] Resend error (access):', error);
      return { sent: false, error: error.message || 'resend_error' };
    }

    console.log('[email] Acceso enviado OK:', { to, id: data?.id });
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[email] Excepción al enviar acceso:', err);
    return { sent: false, error: err.message };
  }
}

// --- Email de magic link para login de admin -------------------------

/**
 * Envía el magic link de autenticación al admin.
 *
 * @param {object} args
 * @param {string} args.to           Email del admin (debe estar en la whitelist).
 * @param {string} args.magicUrl     URL completa del link (con token).
 * @param {Date}   args.expiresAt    Fecha de expiración del link (para mostrar en el cuerpo).
 * @param {string} [args.name]       Nombre del admin (para saludo personalizado).
 * @returns {Promise<{sent: boolean, id?: string, error?: string}>}
 */
export async function sendMagicLink({ to, magicUrl, expiresAt, name }) {
  const client = getClient();
  if (!client) return { sent: false, error: 'no_api_key' };

  if (!to || !magicUrl || !expiresAt) {
    console.warn('[email] Datos incompletos para enviar magic link:', {
      to: !!to,
      magicUrl: !!magicUrl,
      expiresAt: !!expiresAt,
    });
    return { sent: false, error: 'missing_data' };
  }

  const subject = 'Tu acceso al panel de Innova';
  const expiresText = formatExpiryMinutes(expiresAt);

  const html = buildMagicLinkHtml({ magicUrl, expiresText, name });
  const text = buildMagicLinkText({ magicUrl, expiresText, name });

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
      console.error('[email] Resend error (magic link):', error);
      return { sent: false, error: error.message || 'resend_error' };
    }

    console.log('[email] Magic link enviado OK:', { to, id: data?.id });
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[email] Excepción al enviar magic link:', err);
    return { sent: false, error: err.message };
  }
}

// --- Templates: acceso -----------------------------------------------

function buildAccessHtml({ cursoTitle, accessUrl, recoveryUrl }) {
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

function buildAccessText({ cursoTitle, accessUrl, recoveryUrl }) {
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

// --- Templates: magic link -------------------------------------------

function buildMagicLinkHtml({ magicUrl, expiresText, name }) {
  const greeting = name ? `Hola ${escapeHtml(name)},` : 'Hola,';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu acceso al panel</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#153F71;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="padding: 32px 40px; background-color:#153F71; color:#ffffff;">
              <h1 style="margin:0; font-size:22px; font-weight:700; letter-spacing:0.02em;">Innova Trabajo Social</h1>
              <p style="margin:8px 0 0; font-size:13px; opacity:0.85; letter-spacing:0.05em;">PANEL DE ADMINISTRACIÓN</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin:0 0 16px; font-size:20px; color:#153F71;">${greeting}</h2>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#333333;">
                Recibiste este mail porque solicitaste acceso al panel de administración de Innova Trabajo Social. Hacé clic en el botón para ingresar:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td style="border-radius:24px; background-color:#153F71;">
                    <a href="${magicUrl}" style="display:inline-block; padding: 14px 28px; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px;">
                      Entrar al panel
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:13px; line-height:1.6; color:#666666;">
                Este link expira en <strong>${expiresText}</strong> y solo puede usarse una vez.
              </p>
              <p style="margin:0 0 16px; font-size:13px; line-height:1.6; color:#666666;">
                Si el botón no funciona, copiá y pegá esta URL en tu navegador:
              </p>
              <p style="margin:0 0 24px; font-size:12px; line-height:1.5; color:#0f2f56; word-break:break-all;">
                <a href="${magicUrl}" style="color:#0f2f56;">${magicUrl}</a>
              </p>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin: 24px 0;" />
              <p style="margin:0; font-size:13px; line-height:1.6; color:#666666;">
                Si vos no solicitaste este acceso, podés ignorar este mail — no se activó ninguna sesión. Ante cualquier duda, escribinos a
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

function buildMagicLinkText({ magicUrl, expiresText, name }) {
  const greeting = name ? `Hola ${name},` : 'Hola,';
  return `${greeting}

Recibiste este mail porque solicitaste acceso al panel de administración de Innova Trabajo Social.

Entrá al panel desde este link:
${magicUrl}

Este link expira en ${expiresText} y solo puede usarse una vez.

Si vos no solicitaste este acceso, podés ignorar este mail — no se activó ninguna sesión.

Ante cualquier duda, escribinos a ${REPLY_TO}.

--
Innova Trabajo Social
Este es un mail automático, no respondas a esta casilla.
`;
}

// --- Utilidades ------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formatea una fecha de expiración como texto legible en español.
 * Ejemplos: "15 minutos", "1 minuto".
 */
function formatExpiryMinutes(expiresAt) {
  const nowMs = Date.now();
  const expMs = new Date(expiresAt).getTime();
  const diffMinutes = Math.max(1, Math.round((expMs - nowMs) / 60000));
  return diffMinutes === 1 ? '1 minuto' : `${diffMinutes} minutos`;
}