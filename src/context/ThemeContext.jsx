/* ==========================================================================
   CONTEXTO DEL TEMA (Modo Oscuro / Modo Claro)
   --------------------------------------------------------------------------
   - Guarda el tema elegido en LocalStorage.
   - Si el usuario nunca eligió, usa la preferencia de su sistema operativo.
   - Pone el atributo data-theme en <html>, que es lo que activa la paleta
     correcta en variables.css.
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readStorage, writeStorage, STORAGE_KEYS } from '../services/storage.js';

/* Valores posibles del tema */
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

const ThemeContext = createContext(null);

/** Decide el tema inicial: el guardado o el del sistema */
function getInitialTheme() {
  const savedTheme = readStorage(STORAGE_KEYS.THEME);
  if (savedTheme === THEMES.DARK || savedTheme === THEMES.LIGHT) {
    return savedTheme;
  }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? THEMES.LIGHT : THEMES.DARK;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Cada vez que cambia el tema lo aplicamos al <html> y lo guardamos
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      writeStorage(STORAGE_KEYS.THEME, theme);
    } catch {
      // Si no se puede guardar, el tema igual funciona durante esta visita
    }
  }, [theme]);

  // Alterna entre oscuro y claro
  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === THEMES.DARK, toggleTheme }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook para usar el tema en cualquier componente */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>.');
  }
  return context;
}
