/**
 * Cliente de Supabase para uso en Netlify Functions (backend).
 *
 * Usa la secret key. IMPORTANTE: esta key bypassa RLS. Solo usar en
 * funciones que ya hayan verificado permisos por otro medio (por
 * ejemplo, requireAdmin del middleware).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '[supabase] Variables de entorno faltantes: SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});