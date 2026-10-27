/* ==========================================================================
   FORMULARIO DE EDICIÓN DE USUARIO (Panel Admin)
   --------------------------------------------------------------------------
   Permite cambiar: nombre de usuario, correo, rol y contraseña.
   La contraseña es opcional: si se deja vacía, se conserva la actual.
   Un administrador no puede cambiar su propio rol (el select se bloquea).
   ========================================================================== */

import { useState } from 'react';
import Select from '../ui/Select.jsx';
import { ROLES, ROLE_LABELS, updateUser, validateUserUpdate } from '../../services/authService.js';

/* Opciones del desplegable Rol */
const ROLE_OPTIONS = [
  { value: ROLES.USER, label: ROLE_LABELS[ROLES.USER] },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
];

/**
 * @param {object} user - Usuario a editar.
 * @param {string} actorId - Id del administrador que está editando.
 * @param {function} onSaved - Recibe el usuario ya guardado.
 * @param {function} onCancel - Cierra sin guardar.
 */
function UserForm({ user, actorId, onSaved, onCancel }) {
  const isSelf = user.id === actorId;

  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    password: '',
  });
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
    const formErrors = validateUserUpdate(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    // El servicio vuelve a validar ("BackEnd") y guarda
    setIsSaving(true);
    try {
      const savedUser = await updateUser(user.id, form, actorId);
      onSaved(savedUser);
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setGeneralError(error.fieldErrors ? '' : error.message);
      setIsSaving(false);
    }
  }

  /** Clase del campo según tenga error o no */
  function fieldClass(name) {
    return `field ${errors[name] ? 'field--error' : ''}`;
  }

  function renderError(name) {
    return errors[name] ? <p className="field__error">{errors[name]}</p> : null;
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form__row">
        <div className={fieldClass('name')}>
          <label className="field__label" htmlFor="user-name">
            Nombre de usuario
          </label>
          <input id="user-name" name="name" className="field__input" value={form.name} onChange={handleChange} autoComplete="off" />
          {renderError('name')}
        </div>

        <div className={fieldClass('email')}>
          <label className="field__label" htmlFor="user-email">
            Correo
          </label>
          <input id="user-email" name="email" type="email" className="field__input" value={form.email} onChange={handleChange} autoComplete="off" />
          {renderError('email')}
        </div>
      </div>

      <div className="form__row">
        <div className={fieldClass('role')}>
          <label className="field__label" htmlFor="user-role">
            Rol
          </label>
          <Select id="user-role" name="role" value={form.role} onChange={handleChange} options={ROLE_OPTIONS} disabled={isSelf} />
          {isSelf && <p className="field__hint">No puedes cambiar tu propio rol.</p>}
          {renderError('role')}
        </div>

        <div className={fieldClass('password')}>
          <label className="field__label" htmlFor="user-password">
            Nueva contraseña <span className="field__hint">(opcional)</span>
          </label>
          <input
            id="user-password"
            name="password"
            type="password"
            className="field__input"
            placeholder="Déjala vacía para conservar la actual"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          {renderError('password')}
        </div>
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
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

export default UserForm;
