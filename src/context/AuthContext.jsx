/* ==========================================================================
   CONTEXTO DE AUTENTICACIÓN
   --------------------------------------------------------------------------
   Comparte con toda la app quién tiene la sesión iniciada y las funciones
   para entrar y salir. La lógica real vive en authService.
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  getCurrentUser,
  loginUser,
  logout as logoutService,
  ROLES,
} from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Al cargar la página recuperamos la sesión guardada (si existe)
  const [user, setUser] = useState(getCurrentUser);

  /** Inicia sesión; si falla, el error sube al formulario que lo llamó */
  const login = useCallback(async (credentials) => {
    const loggedUser = await loginUser(credentials);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  /** Vuelve a leer el usuario guardado (ej. si el admin edita su propio perfil) */
  const refreshUser = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  /** Cierra la sesión */
  const logout = useCallback(() => {
    logoutService();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLogged: Boolean(user),
      isAdmin: user?.role === ROLES.ADMIN,
      isClient: user?.role === ROLES.USER,
      login,
      logout,
      refreshUser,
    }),
    [user, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para leer la sesión desde cualquier componente */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}
