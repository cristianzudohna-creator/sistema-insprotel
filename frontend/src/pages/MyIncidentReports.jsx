import { useEffect, useState } from "react";
import {
  Calendar,
  Eye,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import IncidentDetailModal from "../components/IncidentDetailModal";

import "./MyIncidentReports.css";

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

function getRole() {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("me") ||
      localStorage.getItem("profile");

    const user = raw ? JSON.parse(raw) : null;
    return String(user?.role || "").toUpperCase();
  } catch {
    return "";
  }
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CL");
}

function MyIncidentReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const role = getRole();
  const canDelete = ["SUPERADMIN", "PREVENCION"].includes(role);

  async function loadReports() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/incidents/mine`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteReport(id) {
    const confirmDelete = window.confirm("¿Deseas eliminar este reporte?");

    if (!confirmDelete) return;

    try {
      await fetch(`${API_URL}/incidents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      loadReports();
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="incident-history-page">
      <div className="incident-history-header">
        <div>
          <h1>Mis Reportes</h1>
          <p>Historial de incidentes y hallazgos creados por ti.</p>
        </div>

        <div className="incident-history-icon">
          <FileText size={36} />
        </div>
      </div>

      {loading ? (
        <div className="incident-empty">Cargando reportes...</div>
      ) : reports.length === 0 ? (
        <div className="incident-empty">
          <AlertTriangle size={40} />
          <h3>No tienes reportes registrados</h3>
        </div>
      ) : (
        <div className="incident-list">
          {reports.map((report) => (
            <div key={report.id} className="incident-history-card">
              <div className="incident-history-top">
                <div>
                  <h3>{report.eventType || "INCIDENTE"}</h3>
                  <span>{report.category || "-"}</span>
                </div>

                <div
                  className={`incident-status ${
                    report.status === "SOLUCIONADO"
                      ? "solved"
                      : report.status === "EN_REVISION"
                      ? "in-review"
                      : "pending"
                  }`}
                >
                  {report.status === "SOLUCIONADO"
                    ? "SOLUCIONADO"
                    : report.status === "EN_REVISION"
                    ? "EN REVISIÓN"
                    : "REPORTADO"}
                </div>
              </div>

              <div className="incident-history-info">
                <div>
                  <Calendar size={16} />
                  {formatDate(report.createdAt)}
                </div>

                <div>
                  <strong>Patente:</strong> {report.vehiclePatent || "-"}
                </div>

                <div>
                  <strong>Supervisor:</strong> {report.supervisor || "-"}
                </div>
              </div>

              <p className="incident-description">
                {report.description || "-"}
              </p>

              <div className="incident-history-actions">
                <button type="button" onClick={() => setSelectedReport(report)}>
                  <Eye size={18} />
                  Ver Detalle
                </button>

                {canDelete && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => deleteReport(report.id)}
                  >
                    <Trash2 size={18} />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <IncidentDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

export default MyIncidentReports;