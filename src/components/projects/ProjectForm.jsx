/* ==========================================================================
   FORMULARIO CREAR / EDITAR PROYECTO
   --------------------------------------------------------------------------
   Campos: ID, Nombre, Descripción, Precio (COP), Categoría, Fase,
           Usuario que contrató, Enlace del botón Contactar e imágenes/videos.
   Reglas:
     - ID y Nombre no se pueden repetir. Se revisa:
         1) En vivo mientras se escribe (FrontEnd).
         2) Otra vez en projectService al guardar ("BackEnd").
     - Al crear, el estado es ACTIVO y la fecha de creación es automática.
     - Al editar, el ID no se puede cambiar y la fecha se conserva.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import Select from '../ui/Select.jsx';
import {
  PROJECT_CATEGORIES,
  PROJECT_PHASES,
  createProject,
  updateProject,
  validateProject,
  getTakenProjectKeys,
} from '../../services/projectService.js';
import { ACCEPTED_MEDIA, MAX_FILES_PER_PROJECT, MAX_VIDEO_LABEL, processMediaFile } from '../../utils/mediaFiles.js';
import { formatCOP, formatDate } from '../../utils/format.js';
import { normalizeText } from '../../utils/validators.js';
import './ProjectForm.css';

/* Opciones del desplegable Categoría (la primera, vacía, sirve de aviso) */
const CATEGORY_OPTIONS = [
  { value: '', label: 'Selecciona una categoría' },
  ...PROJECT_CATEGORIES.map((category) => ({ value: category, label: category })),
];

/** Arma el estado inicial: vacío al crear o con los datos al editar */
function getInitialForm(project) {
  if (project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      price: String(project.price),
      category: project.category,
      phase: project.phase,
      clientId: project.clientId,
      contactLink: project.contactLink,
      media: project.media,
    };
  }
  return {
    id: '',
    name: '',
    description: '',
    price: '',
    category: '',
    phase: PROJECT_PHASES[0].value,
    clientId: '',
    contactLink: '',
    media: [],
  };
}

/**
 * @param {object|null} project - Proyecto a editar o null para crear.
 * @param {Array} clients - Usuarios con rol cliente.
 * @param {function} onSaved - Recibe el proyecto guardado.
 * @param {function} onCancel - Cierra sin guardar.
 */
