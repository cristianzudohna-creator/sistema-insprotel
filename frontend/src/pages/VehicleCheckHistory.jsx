import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
} from "lucide-react";

import "./VehicleCheckHistory.css";

const API_URL = "http://localhost:3000";

/*
  Por ahora lo dejamos fijo en true para probar.
  Cuando hagamos login real, esto debe venir desde el usuario logueado:
  user.role === "SUPERADMIN"
*/
const IS_SUPERADMIN = true;

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-CL");
}

function VehicleCheckHistory() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function openPdfPreview(record) {
    if (!record?.id) return;
    window.open(`${API_URL}/vehicle-checklist/${record.id}/pdf`, "_blank");
  }

  async function loadRecords() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/vehicle-checklist`);
      const data = await response.json();

      setRecords(data);
    } catch (error) {
      console.error(error);
      alert("Error cargando historial");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord(record) {
    const ok = window.confirm(
      `¿Seguro que deseas eliminar el check list de la patente ${
        record.patent || "sin patente"
      }?`
    );

    if (!ok) return;

    try {
      setDeletingId(record.id);

      const response = await fetch(`${API_URL}/vehicle-checklist/${record.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error eliminando check list");
      }

      setRecords((prev) => prev.filter((item) => item.id !== record.id));

      if (selectedRecord?.id === record.id) {
        setSelectedRecord(null);
      }

      alert("Check list eliminado correctamente ✅");
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

  return (
    <div className="history-page">
      <div className="history-header history-header-actions">
        <div>
          <h2>Historial Check List Vehículos</h2>
          <p>Registros guardados de inspecciones vehiculares.</p>
        </div>

        <button
          type="button"
          className="history-back-button"
          onClick={() => navigate("/check-vehiculos")}
        >
          <ArrowLeft size={18} />
          Volver al Formulario
        </button>
      </div>

      <div className="history-card">
        {loading ? (
          <p>Cargando historial...</p>
        ) : records.length === 0 ? (
          <div className="history-empty">
            <FileText size={42} />
            <h3>No hay registros</h3>
            <p>Los check list guardados aparecerán aquí.</p>
          </div>
        ) : (
          <div className="history-list">
            {records.map((record) => (
              <div className="history-row" key={record.id}>
                <div className="history-icon">
                  <Car size={22} />
                </div>

                <div className="history-info">
                  <h3>{record.patent || "Sin patente"}</h3>

                  <div className="history-meta">
                    <span>
                      <Calendar size={15} />
                      {formatDate(record.date)}
                    </span>

                    <span>
                      <User size={15} />
                      {record.driverName || "Sin conductor"}
                    </span>
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

                  {IS_SUPERADMIN && (
                    <button
                      className="history-delete-button"
                      onClick={() => deleteRecord(record)}
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
                <span>Fecha</span>
                <strong>{formatDate(selectedRecord.date)}</strong>
              </div>

              <div>
                <span>Conductor</span>
                <strong>{selectedRecord.driverName || "Sin conductor"}</strong>
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

              {IS_SUPERADMIN && (
                <button
                  type="button"
                  className="history-delete-button detail-delete-button"
                  onClick={() => deleteRecord(selectedRecord)}
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
    </div>
  );
}

export default VehicleCheckHistory;