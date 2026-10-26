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

/* Campos de texto simples del formulario (se pintan con un map) */
const TEXT_FIELDS = [
  { name: 'email', label: 'Correo', type: 'email', placeholder: 'hola@grither.co' },
  { name: 'phone', label: 'Teléfono', type: 'tel', placeholder: '+57 300 000 0000' },
  { name: 'instagram', label: 'Instagram (enlace)', type: 'url', placeholder: 'https://www.instagram.com/...' },
  { name: 'linkedin', label: 'LinkedIn (enlace)', type: 'url', placeholder: 'https://www.linkedin.com/in/...' },
  { name: 'portfolio', label: 'Portafolio web personal', type: 'url', placeholder: 'https://...' },
];

function AdminContactPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState(getContactInfo);
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  function handleIndicatorsChange(indicators) {
    setForm((current) => ({ ...current, indicators }));
    setErrors((current) => ({ ...current, indicators: '' }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Validación FrontEnd
    const formErrors = validateContactInfo(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      showToast('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    // El servicio vuelve a validar y guarda
    try {
      setForm(saveContactInfo(form));
      showToast('Información de contacto guardada.');
    } catch (error) {
      setErrors(error.fieldErrors || {});
      showToast(error.message, 'error');
    }
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
            <textarea id="contact-brand" name="brandDescription" className="field__input" value={form.brandDescription} onChange={handleChange} />
            {errors.brandDescription && <p className="field__error">{errors.brandDescription}</p>}
          </div>

          <IndicatorsEditor indicators={form.indicators} onChange={handleIndicatorsChange} error={errors.indicators} />
        </section>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn--primary">
            Guardar cambios
          </button>
        </div>
      </form>
    </>
  );
}

export default AdminContactPage;
