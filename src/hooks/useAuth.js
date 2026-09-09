import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Hook central de autenticación de alumnos.
 *
 * Estados:
 *   - user: objeto del usuario logueado, o null si no hay sesión.
 *   - profile: datos extendidos del usuario (tabla `usuarios`) — nombre,
 *     apellido, role, etc. Se carga después del login.
 *   - loading: true mientras se verifica la sesión inicial.
 *
 * Métodos:
 *   - signIn(email, password): loguea un usuario existente.
 *   - signUp(email, password, profileData): registra un usuario nuevo.
 *   - signOut(): cierra sesión.
 *   - resetPassword(email): manda mail de recuperación.
 *
 * Uso:
 *   const { user, profile, loading, signIn, signOut } = useAuth();
 *
 * Nota: este hook es para USUARIOS (alumnos), no para admins. Los admins
 * siguen usando useAdminSession con el sistema propio de Blobs. En una
 * fase futura los unificamos.
 */
function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión inicial + suscribirse a cambios de auth
  useEffect(() => {
    let mounted = true;

    // Chequear si hay sesión activa al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de auth (login, logout, refresh de token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Carga el profile del usuario desde la tabla `usuarios`
  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('[useAuth] error cargando profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Login con email + password
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  /**
   * Registro con email + password + datos del perfil.
   *
   * profileData debe tener:
   *   nombre, apellido, documento_tipo ('CUIL' | 'CUIT'), documento_numero.
   * Opcional: telefono, provincia, profesion.
   *
   * El flow es:
   *   1. Crear usuario en Supabase Auth (email + password).
   *   2. Insertar registro en tabla `usuarios` con el mismo id.
   *
   * Si el paso 2 falla, el usuario queda "huérfano" en auth pero sin
   * profile. Es un edge case raro pero hay que manejarlo (retry manual
   * o limpieza posterior).
   */
  const signUp = useCallback(async (email, password, profileData) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Paso 1: crear en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });
    if (authError) throw authError;

    const newUserId = authData.user?.id;
    if (!newUserId) {
      throw new Error('No se pudo crear el usuario en Auth');
    }

    // Paso 2: insertar en tabla usuarios
    const { error: profileError } = await supabase.from('usuarios').insert({
      id: newUserId,
      email: normalizedEmail,
      nombre: profileData.nombre.trim(),
      apellido: profileData.apellido.trim(),
      documento_tipo: profileData.documento_tipo,
      documento_numero: profileData.documento_numero.trim(),
      telefono: profileData.telefono?.trim() || null,
      provincia: profileData.provincia?.trim() || null,
      profesion: profileData.profesion?.trim() || null,
      role: 'user',
      active: true,
    });

    if (profileError) {
      console.error('[useAuth] error insertando profile:', profileError);
      // No hacemos throw — el usuario ya está creado en auth, la sesión
      // queda activa. El error se loggea para diagnóstico.
      throw new Error(
        'Cuenta creada pero no pudimos guardar tus datos. Contactanos para completar tu perfil.'
      );
    }

    return authData;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/resetear-contrasena`,
    });
    if (error) throw error;
  }, []);

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}

export default useAuth;