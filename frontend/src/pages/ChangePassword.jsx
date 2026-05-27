import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";

import { changePassword, getUser, isSuperadmin } from "../auth/auth";
import logo from "../assets/logo-insprotel.png";

import "./ChangePassword.css";

function ChangePassword() {
  const navigate = useNavigate();
  const user = getUser();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  function handleInput(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setSuccessMessage("");

      await changePassword(form);

      setSuccessMessage("Contraseña actualizada correctamente. Redirigiendo...");

      setTimeout(() => {
        if (isSuperadmin()) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/check-vehiculos", { replace: true });
        }
      }, 1200);
    } catch (error) {
      console.error(error);
      alert(error.message || "Error cambiando contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="change-password-page">
      <form className="change-password-card" onSubmit={handleSubmit}>
        <img src={logo} alt="Insprotel" className="change-password-logo" />

        <div className="change-password-icon">
          <ShieldCheck size={28} />
        </div>

        <h1>Crea tu contraseña</h1>

        <p>
          Hola {user?.name || "usuario"}, por seguridad debes crear tu propia
          contraseña antes de continuar.
        </p>

        {successMessage && (
          <div className="change-password-success">
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {user?.mustChangePassword === false && (
          <label>
            Contraseña actual
            <div className="change-password-input">
              <Lock size={18} />
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) =>
                  handleInput("currentPassword", e.target.value)
                }
                placeholder="Ingrese contraseña actual"
                disabled={loading || Boolean(successMessage)}
              />
            </div>
          </label>
        )}

        <label>
          Nueva contraseña
          <div className="change-password-input">
            <Lock size={18} />
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => handleInput("newPassword", e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading || Boolean(successMessage)}
            />
          </div>
        </label>

        <label>
          Confirmar contraseña
          <div className="change-password-input">
            <Lock size={18} />
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleInput("confirmPassword", e.target.value)}
              placeholder="Repita su nueva contraseña"
              required
              disabled={loading || Boolean(successMessage)}
            />
          </div>
        </label>

        <button type="submit" disabled={loading || Boolean(successMessage)}>
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}

export default ChangePassword;