import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AlertTriangle,
  Calendar,
  Eye,
  FileDown,
  FileText,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";

import "./HarnessCheckHistory.css";

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

function formatStatus(value) {
  const status = String(value || "PENDIENTE").toUpperCase();

  if (status === "APROBADO") return "Aprobado";
  if (status === "RECHAZADO") return "Rechazado";

  return "Pendiente";
}

function HarnessCheckHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUser(), []);
  const role = String(user?.role || "").toUpperCase();
  const isTechnician = role === "TECNICO";
  const canDelete = role === "SUPERADMIN";

  const canSeeAllHistory =
    role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";

  const isAllHistory = location.pathname.includes("historial-todos");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [searchDate, setSearchDate] = useState("");
const [searchText, setSearchText] = useState("");

  async function loadRecords() {
    try {
      setLoading(true);

      const endpoint = isAllHistory
  ? `${API_URL}/harness-check/all`
  : `${API_URL}/harness-check/finished`;

const response = await fetch(endpoint, {
  headers: authHeaders(),
});

      if (!response.ok) {
        throw new Error("Error cargando check list terminados");
      }

      const data = await response.json();

      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Error cargando check list de arnés terminados");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function openPdfPreview(record) {
    if (!record?.id) return;

    try {
      const response = await fetch(`${API_URL}/harness-check/${record.id}/pdf`, {
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

  async function downloadPdf(record) {
  if (!record?.id) return;

  try {
    const response = await fetch(
      `${API_URL}/harness-check/${record.id}/pdf`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("No se pudo descargar el PDF");
    }

    const blob = await response.blob();
    const fileUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `${record.folio || "CHECKLIST_ARNES"}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(fileUrl);
  } catch (error) {
    console.error(error);
    alert("Error descargando PDF ❌");
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
        `${API_URL}/harness-check/${recordToDelete.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Error eliminando check list");
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
      alert("Error eliminando check list ❌");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = records.filter((record) => {
  const matchDate =
    !searchDate ||
    String(record.date || "").startsWith(searchDate);

  const text = searchText.toLowerCase();

  const matchText =
    !text ||
    String(record.folio || "")
      .toLowerCase()
      .includes(text) ||
    String(record.technicianName || "")
      .toLowerCase()
      .includes(text) ||
    String(record.user?.name || "")
      .toLowerCase()
      .includes(text);

  return matchDate && matchText;
});

  return (
    <div className="history-page">
      <div className="history-header history-header-actions">
  <div>
    <h2>
      {isAllHistory
        ? "Todos los Check List Arnés"
        : "Mis Check List Arnés"}
    </h2>

    <p>
      {isAllHistory
        ? "Todos los registros de check list de arnés."
        : "Registros de check list de arnés asociados a tu usuario."}
    </p>
  </div>

  <div className="history-top-actions">
    {canSeeAllHistory && !isAllHistory && (
      <button
        type="button"
        className="history-back-button"
        onClick={() => navigate("/arnes/historial-todos")}
      >
        <FileText size={18} />
        Todos los Check List
      </button>
    )}

    {isAllHistory && (
      <button
        type="button"
        className="history-back-button"
        onClick={() => navigate("/arnes/historial")}
      >
        <User size={18} />
        Mis Check List
      </button>
    )}

    <button
      type="button"
      className="history-back-button"
      onClick={() => navigate("/arnes")}
    >
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
    placeholder="Buscar folio, técnico o creador..."
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    className="history-search-input"
  />

  <button
    type="button"
    className="history-clear-filter"
    onClick={() => {
      setSearchDate("");
      setSearchText("");
    }}
  >
    Limpiar filtros
  </button>
</div>

      <div className="history-card">
        {loading ? (
          <p>Cargando terminados...</p>
        ) : filteredRecords.length === 0 ? (
          <div className="history-empty">
            <FileText size={42} />
            <h3>No hay registros</h3>
<p>Los check list de arnés aparecerán aquí.</p>
          </div>
        ) : (
          <div className="history-list">
  {filteredRecords.map((record) => (
              <div className="history-row" key={record.id}>
                <div className="history-icon">
                  <ShieldCheck size={22} />
                </div>

                <div className="history-info">
                  <h3>{record.folio || "Check List Arnés"}</h3>

                  <div className="history-meta">
                    <span>
                      <Calendar size={15} />
                      {formatDate(record.date)}
                    </span>

                    <span>
                      <User size={15} />
                      Técnico: {record.technicianName || "Sin técnico"}
                    </span>

                    <span>
                      <AlertTriangle size={15} />
                      {formatStatus(record.status)}
                    </span>

                    {!isTechnician && (
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

                  <button
  className="history-pdf-button"
  onClick={() => downloadPdf(record)}
  type="button"
>
  <FileDown size={17} />
  Descargar PDF
</button>

                  {canDelete && (
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
                <h3>Detalle Check List Arnés</h3>
                <p>
                  Folio: <strong>{selectedRecord.folio || "Sin folio"}</strong>
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
                <strong>{formatDate(selectedRecord.date)}</strong>
              </div>

              <div>
                <span>Contrato</span>
                <strong>{selectedRecord.contract || "—"}</strong>
              </div>

              <div>
                <span>Técnico</span>
                <strong>{selectedRecord.technicianName || "—"}</strong>
              </div>

              <div>
                <span>Móvil</span>
                <strong>{selectedRecord.mobile || "—"}</strong>
              </div>

              <div>
                <span>Supervisor / Inspector</span>
                <strong>{selectedRecord.supervisorInspectorName || "—"}</strong>
              </div>

              <div>
                <span>Zona</span>
                <strong>{selectedRecord.zone || "—"}</strong>
              </div>

              {!isTechnician && (
                <div>
                  <span>Creado por</span>
                  <strong>{selectedRecord.user?.name || "Usuario"}</strong>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h4>Inspección del Arnés</h4>

              <div className="detail-items">
                {selectedRecord.items?.length > 0 ? (
                  selectedRecord.items.map((item, index) => (
                    <div
                      className={`detail-item ${
                        item.status === "NO" ? "bad" : ""
                      }`}
                      key={item.id || index}
                    >
                      <div>
                        <ShieldCheck size={18} />
                        <strong>
                          {index + 1}. {item.description}
                        </strong>
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

            <div className="detail-footer-actions">
              <button
                type="button"
                className="history-pdf-button detail-pdf-button"
                onClick={() => openPdfPreview(selectedRecord)}
              >
                <FileDown size={17} />
                Vista previa PDF
              </button>

              {canDelete && (
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
              Estás a punto de eliminar el check list{" "}
              <strong>“{recordToDelete.folio || "Sin folio"}”</strong>.
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

export default HarnessCheckHistory;