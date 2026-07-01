import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Eye,
  FileText,
  Trash2,
  CheckCircle2,
  Search,
  PlayCircle,
} from "lucide-react";

import IncidentDetailModal from "../components/IncidentDetailModal";

import "./IncidentReportHistory.css";

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
  return new Date(value).toLocaleString("es-CL");
}

function getStatusLabel(status) {
  if (status === "EN_REVISION") return "EN REVISIÓN";
  if (status === "SOLUCIONADO") return "SOLUCIONADO";
  return "REPORTADO";
}

function getStatusClass(status) {
  if (status === "EN_REVISION") return "in-review";
  if (status === "SOLUCIONADO") return "solved";
  return "pending";
}

function IncidentReportHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const [filters, setFilters] = useState({
    patent: "",
    supervisor: "",
    type: "",
  });

  async function loadReports() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/incidents/all`, {
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

  async function startReview(id) {
    try {
      await fetch(`${API_URL}/incidents/${id}/review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      loadReports();
    } catch (error) {
      console.error(error);
    }
  }

  async function solveReport(id) {
    const solutionDescription = window.prompt(
      "Describe brevemente la solución o acción realizada:",
    );

    if (solutionDescription === null) return;

    try {
      await fetch(`${API_URL}/incidents/${id}/solve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          solutionDescription,
        }),
      });

      loadReports();
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteReport(id) {
    const ok = window.confirm("¿Eliminar este reporte?");

    if (!ok) return;

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

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const patentOk =
        !filters.patent ||
        String(report.vehiclePatent || "")
          .toUpperCase()
          .includes(filters.patent.toUpperCase());

      const supervisorOk =
        !filters.supervisor ||
        String(report.supervisor || "")
          .toUpperCase()
          .includes(filters.supervisor.toUpperCase());

      const typeOk = !filters.type || report.eventType === filters.type;

      return patentOk && supervisorOk && typeOk;
    });
  }, [reports, filters]);

  return (
    <div className="incident-history-page">
      <div className="incident-history-header">
        <div>
          <h1>Historial General</h1>
          <p>Todos los incidentes y hallazgos registrados.</p>
        </div>

        <div className="incident-history-icon">
          <FileText size={36} />
        </div>
      </div>

      <div className="incident-filters">
        <div className="incident-filter-title">
          <Search size={18} />
          Filtros
        </div>

        <div className="incident-filter-grid">
          <input
            placeholder="Patente"
            value={filters.patent}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                patent: e.target.value,
              }))
            }
          />

          <input
            placeholder="Supervisor"
            value={filters.supervisor}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                supervisor: e.target.value,
              }))
            }
          />

          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: e.target.value,
              }))
            }
          >
            <option value="">Todos</option>
            <option value="INCIDENTE">Incidente</option>
            <option value="HALLAZGO">Hallazgo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="incident-empty">Cargando reportes...</div>
      ) : (
        <div className="incident-list">
          {filteredReports.map((report) => (
            <div key={report.id} className="incident-history-card">
              <div className="incident-history-top">
                <div>
                  <h3>{report.eventType}</h3>
                  <span>{report.category}</span>
                </div>

                <div className={`incident-status ${getStatusClass(report.status)}`}>
                  {getStatusLabel(report.status)}
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

              <p className="incident-description">{report.description}</p>

              <div className="incident-history-actions">
                <button type="button" onClick={() => setSelectedReport(report)}>
                  <Eye size={18} />
                  Ver Detalle
                </button>

                {report.status === "REPORTADO" && (
                  <button type="button" onClick={() => startReview(report.id)}>
                    <PlayCircle size={18} />
                    Iniciar Revisión
                  </button>
                )}

                {report.status === "EN_REVISION" && (
                  <button type="button" onClick={() => solveReport(report.id)}>
                    <CheckCircle2 size={18} />
                    Marcar Solucionado
                  </button>
                )}

                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => deleteReport(report.id)}
                >
                  <Trash2 size={18} />
                  Eliminar
                </button>
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

export default IncidentReportHistory;