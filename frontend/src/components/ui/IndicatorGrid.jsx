/* ==========================================================================
   CUADRÍCULA DE INDICADORES
   --------------------------------------------------------------------------
   Muestra cifras destacadas tipo "+30 Proyectos entregados".
   Se usa en Sobre mí y en Contacto. Los números cuentan desde 0 al
   aparecer en pantalla (CountUp).
   ========================================================================== */

import CountUp from './CountUp.jsx';
import './IndicatorGrid.css';

/** @param {Array<{value:string, label:string}>} indicators */
function IndicatorGrid({ indicators = [] }) {
  return (
    <dl className="indicator-grid">
      {indicators.map((indicator, index) => (
        <div key={`${indicator.label}-${index}`} className="indicator-grid__item">
          {/* <dt> es el nombre del dato y <dd> su valor; visualmente el valor va arriba */}
          <dt className="indicator-grid__label">{indicator.label}</dt>
          <dd className="indicator-grid__value text-gradient">
            <CountUp value={indicator.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default IndicatorGrid;
