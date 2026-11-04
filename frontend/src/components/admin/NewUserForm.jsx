/* ==========================================================================
   FORMULARIO PARA CREAR UN USUARIO (Panel Admin)
   --------------------------------------------------------------------------
   Campos: Nombre o Empresa, Correo y Contraseña.
   El usuario se crea como Cliente y activo; el rol se puede cambiar después
   con la opción "Editar". El administrador mantiene su propia sesión.

   Casilla de autorización (obligatoria): la Ley 1581 de 2012 exige tener
   la autorización PREVIA, expresa e informada del cliente antes de guardar
   sus datos. El admin confirma aquí que ya la tiene por escrito (contrato,
   correo o WhatsApp) y debe conservar esa prueba (art. 8 Decreto 1377/2013).
   ========================================================================== */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUser, validateNewUser } from '../../services/authService.js';
import { MAX_LENGTH } from '../../utils/validators.js';
import { LEGAL_ROUTES } from '../../data/siteContent.js';

/**
 * @param {function} onCreated - Recibe el usuario ya creado.
 * @param {function} onCancel - Cierra sin guardar.
 */
function NewUserForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', consent: false });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    // La casilla de autorización guarda true/false; los demás campos, el texto
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setGeneralError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Validación FrontEnd
    const formErrors = validateNewUser(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    // El servicio vuelve a validar ("BackEnd") y guarda
    setIsSaving(true);
    try {
      onCreated(await createUser(form));
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setGeneralError(error.fieldErrors ? '' : error.message);
      setIsSaving(false);
    }
  }

  /** Pinta un campo con su etiqueta y su error (evita repetir código) */
  function renderField({ name, label, type = 'text', placeholder, autoComplete, maxLength }) {
    return (
      <div className={`field ${errors[name] ? 'field--error' : ''}`}>
        <label className="field__label" htmlFor={`new-user-${name}`}>
          {label}
        </label>
        <input
          id={`new-user-${name}`}
          name={name}
          type={type}
          className="field__input"
          placeholder={placeholder}
          value={form[name]}
          onChange={handleChange}
          autoComplete={autoComplete}
          maxLength={maxLength}
        />
        {errors[name] && <p className="field__error">{errors[name]}</p>}
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {renderField({ name: 'name', label: 'Nombre o empresa', placeholder: 'Ej. Café Andino SAS', autoComplete: 'off', maxLength: MAX_LENGTH.PERSON_NAME })}
      {renderField({ name: 'email', label: 'Correo', type: 'email', placeholder: 'cliente@correo.com', autoComplete: 'off', maxLength: MAX_LENGTH.EMAIL })}
      {renderField({ name: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 8, con letras y números', autoComplete: 'new-password', maxLength: MAX_LENGTH.PASSWORD })}

      <p className="field__hint">El usuario se crea como Cliente y activo. Podrás cambiar su rol con "Editar".</p>

      {/* Autorización del titular (Ley 1581 de 2012) */}
      <div className={`field ${errors.consent ? 'field--error' : ''}`}>
        <label className="checkbox">
          <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} />
          <span>
            El cliente ya aceptó la cotización o el contrato y me autorizó por escrito a tratar sus datos según la{' '}
            <Link to={LEGAL_ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer">
              Política de privacidad
            </Link>
            .
          </span>
        </label>
        {errors.consent && <p className="field__error">{errors.consent}</p>}
      </div>

      {generalError && (
        <p className="form-alert" role="alert">
          {generalError}
        </p>
      )}

      <div className="modal__actions">
        <button
          type="button"
          className="btn btn--outline"
          onClick={(event) => {
            event.preventDefault();
            onCancel();
          }}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={isSaving}>
          {isSaving ? 'Creando...' : 'Crear usuario'}
        </button>
      </div>
    </form>
  );
}

export default NewUserForm;
