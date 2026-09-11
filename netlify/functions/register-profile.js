/**
 * POST /.netlify/functions/register-profile
 *
 * Crea el registro del profile del usuario en public.usuarios usando
 * la service_role key (bypassa RLS).
 *
 * Este endpoint se llama después de que el usuario se registró en
 * Supabase Auth (auth.users) pero antes de que confirme su email.
 * Sin sesión, el frontend no puede insertar en usuarios porque la
 * RLS policy usuarios_insert_own requiere auth.uid() = id.
 *
 * Body:
 *   { userId, email, nombre, apellido, documento_tipo,
 *     documento_numero, telefono?, provincia?, profesion? }
 *
 * Response:
 *   200 { ok: true }
 *   400 si faltan datos requeridos
 *   500 si Postgres falla (por ejemplo, unique constraint)
 */

import { ok, error, preflight } from './_lib/config.js';
import { supabaseAdmin } from './_lib/supabase.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const {
    userId,
    email,
    nombre,
    apellido,
    documento_tipo,
    documento_numero,
    telefono,
    provincia,
    profesion,
  } = payload;

  // Validaciones básicas
  if (!userId || !email || !nombre || !apellido || !documento_tipo || !documento_numero) {
    return error(400, 'Faltan datos obligatorios', {
      required: ['userId', 'email', 'nombre', 'apellido', 'documento_tipo', 'documento_numero'],
    });
  }

  if (!['CUIL', 'CUIT'].includes(documento_tipo)) {
    return error(400, 'documento_tipo debe ser CUIL o CUIT');
  }

  try {
    const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
      id: userId,
      email: email.trim().toLowerCase(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      documento_tipo,
      documento_numero: documento_numero.trim(),
      telefono: telefono?.trim() || null,
      provincia: provincia?.trim() || null,
      profesion: profesion?.trim() || null,
      role: 'user',
      active: true,
    });

    if (insertError) {
      console.error('[register-profile] error insertando:', insertError);
      // Si el usuario ya existe (unique constraint), es un caso especial
      if (insertError.code === '23505') {
        return error(409, 'Ya existe un usuario con ese email o documento', {
          details: insertError.details,
        });
      }
      return error(500, 'No se pudo guardar el profile', {
        details: insertError.message,
      });
    }

    return ok({ ok: true });
  } catch (err) {
    console.error('[register-profile] error:', err);
    return error(500, 'Error inesperado al crear el profile', {
      details: err.message,
    });
  }
};