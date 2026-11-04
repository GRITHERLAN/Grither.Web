/* ==========================================================================
   PANEL ADMIN: INFORMACIÓN DE CONTACTO
   --------------------------------------------------------------------------
   Editable solo por el administrador:
     Correo, Teléfono, Descripción de marca, Indicadores,
     Instagram, LinkedIn y Portafolio web personal.
   Los cambios se ven de inmediato en la página pública de Contacto.
   ========================================================================== */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { getContactInfo, saveContactInfo, validateContactInfo } from '../../services/siteInfoService.js';
import IndicatorsEditor from '../../components/admin/IndicatorsEditor.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { MAX_LENGTH } from '../../utils/validators.js';

/* Campos de texto simples del formulario (se pintan con un map) */
const TEXT_FIELDS = [
  { name: 'email', label: 'Correo', type: 'email', placeholder: 'hola@grither.co', maxLength: MAX_LENGTH.EMAIL },
  { name: 'phone', label: 'Teléfono', type: 'tel', placeholder: '+57 300 000 0000', maxLength: MAX_LENGTH.PHONE },
  // Domicilio del Responsable: se muestra en las páginas legales
  { name: 'city', label: 'Ciudad (páginas legales)', type: 'text', placeholder: 'Dosquebradas, Risaralda, Colombia', maxLength: MAX_LENGTH.CITY },
  { name: 'instagram', label: 'Instagram (enlace)', type: 'url', placeholder: 'https://www.instagram.com/...', maxLength: MAX_LENGTH.URL },
  { name: 'linkedin', label: 'LinkedIn (enlace)', type: 'url', placeholder: 'https://www.linkedin.com/in/...', maxLength: MAX_LENGTH.URL },
  { name: 'portfolio', label: 'Portafolio web personal', type: 'url', placeholder: 'https://...', maxLength: MAX_LENGTH.URL },
];

function AdminContactPage() {
  // Primero se pide la información guardada; el formulario se monta cuando llega
  const { data, error, reload } = useAsyncData(getContactInfo, []);

  if (!data) {
    return <LoadingState label="Cargando información de contacto..." error={error} onRetry={reload} />;
  }
  return <ContactInfoForm initialData={data} />;
}

/**
 * Formulario de edición (se monta con los datos ya cargados).
 * @param {object} initialData - Información de contacto guardada.
 */
function ContactInfoForm({ initialData }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  function handleIndicatorsChange(indicators) {
    setForm((current) => ({ ...current, indicators }));
    setErrors((current) => ({ ...current, indicators: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return; // evita guardar dos veces con doble clic

    // Validación FrontEnd
    const formErrors = validateContactInfo(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      showToast('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    // El servicio vuelve a validar y guarda
    setIsSaving(true);
    try {
      setForm(await saveContactInfo(form));
      showToast('Información de contacto guardada.');
    } catch (error) {
      setErrors(error.fieldErrors || {});
      showToast(error.message, 'error');
    }
    setIsSaving(false);
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">Contacto</h1>
          <p className="admin-header__text">Datos que se muestran en la página pública de Contacto.</p>
        </div>
        <Link to="/contacto" className="btn btn--outline">
          Ver página
        </Link>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <section className="card admin-form-section">
          <h2 className="admin-form-section__title">Datos de contacto</h2>
          <div className="form__row">
            {TEXT_FIELDS.map((field) => (
              <div key={field.name} className={`field ${errors[field.name] ? 'field--error' : ''}`}>
                <label className="field__label" htmlFor={`contact-${field.name}`}>
                  {field.label}
                </label>
                <input
                  id={`contact-${field.name}`}
                  name={field.name}
                  type={field.type}
                  className="field__input"
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={handleChange}
                  maxLength={field.maxLength}
                />
                {errors[field.name] && <p className="field__error">{errors[field.name]}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="card admin-form-section">
          <h2 className="admin-form-section__title">Marca</h2>
          <div className={`field ${errors.brandDescription ? 'field--error' : ''}`}>
            <label className="field__label" htmlFor="contact-brand">
              Descripción de marca
            </label>
            <textarea id="contact-brand" name="brandDescription" className="field__input" value={form.brandDescription} onChange={handleChange} maxLength={MAX_LENGTH.BRAND_DESCRIPTION} />
            {errors.brandDescription && <p className="field__error">{errors.brandDescription}</p>}
          </div>

          <IndicatorsEditor indicators={form.indicators} onChange={handleIndicatorsChange} error={errors.indicators} />
        </section>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn--primary" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </>
  );
}

export default AdminContactPage;
