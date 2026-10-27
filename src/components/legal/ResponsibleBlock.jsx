/* ==========================================================================
   DATOS DEL RESPONSABLE DEL TRATAMIENTO
   --------------------------------------------------------------------------
   Tarjeta con nombre, domicilio, correo y teléfono (art. 13 del Decreto
   1377 de 2013). Los datos llegan de useResponsible().
   ========================================================================== */

import LoadingState from '../ui/LoadingState.jsx';

/**
 * @param {{name: string, city: string, email: string, phone: string}|null} responsible
 * @param {Error|null} error - Error de la carga (si lo hubo).
 * @param {function} onRetry - Vuelve a intentar la carga.
 */
function ResponsibleBlock({ responsible, error, onRetry }) {
  if (!responsible) {
    return <LoadingState label="Cargando datos del responsable..." error={error} onRetry={onRetry} />;
  }

  return (
    <dl className="legal__responsible card">
      <div>
        <dt>Nombre</dt>
        <dd>{responsible.name} (marca comercial Grither)</dd>
      </div>
      <div>
        <dt>Domicilio</dt>
        <dd>{responsible.city}</dd>
      </div>
      <div>
        <dt>Correo</dt>
        <dd>
          <a href={`mailto:${responsible.email}`}>{responsible.email}</a>
        </dd>
      </div>
      <div>
        <dt>Teléfono</dt>
        <dd>
          <a href={`tel:${responsible.phone.replace(/\s/g, '')}`}>{responsible.phone}</a>
        </dd>
      </div>
    </dl>
  );
}

export default ResponsibleBlock;
