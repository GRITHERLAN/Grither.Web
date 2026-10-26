// Configuración de Vite: solo activamos el plugin oficial de React
// para poder escribir JSX y tener recarga rápida en desarrollo.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
