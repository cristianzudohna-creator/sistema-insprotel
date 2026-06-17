import {
  ShieldCheck,
  PenLine,
  FileText,
  Car,
  ClipboardCheck,
  UserCircle2,
} from "lucide-react";

import { getUser } from "../auth/auth";
import "./Home.css";

function Home() {
  const user = getUser();
  const role = String(user?.role || "").toUpperCase();

  const isSuperadmin = role === "SUPERADMIN";
  const canCreateSafetyTalks =
    role === "SUPERADMIN" || role === "TECNICO" || role === "CONDUCTOR";

  const canSignSafetyTalks = role === "TECNICO" || role === "CONDUCTOR";

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
          <p>Selecciona una opción del menú lateral para comenzar.</p>
        </div>
      </section>

      <section className="home-grid">
        {canCreateSafetyTalks && (
          <div className="home-card">
            <ShieldCheck size={26} />
            <h3>Charlas de Seguridad</h3>
            <p>Crear reuniones previas de seguridad.</p>
          </div>
        )}

        {canSignSafetyTalks && (
          <div className="home-card">
            <PenLine size={26} />
            <h3>Pendientes de Firma</h3>
            <p>Revisar charlas asignadas y firmarlas.</p>
          </div>
        )}

        {canReviewSafetyTalks && (
          <div className="home-card">
            <FileText size={26} />
            <h3>Charlas Terminadas</h3>
            <p>Revisar charlas completadas.</p>
          </div>
        )}

        {isSuperadmin && (
          <>
            <div className="home-card">
              <Car size={26} />
              <h3>Check Vehículos</h3>
              <p>Registrar inspecciones vehiculares.</p>
            </div>

            <div className="home-card">
              <ClipboardCheck size={26} />
              <h3>Check List</h3>
              <p>Revisar arnés, escalas y herramientas.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Home;