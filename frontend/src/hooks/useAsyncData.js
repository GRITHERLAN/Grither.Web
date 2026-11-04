/* ==========================================================================
   HOOK: useAsyncData
   --------------------------------------------------------------------------
   Los servicios ahora son ASÍNCRONOS (los datos vienen de Supabase por
   internet), así que una página ya no puede leerlos directamente durante el
   render. Este hook se encarga de:
     1. Llamar a la función que carga los datos cuando el componente aparece.
     2. Guardar el resultado en "data".
     3. Avisar si está cargando ("loading") o si hubo un error ("error").
     4. Permitir volver a cargar con "reload()" (por ejemplo después de guardar).

   Uso:
     const { data, loading, error, reload } = useAsyncData(() => getProjects(), []);
   ========================================================================== */

import { useEffect, useState } from 'react';

/**
 * @param {function} loader - Función async que devuelve los datos.
 * @param {Array} deps - Valores que, si cambian, obligan a recargar (como en useEffect).
 * @returns {{ data: *, loading: boolean, error: Error|null, reload: function, setData: function }}
 */
export function useAsyncData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Contador que solo sirve para disparar una recarga manual
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // Si el componente desaparece (o cambian las deps) antes de que llegue la
    // respuesta, ignoramos ese resultado viejo para no pisar datos nuevos.
    let isCurrent = true;

    /* useEffect no puede ser async directamente (debe devolver la función de
       limpieza, no una promesa), por eso se crea esta función async adentro. */
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await loader();
        if (isCurrent) setData(result);
      } catch (loadError) {
        if (isCurrent) setError(loadError);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }
    load();

    return () => {
      isCurrent = false;
    };
    // "loader" se omite a propósito: suele ser una función nueva en cada render
    // y recargaría sin parar. Quien usa el hook declara sus deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  /** Vuelve a pedir los datos (mantiene los anteriores mientras llegan) */
  function reload() {
    setReloadCount((count) => count + 1);
  }

  return { data, loading, error, reload, setData };
}
