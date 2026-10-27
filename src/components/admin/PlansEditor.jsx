/* ==========================================================================
   EDITOR DE PLANES
   --------------------------------------------------------------------------
   Permite al administrador editar, agregar y quitar las cards de planes de
   la página Servicios. Reglas:
     - Precio en COP; si se deja vacío la card muestra "Cotización".
     - Solo un plan puede ser "Más elegido" (al marcar uno, se desmarca el otro).
   Los cambios solo se publican al pulsar "Guardar planes".
   ========================================================================== */

import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import {
  MAX_CARDS,
  MIN_CARDS,
  createOfferId,
  getPlans,
  savePlans,
  validatePlans,
} from '../../services/offerService.js';
import { formatCOP } from '../../utils/format.js';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import Icon from '../ui/Icon.jsx';
import StringListEditor from './StringListEditor.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import './OfferEditor.css';

/** El input de precio trabaja con texto: null se muestra como cadena vacía */
function toFormPlans(plans) {
  return plans.map((plan) => ({ ...plan, price: plan.price === null ? '' : String(plan.price) }));
}

function PlansEditor() {
  // Primero se piden los planes guardados; el editor se monta cuando llegan
  const { data, error, reload } = useAsyncData(getPlans, []);

  if (!data) {
    return (
      <section className="card offer-editor">
        <LoadingState label="Cargando planes..." error={error} onRetry={reload} />
      </section>
    );
  }
  return <PlansForm initialPlans={data} />;
}

/**
 * Editor de las cards (se monta con los datos ya cargados).
 * @param {Array} initialPlans - Cards de planes guardadas.
 */
