import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  HardHat,
  PenLine,
  ShieldCheck,
  UserCircle2,
  Wrench,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { getUser } from "../auth/auth";
import "./Home.css";

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "/api";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CL");
}

function timeAgo(value) {
  if (!value) return "-";

  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);

  if (diffHours < 24) {
    return diffHours === 1 ? "Hace 1 hora" : `Hace ${diffHours} horas`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return "Hace 1 día";
  return `Hace ${diffDays} días`;
}

function statusLabel(status) {
  if (status === "EN_REVISION") return "EN REVISIÓN";
  if (status === "SOLUCIONADO") return "SOLUCIONADO";
  return "REPORTADO";
}

function statusClass(status) {
  if (status === "EN_REVISION") return "review";
  if (status === "SOLUCIONADO") return "solved";
  return "pending";
}

function Home() {
  const navigate = useNavigate();

  const user = getUser();
  const role = String(user?.role || "").toUpperCase();

  const [summary, setSummary] = useState({
    incidentsTotal: 0,
    incidentsInReview: 0,
    incidentsSolved: 0,
    pendingSignatures: 0,
    safetyTalksCompleted: 0,
    vehicleChecks: 0,
vehicleChecksCompleted: 0,
harnessChecksCompleted: 0,
ladderChecksCompleted: 0,
scissorLadderChecksCompleted: 0,
toolsEppChecksCompleted: 0,
toolsDriverChecksCompleted: 0,
autoInspectionsCompleted: 0,
allChecksCompleted: 0,
safetyTalkPendingSignatures: 0,
vehicleCheckPendingSignatures: 0,
harnessPendingSignatures: 0,
ladderPendingSignatures: 0,
ladderTotalCompleted: 0,
    latestReports: [],
    latestNotifications: [],
  });

  const isSuperadmin = role === "SUPERADMIN";
  const isPrevention = role === "PREVENCION";
  const canViewIncidentGeneral = isSuperadmin || isPrevention;

  const canCreateSafetyTalks = [
    "SUPERADMIN",
    "TECNICO",
    "CONDUCTOR",
    "SUPERVISOR",
    "PREVENCION",
  ].includes(role);

  const canUseVehicleCheck = [
    "SUPERADMIN",
    "SUPERVISOR",
    "PREVENCION",
    "CONDUCTOR",
    "TECNICO",
  ].includes(role);

  const canUseHarness = [
    "SUPERADMIN",
    "SUPERVISOR",
    "PREVENCION",
    "TECNICO",
  ].includes(role);

  async function loadSummary() {
    try {
      const response = await fetch(`${API_URL}/home/summary`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSummary((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const reported = summary.incidentsReported || 0;
const inReview = summary.incidentsInReview || 0;
const solved = summary.incidentsSolved || 0;
const totalIncidents = summary.incidentsTotal || 0;

const reportedPercent =
  totalIncidents > 0 ? (reported / totalIncidents) * 100 : 0;

const inReviewPercent =
  totalIncidents > 0 ? (inReview / totalIncidents) * 100 : 0;

const solvedPercent =
  totalIncidents > 0 ? (solved / totalIncidents) * 100 : 0;

const donutStyle = {
  background:
    totalIncidents > 0
      ? `conic-gradient(
          #ef4444 0 ${reportedPercent}%,
          #3b82f6 ${reportedPercent}% ${reportedPercent + inReviewPercent}%,
          #22c55e ${reportedPercent + inReviewPercent}% 100%
        )`
      : "#e5e7eb",
};

  return (
    <div className="home-page">
      <section className="home-hero-dashboard">
        <div className="home-hero-user">
          <div className="home-icon-large">
            <UserCircle2 size={58} />
          </div>

          <div>
            <h1>¡Bienvenido, {user?.name || "Usuario"}!</h1>
            <strong>{role || "USUARIO"}</strong>
            <p>
              Aquí tienes un resumen de la información más importante del
              sistema.
            </p>
          </div>
        </div>

        <div className="home-hero-illustration">
          <div className="tower" />
          <div className="worker" />
        </div>
      </section>

      <section className="home-kpi-grid">
        <div className="home-kpi-card danger">
          <div className="home-kpi-icon">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2>{summary.incidentsTotal}</h2>
            <strong>Incidentes / Hallazgos</strong>
            <span>Total registrados</span>
          </div>
        </div>

        <div className="home-kpi-card blue">
          <div className="home-kpi-icon">
            <Eye size={28} />
          </div>
          <div>
            <h2>{summary.incidentsInReview}</h2>
            <strong>En revisión</strong>
            <span>Incidentes / Hallazgos</span>
          </div>
        </div>

        <div className="home-kpi-card warning">
  <div className="home-kpi-icon">
    <PenLine size={28} />
  </div>

  <div>
    <h2>{summary.pendingSignatures}</h2>
    <strong>Pendientes de Firma</strong>

    <div className="signature-breakdown">
      <div>
        <span>Charlas</span>
        <strong>{summary.safetyTalkPendingSignatures}</strong>
      </div>

      <div>
        <span>Vehículos</span>
        <strong>{summary.vehicleCheckPendingSignatures}</strong>
      </div>

      <div>
        <span>Arnés</span>
        <strong>{summary.harnessPendingSignatures}</strong>
      </div>

      <div>
        <span>Escaleras</span>
        <strong>{summary.ladderPendingSignatures}</strong>
      </div>
    </div>
  </div>
</div>

        <div className="home-kpi-card success">
          <div className="home-kpi-icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2>{summary.safetyTalksCompleted}</h2>
            <strong>Charlas realizadas</strong>
            <span>Total completadas</span>
          </div>
        </div>

        <div className="home-kpi-card purple">
          <div className="home-kpi-icon">
            <Car size={28} />
          </div>
          <div>
            <h2>{summary.vehicleChecksCompleted}</h2>
<strong>Check List Vehículos</strong>
<span>Terminados</span>
          </div>
        </div>
      <div className="home-kpi-card success">
  <div className="home-kpi-icon">
    <HardHat size={28} />
  </div>
  <div>
    <h2>{summary.harnessChecksCompleted}</h2>
    <strong>Check Arnés</strong>
    <span>Terminados</span>
  </div>
</div>

<div className="home-kpi-card success">
  <div className="home-kpi-icon">
    <ClipboardCheck size={28} />
  </div>
  <div>
    <h2>{summary.ladderTotalCompleted}</h2>
    <strong>Check Escaleras</strong>
    <span>Terminados</span>
  </div>
</div>

<div className="home-kpi-card purple">
  <div className="home-kpi-icon">
    <Wrench size={28} />
  </div>
  <div>
    <h2>{summary.autoInspectionsCompleted}</h2>
    <strong>Autoinspecciones</strong>
    <span>Terminadas</span>
  </div>
</div>

</section>

<section className="home-dashboard-grid">
        <div className="home-panel">
          <div className="home-panel-title">
            <h2>Accesos rápidos</h2>
          </div>

          <div className="home-shortcuts-grid">
            <button
              type="button"
              className="home-shortcut danger"
              onClick={() => navigate("/incidentes")}
            >
              <AlertTriangle size={24} />
              <h3>Crear Incidente / Hallazgo</h3>
              <p>Registra un nuevo incidente o hallazgo.</p>
            </button>

            <button
              type="button"
              className="home-shortcut"
              onClick={() => navigate("/incidentes/mis-reportes")}
            >
              <FileText size={24} />
              <h3>Mis Reportes</h3>
              <p>Revisa el estado de tus reportes.</p>
            </button>

            {canViewIncidentGeneral && (
              <button
                type="button"
                className="home-shortcut"
                onClick={() => navigate("/incidentes/historial")}
              >
                <ClipboardCheck size={24} />
                <h3>Historial General</h3>
                <p>Gestiona reportes registrados.</p>
              </button>
            )}

            {canCreateSafetyTalks && (
              <button
                type="button"
                className="home-shortcut"
                onClick={() => navigate("/charlas")}
              >
                <ShieldCheck size={24} />
                <h3>Charlas de Seguridad</h3>
                <p>Crear reuniones previas.</p>
              </button>
            )}

            {canCreateSafetyTalks && (
              <button
                type="button"
                className="home-shortcut warning"
                onClick={() => navigate("/charlas/pendientes")}
              >
                <PenLine size={24} />
                <h3>Pendientes de Firma</h3>
                <p>Revisar charlas asignadas.</p>
              </button>
            )}

            {canUseVehicleCheck && (
              <button
                type="button"
                className="home-shortcut success"
                onClick={() => navigate("/check-vehiculos")}
              >
                <Car size={24} />
                <h3>Check Vehículos</h3>
                <p>Registrar inspecciones.</p>
              </button>
            )}

            {canUseHarness && (
              <button
                type="button"
                className="home-shortcut success"
                onClick={() => navigate("/arnes")}
              >
                <HardHat size={24} />
                <h3>Check Arnés</h3>
                <p>Control de arnés de seguridad.</p>
              </button>
            )}

            {isSuperadmin && (
              <button
                type="button"
                className="home-shortcut"
                onClick={() => navigate("/check-herramientas")}
              >
                <Wrench size={24} />
                <h3>Autoinspección Técnico</h3>
                <p>Herramientas y EPP técnico.</p>
              </button>
            )}
          </div>
        </div>

        <div className="home-panel">
          <div className="home-panel-title">
            <h2>Últimas notificaciones</h2>
            <button type="button">Ver todas</button>
          </div>

          <div className="home-notification-list">
            {summary.latestNotifications.length === 0 ? (
              <div className="home-notification-item">
                <Bell size={20} />
                <div>
                  <strong>Sin notificaciones recientes</strong>
                  <p>No tienes movimientos recientes.</p>
                </div>
              </div>
            ) : (
              summary.latestNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="home-notification-item blue"
                >
                  <Bell size={20} />
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                  </div>
                  <span>{timeAgo(notification.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="home-side-column">
          <div className="home-panel incident-state-panel">
            <h2>Estado de incidentes</h2>

            <div className="incident-donut" style={donutStyle}>
  <div className="donut-center">
    <strong>{totalIncidents}</strong>
    <span>Total</span>
  </div>
</div>

            <div className="incident-legend">
              <div>
                <span className="dot red" />
                Reportados
                <strong>{reported}</strong>
              </div>

              <div>
                <span className="dot blue" />
                En revisión
                <strong>{inReview}</strong>
              </div>

              <div>
                <span className="dot green" />
                Solucionados
                <strong>{solved}</strong>
              </div>

              <hr />

              <div>
                Total
                <strong>{totalIncidents}</strong>
              </div>
            </div>
          </div>

          <div className="home-panel">
            <div className="home-panel-title">
              <h2>Mis últimos reportes</h2>
              <button
                type="button"
                onClick={() => navigate("/incidentes/mis-reportes")}
              >
                Ver todos
              </button>
            </div>

            <div className="home-report-list">
              {summary.latestReports.length === 0 ? (
                <div className="home-report-item">
                  <span>Sin reportes</span>
                  <div>
                    <strong>No tienes reportes recientes</strong>
                    <p>Crea un incidente o hallazgo para verlo aquí.</p>
                  </div>
                </div>
              ) : (
                summary.latestReports.map((report) => (
                  <div className="home-report-item" key={report.id}>
                    <span>{report.folio || `#${report.id}`}</span>
                    <div>
                      <strong>
                        {report.eventType} - {report.category}
                      </strong>
                      <p>
                        {formatDate(report.createdAt)} · Patente:{" "}
                        {report.vehiclePatent || "-"}
                      </p>
                    </div>
                    <em className={`status ${statusClass(report.status)}`}>
                      {statusLabel(report.status)}
                    </em>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;