import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Users,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { authHeaders } from "../auth/auth";

import "./UsersAdmin.css";

const API_URL = "http://localhost:3000";

const ROLES = ["SUPERADMIN", "ADMIN", "SUPERVISOR", "PREVENCION", "CONDUCTOR"];

function emptyForm() {
  return {
    rut: "",
    name: "",
    role: "CONDUCTOR",
  };
}

function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [editingUser, setEditingUser] = useState(null);

  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState({
    type: "",
    title: "",
    message: "",
  });

  async function loadUsers() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/users`, {
        headers: authHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error cargando usuarios");
      }

      setUsers(data);
    } catch (error) {
      showNotice("error", "Error", error.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function showNotice(type, title, message) {
    setNotice({
      type,
      title,
      message,
    });

    setTimeout(() => {
      setNotice({
        type: "",
        title: "",
        message: "",
      });
    }, 1800);
  }

  function resetForm() {
    setForm(emptyForm());
    setEditingUser(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const isEditing = Boolean(editingUser);

      const response = await fetch(
        isEditing ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(form),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error guardando usuario");
      }

      await loadUsers();
      resetForm();

      showNotice(
        "success",
        isEditing ? "Usuario actualizado" : "Usuario creado",
        isEditing
          ? "Los datos fueron guardados correctamente."
          : "El usuario fue creado correctamente.",
      );
    } catch (error) {
      showNotice("error", "Error", error.message || "Error guardando usuario");
    }
  }

  async function confirmDeleteUser() {
    if (!deleteUser) return;

    try {
      setDeleting(true);

      const response = await fetch(`${API_URL}/users/${deleteUser.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error eliminando usuario");
      }

      await loadUsers();

      setDeleteUser(null);

      showNotice(
        "success",
        "Usuario eliminado",
        "El usuario fue eliminado correctamente.",
      );
    } catch (error) {
      showNotice("error", "Error", error.message || "Error eliminando usuario");
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(user) {
    setEditingUser(user);

    setForm({
      rut: user.rut || "",
      name: user.name || "",
      role: user.role || "CONDUCTOR",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return users;

    return users.filter((user) => {
      return (
        String(user.name || "").toLowerCase().includes(value) ||
        String(user.rut || "").toLowerCase().includes(value) ||
        String(user.role || "").toLowerCase().includes(value)
      );
    });
  }, [users, search]);

  return (
    <div className="users-page">
      {notice.message && (
        <div className="users-modal-backdrop">
          <div className={`users-feedback-modal ${notice.type}`}>
            <div className="users-feedback-icon">
              {notice.type === "success" ? (
                <CheckCircle2 size={34} />
              ) : (
                <AlertTriangle size={34} />
              )}
            </div>

            <h3>{notice.title}</h3>
            <p>{notice.message}</p>
          </div>
        </div>
      )}

      <div className="users-header">
        <div className="users-chip">
          <Users size={16} />
          ADMINISTRACIÓN
        </div>

        <h2>Usuarios del Sistema</h2>

        <p>Crear, editar y administrar accesos del sistema.</p>
      </div>

      <section className="users-card">
        <div className="users-card-title">
          {editingUser ? <Pencil size={22} /> : <Plus size={22} />}

          <h3>{editingUser ? "Editar Usuario" : "Crear Usuario"}</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="users-form-grid">
            <label>
              RUT
              <input
                value={form.rut}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    rut: e.target.value,
                  }))
                }
                placeholder="Ej: 12345678K"
              />
            </label>

            <label>
              Nombre Completo
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Ingrese nombre completo"
              />
            </label>

            <label>
              Cargo
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="users-actions">
            <button type="submit" className="create-user-button">
              {editingUser ? (
                <>
                  <Save size={18} />
                  Guardar Cambios
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Crear Usuario
                </>
              )}
            </button>

            {editingUser && (
              <button
                type="button"
                className="cancel-edit-button"
                onClick={resetForm}
              >
                <X size={18} />
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="users-card">
        <div className="users-list-header">
          <div className="users-card-title">
            <Users size={22} />
            <h3>Usuarios Registrados</h3>
          </div>

          <div className="users-search">
            <Search size={18} />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuario..."
            />
          </div>
        </div>

        {loading ? (
          <div className="users-empty">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty">No se encontraron usuarios</div>
        ) : (
          <div className="users-grid">
            {filteredUsers.map((user) => (
              <div className="user-card" key={user.id}>
                <div className="user-card-top">
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.rut}</span>
                  </div>

                  <div className="role-badge">{user.role}</div>
                </div>

                <div className="user-status">
                  {user.mustChangePassword
                    ? "Debe cambiar contraseña"
                    : "Activo"}
                </div>

                <div className="user-card-actions">
                  <button
                    className="edit-user-button"
                    onClick={() => handleEdit(user)}
                    type="button"
                  >
                    <Pencil size={18} />
                    Editar
                  </button>

                  <button
                    className="delete-user-button"
                    onClick={() => setDeleteUser(user)}
                    type="button"
                  >
                    <Trash2 size={18} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {deleteUser && (
        <div className="users-modal-backdrop">
          <div className="users-delete-modal">
            <div className="users-delete-icon">
              <AlertTriangle size={30} />
            </div>

            <h3>Eliminar usuario</h3>

            <p>
              ¿Seguro que deseas eliminar a <strong>{deleteUser.name}</strong>?
            </p>

            <span>
              Esta acción no se puede deshacer. Si el usuario tiene registros
              asociados, el sistema no permitirá eliminarlo.
            </span>

            <div className="users-delete-actions">
              <button
                type="button"
                className="users-delete-cancel"
                onClick={() => setDeleteUser(null)}
                disabled={deleting}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="users-delete-confirm"
                onClick={confirmDeleteUser}
                disabled={deleting}
              >
                <Trash2 size={18} />
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersAdmin;