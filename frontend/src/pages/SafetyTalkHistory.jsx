import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Calendar,
  Eye,
  FileText,
  User,
  X,
  ArrowLeft,
  Trash2,
  FileDown,
  ShieldCheck,
  Users,
  MapPin,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RotateCcw,
} from "lucide-react";

import "./SafetyTalkHistory.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getUser() {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("me") ||
      localStorage.getItem("profile");

    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function authHeaders() {
  const token = getToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL");
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "Sin hora";
  return String(value).slice(0, 5);
}

function text(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function statusLabel(value) {
  const status = String(value || "PENDIENTE_FIRMAS").toUpperCase();

  if (status === "PENDIENTE_FIRMAS") return "Pendiente de firmas";
  if (status === "PENDIENTE_REVISION") return "Pendiente de revisión";
  if (status === "COMPLETADA") return "Completada";
  if (status === "APROBADA") return "Aprobada";
  if (status === "RECHAZADA") return "Rechazada";

  return status.replaceAll("_", " ");
}

function getSignedCount(record) {
  return (record.participants || []).filter((item) => item.signatureUrl).length;
}

function getTitle(record) {
  return (
    record.workOrderProject ||
    record.areaLocationInstallation ||
    "Reunión previa de seguridad"
  );
}

function SafetyTalkHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUser(), []);
  const role = String(user?.role || "").toUpperCase();

  const isSuperadmin = role === "SUPERADMIN";
  const isReviewer =
    role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";

  const isAllHistory = location.pathname.includes("historial-todos");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  function updateFilter(field, value) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      search: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    });
  }

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const search = filters.search.trim().toLowerCase();

      const participantsText = (record.participants || [])
        .map((item) => `${item.name || ""} ${item.rut || ""}`)
        .join(" ");

      const searchableText = [
        record.folio,
        getTitle(record),
        record.createdByName,
        record.createdByRut,
        record.user?.name,
        record.areaLocationInstallation,
        record.workOrderProject,
        record.workPermitActivity,
        record.foremanOrBrigadeName,
        record.foremanCompany,
        participantsText,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);

      const recordStatus = String(record.status || "").toUpperCase();
      const matchesStatus = !filters.status || recordStatus === filters.status;

      const recordDate = record.completedAt || record.date;
      const parsedDate = recordDate ? new Date(recordDate) : null;

      let matchesDateFrom = true;
      let matchesDateTo = true;

      if (filters.dateFrom && parsedDate) {
        const from = new Date(`${filters.dateFrom}T00:00:00`);
        matchesDateFrom = parsedDate >= from;
      }

      if (filters.dateTo && parsedDate) {
        const to = new Date(`${filters.dateTo}T23:59:59`);
        matchesDateTo = parsedDate <= to;
      }

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [records, filters]);

  async function downloadExcel() {
    try {
      setDownloadingExcel(true);

      const params = new URLSearchParams();

      if (filters.dateFrom) {
        params.append("dateFrom", filters.dateFrom);
      }

      if (filters.dateTo) {
        params.append("dateTo", filters.dateTo);
      }

      const query = params.toString();
      const url = query
        ? `${API_URL}/safety-talks/export/excel?${query}`
        : `${API_URL}/safety-talks/export/excel`;

      const response = await fetch(url, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("No se pudo descargar el Excel");
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      const today = new Date().toLocaleDateString("es-CL").replace(/\//g, "-");

      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `charlas_completadas_${today}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error(error);
      alert("Error descargando Excel ❌");
    } finally {
      setDownloadingExcel(false);
    }
  }

  async function openPdfPreview(record) {
    if (!record?.id) return;

    try {
      const response = await fetch(`${API_URL}/safety-talks/${record.id}/pdf`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("No se pudo abrir el PDF");
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, "_blank");
    } catch (error) {
      console.error(error);
      alert("Error abriendo PDF ❌");
    }
  }

  async function loadRecords() {
    try {
      setLoading(true);

      const endpoint = isAllHistory
        ? `${API_URL}/safety-talks/all`
        : `${API_URL}/safety-talks`;

      const response = await fetch(endpoint, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("Error cargando historial");
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : [];

      const filteredList = isAllHistory
        ? list.filter(
            (item) => String(item.status || "").toUpperCase() === "COMPLETADA",
          )
        : list;

      setRecords(filteredList);
    } catch (error) {
      console.error(error);
      alert("Error cargando historial");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  function askDeleteRecord(record) {
    setRecordToDelete(record);
  }

  function cancelDelete() {
    setRecordToDelete(null);
  }

  async function confirmDeleteRecord() {
    if (!recordToDelete?.id) return;

    try {
      setDeletingId(recordToDelete.id);

      const response = await fetch(
        `${API_URL}/safety-talks/${recordToDelete.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Error eliminando reunión");
      }

      setRecords((prev) =>
        prev.filter((item) => item.id !== recordToDelete.id),
      );

      if (selectedRecord?.id === recordToDelete.id) {
        setSelectedRecord(null);
      }

      setRecordToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Error eliminando reunión ❌");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (isAllHistory && !isReviewer) {
      alert("No tienes permiso para ver todas las reuniones");
      navigate("/charlas/historial");
      return;
    }

    loadRecords();
  }, [isAllHistory]);

  return (
    <div className="history-page">
      <div className="history-header history-header-actions">
        <div>
          <h2>
            {isAllHistory
              ? "Historial General Reuniones de Seguridad"
              : "Mis Reuniones de Seguridad"}
          </h2>

          <p>
            {isAllHistory
              ? "Charlas terminadas disponibles para revisión."
              : "Registros guardados de reuniones previas de seguridad."}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
            minWidth: "320px",
          }}
        >
          {isAllHistory && (
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              {isReviewer && (
                <button
                  type="button"
                  className="history-pdf-button"
                  onClick={downloadExcel}
                  disabled={downloadingExcel}
                >
                  <FileDown size={18} />
                  {downloadingExcel ? "Descargando..." : "Descargar Excel"}
                </button>
              )}

              <button
                type="button"
                className="history-back-button"
                onClick={() => navigate("/charlas/historial")}
              >
                <User size={18} />
                Ver Mis Reuniones
              </button>
            </div>
          )}

          {isReviewer && !isAllHistory && (
            <button
              type="button"
              className="history-back-button"
              onClick={() => navigate("/charlas/historial-todos")}
            >
              <FileText size={18} />
              Ver Todas
            </button>
          )}

          <button
            type="button"
            className="history-back-button"
            onClick={() => navigate("/charlas")}
          >
            <ArrowLeft size={18} />
            Volver al Formulario
          </button>
        </div>
      </div>

      <div className="history-card">
        <div className="history-filters">
          <div className="history-filter-field history-filter-search">
            <label>
              <Search size={15} />
              Buscar
            </label>

            <input
              type="text"
              placeholder="Folio, creador, participante, RUT, proyecto..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>

          <div className="history-filter-field">
            <label>
              <Filter size={15} />
              Estado
            </label>

            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE_FIRMAS">Pendiente de firmas</option>
              <option value="COMPLETADA">Completada</option>
            </select>
          </div>

          <div className="history-filter-field">
            <label>Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />
          </div>

          <div className="history-filter-field">
            <label>Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </div>

          <button
            type="button"
            className="history-back-button"
            onClick={clearFilters}
          >
            <RotateCcw size={16} />
            Limpiar
          </button>
        </div>

        <div className="history-results-count">
          Mostrando {filteredRecords.length} de {records.length} reuniones
        </div>

        {loading ? (
          <p>Cargando historial...</p>
        ) : records.length === 0 ? (
          <div className="history-empty">
            <FileText size={42} />
            <h3>No hay registros</h3>
            <p>Las reuniones guardadas aparecerán aquí.</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="history-empty">
            <FileText size={42} />
            <h3>No hay resultados</h3>
            <p>No se encontraron charlas con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="history-list">
            {filteredRecords.map((record) => {
              const signedCount = getSignedCount(record);
              const totalParticipants = record.participants?.length || 0;

              return (
                <div className="history-row" key={record.id}>
                  <div className="history-icon">
                    <ShieldCheck size={22} />
                  </div>

                  <div className="history-info">
                    <h3>{getTitle(record)}</h3>

                    <div className="history-meta">
                      <span>
                        <Calendar size={15} />
                        {formatDate(record.completedAt || record.date)}
                      </span>

                      <span>
                        <Clock size={15} />
                        {record.completedAt
                          ? formatDateTime(record.completedAt)
                          : formatTime(record.meetingTime)}
                      </span>

                      <span>
                        <User size={15} />
                        {record.createdByName || record.user?.name || "Usuario"}
                      </span>

                      <span>
                        <Users size={15} />
                        {totalParticipants} participantes
                      </span>

                      <span>
                        <CheckCircle2 size={15} />
                        {signedCount}/{totalParticipants} firmas
                      </span>

                      <span>{statusLabel(record.status)}</span>

                      {isAllHistory && (
                        <span>
                          <User size={15} />
                          Creado por: {record.user?.name || "Usuario"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="history-actions">
                    <button
                      className="history-action"
                      onClick={() => setSelectedRecord(record)}
                      type="button"
                    >
                      <Eye size={17} />
                      Ver detalle
                    </button>

                    <button
                      className="history-pdf-button"
                      onClick={() => openPdfPreview(record)}
                      type="button"
                    >
                      <FileDown size={17} />
                      Vista previa PDF
                    </button>

                    {isSuperadmin && (
                      <button
                        className="history-delete-button"
                        onClick={() => askDeleteRecord(record)}
                        disabled={deletingId === record.id}
                        type="button"
                      >
                        <Trash2 size={17} />
                        {deletingId === record.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="detail-overlay">
          <div className="detail-modal">
            <div className="detail-header">
              <div>
                <h3>Detalle Reunión de Seguridad</h3>
                <p>
                  <strong>{getTitle(selectedRecord)}</strong>
                </p>
              </div>

              <button
                className="detail-close"
                onClick={() => setSelectedRecord(null)}
                type="button"
              >
                <X size={22} />
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <span>Fecha</span>
                <strong>
                  {formatDate(selectedRecord.completedAt || selectedRecord.date)}
                </strong>
              </div>

              <div>
                <span>Hora</span>
                <strong>
                  {selectedRecord.completedAt
                    ? formatDateTime(selectedRecord.completedAt)
                    : formatTime(selectedRecord.meetingTime)}
                </strong>
              </div>

              <div>
                <span>Realizada por</span>
                <strong>
                  {selectedRecord.createdByName ||
                    selectedRecord.user?.name ||
                    "Usuario"}
                </strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>{statusLabel(selectedRecord.status)}</strong>
              </div>

              <div>
                <span>Área / Lugar / Instalación</span>
                <strong>{text(selectedRecord.areaLocationInstallation)}</strong>
              </div>

              <div>
                <span>Orden de trabajo / Proyecto</span>
                <strong>{text(selectedRecord.workOrderProject)}</strong>
              </div>

              <div>
                <span>Permiso de Faena / Actividad</span>
                <strong>{text(selectedRecord.workPermitActivity)}</strong>
              </div>

              <div>
                <span>N° Personas</span>
                <strong>
                  {text(
                    selectedRecord.peopleCount ||
                      selectedRecord.participants?.length,
                  )}
                </strong>
              </div>

              {isAllHistory && (
                <div>
                  <span>Creado por</span>
                  <strong>{selectedRecord.user?.name || "Usuario"}</strong>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h4>
                <ClipboardList size={18} />
                Se realizarán trabajos de
              </h4>
              <p className="detail-observation">
                {text(selectedRecord.worksToDo, "Sin trabajos registrados")}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <MapPin size={18} />
                Jefe de Faena / Empresa
              </h4>
              <div className="detail-grid">
                <div>
                  <span>Jefe de Faena o Brigada</span>
                  <strong>{text(selectedRecord.foremanOrBrigadeName)}</strong>
                </div>

                <div>
                  <span>Empresa</span>
                  <strong>{text(selectedRecord.foremanCompany)}</strong>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>
                <ShieldCheck size={18} />
                Tipo de trabajos
              </h4>
              <p className="detail-observation">
                {text(selectedRecord.workTypes, "Sin tipo de trabajos")}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <AlertTriangle size={18} />
                Riesgos previstos más significativos
              </h4>
              <p className="detail-observation">
                {text(selectedRecord.significantRisks, "Sin riesgos")}
              </p>
            </div>

            <div className="detail-section">
              <h4>Accidente e incidente analizado</h4>
              <p className="detail-observation">
                {text(selectedRecord.analyzedAccident, "Sin análisis")}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <CheckCircle2 size={18} />
                Medidas de control
              </h4>

              <div className="detail-items">
                {Array.from({ length: 12 }, (_, index) => {
                  const value = selectedRecord[`controlMeasure${index + 1}`];

                  return (
                    <div key={index} className="detail-item">
                      <div>
                        <CheckCircle2 size={18} />
                        <strong>{index + 1}.-</strong>
                      </div>

                      <p>{text(value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="detail-section">
              <h4>
                <Users size={18} />
                Participantes
              </h4>

              {selectedRecord.participants?.length > 0 ? (
                <div className="detail-items">
                  {selectedRecord.participants.map((participant, index) => (
                    <div key={index} className="detail-item">
                      <div>
                        <Users size={18} />
                        <strong>{participant.name || "Sin nombre"}</strong>
                      </div>

                      <span>{participant.rut || "Sin RUT"}</span>

                      <p>
                        Descanso:{" "}
                        <strong>{participant.compliesRest ? "Sí" : "No"}</strong>{" "}
                        · Firma:{" "}
                        <strong>
                          {participant.signatureUrl ? "Firmado" : "Pendiente"}
                        </strong>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="detail-observation">
                  Sin participantes registrados.
                </p>
              )}
            </div>

            <div className="detail-footer-actions">
              <button
                type="button"
                className="history-pdf-button detail-pdf-button"
                onClick={() => openPdfPreview(selectedRecord)}
              >
                <FileDown size={17} />
                Vista previa PDF
              </button>

              {isSuperadmin && (
                <button
                  type="button"
                  className="history-delete-button detail-delete-button"
                  onClick={() => askDeleteRecord(selectedRecord)}
                  disabled={deletingId === selectedRecord.id}
                >
                  <Trash2 size={17} />
                  {deletingId === selectedRecord.id
                    ? "Eliminando..."
                    : "Eliminar Reunión"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {recordToDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-icon">
              <Trash2 size={38} />
            </div>

            <h3>¿Eliminar reunión?</h3>

            <p>
              Estás a punto de eliminar la reunión{" "}
              <strong>“{getTitle(recordToDelete)}”</strong>.
            </p>

            <p className="delete-warning">Esta acción no se puede deshacer.</p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel-button"
                onClick={cancelDelete}
                disabled={deletingId === recordToDelete.id}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={confirmDeleteRecord}
                disabled={deletingId === recordToDelete.id}
              >
                <Trash2 size={18} />
                {deletingId === recordToDelete.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SafetyTalkHistory;