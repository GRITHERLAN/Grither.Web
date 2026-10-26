/* ==========================================================================
   EDITOR DE SERVICIOS ("Qué hacemos")
   --------------------------------------------------------------------------
   Permite al administrador editar, agregar y quitar las cards de servicios
   de la página Servicios. Los cambios solo se publican al pulsar
   "Guardar servicios".
   ========================================================================== */

import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import {
  MAX_CARDS,
  MIN_CARDS,
  SERVICE_ICON_OPTIONS,
  createOfferId,
  getServices,
  saveServices,
  validateServices,
} from '../../services/offerService.js';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import Icon from '../ui/Icon.jsx';
import Select from '../ui/Select.jsx';
import StringListEditor from './StringListEditor.jsx';
import './OfferEditor.css';

function ServicesEditor() {
  const { showToast } = useToast();
  const [services, setServices] = useState(getServices);
  const [errors, setErrors] = useState({});
  // Card que se quiere quitar (null = ventana cerrada)
  const [serviceToRemove, setServiceToRemove] = useState(null);

  /** Cambia uno o varios campos de la card en la posición "index" */
  function updateService(index, changes) {
    setServices((current) =>
      current.map((service, serviceIndex) => (serviceIndex === index ? { ...service, ...changes } : service))
    );
    // Borramos los errores de los campos que se acaban de tocar
    setErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((field) => delete next[`${index}.${field}`]);
      return next;
    });
  }

  function handleAdd(event) {
    event.preventDefault();
    setServices((current) => [
      ...current,
      { id: createOfferId('srv'), icon: 'layout', title: '', description: '', tags: [''] },
    ]);
    setErrors({});
  }

  function handleConfirmRemove() {
    setServices((current) => current.filter((service) => service.id !== serviceToRemove.id));
    setServiceToRemove(null);
    setErrors({});
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Validación FrontEnd
    const formErrors = validateServices(services);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      showToast('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    // El servicio vuelve a validar ("BackEnd") y guarda
    try {
      setServices(saveServices(services));
      setErrors({});
      showToast('Servicios guardados. Ya se ven en la página.');
    } catch (error) {
      setErrors(error.fieldErrors || {});
      showToast(error.message, 'error');
    }
  }

  /** Pinta el error de un campo de una card */
  function renderError(index, field) {
    const message = errors[`${index}.${field}`];
    return message ? <p className="field__error">{message}</p> : null;
  }

  return (
    <section className="card offer-editor" aria-labelledby="services-editor-title">
      <header className="offer-editor__header">
        <div>
          <h2 id="services-editor-title" className="admin-form-section__title">
            Qué hacemos
          </h2>
          <p className="text-muted">Cards de servicios ({services.length}/{MAX_CARDS}).</p>
        </div>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          disabled={services.length >= MAX_CARDS}
          onClick={handleAdd}
        >
          <Icon name="plus" className="offer-editor__btn-icon" />
          Agregar servicio
        </button>
      </header>

      {errors.list && (
        <p className="form-alert" role="alert">
          {errors.list}
        </p>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <ul className="offer-editor__list">
          {services.map((service, index) => (
            <li key={service.id} className="offer-card">
              <header className="offer-card__header">
                <p className="offer-card__code text-mono">SRV-{String(index + 1).padStart(2, '0')}</p>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Quitar servicio ${service.title || index + 1}`}
                  title="Quitar servicio"
                  disabled={services.length <= MIN_CARDS}
                  onClick={(event) => {
                    event.preventDefault();
                    setServiceToRemove(service);
                  }}
                >
                  <Icon name="trash" />
                </button>
              </header>

              <div className="form__row">
                <div className={`field ${errors[`${index}.title`] ? 'field--error' : ''}`}>
                  <label className="field__label" htmlFor={`${service.id}-title`}>
                    Título
                  </label>
                  <input
                    id={`${service.id}-title`}
                    className="field__input"
                    placeholder="Ej. Landing pages"
                    value={service.title}
                    onChange={(event) => updateService(index, { title: event.target.value })}
                  />
                  {renderError(index, 'title')}
                </div>

                <div className={`field ${errors[`${index}.icon`] ? 'field--error' : ''}`}>
                  <label className="field__label" htmlFor={`${service.id}-icon`}>
                    Icono
                  </label>
                  <Select
                    id={`${service.id}-icon`}
                    name="icon"
                    value={service.icon}
                    onChange={(event) => updateService(index, { icon: event.target.value })}
                    options={SERVICE_ICON_OPTIONS}
                  />
                  {renderError(index, 'icon')}
                </div>
              </div>

              <div className={`field ${errors[`${index}.description`] ? 'field--error' : ''}`}>
                <label className="field__label" htmlFor={`${service.id}-description`}>
                  Descripción
                </label>
                <textarea
                  id={`${service.id}-description`}
                  className="field__input offer-card__textarea"
                  value={service.description}
                  onChange={(event) => updateService(index, { description: event.target.value })}
                />
                {renderError(index, 'description')}
              </div>

              <StringListEditor
                label="Etiquetas"
                items={service.tags}
                onChange={(tags) => updateService(index, { tags })}
                addLabel="Agregar etiqueta"
                placeholder="Ej. Responsive"
                error={errors[`${index}.tags`]}
              />
            </li>
          ))}
        </ul>

        <div className="offer-editor__actions">
          <button type="submit" className="btn btn--primary">
            Guardar servicios
          </button>
        </div>
      </form>

      {/* Confirmación antes de quitar una card */}
      <ConfirmDialog
        isOpen={Boolean(serviceToRemove)}
        title="Quitar servicio"
        message={
          serviceToRemove
            ? `¿Quitar "${serviceToRemove.title || 'este servicio'}" de la lista? Se publicará al guardar los cambios.`
            : ''
        }
        confirmLabel="Sí, quitar"
        danger
        onConfirm={handleConfirmRemove}
        onCancel={() => setServiceToRemove(null)}
      />
    </section>
  );
}

export default ServicesEditor;