function PlansForm({ initialPlans }) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState(() => toFormPlans(initialPlans));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  // Card que se quiere quitar (null = ventana cerrada)
  const [planToRemove, setPlanToRemove] = useState(null);

  /** Cambia uno o varios campos del plan en la posición "index" */
  function updatePlan(index, changes) {
    setPlans((current) =>
      current.map((plan, planIndex) => (planIndex === index ? { ...plan, ...changes } : plan))
    );
    // Borramos los errores de los campos que se acaban de tocar
    setErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((field) => delete next[`${index}.${field}`]);
      delete next.list;
      return next;
    });
  }

  /** Marca/desmarca "Más elegido": si se marca uno, los demás se desmarcan */
  function handleFeaturedChange(index, checked) {
    setPlans((current) =>
      current.map((plan, planIndex) => ({ ...plan, featured: planIndex === index ? checked : false }))
    );
    setErrors((current) => {
      const next = { ...current };
      delete next.list;
      return next;
    });
  }

  function handleAdd(event) {
    event.preventDefault();
    setPlans((current) => [
      ...current,
      {
        id: createOfferId('plan'),
        name: '',
        price: '',
        description: '',
        features: [''],
        cta: 'Elegir plan',
        featured: false,
      },
    ]);
    setErrors({});
  }

  function handleConfirmRemove() {
    setPlans((current) => current.filter((plan) => plan.id !== planToRemove.id));
    setPlanToRemove(null);
    setErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return; // evita guardar dos veces con doble clic

    // Validación FrontEnd
    const formErrors = validatePlans(plans);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      showToast('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    // El servicio vuelve a validar ("BackEnd") y guarda
    setIsSaving(true);
    try {
      setPlans(toFormPlans(await savePlans(plans)));
      setErrors({});
      showToast('Planes guardados. Ya se ven en la página.');
    } catch (error) {
      setErrors(error.fieldErrors || {});
      showToast(error.message, 'error');
    }
    setIsSaving(false);
  }

  /** Pinta el error de un campo de una card */
  function renderError(index, field) {
    const message = errors[`${index}.${field}`];
    return message ? <p className="field__error">{message}</p> : null;
  }

  return (
    <section className="card offer-editor" aria-labelledby="plans-editor-title">
      <header className="offer-editor__header">
        <div>
          <h2 id="plans-editor-title" className="admin-form-section__title">
            Planes
          </h2>
          <p className="text-muted">Cards de planes ({plans.length}/{MAX_CARDS}).</p>
        </div>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          disabled={plans.length >= MAX_CARDS}
          onClick={handleAdd}
        >
          <Icon name="plus" className="offer-editor__btn-icon" />
          Agregar plan
        </button>
      </header>

      {errors.list && (
        <p className="form-alert" role="alert">
          {errors.list}
        </p>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <ul className="offer-editor__list">
          {plans.map((plan, index) => (
            <li key={plan.id} className="offer-card">
              <header className="offer-card__header">
                <p className="offer-card__code text-mono">PLAN {index + 1}</p>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Quitar plan ${plan.name || index + 1}`}
                  title="Quitar plan"
                  disabled={plans.length <= MIN_CARDS}
                  onClick={(event) => {
                    event.preventDefault();
                    setPlanToRemove(plan);
                  }}
                >
                  <Icon name="trash" />
                </button>
              </header>

              <div className="form__row">
                <div className={`field ${errors[`${index}.name`] ? 'field--error' : ''}`}>
                  <label className="field__label" htmlFor={`${plan.id}-name`}>
                    Nombre del plan
                  </label>
                  <input
                    id={`${plan.id}-name`}
                    className="field__input"
                    placeholder="Ej. Esencial"
                    value={plan.name}
                    onChange={(event) => updatePlan(index, { name: event.target.value })}
                  />
                  {renderError(index, 'name')}
                </div>

                <div className={`field ${errors[`${index}.price`] ? 'field--error' : ''}`}>
                  <label className="field__label" htmlFor={`${plan.id}-price`}>
                    Precio <span className="field__hint">(COP · vacío = Cotización)</span>
                  </label>
                  <input
                    id={`${plan.id}-price`}
                    type="number"
                    min="0"
                    step="1000"
                    inputMode="numeric"
                    className="field__input text-mono"
                    placeholder="Cotización"
                    value={plan.price}
                    onChange={(event) => updatePlan(index, { price: event.target.value })}
                  />
                  {plan.price !== '' && !errors[`${index}.price`] && Number(plan.price) > 0 && (
                    <p className="field__hint">{formatCOP(plan.price)}</p>
                  )}
                  {renderError(index, 'price')}
                </div>
              </div>

              <div className={`field ${errors[`${index}.description`] ? 'field--error' : ''}`}>
                <label className="field__label" htmlFor={`${plan.id}-description`}>
                  Descripción
                </label>
                <textarea
                  id={`${plan.id}-description`}
                  className="field__input offer-card__textarea"
                  value={plan.description}
                  onChange={(event) => updatePlan(index, { description: event.target.value })}
                />
                {renderError(index, 'description')}
              </div>

              <StringListEditor
                label="Características"
                items={plan.features}
                onChange={(features) => updatePlan(index, { features })}
                addLabel="Agregar característica"
                placeholder="Ej. Panel administrador"
                error={errors[`${index}.features`]}
              />

              <div className="form__row">
                <div className={`field ${errors[`${index}.cta`] ? 'field--error' : ''}`}>
                  <label className="field__label" htmlFor={`${plan.id}-cta`}>
                    Texto del botón
                  </label>
                  <input
                    id={`${plan.id}-cta`}
                    className="field__input"
                    placeholder="Ej. Elegir Esencial"
                    value={plan.cta}
                    onChange={(event) => updatePlan(index, { cta: event.target.value })}
                  />
                  {renderError(index, 'cta')}
                </div>

                <div className="field offer-card__featured">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={plan.featured}
                      onChange={(event) => handleFeaturedChange(index, event.target.checked)}
                    />
                    Marcar como "Más elegido"
                  </label>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="offer-editor__actions">
          <button type="submit" className="btn btn--primary" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar planes'}
          </button>
        </div>
      </form>

      {/* Confirmación antes de quitar una card */}
      <ConfirmDialog
        isOpen={Boolean(planToRemove)}
        title="Quitar plan"
        message={
          planToRemove
            ? `¿Quitar "${planToRemove.name || 'este plan'}" de la lista? Se publicará al guardar los cambios.`
            : ''
        }
        confirmLabel="Sí, quitar"
        danger
        onConfirm={handleConfirmRemove}
        onCancel={() => setPlanToRemove(null)}
      />
    </section>
  );
}

export default PlansEditor;
