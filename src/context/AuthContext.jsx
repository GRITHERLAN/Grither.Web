/* ==========================================================================
   CONTEXTO DE AUTENTICACIÓN
   --------------------------------------------------------------------------
   Comparte con toda la app quién tiene la sesión iniciada y las funciones
   para entrar y salir. La lógica real vive en authService.

   Como la sesión se recupera de forma ASÍNCRONA (Supabase Auth), el
   contexto expone "loading": mientras es true todavía no sabemos si hay
   sesión, y las rutas protegidas esperan en vez de mandar al usuario a
   /ingresar.
   Además escucha a Supabase: si la sesión se cierra o vence (por ejemplo
   en otra pestaña), el usuario sale también aquí.
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCurrentUser,
  loginUser,
  logout as logoutService,
  ROLES,
} from '../services/authService.js';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la página recuperamos la sesión guardada (si existe)
  useEffect(() => {
    let isCurrent = true;
    getCurrentUser()
      .then((currentUser) => {
        if (isCurrent) setUser(currentUser);
      })
      .catch(() => {
        // Si no se pudo leer la sesión, se trata como "sin sesión"
        if (isCurrent) setUser(null);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  // Si Supabase avisa que la sesión terminó, quitamos al usuario.
  // (Dentro de este aviso no se llama a Supabase: solo se cambia el estado.)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /** Inicia sesión; si falla, el error sube al formulario que lo llamó */
  const login = useCallback(async (credentials) => {
    const loggedUser = await loginUser(credentials);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  /** Vuelve a leer el usuario guardado (ej. si el admin edita su propio perfil) */
  const refreshUser = useCallback(async () => {
    setUser(await getCurrentUser());
  }, []);

  /** Cierra la sesión */
  const logout = useCallback(async () => {
    setUser(null);
    await logoutService();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isLogged: Boolean(user),
      isAdmin: user?.role === ROLES.ADMIN,
      isClient: user?.role === ROLES.USER,
      login,
      logout,
      refreshUser,
    }),
    [user, loading, login, logout, refreshUser]
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
