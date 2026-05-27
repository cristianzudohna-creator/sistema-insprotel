import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, UserRound } from "lucide-react";

import { login } from "../auth/auth";
import logo from "../assets/logo-insprotel.png";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);

      const data = await login(rut, password);
      const user = data.user;

      if (user?.mustChangePassword) {
        window.location.href = "/cambiar-password";
        return;
      }

      if (user?.role === "SUPERADMIN") {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/check-vehiculos", { replace: true });
    } catch (error) {
      alert(error.message || "Error iniciando sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={logo} alt="Insprotel" className="login-logo" />

        <h1>Sistema Insprotel</h1>
        <p>Ingrese con su RUT y contraseña</p>

        <label>
          RUT
          <div className="login-input">
            <UserRound size={20} />
            <input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="Ej: 12345678K"
            />
          </div>
        </label>

        <label>
          Contraseña
          <div className="login-input">
            <Lock size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
            />
          </div>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

export default Login;