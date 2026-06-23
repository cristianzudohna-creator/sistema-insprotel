import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Calendar,
  Car,
  Eye,
  FileText,
  User,
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  FileDown,
  PenLine,
} from "lucide-react";

import "./VehicleCheckHistory.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
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

  const [year, month, day] = String(value).split("T")[0].split("-");
  return `${day}-${month}-${year}`;
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusLabel(status) {
  if (status === "COMPLETADO") return "Completado";
  if (status === "PENDIENTE_FIRMAS") return "Pendiente firmas";
  if (status === "OBSERVADO") return "Observado";
  return "Pendiente";
}

function VehicleCheckHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUser(), []);
  const role = String(user?.role || "").toUpperCase();
  const isSuperadmin = role === "SUPERADMIN";
const canSeeAllHistory =
  role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";

const isAllHistory = location.pathname.includes("historial-todos");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [searchDate, setSearchDate] = useState("");
  const [searchPatent, setSearchPatent] = useState("");

  async function openPdfPreview(record) {
    if (!record?.id) return;

    try {
      const response = await fetch(`${API_URL}/vehicle-checklist/${record.id}/pdf`, {
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error("No se pudo abrir el PDF");

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

      const endpoint = `${API_URL}/vehicle-checklist/finished`;

      const response = await fetch(endpoint, {
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error("Error cargando historial");

      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Error cargando historial");
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
        `${API_URL}/vehicle-checklist/${recordToDelete.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      if (!response.ok) throw new Error("Error eliminando check list");

      setRecords((prev) => prev.filter((item) => item.id !== recordToDelete.id));

      if (selectedRecord?.id === recordToDelete.id) {
        setSelectedRecord(null);
      }

      setRecordToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Error eliminando check list ❌");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (isAllHistory && !canSeeAllHistory) {
  alert("No tienes permiso para ver todos los check list");
  navigate("/check-vehiculos/historial");
  return;
}

    loadRecords();
  }, [isAllHistory]);

  const filteredRecords = records.filter((record) => {
    const recordDate = record.date
      ? String(record.date).split("T")[0]
      : "";

    const matchDate = !searchDate || recordDate === searchDate;

    const matchPatent =
      !searchPatent ||
      String(record.patent || "")
        .toLowerCase()
        .includes(searchPatent.toLowerCase());

    return matchDate && matchPatent;
  });

  return (
    <div className="history-page">
      <div className="history-header history-header-actions">
        <div>
          <h2>
  {isAllHistory
    ? "Todos los Check List Vehículos"
    : "Mis Check List Vehículos"}
</h2>

          <p>
            {isAllHistory
              ? "Todos los registros guardados por los usuarios."
              : "Registros completados con sus firmas correspondientes."}
          </p>
        </div>

        <div className="history-top-actions">
          <button
            type="button"
            className="history-back-button"
            onClick={() => navigate("/check-vehiculos/pendientes-firma")}
          >
            <PenLine size={18} />
            Pendientes de Firma
          </button>

          {canSeeAllHistory && !isAllHistory && (
            <button
              type="button"
              className="history-back-button"
              onClick={() => navigate("/check-vehiculos/historial-todos")}
            >
              <FileText size={18} />
Todos los Check List
            </button>
          )}

          {isAllHistory && (
            <button
              type="button"
              className="history-back-button"
              onClick={() => navigate("/check-vehiculos/historial")}
            >
              <User size={18} />
Mis Check List
            </button>
          )}

          <button
            type="button"
            className="history-back-button"
            onClick={() => navigate("/check-vehiculos")}
          >
            <ArrowLeft size={18} />
            Volver al Formulario
          </button>
        </div>
      </div>

      <div className="history-filters">
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="history-date-filter"
        />

        <input
          type="text"
          placeholder="Buscar patente..."
          value={searchPatent}
          onChange={(e) => setSearchPatent(e.target.value)}
          className="history-search-input"
        />

        <button
          type="button"
          className="history-clear-filter"
          onClick={() => {
            setSearchDate("");
            setSearchPatent("");
          }}
        >
          Limpiar filtros
        </button>
      </div>

      <div className="history-card">
        {loading ? (
          <p>Cargando historial...</p>
        ) : filteredRecords.length === 0 ? (
          <div className="history-empty">
            <FileText size={42} />
            <h3>No hay registros</h3>
            <p>Los check list terminados aparecerán aquí.</p>
          </div>
        ) : (
          <div className="history-list">
            {filteredRecords.map((record) => (
              <div className="history-row" key={record.id}>
                <div className="history-icon">
                  <Car size={22} />
                </div>

                <div className="history-info">
                  <h3>{record.patent || "Sin patente"}</h3>

                  <div className="history-meta">
                    <span>
                      <Calendar size={15} />
{formatDateTime(record.completedAt || record.createdAt)}
                    </span>

                    <span>
                      <User size={15} />
                      {record.driverName || "Sin conductor"}
                    </span>

                    <span>
                      <CheckCircle2 size={15} />
                      {statusLabel(record.status)}
                    </span>

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
                      {deletingId === record.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="detail-overlay">
          <div className="detail-modal">
            <div className="detail-header">
              <div>
                <h3>Detalle Check List</h3>
                <p>
                  Patente:{" "}
                  <strong>{selectedRecord.patent || "Sin patente"}</strong>
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
                <span>Fecha y Hora</span>
<strong>
  {formatDateTime(
    selectedRecord.completedAt || selectedRecord.createdAt
  )}
</strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>{statusLabel(selectedRecord.status)}</strong>
              </div>

              <div>
                <span>Conductor</span>
                <strong>{selectedRecord.driverName || "Sin conductor"}</strong>
              </div>

              <div>
                <span>Inspector</span>
                <strong>{selectedRecord.inspectorName || "—"}</strong>
              </div>

              <div>
                <span>Kilometraje</span>
                <strong>{selectedRecord.mileage || 0}</strong>
              </div>

              <div>
                <span>Tipo Vehículo</span>
                <strong>{selectedRecord.vehicleType || "—"}</strong>
              </div>

              <div>
                <span>Modelo</span>
                <strong>{selectedRecord.vehicleModel || "—"}</strong>
              </div>

              {isAllHistory && (
                <div>
                  <span>Creado por</span>
                  <strong>{selectedRecord.user?.name || "Usuario"}</strong>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h4>Firmas</h4>

              <div className="detail-grid">
                <div>
                  <span>Conductor</span>
                  <strong>
                    {selectedRecord.driverSignatureUrl ? "Firmado" : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Inspector</span>
                  <strong>
                    {selectedRecord.inspectorSignatureUrl ? "Firmado" : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Supervisor</span>
                  <strong>
                    {selectedRecord.supervisorSignatureUrl
                      ? "Firmado"
                      : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Prevención</span>
                  <strong>
                    {selectedRecord.preventionSignatureUrl
                      ? "Firmado"
                      : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Superadmin</span>
                  <strong>
                    {selectedRecord.superadminSignatureUrl
                      ? "Firmado"
                      : "Pendiente"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Chequeo General</h4>

              <div className="detail-items">
                {selectedRecord.items?.length > 0 ? (
                  selectedRecord.items.map((item) => (
                    <div
                      className={`detail-item ${
                        item.status === "MALO" ? "bad" : ""
                      }`}
                      key={item.id}
                    >
                      <div>
                        {item.status === "MALO" ? (
                          <AlertTriangle size={18} />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}

                        <strong>{item.itemName}</strong>
                      </div>

                      <span>{item.status || "Sin estado"}</span>

                      <p>{item.observation || "Sin observación"}</p>
                    </div>
                  ))
                ) : (
                  <p className="detail-observation">Sin ítems registrados.</p>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h4>Observaciones Generales</h4>

              <p className="detail-observation">
                {selectedRecord.generalObservation || "Sin observaciones"}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <Camera size={18} />
                Fotos del Desperfecto
              </h4>

              {selectedRecord.photos?.length > 0 ? (
                <div className="detail-photo-grid">
                  {selectedRecord.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={`${API_URL}${photo.imageUrl}`}
                      alt="desperfecto"
                    />
                  ))}
                </div>
              ) : (
                <p className="detail-observation">Sin fotos adjuntas.</p>
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
                    : "Eliminar Check List"}
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

            <h3>¿Eliminar check list?</h3>

            <p>
              Estás a punto de eliminar el check list de la patente{" "}
              <strong>“{recordToDelete.patent || "Sin patente"}”</strong>.
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

export default VehicleCheckHistory;