function ProjectForm({ project, clients, onSaved, onCancel }) {
  const isEditing = Boolean(project);
  const editingId = isEditing ? project.id : null;

  const [form, setForm] = useState(() => getInitialForm(project));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // IDs y nombres ya usados: se piden UNA sola vez al abrir el formulario
  // (RENDIMIENTO: luego se revisan en memoria en cada tecla, sin ir a internet).
  // Mientras llegan, son dos listas vacías: el servicio igual revisa al guardar.
  const [takenKeys, setTakenKeys] = useState(() => ({ ids: new Set(), names: new Set() }));
  useEffect(() => {
    let isCurrent = true;
    getTakenProjectKeys(editingId)
      .then((keys) => {
        if (isCurrent) setTakenKeys(keys);
      })
      .catch(() => {
        // Si falla, no bloqueamos el formulario: la base de datos revisa al guardar
      });
    return () => {
      isCurrent = false;
    };
  }, [editingId]);

  // Opciones del desplegable de clientes (la primera, vacía, sirve de aviso)
  const clientOptions = useMemo(
    () => [
      { value: '', label: clients.length ? 'Selecciona un cliente' : 'No hay clientes registrados' },
      ...clients.map((client) => ({ value: client.id, label: `${client.name} (${client.email})` })),
    ],
    [clients]
  );

  /** Cambia un campo y revisa duplicados en vivo para ID y Nombre */
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setGeneralError('');

    // Solo ID y Nombre tienen validación en vivo; en los demás campos
    // borramos el error solo si había uno (evita re-renders innecesarios)
    if (name !== 'id' && name !== 'name') {
      setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
      return;
    }

    // Validación en vivo (FrontEnd) de los campos que no se pueden repetir
    const key = normalizeText(value);
    let liveError = '';
    if (name === 'id' && key && takenKeys.ids.has(key)) {
      liveError = 'Ya existe un proyecto con este ID.';
    }
    if (name === 'name' && key && takenKeys.names.has(key)) {
      liveError = 'Ya existe un proyecto con este nombre.';
    }
    setErrors((current) => (current[name] === liveError ? current : { ...current, [name]: liveError }));
  }

  /** Procesa los archivos elegidos uno por uno (comprimir imágenes, validar videos) */
  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    // Limpiamos el input para poder volver a elegir el mismo archivo
    event.target.value = '';
    if (files.length === 0) return;

    setMediaError('');
    const freeSlots = MAX_FILES_PER_PROJECT - form.media.length;
    if (files.length > freeSlots) {
      setMediaError(`Puedes subir máximo ${MAX_FILES_PER_PROJECT} archivos por proyecto.`);
    }

    setIsProcessingMedia(true);
    const processed = [];
    for (const file of files.slice(0, Math.max(freeSlots, 0))) {
      try {
        processed.push(await processMediaFile(file));
      } catch (error) {
        setMediaError(error.message);
      }
    }
    setForm((current) => ({ ...current, media: [...current.media, ...processed] }));
    setIsProcessingMedia(false);
  }

  /** Quita un archivo de la lista */
  function handleRemoveMedia(event, indexToRemove) {
    event.preventDefault();
    setForm((current) => ({
      ...current,
      media: current.media.filter((_, index) => index !== indexToRemove),
    }));
  }

  /** Abre el selector de archivos del sistema */
  function handleOpenFilePicker(event) {
    event.preventDefault();
    fileInputRef.current?.click();
  }

  /** Guarda el proyecto */
  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return; // evita guardar dos veces con doble clic

    // 1) Validación FrontEnd completa (en memoria, sin esperar a internet)
    const formErrors = validateProject(form, { takenKeys, clients });
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setGeneralError('Revisa los campos marcados en rojo.');
      return;
    }

    // 2) El servicio vuelve a validar ("BackEnd") y guarda
    setIsSaving(true);
    try {
      const savedProject = isEditing
        ? await updateProject(editingId, form)
        : await createProject(form);
      onSaved(savedProject);
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setGeneralError(error.message);
      setIsSaving(false);
    }
  }

  /** Clase del campo según tenga error o no */
  function fieldClass(name) {
    return `field ${errors[name] ? 'field--error' : ''}`;
  }

  /** Mensaje de error debajo del campo */
  function renderError(name) {
    return errors[name] ? <p className="field__error">{errors[name]}</p> : null;
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {/* Datos automáticos: informativos, no editables */}
      <p className="project-form__auto text-mono">
        {isEditing
          ? `Creado el ${formatDate(project.createdAt)} · la fecha de creación no cambia al editar`
          : 'Fecha de creación automática · se crea en estado Activo'}
      </p>

      <div className="form__row">
        <div className={fieldClass('id')}>
          <label className="field__label" htmlFor="project-id">
            ID del proyecto
          </label>
          <input
            id="project-id"
            name="id"
            className="field__input text-mono"
            placeholder="GTH-8050"
            value={form.id}
            onChange={handleChange}
            disabled={isEditing}
            autoComplete="off"
          />
          {isEditing && <p className="field__hint">El ID no se puede cambiar.</p>}
          {renderError('id')}
        </div>

        <div className={fieldClass('name')}>
          <label className="field__label" htmlFor="project-name">
            Nombre
          </label>
          <input id="project-name" name="name" className="field__input" placeholder="Ej. Tienda online de café" value={form.name} onChange={handleChange} autoComplete="off" />
          {renderError('name')}
        </div>
      </div>

      <div className={fieldClass('description')}>
        <label className="field__label" htmlFor="project-description">
          Descripción
        </label>
        <textarea id="project-description" name="description" className="field__input" placeholder="¿Qué incluye el proyecto?" value={form.description} onChange={handleChange} />
        {renderError('description')}
      </div>

      <div className="form__row">
        <div className={fieldClass('price')}>
          <label className="field__label" htmlFor="project-price">
            Precio <span className="field__hint">(COP - Peso colombiano)</span>
          </label>
          <input id="project-price" name="price" type="number" min="0" step="1000" inputMode="numeric" className="field__input text-mono" placeholder="5000000" value={form.price} onChange={handleChange} />
          {form.price && !errors.price && <p className="field__hint">{formatCOP(form.price)}</p>}
          {renderError('price')}
        </div>

        <div className={fieldClass('category')}>
          <label className="field__label" htmlFor="project-category">
            Categoría
          </label>
          <Select id="project-category" name="category" value={form.category} onChange={handleChange} options={CATEGORY_OPTIONS} />
          {renderError('category')}
        </div>
      </div>

      <div className="form__row">
        <div className={fieldClass('phase')}>
          <label className="field__label" htmlFor="project-phase">
            Fase actual
          </label>
          <Select id="project-phase" name="phase" value={form.phase} onChange={handleChange} options={PROJECT_PHASES} />
          {renderError('phase')}
        </div>

        <div className={fieldClass('clientId')}>
          <label className="field__label" htmlFor="project-client">
            Usuario que contrató
          </label>
          <Select id="project-client" name="clientId" value={form.clientId} onChange={handleChange} options={clientOptions} />
          {renderError('clientId')}
        </div>
      </div>

      <div className={fieldClass('contactLink')}>
        <label className="field__label" htmlFor="project-contact">
          Enlace del botón Contactar
        </label>
        <input id="project-contact" name="contactLink" type="url" className="field__input" placeholder="https://wa.link/... o mailto:hola@grither.co" value={form.contactLink} onChange={handleChange} />
        {renderError('contactLink')}
      </div>

      {/* ---------- Imágenes y videos ---------- */}
      <fieldset className="field project-form__media">
        <legend className="field__label">
          Imágenes y videos <span className="field__hint">({form.media.length}/{MAX_FILES_PER_PROJECT} · videos de máx. {MAX_VIDEO_LABEL})</span>
        </legend>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MEDIA}
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={handleFilesSelected}
        />
        <button
          type="button"
          className="project-form__dropzone"
          onClick={handleOpenFilePicker}
          disabled={isProcessingMedia || form.media.length >= MAX_FILES_PER_PROJECT}
        >
          <Icon name="upload" />
          {isProcessingMedia ? 'Procesando archivos...' : 'Seleccionar imágenes o videos'}
        </button>

        {mediaError && <p className="field__error">{mediaError}</p>}

        {form.media.length > 0 && (
          <ul className="project-form__previews">
            {form.media.map((item, index) => (
              <li key={item.id || item.src} className="project-form__preview">
                {item.type === 'video' ? (
                  <video src={item.src} muted />
                ) : (
                  <img src={item.src} alt={item.name || `Imagen ${index + 1}`} />
                )}
                {item.type === 'video' && <span className="project-form__video-tag">Video</span>}
                <button
                  type="button"
                  className="project-form__remove"
                  aria-label={`Quitar ${item.name || `archivo ${index + 1}`}`}
                  onClick={(event) => handleRemoveMedia(event, index)}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

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
        <button type="submit" className="btn btn--primary" disabled={isProcessingMedia || isSaving}>
          {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
        </button>
      </div>
    </form>
  );
}

export default ProjectForm;
