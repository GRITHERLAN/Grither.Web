/* ==========================================================================
   PANEL ADMIN: USUARIOS
   --------------------------------------------------------------------------
   Lista de usuarios registrados. El administrador puede:
     - Crear usuarios nuevos (Nombre o Empresa, Correo y Contraseña).
   Y por cada usuario:
     - Editar nombre de usuario, correo, rol y contraseña.
     - Inactivar (no podrá iniciar sesión) o volver a activar.
     - Borrar (con confirmación; no si tiene proyectos asignados).
   Reglas de seguridad (también validadas en authService):
     - No puedes inactivarte ni borrarte a ti mismo.
     - Siempre debe quedar un administrador activo.
   ========================================================================== */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getUsers,
  isUserActive,
  setUserActive,
  deleteUser,
  ROLE_LABELS,
  ROLES,
} from '../../services/authService.js';
import { getProjects } from '../../services/projectService.js';
import { formatDate, getInitials } from '../../utils/format.js';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import UserForm from '../../components/admin/UserForm.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import NewUserForm from '../../components/admin/NewUserForm.jsx';
import './AdminUsersPage.css';

function AdminUsersPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Usuarios y proyectos se piden juntos (los proyectos sirven para contar cuántos tiene cada uno)
  const { data, error, reload: reloadUsers } = useAsyncData(
    async () => {
      const [users, projects] = await Promise.all([getUsers(), getProjects()]);
      return { users, projects };
    },
    []
  );
  const [isCreating, setIsCreating] = useState(false);
  // Usuario al que se le está cambiando el estado (desactiva su botón mientras tanto)
  const [busyUserId, setBusyUserId] = useState(null);
  // Usuario que se está editando o que se quiere borrar (null = ventana cerrada)
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // Mientras llegan los datos por primera vez (o si falló la carga)
  if (!data) {
    return <LoadingState label="Cargando usuarios..." error={error} onRetry={reloadUsers} />;
  }

  const { users, projects } = data;

  /** Cuántos proyectos tiene asignados un usuario */
  function countProjects(userId) {
    return projects.filter((project) => project.clientId === userId).length;
  }

  // ---------- Crear ----------
  function handleCreated(createdUser) {
    setIsCreating(false);
    reloadUsers();
    showToast(`Usuario ${createdUser.name} creado como Cliente.`);
  }

  // ---------- Editar ----------
  function handleSaved(savedUser) {
    setUserToEdit(null);
    reloadUsers();
    // Si el admin se editó a sí mismo, actualizamos su nombre en el encabezado
    if (savedUser.id === currentUser.id) refreshUser();
    showToast(`Usuario ${savedUser.name} actualizado.`);
  }

  // ---------- Activar / Inactivar ----------
  async function handleToggleActive(event, targetUser) {
    event.preventDefault();
    if (busyUserId) return; // ya hay un cambio en curso
    const nextActive = !isUserActive(targetUser);

    setBusyUserId(targetUser.id);
    try {
      await setUserActive(targetUser.id, nextActive, currentUser.id);
      reloadUsers();
      showToast(
        nextActive ? `${targetUser.name} fue activado.` : `${targetUser.name} fue inactivado y ya no puede iniciar sesión.`,
        nextActive ? 'success' : 'info'
      );
    } catch (actionError) {
      showToast(actionError.message, 'error');
    }
    setBusyUserId(null);
  }

  // ---------- Borrar ----------
  async function handleConfirmDelete() {
    const target = userToDelete;
    setUserToDelete(null);
    try {
      await deleteUser(target.id, currentUser.id);
      showToast(`Usuario ${target.name} borrado.`, 'info');
      reloadUsers();
    } catch (actionError) {
      showToast(actionError.message, 'error');
    }
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">Usuarios</h1>
          <p className="admin-header__text">
            {users.length} usuarios registrados · las cuentas nuevas se crean desde aquí.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={(event) => {
            event.preventDefault();
            setIsCreating(true);
          }}
        >
          <Icon name="plus" className="admin-header__btn-icon" />
          Nuevo usuario
        </button>
      </header>

      <ul className="users-grid">
        {users.map((user) => {
          const active = isUserActive(user);
          const isSelf = user.id === currentUser.id;

          return (
            <li key={user.id} className={`card user-card ${active ? '' : 'user-card--inactive'}`}>
              <span className="user-card__avatar" aria-hidden="true">
                {getInitials(user.name)}
              </span>
              <div className="user-card__info">
                <p className="user-card__name">
                  {user.name} {isSelf && <span className="user-card__you">(tú)</span>}
                </p>
                <p className="user-card__email">{user.email}</p>
              </div>

              <dl className="user-card__data">
                <div>
                  <dt>Rol</dt>
                  <dd>
                    <span className={`tag ${user.role === ROLES.ADMIN ? 'user-card__role--admin' : ''}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className={`user-card__status ${active ? 'user-card__status--active' : ''}`}>
                      {active ? 'Activo' : 'Inactivo'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Proyectos</dt>
                  <dd className="text-mono">{user.role === ROLES.ADMIN ? '—' : countProjects(user.id)}</dd>
                </div>
                <div>
                  <dt>Registro</dt>
                  <dd className="text-mono">{formatDate(user.createdAt)}</dd>
                </div>
              </dl>

              <div className="user-card__actions">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={(event) => {
                    event.preventDefault();
                    setUserToEdit(user);
                  }}
                >
                  <Icon name="edit" className="user-card__btn-icon" />
                  Editar
                </button>

                {/* Nadie puede inactivarse a sí mismo: el botón se oculta; activar siempre se permite */}
                {(!isSelf || !active) && (
                  <button
                    type="button"
                    className={`btn btn--sm ${active ? 'btn--outline' : 'btn--soft'}`}
                    disabled={busyUserId === user.id}
                    onClick={(event) => handleToggleActive(event, user)}
                  >
                    <Icon name={active ? 'pause' : 'play'} className="user-card__btn-icon" />
                    {active ? 'Inactivar' : 'Activar'}
                  </button>
                )}

                {!isSelf && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`Borrar a ${user.name}`}
                    title="Borrar usuario"
                    onClick={(event) => {
                      event.preventDefault();
                      setUserToDelete(user);
                    }}
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ---------- Ventana crear ---------- */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Nuevo usuario"
        description="Crea una cuenta de cliente para que pueda ingresar."
        size="sm"
      >
        {isCreating && <NewUserForm onCreated={handleCreated} onCancel={() => setIsCreating(false)} />}
      </Modal>

      {/* ---------- Ventana editar ---------- */}
      <Modal
        isOpen={Boolean(userToEdit)}
        onClose={() => setUserToEdit(null)}
        title="Editar usuario"
        description={userToEdit ? userToEdit.email : ''}
        size="md"
      >
        {userToEdit && (
          <UserForm
            user={userToEdit}
            actorId={currentUser.id}
            onSaved={handleSaved}
            onCancel={() => setUserToEdit(null)}
          />
        )}
      </Modal>

      {/* ---------- Confirmación borrar ---------- */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Borrar usuario"
        message={
          userToDelete
            ? `¿Seguro que quieres borrar a "${userToDelete.name}" (${userToDelete.email})? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Sí, borrar"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </>
  );
}

export default AdminUsersPage;
