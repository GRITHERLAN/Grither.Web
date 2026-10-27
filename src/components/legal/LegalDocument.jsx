/* ==========================================================================
   DOCUMENTO LEGAL (plantilla compartida)
   --------------------------------------------------------------------------
   Lo usan las tres páginas legales: Política de privacidad, Términos y
   condiciones y Política de cookies. Pinta siempre lo mismo:
     1. Encabezado: etiqueta, título, fecha de vigencia e introducción.
     2. Índice con enlaces a cada sección (navegable con teclado).
     3. Las secciones, cada una con su título <h2>.
   Cada página solo entrega su lista de secciones: { id, title, content }.
   ========================================================================== */

import { LEGAL_UPDATED_AT } from '../../data/siteContent.js';
import './LegalDocument.css';

/**
 * @param {string} title - Título de la página (h1).
 * @param {import('react').ReactNode} intro - Párrafo de introducción.
 * @param {Array<{id: string, title: string, content: import('react').ReactNode}>} sections
 */
function LegalDocument({ title, intro, sections }) {
  return (
    <article className="container legal">
      {/* ---------- 1. Encabezado ---------- */}
      <header className="legal__header">
        <span className="eyebrow">Información legal</span>
        <h1 className="legal__title">{title}</h1>
        <p className="legal__date text-mono">Vigente desde el {LEGAL_UPDATED_AT}</p>
        <div className="legal__intro">{intro}</div>
      </header>

      <div className="legal__layout">
        {/* ---------- 2. Índice ---------- */}
        <nav className="legal__toc card" aria-label="Contenido de la página">
          <p className="legal__toc-title">Contenido</p>
          <ol className="legal__toc-list">
            {sections.map((section, index) => (
              <li key={section.id}>
                {/* Enlace interno: lleva a la sección con su id */}
                <a href={`#${section.id}`} className="legal__toc-link">
                  <span className="text-mono">{String(index + 1).padStart(2, '0')}</span> {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ---------- 3. Secciones ---------- */}
        <div className="legal__body">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="legal__section" aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="legal__section-title">
                <span className="legal__section-number text-mono">{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

export default LegalDocument;
