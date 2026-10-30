/* ==========================================================================
   PÁGINA: SERVICIOS (inicio)
   --------------------------------------------------------------------------
   Secciones:
     1. Héroe con título, breve descripción y botones.
     2. "Qué hago": 3 tarjetas de servicios.
     3. "Planes": 3 planes de referencia.
   ========================================================================== */

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import TiltCard from '../components/ui/TiltCard.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getServices, getPlans } from '../services/offerService.js';
import { formatCOP } from '../utils/format.js';
import { toSafeHref } from '../utils/validators.js';
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
          Construyo la web que tu negocio <span className="text-gradient">necesita para crecer.</span>
        </h1>
        <p className="services-hero__text">
          Desde una landing de un día hasta plataformas completas. Diseño, desarrollo y despliegue con
          un solo desarrollador a tu lado.
        </p>
        <div className="services-hero__actions">
          <Link to="/contacto" className="btn btn--primary">
            Cotizar mi proyecto
          </Link>
          {/* Enlace real a #planes (rastreable); el clic hace el desplazamiento suave */}
          <a href="#planes" className="btn btn--outline" onClick={handleScrollToPlans}>
            Ver planes
          </a>
        </div>
        <p className="services-hero__more">
          ¿Quieres saber cómo trabajo? Conoce <Link to="/sobre-mi">quién está detrás de Grither</Link> y mi
          proceso.
        </p>
      </section>

      {/* Mientras llegan las cards (o si falló la carga) */}
      {!data && <LoadingState label="Cargando servicios..." error={error} onRetry={reload} />}

      {data && <OfferSections services={data.services} plans={data.plans} plansRef={plansRef} />}
    </div>
  );
}

/**
 * Secciones "Qué hago" y "Planes" (se pintan cuando ya llegaron los datos).
 * @param {Array} services - Cards de servicios.
 * @param {Array} plans - Cards de planes.
 * @param {object} plansRef - Referencia para el botón "Ver planes".
 */
function OfferSections({ services, plans, plansRef }) {
  return (
    <>
      {/* ---------- 2. Qué hago ---------- */}
      <section className="section" aria-labelledby="services-title">
        <header className="section__header">
          <h2 id="services-title" className="section__title">
            Qué hago
          </h2>
          <p className="section__meta">{String(services.length).padStart(2, '0')} servicios</p>
        </header>

        <ul className="services-grid">
          {services.map((service, index) => (
            <li key={service.id}>
              {/* TiltCard: se inclina en 3D siguiendo al puntero */}
              <TiltCard className="card service-card">
                {/* Encabezado de vidrio: en 3D "flota" por encima de la tarjeta */}
                <header className="service-card__glass">
                  <div className="service-card__top">
                    <span className="card__icon">
                      <Icon name={service.icon} />
                    </span>
                    {/* El código SRV-0X sale de la posición de la card */}
                    <span className="service-card__code text-mono">SRV-{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="service-card__title">{service.title}</h3>
                </header>
                <p className="service-card__text">{service.description}</p>
                <ul className="tag-list">
                  {service.tags.map((tag) => (
                    <li key={tag} className="tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              </TiltCard>
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
              {/* TiltCard: se inclina en 3D siguiendo al puntero */}
              <TiltCard className={`card plan-card ${plan.featured ? 'plan-card--featured' : ''}`}>
                {/* Encabezado de vidrio con el nombre y el precio en píldora */}
                <header className="plan-card__glass">
                  <div className="plan-card__top">
                    <h3 className="plan-card__name text-mono">{plan.name}</h3>
                    {plan.featured && <span className="plan-card__badge">Más elegido</span>}
                  </div>

                  <p className="plan-card__price text-mono">
                    {plan.price !== null && <span className="plan-card__from">Desde</span>}
                    <span className="plan-card__pill">
                      {plan.price === null ? (
                        'Cotización'
                      ) : (
                        <>
                          {formatCOP(plan.price)}
                          <span className="plan-card__currency">COP</span>
                        </>
                      )}
                    </span>
                  </p>
                </header>

                <p className="plan-card__text">{plan.description}</p>

                <ul className="plan-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Icon name="check" className="plan-card__check" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* El administrador define el enlace de cada botón (ej. WhatsApp) */}
                <a
                  href={toSafeHref(plan.cta_url)}
                  className={`btn btn--block ${plan.featured ? 'btn--primary' : 'btn--outline'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {plan.cta}
                </a>
              </TiltCard>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default ServicesPage;
