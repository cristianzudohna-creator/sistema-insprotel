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
} from "lucide-react";

import "./SafetyTalkHistory.css";

const API_URL = "http://localhost:3000";

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

function formatType(value) {
  return String(value || "").replaceAll("_", " ").trim();
}

function SafetyTalkHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUser(), []);
  const isSuperadmin = String(user?.role || "").toUpperCase() === "SUPERADMIN";
  const isAllHistory = location.pathname.includes("historial-todos");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);

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
      setRecords(Array.isArray(data) ? data : []);
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
        throw new Error("Error eliminando charla");
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
      alert("Error eliminando charla ❌");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (isAllHistory && !isSuperadmin) {
      alert("No tienes permiso para ver todas las charlas");
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
              ? "Historial General Charlas de Seguridad"
              : "Mis Charlas de Seguridad"}
          </h2>

          <p>
            {isAllHistory
              ? "Todos los registros guardados por los usuarios."
              : "Registros guardados de tus charlas y participantes."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {isSuperadmin && !isAllHistory && (
            <button
              type="button"
              className="history-back-button"
              onClick={() => navigate("/charlas/historial-todos")}
            >
              <FileText size={18} />
              Ver Todas
            </button>
          )}

          {isAllHistory && (
            <button
              type="button"
              className="history-back-button"
              onClick={() => navigate("/charlas/historial")}
            >
              <User size={18} />
              Ver Mis Charlas
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
        {loading ? (
          <p>Cargando historial...</p>
        ) : records.length === 0 ? (
          <div className="history-empty">
            <FileText size={42} />
            <h3>No hay registros</h3>
            <p>Las charlas guardadas aparecerán aquí.</p>
          </div>
        ) : (
          <div className="history-list">
            {records.map((record) => (
              <div className="history-row" key={record.id}>
                <div className="history-icon">
                  <ShieldCheck size={22} />
                </div>

                <div className="history-info">
                  <h3>{record.topicTitle || "Sin tema"}</h3>

                  <div className="history-meta">
                    <span>
                      <Calendar size={15} />
                      {formatDate(record.date)}
                    </span>

                    <span>
                      <User size={15} />
                      {record.reporterName || "Sin relator"}
                    </span>

                    <span>
                      <Users size={15} />
                      {record.participants?.length || 0} participantes
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

                  {(isSuperadmin || !isAllHistory) && (
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
                <h3>Detalle Charla</h3>
                <p>
                  Tema:{" "}
                  <strong>{selectedRecord.topicTitle || "Sin tema"}</strong>
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
                <span>Tipo</span>
                <strong>{formatType(selectedRecord.type)}</strong>
              </div>

              <div>
                <span>Relator</span>
                <strong>{selectedRecord.reporterName || "Sin relator"}</strong>
              </div>

              <div>
                <span>Sección / Obra</span>
                <strong>{selectedRecord.sectionOrWork || "—"}</strong>
              </div>

              {isAllHistory && (
                <div>
                  <span>Creado por</span>
                  <strong>{selectedRecord.user?.name || "Usuario"}</strong>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h4>Detalle charla</h4>
              <p className="detail-observation">
                {selectedRecord.topicDetails || "Sin detalle"}
              </p>
            </div>

            <div className="detail-section">
              <h4>Participantes</h4>

              {selectedRecord.participants?.length > 0 ? (
                <div className="detail-items">
                  {selectedRecord.participants.map((participant, index) => (
                    <div key={index} className="detail-item">
                      <div>
                        <Users size={18} />
                        <strong>{participant.name || "Sin nombre"}</strong>
                      </div>

                      <span>{participant.rut || "Sin RUT"}</span>
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

              {(isSuperadmin || !isAllHistory) && (
                <button
                  type="button"
                  className="history-delete-button detail-delete-button"
                  onClick={() => askDeleteRecord(selectedRecord)}
                  disabled={deletingId === selectedRecord.id}
                >
                  <Trash2 size={17} />
                  {deletingId === selectedRecord.id
                    ? "Eliminando..."
                    : "Eliminar Charla"}
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

            <h3>¿Eliminar charla?</h3>

            <p>
              Estás a punto de eliminar la charla{" "}
              <strong>“{recordToDelete.topicTitle || "Sin tema"}”</strong>.
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