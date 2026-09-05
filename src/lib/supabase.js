/**
 * Cliente de Supabase para uso en el frontend.
 *
 * Usa la publishable key (pública por diseño). La RLS de Postgres se
 * encarga de la seguridad — cada request del cliente lleva el JWT del
 * usuario logueado y las policies filtran por auth.uid().
 *
 * Cada ambiente (develop/producción) apunta a su propio proyecto Supabase
 * a través de las variables de entorno correspondientes.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Variables de entorno faltantes: VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});