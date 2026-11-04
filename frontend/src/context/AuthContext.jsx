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

import { createContext, useContext, useEffect, useState } from 'react';
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

    // useEffect no puede ser async: se crea una función async adentro y se llama
    async function loadSession() {
      try {
        const currentUser = await getCurrentUser();
        if (isCurrent) setUser(currentUser);
      } catch {
        // Si no se pudo leer la sesión, se trata como "sin sesión"
        if (isCurrent) setUser(null);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }
    loadSession();

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
  async function login(credentials) {
    const loggedUser = await loginUser(credentials);
    setUser(loggedUser);
    return loggedUser;
  }

  /** Vuelve a leer el usuario guardado (ej. si el admin edita su propio perfil) */
  async function refreshUser() {
    setUser(await getCurrentUser());
  }

  /** Cierra la sesión */
  async function logout() {
    setUser(null);
    await logoutService();
  }

  const value = {
    user,
    loading,
    isLogged: Boolean(user),
    isAdmin: user?.role === ROLES.ADMIN,
    isClient: user?.role === ROLES.USER,
    login,
    logout,
    refreshUser,
  };

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
