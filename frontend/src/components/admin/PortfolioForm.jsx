/* ==========================================================================
   FORMULARIO DE PORTAFOLIO (Panel Admin)
   --------------------------------------------------------------------------
   Sirve para crear y para editar un portafolio. Campos:
     - Título (no se puede repetir), Categoría y Descripción.
     - Enlace del botón "Ver web".
     - Stack: lista de tecnologías (se muestran como etiquetas en la card).
     - Tipo de proyecto: real o de prueba.
     - Imagen de portada (opcional): se comprime antes de subirla.
   Valida en vivo (FrontEnd) y el servicio vuelve a validar al guardar (BackEnd).
   ========================================================================== */

import { useRef, useState } from 'react';
import {
  MAX_STACK_ITEMS,
  PORTFOLIO_TYPES,
  PORTFOLIO_TYPE_OPTIONS,
  createPortfolioItem,
  updatePortfolioItem,
  validatePortfolioItem,
} from '../../services/portfolioService.js';
import { MAX_LENGTH } from '../../utils/validators.js';
import { ACCEPTED_PHOTO, processImageFile } from '../../utils/mediaFiles.js';
import Select from '../ui/Select.jsx';
import Icon from '../ui/Icon.jsx';
import StringListEditor from './StringListEditor.jsx';

/* Valores de un portafolio nuevo */
const EMPTY_FORM = {
  title: '',
  category: '',
  description: '',
  url: '',
  stack: [''],
  type: PORTFOLIO_TYPES.REAL,
};

/**
 * @param {object|null} item - Portafolio a editar (null = crear uno nuevo).
 * @param {object[]} existingItems - Todos los portafolios (para revisar títulos repetidos).
 * @param {function} onSaved - Recibe el portafolio guardado.
 * @param {function} onCancel - Cierra sin guardar.
 */
