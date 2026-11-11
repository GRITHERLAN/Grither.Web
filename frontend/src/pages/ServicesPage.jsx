/* ==========================================================================
   PÁGINA: SERVICIOS (inicio)
   --------------------------------------------------------------------------
   Secciones:
     1. Héroe con título, breve descripción y botones.
     2. "Qué hago": 3 tarjetas de servicios.
     3. "Planes": 3 planes de referencia.
   ========================================================================== */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import TiltCard from '../components/ui/TiltCard.jsx';
import CurvedCardCarousel from '../components/ui/CurvedCardCarousel.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getServices, getPlans } from '../services/offerService.js';
import { formatCOP } from '../utils/format.js';
import { toSafeHref } from '../utils/validators.js';
import { scrollToElement } from '../lib/smoothScroll.js';
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
    scrollToElement(plansRef.current);
  }

  return (
    <div className="container">
      {/* ---------- 1. Héroe ---------- */}
      <section className="services-hero">
        <span className="eyebrow">Servicios Grither</span>
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
  // Plan cuyo modal de características está abierto (null = cerrado)
  const [featuresPlan, setFeaturesPlan] = useState(null);

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

        {/* Carrusel curvo (sin bordes de color): las cards de servicio de siempre */}
        <CurvedCardCarousel label="Servicios de Grither" chromatic={false}>
          {services.map((service, index) => (
            /* TiltCard: se inclina en 3D siguiendo al puntero (solo la del centro) */
            <TiltCard key={service.id} className="card service-card">
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
          ))}
        </CurvedCardCarousel>
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
          <p className="section__meta">{String(plans.length).padStart(2, '0')} planes</p>
        </header>

        {/* Carrusel curvo (sin bordes de color): las cards de plan de siempre.
            El orden es el que define el administrador. */}
        <CurvedCardCarousel label="Planes de Grither" chromatic={false}>
          {plans.map((plan) => (
            /* TiltCard: se inclina en 3D siguiendo al puntero (solo la del centro) */
            <TiltCard key={plan.id} className={`card plan-card ${plan.featured ? 'plan-card--featured' : ''}`}>
              {/* Encabezado de vidrio con el nombre y el precio en píldora */}
              <header className="plan-card__glass">
                <div className="plan-card__top">
                  <h3 className="plan-card__name text-mono">{plan.name}</h3>
                  {plan.featured && <span className="plan-card__badge">Más elegido</span>}
                </div>

                <p className="plan-card__price text-mono">
                  {/* Sin precio se deja el renglón vacío: así la píldora queda a la
                      misma altura que en las demás cards */}
                  <span className="plan-card__from" aria-hidden={plan.price === null || undefined}>
                    {plan.price === null ? ' ' : 'Desde'}
                  </span>
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

              <div className="plan-card__actions">
                {/* La lista de características vive en un modal: la card queda corta */}
                {plan.features.length > 0 && (
                  <button
                    type="button"
                    className="btn btn--block btn--soft plan-card__features-btn"
                    aria-haspopup="dialog"
                    onClick={() => setFeaturesPlan(plan)}
                  >
                    Características
                  </button>
                )}
                <PlanCta plan={plan} />
              </div>
            </TiltCard>
          ))}
        </CurvedCardCarousel>
      </section>

      {/* Modal de vidrio con las características del plan elegido */}
      <Modal
        isOpen={featuresPlan !== null}
        onClose={() => setFeaturesPlan(null)}
        title={featuresPlan?.name ?? ''}
        description={featuresPlan ? planPriceLabel(featuresPlan) : ''}
        size="sm"
        variant="glass"
      >
        {featuresPlan && (
          <>
            <ul className="plan-card__features">
              {featuresPlan.features.map((feature) => (
                <li key={feature}>
                  <Icon name="check" className="plan-card__check" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="plan-features__cta">
              <PlanCta plan={featuresPlan} />
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

/** "Desde $ 650.000 COP" o "Precio por cotización" (texto bajo el título del modal) */
function planPriceLabel(plan) {
  return plan.price === null ? 'Precio por cotización' : `Desde ${formatCOP(plan.price)} COP`;
}

/**
 * Botón del plan; el administrador define su enlace (ej. WhatsApp).
 * @param {object} plan - Plan con cta, cta_url y featured.
 */
function PlanCta({ plan }) {
  return (
    <a
      href={toSafeHref(plan.cta_url)}
      className={`btn btn--block ${plan.featured ? 'btn--primary' : 'btn--outline'}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {plan.cta}
    </a>
  );
}

export default ServicesPage;
