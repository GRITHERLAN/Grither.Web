/* ==========================================================================
   PÁGINA: CONTACTO
   --------------------------------------------------------------------------
   Izquierda: descripción de marca, tarjetas de contacto (teléfono, correo,
              Instagram, LinkedIn, portafolio) e indicadores.
   Derecha:   formulario. Al enviarlo se abre el programa de correo del
              visitante con el mensaje ya escrito (enlace mailto:).
   Toda la información de la izquierda la edita el administrador.

   Seguridad y ley:
     - Casilla de autorización obligatoria (Ley 1581 de 2012) con enlace a
       la Política de privacidad.
     - Campo trampa ("honeypot") invisible: una persona no lo ve ni lo llena,
       pero los robots que llenan todos los campos sí. Si viene lleno, se
       finge el envío y no se abre el correo.
     - Largo máximo en cada campo y validación del WhatsApp.
     - Los enlaces de las tarjetas pasan por toSafeHref (nunca javascript:).
   ========================================================================== */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import IndicatorGrid from '../components/ui/IndicatorGrid.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getContactInfo } from '../services/siteInfoService.js';
import { CONTACT_NEEDS, BUDGET_OPTIONS, LEGAL_ROUTES } from '../data/siteContent.js';
import { MAX_LENGTH, isTooLong, isValidEmail, isValidPhone, toSafeHref } from '../utils/validators.js';
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
  consent: false, // autorización del tratamiento de datos (obligatoria)
  website: '', // campo trampa para robots: una persona siempre lo deja vacío
};

/** Valida el formulario y devuelve los errores por campo */
function validateContactForm(form) {
  const errors = {};
  if (form.name.trim().length < 3) errors.name = 'Escribe tu nombre.';
  else if (isTooLong(form.name, MAX_LENGTH.PERSON_NAME)) errors.name = `Máximo ${MAX_LENGTH.PERSON_NAME} caracteres.`;

  if (isTooLong(form.company, MAX_LENGTH.PERSON_NAME)) errors.company = `Máximo ${MAX_LENGTH.PERSON_NAME} caracteres.`;

  if (!isValidEmail(form.email) || isTooLong(form.email, MAX_LENGTH.EMAIL)) errors.email = 'Escribe un correo válido.';

  // WhatsApp es opcional, pero si se escribe debe tener forma de teléfono
  if (form.whatsapp.trim() && !isValidPhone(form.whatsapp)) {
    errors.whatsapp = 'Escribe un número válido (ej. +57 300 000 0000).';
  }

  if (form.message.trim().length < 10) errors.message = 'Cuéntame un poco más (mínimo 10 caracteres).';
  else if (isTooLong(form.message, MAX_LENGTH.CONTACT_MESSAGE)) errors.message = `Máximo ${MAX_LENGTH.CONTACT_MESSAGE} caracteres.`;

  if (!form.consent) errors.consent = 'Debes autorizar el tratamiento de tus datos para poder enviar el mensaje.';
  return errors;
}

function ContactPage() {
  const { data: contact, error, reload } = useAsyncData(getContactInfo, []);

  // Mientras llega la información de contacto (o si falló)
  if (!contact) {
    return (
      <div className="container">
        {/* El h1 existe desde el inicio (también para quien lee la página sin esperar a los datos) */}
        <h1 className="sr-only">Contacto</h1>
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
    { icon: 'instagram', label: 'Instagram', value: prettyUrl(contact.instagram), href: toSafeHref(contact.instagram) },
    { icon: 'linkedin', label: 'LinkedIn', value: prettyUrl(contact.linkedin), href: toSafeHref(contact.linkedin) },
    { icon: 'globe', label: 'Portafolio web', value: prettyUrl(contact.portfolio), href: toSafeHref(contact.portfolio) },
  ];

  /** Actualiza un campo del formulario y borra su error */
  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    // La casilla de autorización guarda true/false; los demás campos, el texto
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setIsSent(false);
  }

  /** Valida y abre el correo con el mensaje ya armado */
  function handleSubmit(event) {
    event.preventDefault(); // evita que el navegador recargue la página

    // Campo trampa lleno = robot. Se finge el envío (para no darle pistas)
    // y NO se abre el correo.
    if (form.website) {
      setIsSent(true);
      setForm(EMPTY_FORM);
      return;
    }

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
          Cuéntame tu idea. <span className="contact-info__accent">Te respondo hoy.</span>
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
      <section className="card contact-form-card" aria-labelledby="contact-form-title">
        {/* Subtítulo oculto a la vista: da la jerarquía h1 > h2 correcta al formulario */}
        <h2 id="contact-form-title" className="sr-only">
          Escríbeme tu mensaje
        </h2>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form__row">
            <div className={`field ${errors.name ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="contact-name">
                Nombre
              </label>
              <input id="contact-name" name="name" className="field__input" placeholder="Tu nombre" value={form.name} onChange={handleChange} maxLength={MAX_LENGTH.PERSON_NAME} autoComplete="name" />
              {errors.name && <p className="field__error">{errors.name}</p>}
            </div>
            <div className={`field ${errors.company ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="contact-company">
                Empresa <span className="field__hint">(opcional)</span>
              </label>
              <input id="contact-company" name="company" className="field__input" placeholder="Nombre de la empresa" value={form.company} onChange={handleChange} maxLength={MAX_LENGTH.PERSON_NAME} autoComplete="organization" />
              {errors.company && <p className="field__error">{errors.company}</p>}
            </div>
          </div>

          <div className="form__row">
            <div className={`field ${errors.email ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="contact-email">
                Correo
              </label>
              <input id="contact-email" name="email" type="email" className="field__input" placeholder="tu@correo.com" value={form.email} onChange={handleChange} maxLength={MAX_LENGTH.EMAIL} autoComplete="email" />
              {errors.email && <p className="field__error">{errors.email}</p>}
            </div>
            <div className={`field ${errors.whatsapp ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="contact-whatsapp">
                WhatsApp <span className="field__hint">(opcional)</span>
              </label>
              <input id="contact-whatsapp" name="whatsapp" type="tel" className="field__input" placeholder="+57 300 000 0000" value={form.whatsapp} onChange={handleChange} maxLength={MAX_LENGTH.PHONE} autoComplete="tel" />
              {errors.whatsapp && <p className="field__error">{errors.whatsapp}</p>}
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
              Cuéntame del proyecto
            </label>
            <textarea id="contact-message" name="message" className="field__input" placeholder="Objetivo, fecha ideal, referencias que te gusten..." value={form.message} onChange={handleChange} maxLength={MAX_LENGTH.CONTACT_MESSAGE} />
            {errors.message && <p className="field__error">{errors.message}</p>}
          </div>

          {/* Campo trampa para robots: fuera de la pantalla, sin foco con Tab
              y oculto para lectores de pantalla. Una persona nunca lo llena. */}
          <div className="contact-form__trap" aria-hidden="true">
            <label htmlFor="contact-website">No llenes este campo</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
          </div>

          {/* Autorización del tratamiento de datos (Ley 1581 de 2012) */}
          <div className={`field ${errors.consent ? 'field--error' : ''}`}>
            <label className="checkbox">
              <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} />
              <span>
                Autorizo a Grither a usar mis datos para responder mi solicitud y enviarme una cotización, según la{' '}
                <Link to={LEGAL_ROUTES.PRIVACY}>Política de privacidad</Link>.
              </span>
            </label>
            {errors.consent && <p className="field__error">{errors.consent}</p>}
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
