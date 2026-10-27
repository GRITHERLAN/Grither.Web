/* ==========================================================================
   PÁGINA: INICIAR SESIÓN
   --------------------------------------------------------------------------
   Solo hay inicio de sesión: las cuentas las crea el Administrador desde
   su panel (Usuarios > Nuevo usuario).
   Después de entrar:
     - Administrador -> /administrador
     - Cliente       -> /proyecto  (o la página que intentaba abrir)
   Protección contra bots: tras 5 intentos fallidos el botón se bloquea y
   muestra una cuenta regresiva (ver getLoginLockSeconds en authService).
   ========================================================================== */

import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ROLES, getLoginLockSeconds } from '../services/authService.js';
import { MAX_LENGTH } from '../utils/validators.js';
import Logo from '../components/layout/Logo.jsx';
import ThemeToggle from '../components/layout/ThemeToggle.jsx';
import Icon from '../components/ui/Icon.jsx';
import './AuthPage.css';

const EMPTY_LOGIN = { email: '', password: '', remember: true };

function AuthPage() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Segundos de espera por intentos fallidos (0 = puede intentar)
  const [lockSeconds, setLockSeconds] = useState(getLoginLockSeconds);

  // Cuenta regresiva: baja cada segundo mientras el login esté bloqueado
  useEffect(() => {
    if (lockSeconds <= 0) return undefined;
    const timerId = window.setTimeout(() => {
      const remaining = getLoginLockSeconds();
      setLockSeconds(remaining);
      if (remaining === 0) setGeneralError(''); // ya puede intentar: se quita el aviso
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [lockSeconds]);

  // Si ya tiene sesión, no tiene sentido mostrar el login
  if (user && !isSubmitting) {
    return <Navigate to={user.role === ROLES.ADMIN ? '/administrador' : '/proyecto'} replace />;
  }

  /** Decide a dónde ir después de entrar */
  function goAfterLogin(loggedUser) {
    if (loggedUser.role === ROLES.ADMIN) {
      navigate('/administrador', { replace: true });
      return;
    }
    // Si venía de una página protegida (ej. /proyecto/GTH-8041) volvemos allí
    const from = location.state?.from;
    navigate(from && from.startsWith('/proyecto') ? from : '/proyecto', { replace: true });
  }

  /** Cambios del formulario de login (incluye el checkbox) */
  function handleLoginChange(event) {
    const { name, value, type, checked } = event.target;
    setLoginForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setGeneralError('');
  }

  /** Envía el login */
  async function handleLoginSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const loggedUser = await login(loginForm);
      showToast(`¡Bienvenido de nuevo, ${loggedUser.name.split(' ')[0]}!`);
      goAfterLogin(loggedUser);
    } catch (error) {
      // ValidationError trae errores por campo; AppError solo un mensaje
      setErrors(error.fieldErrors || {});
      setGeneralError(error.fieldErrors ? '' : error.message);
      setLockSeconds(getLoginLockSeconds());
      setIsSubmitting(false);
    }
  }

  /** Pinta un campo con su etiqueta y su error (evita repetir código) */
  function renderField({ id, name, label, type = 'text', placeholder, value, onChange, autoComplete, maxLength }) {
    return (
      <div className={`field ${errors[name] ? 'field--error' : ''}`}>
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          name={name}
          type={type}
          className="field__input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={maxLength}
        />
        {errors[name] && <p className="field__error">{errors[name]}</p>}
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Barra superior simple */}
      <header className="container auth-page__top">
        <Logo />
        <div className="auth-page__top-actions">
          <ThemeToggle />
          <Link to="/" className="auth-page__back">
            <Icon name="arrowLeft" /> Volver al sitio
          </Link>
        </div>
      </header>

      <main className="container auth-page__main">
        {/* Columna izquierda: emblema y mensaje */}
        <section className="auth-page__intro">
          <div className="auth-page__emblem">
            <Logo variant="emblem" />
          </div>
          <span className="eyebrow">Desarrollo web a medida</span>
          <h1 className="auth-page__title">
            Tu proyecto, con alas <span className="text-gradient">para despegar.</span>
          </h1>
          <p className="auth-page__text">
            Ingresa para seguir el estado de tus proyectos, cotizaciones y entregas en un solo lugar.
          </p>
        </section>

        {/* Columna derecha: tarjeta de inicio de sesión */}
        <section className="card auth-card" aria-label="Acceso a la cuenta">
          <header className="auth-card__header">
            <h2 className="auth-card__title">Bienvenido de nuevo</h2>
            <p className="text-muted">Usa el correo con el que el administrador creó tu cuenta.</p>
          </header>

          {/* Durante el bloqueo, el aviso muestra los segundos que faltan (se actualiza solo) */}
          {lockSeconds > 0 ? (
            <p className="form-alert" role="alert">
              Demasiados intentos fallidos. Espera {lockSeconds} segundos antes de volver a intentarlo.
            </p>
          ) : (
            generalError && (
              <p className="form-alert" role="alert">
                {generalError}
              </p>
            )
          )}

          <form className="form" onSubmit={handleLoginSubmit} noValidate>
            {renderField({
              id: 'login-email',
              name: 'email',
              label: 'Correo electrónico',
              type: 'email',
              placeholder: 'tu@correo.com',
              value: loginForm.email,
              onChange: handleLoginChange,
              autoComplete: 'email',
              maxLength: MAX_LENGTH.EMAIL,
            })}
            {renderField({
              id: 'login-password',
              name: 'password',
              label: 'Contraseña',
              type: 'password',
              placeholder: '••••••••',
              value: loginForm.password,
              onChange: handleLoginChange,
              autoComplete: 'current-password',
              maxLength: MAX_LENGTH.PASSWORD,
            })}

            <label className="checkbox">
              <input type="checkbox" name="remember" checked={loginForm.remember} onChange={handleLoginChange} />
              Recordarme en este dispositivo
            </label>

            <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting || lockSeconds > 0}>
              {lockSeconds > 0 ? `Espera ${lockSeconds} s` : isSubmitting ? 'Ingresando...' : 'Ingresar'}{' '}
              <Icon name="arrowRight" className="auth-card__btn-icon" />
            </button>
          </form>

          <p className="auth-card__note text-mono">Conexión segura · tu sesión se guarda en este navegador</p>
        </section>
      </main>
    </div>
  );
}

export default AuthPage;
