import { createContext, useContext } from 'react';
import useAuth from '../hooks/useAuth.js';

/**
 * Context de autenticación de alumnos.
 *
 * Envuelve el árbol de componentes en <AuthProvider> para que
 * cualquier hijo pueda usar useAuthContext() y obtener el estado
 * de auth actual sin crear subscriptions duplicadas.
 *
 * Uso:
 *   // En App.jsx (o en el punto más alto)
 *   <AuthProvider>
 *     <MiApp />
 *   </AuthProvider>
 *
 *   // En cualquier componente hijo
 *   const { user, profile, signIn, signOut } = useAuthContext();
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuthContext debe usarse dentro de <AuthProvider>');
  }
  return context;
}