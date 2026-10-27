/* ==========================================================================
   PÁGINA: SERVICIOS (inicio)
   --------------------------------------------------------------------------
   Secciones:
     1. Héroe con título, breve descripción y botones.
     2. "Qué hacemos": 3 tarjetas de servicios.
     3. "Planes": 3 planes de referencia.
   ========================================================================== */

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getServices, getPlans } from '../services/offerService.js';
import { formatCOP } from '../utils/format.js';
import './ServicesPage.css';

function ServicesPage() {
  // Cards editables por el administrador (se piden las dos listas a la vez)
  const { data, error, reload } = useAsyncData(
    async () => {
      const [services, plans] = await Promise.all([getServices(), getPlans()]);
      return { services, plans };
    },
    []
  );

  // Referencia a la sección de planes para el botón "Ver planes"
  const plansRef = useRef(null);

  /** Baja suavemente hasta la sección de planes */
  function handleScrollToPlans(event) {
    event.preventDefault();
    plansRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="container">
      {/* ---------- 1. Héroe ---------- */}
      <section className="services-hero">
        <span className="eyebrow eyebrow--pill">Servicios Grither</span>
        <h1 className="services-hero__title">
          Construimos la web que tu negocio <span className="text-gradient">necesita para crecer.</span>
        </h1>
        <p className="services-hero__text">
          Desde una landing de un día hasta plataformas completas. Diseño, desarrollo y despliegue con
          un solo equipo.
        </p>
        <div className="services-hero__actions">
          <Link to="/contacto" className="btn btn--primary">
            Cotizar mi proyecto
          </Link>
          <button type="button" className="btn btn--outline" onClick={handleScrollToPlans}>
            Ver planes
          </button>
        </div>
      </section>

      {/* Mientras llegan las cards (o si falló la carga) */}
      {!data && <LoadingState label="Cargando servicios..." error={error} onRetry={reload} />}

      {data && <OfferSections services={data.services} plans={data.plans} plansRef={plansRef} />}
    </div>
  );
}

/**
 * Secciones "Qué hacemos" y "Planes" (se pintan cuando ya llegaron los datos).
 * @param {Array} services - Cards de servicios.
 * @param {Array} plans - Cards de planes.
 * @param {object} plansRef - Referencia para el botón "Ver planes".
 */
function OfferSections({ services, plans, plansRef }) {
  return (
    <>
      {/* ---------- 2. Qué hacemos ---------- */}
      <section className="section" aria-labelledby="services-title">
        <header className="section__header">
          <h2 id="services-title" className="section__title">
            Qué hacemos
          </h2>
          <p className="section__meta">{String(services.length).padStart(2, '0')} servicios</p>
        </header>

        <ul className="services-grid">
          {services.map((service, index) => (
            <li key={service.id}>
              <article className="card service-card">
                <header className="service-card__top">
                  <span className="card__icon">
                    <Icon name={service.icon} />
                  </span>
                  {/* El código SRV-0X sale de la posición de la card */}
                  <span className="service-card__code text-mono">SRV-{String(index + 1).padStart(2, '0')}</span>
                </header>
                <h3 className="service-card__title">{service.title}</h3>
                <p className="service-card__text">{service.description}</p>
                <ul className="tag-list">
                  {service.tags.map((tag) => (
                    <li key={tag} className="tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- 3. Planes ---------- */}
      <section className="section" id="planes" ref={plansRef} aria-labelledby="plans-title">
        <header className="section__header">
          <div>
            <h2 id="plans-title" className="section__title">
              Planes
            </h2>
            <p className="section__subtitle">Precios de referencia; cada proyecto se cotiza según su alcance.</p>
          </div>
        </header>

        <ul className="plans-grid">
          {plans.map((plan) => (
            <li key={plan.id}>
              <article className={`card plan-card ${plan.featured ? 'plan-card--featured' : ''}`}>
                <header className="plan-card__top">
                  <h3 className="plan-card__name text-mono">{plan.name}</h3>
                  {plan.featured && <span className="plan-card__badge">Más elegido</span>}
                </header>

                <p className="plan-card__price text-mono">
                  {plan.price === null ? (
                    'Cotización'
                  ) : (
                    <>
                      <span className="plan-card__from">Desde</span> {formatCOP(plan.price)}
                      <span className="plan-card__currency">COP</span>
                    </>
                  )}
                </p>

                <p className="plan-card__text">{plan.description}</p>

                <ul className="plan-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Icon name="check" className="plan-card__check" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/contacto"
                  className={`btn btn--block ${plan.featured ? 'btn--primary' : 'btn--outline'}`}
                >
                  {plan.cta}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default ServicesPage;