function PortfolioForm({ item = null, existingItems, onSaved, onCancel }) {
  const isEditing = Boolean(item);

  // Si se edita, el formulario arranca con los datos actuales
  const [form, setForm] = useState(() =>
    isEditing
      ? {
          title: item.title,
          category: item.category,
          description: item.description,
          url: item.url,
          stack: item.stack.length > 0 ? item.stack : [''],
          type: item.type,
        }
      : EMPTY_FORM
  );

  // Portada: vista previa que se ve en pantalla y archivo pendiente de subir
  const [imagePreview, setImagePreview] = useState(item?.imageUrl || '');
  const [imageFile, setImageFile] = useState(null);
  const imageInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Hasta el primer intento de guardar no se marcan errores (para no regañar al escribir)
  const [wasSubmitted, setWasSubmitted] = useState(false);

  /** Actualiza un campo y, si ya se intentó guardar, revalida en vivo */
  function updateField(name, value) {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setGeneralError('');
    if (wasSubmitted) {
      setErrors(validatePortfolioItem(nextForm, existingItems, item?.id ?? null));
    }
  }

  function handleChange(event) {
    updateField(event.target.name, event.target.value);
  }

  /** Abre el selector de archivos para la portada */
  function handleChooseImage(event) {
    event.preventDefault();
    imageInputRef.current?.click();
  }

  /** Comprime la imagen elegida y muestra su vista previa */
  async function handleImageSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    try {
      const { file: compressed, previewUrl } = await processImageFile(file);
      setImageFile(compressed);
      setImagePreview(previewUrl);
      setErrors((current) => ({ ...current, image: '' }));
    } catch (error) {
      setErrors((current) => ({ ...current, image: error.message }));
    }
  }

  function handleRemoveImage(event) {
    event.preventDefault();
    setImageFile(null);
    setImagePreview('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return; // evita guardar dos veces con doble clic
    setWasSubmitted(true);

    // Validación FrontEnd
    const formErrors = validatePortfolioItem(form, existingItems, item?.id ?? null);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    // El servicio vuelve a validar ("BackEnd"), sube la imagen y guarda
    setIsSaving(true);
    try {
      const saved = isEditing
        ? await updatePortfolioItem(item.id, form, {
            file: imageFile,
            // Se quitó la portada que ya tenía y no se eligió otra
            remove: !imageFile && !imagePreview,
          })
        : await createPortfolioItem(form, imageFile);
      onSaved(saved);
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setGeneralError(error.fieldErrors ? '' : error.message);
      setIsSaving(false);
    }
  }

  /** Pinta un campo de texto con su etiqueta y su error (evita repetir código) */
  function renderField({ name, label, placeholder, maxLength, type = 'text', hint = '' }) {
    return (
      <div className={`field ${errors[name] ? 'field--error' : ''}`}>
        <label className="field__label" htmlFor={`portfolio-${name}`}>
          {label}
        </label>
        <input
          id={`portfolio-${name}`}
          name={name}
          type={type}
          className="field__input"
          placeholder={placeholder}
          value={form[name]}
          onChange={handleChange}
          maxLength={maxLength}
          autoComplete="off"
        />
        {hint && !errors[name] && <p className="field__hint">{hint}</p>}
        {errors[name] && <p className="field__error">{errors[name]}</p>}
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {renderField({ name: 'title', label: 'Título', placeholder: 'Ej. Tienda online de café', maxLength: MAX_LENGTH.PORTFOLIO_TITLE })}

      <div className="form__row">
        {renderField({
          name: 'category',
          label: 'Categoría',
          placeholder: 'Ej. E-commerce',
          maxLength: MAX_LENGTH.PORTFOLIO_CATEGORY,
          hint: 'Con esta categoría se arman los filtros de la página.',
        })}

        <div className={`field ${errors.type ? 'field--error' : ''}`}>
          <label className="field__label" htmlFor="portfolio-type">
            Tipo de proyecto
          </label>
          <Select id="portfolio-type" name="type" value={form.type} options={PORTFOLIO_TYPE_OPTIONS} onChange={handleChange} />
          {errors.type && <p className="field__error">{errors.type}</p>}
        </div>
      </div>

      <div className={`field ${errors.description ? 'field--error' : ''}`}>
        <label className="field__label" htmlFor="portfolio-description">
          Descripción
        </label>
        <textarea
          id="portfolio-description"
          name="description"
          className="field__input"
          rows={3}
          placeholder="Qué hace el proyecto y para quién es."
          value={form.description}
          onChange={handleChange}
          maxLength={MAX_LENGTH.PORTFOLIO_DESCRIPTION}
        />
        {errors.description && <p className="field__error">{errors.description}</p>}
      </div>

      {renderField({
        name: 'url',
        label: 'Enlace del botón "Ver web"',
        type: 'url',
        placeholder: 'https://www.mitienda.com',
        maxLength: MAX_LENGTH.URL,
      })}

      <StringListEditor
        label="Stack usado"
        items={form.stack}
        onChange={(stack) => updateField('stack', stack)}
        addLabel="Agregar tecnología"
        placeholder="Ej. React"
        max={MAX_STACK_ITEMS}
        error={errors.stack}
      />

      {/* ---------- Imagen de portada (opcional) ---------- */}
      <div className={`field ${errors.image ? 'field--error' : ''}`}>
        <p className="field__label">Imagen de portada (opcional)</p>
        <div className="portfolio-form__image-row">
          {imagePreview ? (
            <img className="portfolio-form__image" src={imagePreview} alt="Vista previa de la portada" />
          ) : (
            <span className="portfolio-form__image portfolio-form__image--empty" aria-hidden="true">
              <Icon name="image" />
            </span>
          )}
          <div className="portfolio-form__image-actions">
            <input ref={imageInputRef} type="file" accept={ACCEPTED_PHOTO} className="sr-only" tabIndex={-1} onChange={handleImageSelected} />
            <button type="button" className="btn btn--outline btn--sm" onClick={handleChooseImage}>
              <Icon name="upload" className="portfolio-form__btn-icon" />
              {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            {imagePreview && (
              <button type="button" className="btn btn--outline btn--sm" onClick={handleRemoveImage}>
                Quitar imagen
              </button>
            )}
          </div>
        </div>
        {errors.image ? (
          <p className="field__error">{errors.image}</p>
        ) : (
          <p className="field__hint">PNG, JPG o WEBP. Sin imagen se muestra un boceto de navegador.</p>
        )}
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
          {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear portafolio'}
        </button>
      </div>
    </form>
  );
}

export default PortfolioForm;
