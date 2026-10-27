/* ==========================================================================
   PÁGINA: CONTACTO
   --------------------------------------------------------------------------
   Izquierda: descripción de marca, tarjetas de contacto (teléfono, correo,
              Instagram, LinkedIn, portafolio) e indicadores.
   Derecha:   formulario. Al enviarlo se abre el programa de correo del
              visitante con el mensaje ya escrito (enlace mailto:).
   Toda la información de la izquierda la edita el administrador.
   ========================================================================== */

import { useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
import IndicatorGrid from '../components/ui/IndicatorGrid.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getContactInfo } from '../services/siteInfoService.js';
import { CONTACT_NEEDS, BUDGET_OPTIONS } from '../data/siteContent.js';
import { isValidEmail } from '../utils/validators.js';
import { prettyUrl } from '../utils/format.js';
import Select from '../components/ui/Select.jsx';
import './ContactPage.css';

/* Los presupuestos son textos simples: se convierten a { value, label } */
const BUDGET_SELECT_OPTIONS = BUDGET_OPTIONS.map((option) => ({ value: option, label: option }));

/* Estado inicial (vacío) del formulario */
const EMPTY_FORM = {
  name: '',
  company: '',
  email: '',
  whatsapp: '',
  need: CONTACT_NEEDS[1],
  budget: BUDGET_OPTIONS[0],
  message: '',
};

/** Valida el formulario y devuelve los errores por campo */
function validateContactForm(form) {
  const errors = {};
  if (form.name.trim().length < 3) errors.name = 'Escribe tu nombre.';
  if (!isValidEmail(form.email)) errors.email = 'Escribe un correo válido.';
  if (form.message.trim().length < 10) errors.message = 'Cuéntanos un poco más (mínimo 10 caracteres).';
  return errors;
}

function ContactPage() {
  const { data: contact, error, reload } = useAsyncData(getContactInfo, []);

  // Mientras llega la información de contacto (o si falló)
  if (!contact) {
    return (
      <div className="container">
        <LoadingState label="Cargando contacto..." error={error} onRetry={reload} />
      </div>
    );
  }

  return <ContactContent contact={contact} />;
}

/**
 * Contenido de la página cuando ya llegó la información.
 * Va en un componente aparte para que sus useState no queden detrás
 * de un "return" anticipado (regla de los hooks de React).
 * @param {object} contact - Información de contacto editable por el admin.
 */
function ContactContent({ contact }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSent, setIsSent] = useState(false);

  // Tarjetas de contacto: cada una es un enlace
  const contactCards = [
    { icon: 'phone', label: 'Teléfono / WhatsApp', value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
    { icon: 'mail', label: 'Correo', value: contact.email, href: `mailto:${contact.email}` },
    { icon: 'instagram', label: 'Instagram', value: prettyUrl(contact.instagram), href: contact.instagram },
    { icon: 'linkedin', label: 'LinkedIn', value: prettyUrl(contact.linkedin), href: contact.linkedin },
    { icon: 'globe', label: 'Portafolio web', value: prettyUrl(contact.portfolio), href: contact.portfolio },
  ];

  /** Actualiza un campo del formulario y borra su error */
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setIsSent(false);
  }

  /** Valida y abre el correo con el mensaje ya armado */
  function handleSubmit(event) {
    event.preventDefault(); // evita que el navegador recargue la página

    const formErrors = validateContactForm(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    // Armamos el cuerpo del correo línea por línea
    const body = [
      `Nombre: ${form.name}`,
      `Empresa: ${form.company || 'No aplica'}`,
      `Correo: ${form.email}`,
      `WhatsApp: ${form.whatsapp || 'No indicado'}`,
      `Necesito: ${form.need}`,
      `Presupuesto: ${form.budget}`,
      '',
      form.message,
    ].join('\n');

    const subject = `Nuevo proyecto: ${form.need} - ${form.name}`;
    const mailtoUrl = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
    setIsSent(true);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="container contact-layout">
      {/* ---------- Columna izquierda: información ---------- */}
      <section className="contact-info" aria-labelledby="contact-title">
        <span className="eyebrow contact-info__eyebrow">Contacto</span>
        <h1 id="contact-title" className="contact-info__title">
          Cuéntanos tu idea. <span className="contact-info__accent">Te respondemos hoy.</span>
        </h1>
        <p className="contact-info__text">{contact.brandDescription}</p>

        <ul className="contact-cards">
          {contactCards.map((card) => (
            <li key={card.label}>
              <a
                className="contact-card"
                href={card.href}
                target={card.href.startsWith('http') ? '_blank' : undefined}
                rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                <span className="card__icon contact-card__icon">
                  <Icon name={card.icon} />
                </span>
                <span>
                  <span className="contact-card__label text-mono">{card.label}</span>
                  <span className="contact-card__value">{card.value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <IndicatorGrid indicators={contact.indicators} />
      </section>

      {/* ---------- Columna derecha: formulario ---------- */}
      <section className="card contact-form-card" aria-label="Formulario de contacto">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form__row">
            <div className={`field ${errors.name ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="contact-name">
                Nombre
              </label>
              <input id="contact-name" name="name" className="field__input" placeholder="Tu nombre" value={form.name} onChange={handleChange} />
              {errors.name && <p className="field__error">{errors.name}</p>}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="contact-company">
                Empresa <span className="field__hint">(opcional)</span>
              </label>
              <input id="contact-company" name="company" className="field__input" placeholder="Nombre de la empresa" value={form.company} onChange={handleChange} />
            </div>
          </div>

          <div className="form__row">
            <div className={`field ${errors.email ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="contact-email">
                Correo
              </label>
              <input id="contact-email" name="email" type="email" className="field__input" placeholder="tu@correo.com" value={form.email} onChange={handleChange} />
              {errors.email && <p className="field__error">{errors.email}</p>}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="contact-whatsapp">
                WhatsApp <span className="field__hint">(opcional)</span>
              </label>
              <input id="contact-whatsapp" name="whatsapp" type="tel" className="field__input" placeholder="+57 300 000 0000" value={form.whatsapp} onChange={handleChange} />
            </div>
          </div>

          {/* Opciones tipo chip: son radios escondidos dentro de un label */}
          <fieldset className="field contact-needs">
            <legend className="field__label">¿Qué necesitas?</legend>
            <div className="contact-needs__options">
              {CONTACT_NEEDS.map((need) => (
                <label key={need} className={`chip ${form.need === need ? 'chip--active' : ''}`}>
                  <input
                    type="radio"
                    name="need"
                    value={need}
                    className="sr-only"
                    checked={form.need === need}
                    onChange={handleChange}
                  />
                  {need}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label className="field__label" htmlFor="contact-budget">
              Presupuesto aproximado
            </label>
            <Select id="contact-budget" name="budget" value={form.budget} onChange={handleChange} options={BUDGET_SELECT_OPTIONS} />
          </div>

          <div className={`field ${errors.message ? 'field--error' : ''}`}>
            <label className="field__label" htmlFor="contact-message">
              Cuéntanos del proyecto
            </label>
            <textarea id="contact-message" name="message" className="field__input" placeholder="Objetivo, fecha ideal, referencias que te gusten..." value={form.message} onChange={handleChange} />
            {errors.message && <p className="field__error">{errors.message}</p>}
          </div>

          {isSent && (
            <p className="form-alert form-alert--success" role="status">
              ¡Listo! Abrimos tu programa de correo con el mensaje preparado. Si no se abrió, escríbenos a {contact.email}.
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block">
            Enviar mensaje
          </button>
        </form>
      </section>
    </div>
  );
}

export default ContactPage;
