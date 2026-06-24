import { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  PenLine,
  RotateCcw,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";

import "./SafetyTalkHistory.css";
import "./SafetyTalks.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
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
    hour12: false,
  });
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

function SafetyTalkPendingSignatures() {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [talks, setTalks] = useState([]);
  const [selectedTalk, setSelectedTalk] = useState(null);
  const [signing, setSigning] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    loadTalks();
  }, []);

  useEffect(() => {
    if (selectedTalk) {
      setTimeout(prepareCanvas, 100);
    }
  }, [selectedTalk]);

  async function loadTalks() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/safety-talks/pending-signatures`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setTalks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Error cargando charlas pendientes");
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
    setSelectedTalk(null);
    setHasSignature(false);
  }

  async function signTalk() {
    if (!selectedTalk?.id) return;

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
        `firma-charla-${selectedTalk.id}.png`,
      );

      const formData = new FormData();
      formData.append("signature", signatureFile);

      const response = await fetch(
        `${API_URL}/safety-talks/${selectedTalk.id}/sign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Error firmando charla");
      }

      await response.json();

      setTalks((prev) => prev.filter((item) => item.id !== selectedTalk.id));
      setSelectedTalk(null);
      setSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Error firmando charla");
    } finally {
      setSigning(false);
    }
  }

  const controlMeasures = Array.from({ length: 12 }, (_, index) => ({
    key: `controlMeasure${index + 1}`,
    number: index + 1,
  }));

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h2>Charlas Pendientes de Firma</h2>
          <p>
            Lee la reunión previa de seguridad y firma para confirmar tu
            participación.
          </p>
        </div>
      </div>

      <div className="history-card">
        {loading ? (
          <p>Cargando...</p>
        ) : talks.length === 0 ? (
          <div className="history-empty">
            <FileText size={40} />
            <h3>No tienes charlas pendientes</h3>
          </div>
        ) : (
          <div className="history-list">
            {talks.map((talk) => (
              <div className="history-row" key={talk.id}>
                <div className="history-icon">
                  <ShieldCheck size={22} />
                </div>

                <div className="history-info">
                  <h3>
                    {talk.workOrderProject ||
                      talk.areaLocationInstallation ||
                      "Reunión previa de seguridad"}
                  </h3>

                  <div className="history-meta">
                    <span>
                      <Calendar size={15} />
{formatDateTime(talk.createdAt || talk.date)}
                    </span>

                    <span>
                      <MapPin size={15} />
                      {talk.areaLocationInstallation || "Sin ubicación"}
                    </span>

                    <span>
  <User size={15} />
  Creada por: {talk.createdByName || talk.user?.name || "Usuario"}
</span>
                  </div>
                </div>

                <button
                  className="history-pdf-button"
                  type="button"
                  onClick={() => setSelectedTalk(talk)}
                >
                  <PenLine size={18} />
                  Leer y firmar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTalk && (
        <div className="detail-overlay">
          <div className="detail-modal">
            <div className="detail-header">
              <div>
                <h3>Leer y Firmar Charla</h3>
                <p>
                  <strong>
                    {selectedTalk.workOrderProject ||
                      selectedTalk.areaLocationInstallation ||
                      "Reunión previa de seguridad"}
                  </strong>
                </p>
              </div>

              <button className="detail-close" onClick={closeDetail} type="button">
                <X size={22} />
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <span>Fecha</span>
                <strong>
  {formatDateTime(selectedTalk.createdAt || selectedTalk.date)}
</strong>
              </div>

              <div>
                <span>Área / Lugar</span>
                <strong>{text(selectedTalk.areaLocationInstallation)}</strong>
              </div>

              <div>
                <span>OT / Proyecto</span>
                <strong>{text(selectedTalk.workOrderProject)}</strong>
              </div>

              <div>
                <span>Permiso / Actividad</span>
                <strong>{text(selectedTalk.workPermitActivity)}</strong>
              </div>

              <div>
                <span>Realizada por</span>
                <strong>
                  {selectedTalk.createdByName ||
                    selectedTalk.user?.name ||
                    "Usuario"}
                </strong>
              </div>
            </div>

            <div className="detail-section">
              <h4>
                <ClipboardList size={18} />
                Se realizarán trabajos de
              </h4>
              <p className="detail-observation">
                {text(selectedTalk.worksToDo, "Sin trabajos registrados")}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <ShieldCheck size={18} />
                Tipo de trabajos
              </h4>
              <p className="detail-observation">
                {text(selectedTalk.workTypes, "Sin tipo de trabajos")}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <AlertTriangle size={18} />
                Riesgos previstos más significativos
              </h4>
              <p className="detail-observation">
                {text(selectedTalk.significantRisks, "Sin riesgos")}
              </p>
            </div>

            <div className="detail-section">
              <h4>Accidente e incidente analizado</h4>
              <p className="detail-observation">
                {text(selectedTalk.analyzedAccident, "Sin análisis")}
              </p>
            </div>

            <div className="detail-section">
              <h4>
                <CheckCircle2 size={18} />
                Medidas de control
              </h4>

              <div className="detail-items">
                {controlMeasures.map((item) => {
                  const value = selectedTalk[item.key];

                  if (!value) return null;

                  return (
                    <div key={item.key} className="detail-item">
                      <div>
                        <CheckCircle2 size={18} />
                        <strong>{item.number}.-</strong>
                      </div>

                      <p>{value}</p>
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

              <div className="detail-items">
                {(selectedTalk.participants || []).map((participant) => (
                  <div key={participant.id} className="detail-item">
                    <div>
                      <Users size={18} />
                      <strong>{participant.name || "Sin nombre"}</strong>
                    </div>

                    <span>{participant.rut || "Sin RUT"}</span>

                    <p>
                      Firma:{" "}
                      <strong>
                        {participant.signatureUrl ? "Firmado" : "Pendiente"}
                      </strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h4>
                <PenLine size={18} />
                Tu firma
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
                onClick={signTalk}
                disabled={signing}
              >
                <PenLine size={17} />
                {signing ? "Firmando..." : "Firmar charla"}
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

            <h3>Charla firmada</h3>
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

export default SafetyTalkPendingSignatures;