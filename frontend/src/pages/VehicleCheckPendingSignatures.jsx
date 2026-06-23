import { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  PenLine,
  RotateCcw,
  User,
  X,
} from "lucide-react";

import "./VehicleCheckHistory.css";
import "./VehicleCheckList.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function getLoggedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
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

function formatStatus(status) {
  if (status === "PENDIENTE_FIRMAS") {
    return "Pendiente de firma";
  }

  if (status === "COMPLETADO") {
    return "Completado";
  }

  if (status === "OBSERVADO") {
    return "Observado";
  }

  return "Pendiente";
}

function text(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function dataUrlToFile(dataUrl, filename) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(arr[1]);
  let length = binary.length;
  const array = new Uint8Array(length);

  while (length--) {
    array[length] = binary.charCodeAt(length);
  }

  return new File([array], filename, { type: mime });
}

function getCroppedSignatureDataUrl(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      if (a > 0 && (r < 245 || g < 245 || b < 245)) {
        hasInk = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasInk) return canvas.toDataURL("image/png");

  const padding = 28;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width, maxX + padding);
  maxY = Math.min(height, maxY + padding);

  const cropWidth = maxX - minX;
  const cropHeight = maxY - minY;

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;

  const croppedCtx = croppedCanvas.getContext("2d");
  croppedCtx.fillStyle = "#ffffff";
  croppedCtx.fillRect(0, 0, cropWidth, cropHeight);
  croppedCtx.drawImage(
    canvas,
    minX,
    minY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return croppedCanvas.toDataURL("image/png");
}

function getRoleLabel(role) {
  if (role === "CONDUCTOR") return "Conductor";
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "PREVENCION") return "Prevención";
  if (role === "SUPERADMIN") return "Superadmin";
  return "Usuario";
}

