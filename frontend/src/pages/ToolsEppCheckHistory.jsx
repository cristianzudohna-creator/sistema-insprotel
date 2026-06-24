import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Calendar,
  Eye,
  FileDown,
  FileText,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";

import "./ToolsEppCheckHistory.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token") || "";
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
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value) {
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

function ToolsEppCheckHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUser(), []);
  const role = String(user?.role || "").toUpperCase();

const canViewAll =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION";
  const isAllHistory = location.pathname.includes("historial-todos");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadRecords() {
    try {
      setLoading(true);

      const endpoint = isAllHistory
        ? `${API_URL}/tools-epp-check/all`
        : `${API_URL}/tools-epp-check`;

      const response = await fetch(endpoint, {
        headers: authHeaders(),
      });

      if (!response.ok) throw new Error("Error cargando historial");

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

  async function openPdfPreview(record) {
    if (!record?.id) return;

    try {
      const response = await fetch(`${API_URL}/tools-epp-check/${record.id}/pdf`, {
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
  async function downloadPdf(record) {
  if (!record?.id) return;

  try {
    const response = await fetch(
      `${API_URL}/tools-epp-check/${record.id}/pdf`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Error descargando PDF");
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${record.folio || "AUTOINSPECCION"}.pdf`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Error descargando PDF");
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
        `${API_URL}/tools-epp-check/${recordToDelete.id}`,
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
    if (isAllHistory && !canViewAll) {
      alert("No tienes permiso para ver todos los check list de herramientas");
      navigate("/check-herramientas/historial");
      return;
    }

    loadRecords();
  }, [isAllHistory]);

  return (
    <div className="tools-history-page">
      <div className="tools-history-header">
        <div>
          <h2>
            {isAllHistory
              ? "Historial General Check Herramientas"
              : "Mis Check List Herramientas"}
          </h2>

          <p>
            {isAllHistory
              ? "Todos los registros de herramientas y EPP guardados por los usuarios."
              : "Registros guardados de tus inspecciones de herramientas y EPP."}
          </p>
        </div>

        <div className="tools-history-header-buttons">
          {canViewAll && !isAllHistory && (
            <button
              type="button"
              className="tools-history-back-button"
              onClick={() => navigate("/check-herramientas/historial-todos")}
            >
              <FileText size={18} />
              Ver Todos
            </button>
          )}

          {isAllHistory && (
            <button
              type="button"
              className="tools-history-back-button"
              onClick={() => navigate("/check-herramientas/historial")}
            >
              <User size={18} />
              Ver Mis Check List
            </button>
          )}

          <button
            type="button"
            className="tools-history-back-button"
            onClick={() => navigate("/check-herramientas")}
          >
            <ArrowLeft size={18} />
            Volver al Formulario
          </button>
        </div>
      </div>

      <div className="tools-history-card">
        {loading ? (
          <p>Cargando historial...</p>
        ) : records.length === 0 ? (
          <div className="tools-history-empty">
            <FileText size={42} />
            <h3>No hay registros</h3>
            <p>Los check list de herramientas guardados aparecerán aquí.</p>
          </div>
        ) : (
          <div className="tools-history-list">
            {records.map((record) => (
              <div className="tools-history-row" key={record.id}>
                <div className="tools-history-icon">
                  <Wrench size={22} />
                </div>

                <div className="tools-history-info">
                  <h3>{record.folio || "Check List Herramientas"}</h3>

                  <div className="tools-history-meta">
                    <span>
                      <Calendar size={15} />
                      {formatDate(record.date)}
                    </span>

                    <span>
                      <User size={15} />
                      {record.technicianName || "Sin técnico"}
                    </span>

                    <span>
                      <Wrench size={15} />
                      {record.supervisorInspectorName || "Sin supervisor"}
                    </span>

                    {isAllHistory && (
                      <span>
                        <User size={15} />
                        Creado por: {record.user?.name || "Usuario"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="tools-history-actions">
                  <button
                    className="tools-history-action"
                    onClick={() => setSelectedRecord(record)}
                    type="button"
                  >
                    <Eye size={17} />
                    Ver detalle
                  </button>

                  <button
                    className="tools-history-pdf-button"
                    onClick={() => openPdfPreview(record)}
                    type="button"
                  >
                    <FileDown size={17} />
                    Vista previa PDF
                  </button>

                  <button
  className="tools-history-pdf-button"
  onClick={() => downloadPdf(record)}
  type="button"
>
  <FileDown size={17} />
  Descargar PDF
</button>

                  {(canViewAll || !isAllHistory) && (
                    <button
                      className="tools-history-delete-button"
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
        <div className="tools-detail-overlay">
          <div className="tools-detail-modal">
            <div className="tools-detail-header">
              <div>
                <h3>Detalle Check List Herramientas</h3>
                <p>
                  Folio: <strong>{selectedRecord.folio || "Sin folio"}</strong>
                </p>
              </div>

              <button
                className="tools-detail-close"
                onClick={() => setSelectedRecord(null)}
                type="button"
              >
                <X size={22} />
              </button>
            </div>

            <div className="tools-detail-grid">
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
            </div>

            <div className="tools-detail-section">
              <h4>Estado de EPP y Herramientas</h4>

              <div className="tools-detail-items">
                {selectedRecord.items?.length > 0 ? (
                  selectedRecord.items.map((item, index) => (
                    <div
                      className={`tools-detail-item ${
                        item.status === "MALO" ? "bad" : ""
                      }`}
                      key={item.id || index}
                    >
                      <div>
                        <Wrench size={18} />
                        <strong>
                          {item.number || index + 1}. {item.name}
                        </strong>
                      </div>

                      <span>{item.status || "Sin estado"}</span>

                      <p>
                        <strong>Cantidad:</strong> {item.quantity || "—"}
                      </p>

                      <p>{item.observation || "Sin observación"}</p>
                    </div>
                  ))
                ) : (
                  <p className="tools-detail-observation">
                    Sin ítems registrados.
                  </p>
                )}
              </div>
            </div>

            <div className="tools-detail-section">
              <h4>Observaciones Generales</h4>

              <p className="tools-detail-observation">
                {selectedRecord.generalObservation || "Sin observaciones"}
              </p>
            </div>

            <div className="tools-detail-footer-actions">
              <button
                type="button"
                className="tools-history-pdf-button"
                onClick={() => openPdfPreview(selectedRecord)}
              >
                <FileDown size={17} />
                Vista previa PDF
              </button>

              {(canViewAll || !isAllHistory) && (
                <button
                  type="button"
                  className="tools-history-delete-button"
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
        <div className="tools-delete-modal-overlay">
          <div className="tools-delete-modal">
            <div className="tools-delete-modal-icon">
              <Trash2 size={38} />
            </div>

            <h3>¿Eliminar check list?</h3>

            <p>
              Estás a punto de eliminar el check list{" "}
              <strong>“{recordToDelete.folio || "Sin folio"}”</strong>.
            </p>

            <p className="tools-delete-warning">
              Esta acción no se puede deshacer.
            </p>

            <div className="tools-delete-modal-actions">
              <button
                type="button"
                className="tools-delete-cancel-button"
                onClick={cancelDelete}
                disabled={deletingId === recordToDelete.id}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="tools-delete-confirm-button"
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

export default ToolsEppCheckHistory;