/* ==========================================================================
   CONTEXTO DEL TEMA (Modo Oscuro / Modo Claro)
   --------------------------------------------------------------------------
   - Guarda el tema elegido en LocalStorage.
   - Si el usuario nunca eligió, usa la preferencia de su sistema operativo.
   - Pone el atributo data-theme en <html>, que es lo que activa la paleta
     correcta en variables.css.
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readTheme, saveTheme } from '../utils/themeStorage.js';

/* Valores posibles del tema */
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

const ThemeContext = createContext(null);

/** Decide el tema inicial: el guardado o el del sistema */
function getInitialTheme() {
  const savedTheme = readTheme();
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
    const root = document.documentElement;
    // Cambio instantáneo: se apagan las transiciones (base.css), se fuerza al
    // navegador a calcular los colores nuevos y se vuelven a encender
    root.dataset.themeSwitching = '';
    root.dataset.theme = theme;
    window.getComputedStyle(document.body).color;
    delete root.dataset.themeSwitching;

    // Color de la barra del navegador en el celular, igual al fondo del tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === THEMES.DARK ? '#030a04' : '#ffffff');
    saveTheme(theme);
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