function VehicleCheckPendingSignatures() {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const user = getLoggedUser();
  const role = String(user?.role || "").toUpperCase();

  const signatureTitle = `Firma ${getRoleLabel(role)}`;

  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [signing, setSigning] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    loadChecks();
  }, []);

  useEffect(() => {
    if (selectedCheck) {
      setTimeout(prepareCanvas, 100);
    }
  }, [selectedCheck]);

  async function loadChecks() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/vehicle-checklist/pending-signatures`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Error cargando pendientes");
      }

      const data = await response.json();
      setChecks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Error cargando check list pendientes de firma");
    } finally {
      setLoading(false);
    }
  }

  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 600;
    const height = window.innerWidth <= 768 ? 180 : 220;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    setHasSignature(false);
  }

  function getCanvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0];

    return {
      x: (touch ? touch.clientX : event.clientX) - rect.left,
      y: (touch ? touch.clientY : event.clientY) - rect.top,
    };
  }

  function startSignature(event) {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event) {
    if (!drawingRef.current) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setHasSignature(true);
  }

  function stopSignature() {
    drawingRef.current = false;
  }

  function clearSignature() {
    prepareCanvas();
  }

  function closeDetail() {
    setSelectedCheck(null);
    setHasSignature(false);
  }

  async function signCheck() {
    if (!selectedCheck?.id) return;

    if (!hasSignature) {
      alert("Debes firmar antes de enviar.");
      return;
    }

    try {
      setSigning(true);

      const canvas = canvasRef.current;
      const croppedSignatureDataUrl = getCroppedSignatureDataUrl(canvas);

      const signatureFile = dataUrlToFile(
        croppedSignatureDataUrl,
        `firma-vehiculo-${selectedCheck.id}.png`,
      );

      const formData = new FormData();
      formData.append("signature", signatureFile);

      const response = await fetch(
        `${API_URL}/vehicle-checklist/${selectedCheck.id}/sign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Error firmando check list");
      }

      await response.json();

      setChecks((prev) =>
        prev.filter((item) => item.id !== selectedCheck.id),
      );

      setSelectedCheck(null);
      setSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Error firmando check list de vehículo");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h2>Vehículos Pendientes de Firma</h2>
          <p>
            Revisa los check list vehiculares pendientes y registra tu firma.
          </p>
        </div>
      </div>

      <div className="history-card">
        {loading ? (
          <p>Cargando...</p>
        ) : checks.length === 0 ? (
          <div className="history-empty">
            <FileText size={40} />
            <h3>No tienes check list de vehículos pendientes</h3>
          </div>
        ) : (
          <div className="history-list">
            {checks.map((check) => (
              <div className="history-row" key={check.id}>
                <div className="history-icon">
                  <Car size={22} />
                </div>

                <div className="history-info">
                  <h3>{check.patent || "Sin patente"}</h3>

                  <div className="history-meta">
                    <span>
                      <Calendar size={15} />
{formatDateTime(check.createdAt)}
                    </span>

                    <span>
                      <User size={15} />
                      Conductor: {check.driverName || "Sin conductor"}
                    </span>

                    <span>
                      <CheckCircle2 size={15} />
Estado: {formatStatus(check.status)}
                    </span>
                  </div>
                </div>

                <button
                  className="history-pdf-button"
                  type="button"
                  onClick={() => setSelectedCheck(check)}
                >
                  <PenLine size={18} />
                  Leer y firmar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCheck && (
        <div className="detail-overlay">
          <div className="detail-modal">
            <div className="detail-header">
              <div>
                <h3>Leer y Firmar Check List Vehículo</h3>
                <p>
                  Patente:{" "}
                  <strong>{selectedCheck.patent || "Sin patente"}</strong>
                </p>
              </div>

              <button
                className="detail-close"
                onClick={closeDetail}
                type="button"
              >
                <X size={22} />
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <span>Folio</span>
                <strong>{text(selectedCheck.folio)}</strong>
              </div>

              <div>
                <span>Fecha y Hora de Creación</span>
<strong>{formatDateTime(selectedCheck.createdAt)}</strong>
              </div>

              <div>
                <span>Estado</span>
<strong>{formatStatus(selectedCheck.status)}</strong>
              </div>

              <div>
                <span>Patente</span>
                <strong>{text(selectedCheck.patent)}</strong>
              </div>

              <div>
                <span>Conductor</span>
                <strong>{text(selectedCheck.driverName)}</strong>
              </div>

              <div>
                <span>Inspector</span>
                <strong>{text(selectedCheck.inspectorName)}</strong>
              </div>

              <div>
                <span>Kilometraje</span>
                <strong>{text(selectedCheck.mileage)}</strong>
              </div>

              <div>
                <span>Tipo Vehículo</span>
                <strong>{text(selectedCheck.vehicleType)}</strong>
              </div>

              <div>
                <span>Modelo</span>
                <strong>{text(selectedCheck.vehicleModel)}</strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>
                <ClipboardList size={18} />
                Firmas registradas
              </h4>

              <div className="detail-grid">
                <div>
                  <span>Conductor</span>
                  <strong>
                    {selectedCheck.driverSignatureUrl ? "Firmado" : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Inspector</span>
                  <strong>
                    {selectedCheck.inspectorSignatureUrl
                      ? "Firmado"
                      : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Supervisor</span>
                  <strong>
                    {selectedCheck.supervisorSignatureUrl
                      ? "Firmado"
                      : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Prevención</span>
                  <strong>
                    {selectedCheck.preventionSignatureUrl
                      ? "Firmado"
                      : "Pendiente"}
                  </strong>
                </div>

                <div>
                  <span>Superadmin</span>
                  <strong>
                    {selectedCheck.superadminSignatureUrl
                      ? "Firmado"
                      : "Pendiente"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>
                <ClipboardList size={18} />
                Chequeo general
              </h4>

              <div className="detail-items">
                {(selectedCheck.items || []).map((item, index) => (
                  <div
                    key={item.id || index}
                    className={`detail-item ${
                      item.status === "MALO" ? "bad" : ""
                    }`}
                  >
                    <div>
                      {item.status === "MALO" ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}

                      <strong>
                        {index + 1}.- {item.itemName}
                      </strong>
                    </div>

                    <span>
                      Resultado: <strong>{text(item.status)}</strong>
                    </span>

                    <p>{item.observation || "Sin observación"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h4>
                <AlertTriangle size={18} />
                Observaciones generales
              </h4>

              <p className="detail-observation">
                {text(selectedCheck.generalObservation, "Sin observaciones")}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <PenLine size={18} />
                {signatureTitle}
              </h4>

              <div className="signature-box">
                <canvas
                  ref={canvasRef}
                  className="signature-canvas"
                  onMouseDown={startSignature}
                  onMouseMove={drawSignature}
                  onMouseUp={stopSignature}
                  onMouseLeave={stopSignature}
                  onTouchStart={startSignature}
                  onTouchMove={drawSignature}
                  onTouchEnd={stopSignature}
                />

                <div className="signature-actions">
                  <button
                    type="button"
                    className="signature-clear-button"
                    onClick={clearSignature}
                  >
                    <RotateCcw size={16} />
                    Limpiar firma
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-footer-actions">
              <button
                type="button"
                className="history-pdf-button detail-pdf-button"
                onClick={signCheck}
                disabled={signing}
              >
                <PenLine size={17} />
                {signing ? "Firmando..." : "Firmar check list"}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-modal-icon">
              <Check size={36} />
            </div>

            <h3>Check list firmado</h3>
            <p>Tu firma fue registrada correctamente.</p>

            <button
              type="button"
              className="success-modal-button"
              onClick={() => setSuccessModalOpen(false)}
            >
              <Check size={18} />
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleCheckPendingSignatures;