/* ==========================================================================
   PANEL ADMIN: INFORMACIÓN DE "SOBRE NOSOTROS"
   --------------------------------------------------------------------------
   Editable solo por el administrador:
     - Descripción de marca e Indicadores.
     - Quién está detrás de la marca (nombre, cargo, biografía, foto).
     - Explicación de cada fase: Reunión, Bocetos/prototipos,
       Desarrollo y Despliegue.
   ========================================================================== */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { getAboutInfo, saveAboutInfo, validateAboutInfo } from '../../services/siteInfoService.js';
import { PROJECT_PHASES } from '../../services/projectService.js';
import { ACCEPTED_PHOTO, processImageFile } from '../../utils/mediaFiles.js';
import { MAX_LENGTH } from '../../utils/validators.js';
import { getInitials } from '../../utils/format.js';
import IndicatorsEditor from '../../components/admin/IndicatorsEditor.jsx';
import Icon from '../../components/ui/Icon.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import './AdminAboutPage.css';

function AdminAboutPage() {
  // Primero se pide la información guardada; el formulario se monta cuando llega
  const { data, error, reload } = useAsyncData(getAboutInfo, []);

  if (!data) {
    return <LoadingState label="Cargando información de Sobre nosotros..." error={error} onRetry={reload} />;
  }
  return <AboutInfoForm initialData={data} />;
}

/**
 * Formulario de edición (se monta con los datos ya cargados).
 * @param {object} initialData - Información de Sobre nosotros guardada.
 */
function AboutInfoForm({ initialData }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const photoInputRef = useRef(null);

  /** Descripción de marca */
  function handleBrandChange(event) {
    setForm((current) => ({ ...current, brandDescription: event.target.value }));
    setErrors((current) => ({ ...current, brandDescription: '' }));
  }

  /** Campos de "Quién está detrás" (name, role, bio) */
  function handleOwnerChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, owner: { ...current.owner, [name]: value } }));
    // Los errores del dueño se llaman ownerName, ownerRole, ownerBio
    const errorKey = `owner${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    setErrors((current) => ({ ...current, [errorKey]: '' }));
  }

  /** Texto de una fase */
  function handlePhaseChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, phases: { ...current.phases, [name]: value } }));
    setErrors((current) => ({ ...current, [`phase_${name}`]: '' }));
  }

  function handleIndicatorsChange(indicators) {
    setForm((current) => ({ ...current, indicators }));
    setErrors((current) => ({ ...current, indicators: '' }));
  }

  /** Abre el selector de imagen para la foto */
  function handleChoosePhoto(event) {
    event.preventDefault();
    photoInputRef.current?.click();
  }

  /**
   * Comprime la foto elegida y la deja en el formulario:
   *   - photo:     vista previa local para mostrarla ya.
   *   - photoFile: archivo que se sube a Supabase Storage al guardar.
   */
  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const { file: photoFile, previewUrl } = await processImageFile(file);
      setForm((current) => ({ ...current, owner: { ...current.owner, photo: previewUrl, photoFile } }));
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function handleRemovePhoto(event) {
    event.preventDefault();
    setForm((current) => ({ ...current, owner: { ...current.owner, photo: '', photoFile: null } }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return; // evita guardar dos veces con doble clic

    const formErrors = validateAboutInfo(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      showToast('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      setForm(await saveAboutInfo(form));
      showToast('Información de Sobre nosotros guardada.');
    } catch (error) {
      setErrors(error.fieldErrors || {});
      showToast(error.message, 'error');
    }
    setIsSaving(false);
  }

  /** Pinta el error de un campo */
  function renderError(key) {
    return errors[key] ? <p className="field__error">{errors[key]}</p> : null;
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">Sobre nosotros</h1>
          <p className="admin-header__text">Marca, indicadores, quién está detrás y forma de trabajo.</p>
        </div>
        <Link to="/sobre-nosotros" className="btn btn--outline">
          Ver página
        </Link>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {/* ---------- Marca e indicadores ---------- */}
        <section className="card admin-form-section">
          <h2 className="admin-form-section__title">Marca</h2>
          <div className={`field ${errors.brandDescription ? 'field--error' : ''}`}>
            <label className="field__label" htmlFor="about-brand">
              Descripción de marca <span className="field__hint">(deja una línea en blanco para separar párrafos)</span>
            </label>
            <textarea id="about-brand" className="field__input about-admin__brand" value={form.brandDescription} onChange={handleBrandChange} maxLength={MAX_LENGTH.BRAND_DESCRIPTION} />
            {renderError('brandDescription')}
          </div>
          <IndicatorsEditor indicators={form.indicators} onChange={handleIndicatorsChange} error={errors.indicators} />
        </section>

        {/* ---------- Quién está detrás ---------- */}
        <section className="card admin-form-section">
          <h2 className="admin-form-section__title">Quién está detrás de la marca</h2>

          <div className="about-admin__photo-row">
            {form.owner.photo ? (
              <img className="about-admin__photo" src={form.owner.photo} alt={`Foto de ${form.owner.name}`} />
            ) : (
              <span className="about-admin__photo about-admin__photo--initials" aria-hidden="true">
                {getInitials(form.owner.name || 'G')}
              </span>
            )}
            <div className="about-admin__photo-actions">
              <input ref={photoInputRef} type="file" accept={ACCEPTED_PHOTO} className="sr-only" tabIndex={-1} onChange={handlePhotoSelected} />
              <button type="button" className="btn btn--outline btn--sm" onClick={handleChoosePhoto}>
                <Icon name="image" className="about-admin__btn-icon" />
                {form.owner.photo ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {form.owner.photo && (
                <button type="button" className="btn btn--outline btn--sm" onClick={handleRemovePhoto}>
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          <div className="form__row">
            <div className={`field ${errors.ownerName ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="about-owner-name">
                Nombre
              </label>
              <input id="about-owner-name" name="name" className="field__input" value={form.owner.name} onChange={handleOwnerChange} maxLength={MAX_LENGTH.PERSON_NAME} />
              {renderError('ownerName')}
            </div>
            <div className={`field ${errors.ownerRole ? 'field--error' : ''}`}>
              <label className="field__label" htmlFor="about-owner-role">
                Cargo
              </label>
              <input id="about-owner-role" name="role" className="field__input" value={form.owner.role} onChange={handleOwnerChange} maxLength={MAX_LENGTH.OWNER_ROLE} />
              {renderError('ownerRole')}
            </div>
          </div>
          <div className={`field ${errors.ownerBio ? 'field--error' : ''}`}>
            <label className="field__label" htmlFor="about-owner-bio">
              Biografía
            </label>
            <textarea id="about-owner-bio" name="bio" className="field__input" value={form.owner.bio} onChange={handleOwnerChange} maxLength={MAX_LENGTH.OWNER_BIO} />
            {renderError('ownerBio')}
          </div>
        </section>

        {/* ---------- Proceso de trabajo ---------- */}
        <section className="card admin-form-section">
          <h2 className="admin-form-section__title">Proceso de contrato / forma de trabajo</h2>
          <div className="form__row">
            {PROJECT_PHASES.map((phase, index) => (
              <div key={phase.value} className={`field ${errors[`phase_${phase.value}`] ? 'field--error' : ''}`}>
                <label className="field__label" htmlFor={`about-phase-${phase.value}`}>
                  {index + 1}. {phase.label}
                </label>
                <textarea
                  id={`about-phase-${phase.value}`}
                  name={phase.value}
                  className="field__input"
                  value={form.phases[phase.value]}
                  onChange={handlePhaseChange}
                  maxLength={MAX_LENGTH.PHASE_TEXT}
                />
                {renderError(`phase_${phase.value}`)}
              </div>
            ))}
          </div>
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

export default AdminAboutPage;
