/* ==========================================================================
   TARJETAS RESUMEN DEL PANEL ADMIN
   --------------------------------------------------------------------------
   Total cotizado (suma de precios), Activos, Inactivos y Cancelados.
   ========================================================================== */

import { memo } from 'react';
import { formatCOP } from '../../utils/format.js';
import { countByStatus } from '../../utils/filterProjects.js';
import './SummaryCards.css';

function SummaryCards({ projects }) {
  const counts = countByStatus(projects);
  const totalQuoted = projects.reduce((sum, project) => sum + project.price, 0);

  // Datos de cada tarjeta (modifier define el color del número)
  const cards = [
    { label: 'Total cotizado', value: formatCOP(totalQuoted), hint: `Suma de los ${counts.todos} proyectos`, modifier: 'accent' },
    { label: 'Activos', value: counts.activo, hint: 'En ciclo de entrega', modifier: 'success' },
    { label: 'Inactivos', value: counts.inactivo, hint: 'Pausa temporal', modifier: 'warning' },
    { label: 'Cancelados', value: counts.cancelado, hint: 'Con justificación', modifier: 'danger' },
  ];

  return (
    <ul className="summary-cards">
      {cards.map((card) => (
        <li key={card.label} className="card summary-card">
          <p className="summary-card__label text-mono">{card.label}</p>
          <p className={`summary-card__value summary-card__value--${card.modifier} text-mono`}>{card.value}</p>
          <p className="summary-card__hint">{card.hint}</p>
        </li>
      ))}
    </ul>
  );
}

// memo: solo se vuelve a dibujar si cambian sus props (RENDIMIENTO)
export default memo(SummaryCards);
