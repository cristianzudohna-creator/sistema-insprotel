import {
  ShieldCheck,
  PenLine,
  FileText,
  Car,
  ClipboardCheck,
  UserCircle2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { getUser } from "../auth/auth";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  const user = getUser();
  const role = String(user?.role || "").toUpperCase();

  const isSuperadmin = role === "SUPERADMIN";

  const canCreateSafetyTalks =
    role === "SUPERADMIN" ||
    role === "TECNICO" ||
    role === "CONDUCTOR" ||
    role === "SUPERVISOR" ||
    role === "PREVENCION";

  const canSignSafetyTalks =
    role === "SUPERADMIN" ||
    role === "TECNICO" ||
    role === "CONDUCTOR" ||
    role === "SUPERVISOR" ||
    role === "PREVENCION";

  const canReviewSafetyTalks =
    role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-icon">
          <UserCircle2 size={34} />
        </div>

        <div>
          <h1>Bienvenido, {user?.name || "Usuario"}</h1>
          <p>Selecciona una opción para comenzar.</p>
        </div>
      </section>

      <section className="home-grid">
        {canCreateSafetyTalks && (
          <button
            type="button"
            className="home-card"
            onClick={() => navigate("/charlas")}
          >
            <ShieldCheck size={26} />
            <h3>Charlas de Seguridad</h3>
            <p>Crear reuniones previas de seguridad.</p>
          </button>
        )}

        {canSignSafetyTalks && (
          <button
            type="button"
            className="home-card"
            onClick={() => navigate("/charlas/pendientes")}
          >
            <PenLine size={26} />
            <h3>Pendientes de Firma</h3>
            <p>Revisar charlas asignadas y firmarlas.</p>
          </button>
        )}

        {canReviewSafetyTalks && (
          <button
            type="button"
            className="home-card"
            onClick={() => navigate("/charlas/historial-todos")}
          >
            <FileText size={26} />
            <h3>Charlas Terminadas</h3>
            <p>Revisar charlas completadas.</p>
          </button>
        )}

        {isSuperadmin && (
          <>
            <button
              type="button"
              className="home-card"
              onClick={() => navigate("/check-vehiculos")}
            >
              <Car size={26} />
              <h3>Check Vehículos</h3>
              <p>Registrar inspecciones vehiculares.</p>
            </button>

            <button
              type="button"
              className="home-card"
              onClick={() => navigate("/arnes")}
            >
              <ClipboardCheck size={26} />
              <h3>Check List</h3>
              <p>Revisar arnés, escalas y herramientas.</p>
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export default Home;