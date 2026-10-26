/* ==========================================================================
   FORMULARIO PARA CREAR UN USUARIO (Panel Admin)
   --------------------------------------------------------------------------
   Campos: Nombre o Empresa, Correo y Contraseña.
   El usuario se crea como Cliente y activo; el rol se puede cambiar después
   con la opción "Editar". El administrador mantiene su propia sesión.
   ========================================================================== */

import { useState } from 'react';
import { createUser, validateNewUser } from '../../services/authService.js';

/**
 * @param {function} onCreated - Recibe el usuario ya creado.
 * @param {function} onCancel - Cierra sin guardar.
 */
function NewUserForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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
  function renderField({ name, label, type = 'text', placeholder, autoComplete }) {
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
        />
        {errors[name] && <p className="field__error">{errors[name]}</p>}
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {renderField({ name: 'name', label: 'Nombre o empresa', placeholder: 'Ej. Café Andino SAS', autoComplete: 'off' })}
      {renderField({ name: 'email', label: 'Correo', type: 'email', placeholder: 'cliente@correo.com', autoComplete: 'off' })}
      {renderField({ name: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 6 caracteres', autoComplete: 'new-password' })}

      <p className="field__hint">El usuario se crea como Cliente y activo. Podrás cambiar su rol con "Editar".</p>

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
