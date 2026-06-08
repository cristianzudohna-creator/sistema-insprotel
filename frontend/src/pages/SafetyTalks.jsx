import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FileText,
  Plus,
  Trash2,
  Users,
  ShieldCheck,
  History,
  CheckCircle2,
  PenLine,
  RotateCcw,
  Lock,
  Unlock,
  X,
  Check,
} from "lucide-react";

import "./SafetyTalks.css";

const API_URL = "http://localhost:3000";

const TALK_TYPES = [
  { value: "CHARLA_5_MINUTOS", label: "Charla 5 minutos" },
  { value: "CHARLA_OPERACIONAL", label: "Charla operacional" },
  { value: "REINSTRUCCION", label: "Reinstrucción" },
  {
    value: "DIFUSION_PROCEDIMIENTOS",
    label: "Difusión de procedimientos",
  },
];

function createParticipant() {
  return {
    name: "",
    rut: "",
    signatureDataUrl: "",
    signatureLocked: false,
  };
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

      const isInk = a > 0 && (r < 245 || g < 245 || b < 245);

      if (isInk) {
        hasInk = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasInk) {
    return canvas.toDataURL("image/png");
  }

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

function SafetyTalks() {
  const navigate = useNavigate();

  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);
  const drawingRef = useRef(false);
  const modalDrawingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureLocked, setSignatureLocked] = useState(false);

  const [participantSigningIndex, setParticipantSigningIndex] = useState(null);
  const [participantModalHasSignature, setParticipantModalHasSignature] =
    useState(false);
  const [participantModalLocked, setParticipantModalLocked] = useState(false);

  const [participants, setParticipants] = useState([
    createParticipant(),
    createParticipant(),
  ]);

  const [form, setForm] = useState({
    sectionOrWork: "",
    reporterName: "",
    type: ["CHARLA_5_MINUTOS"],
    topicTitle: "",
    topicDetails: "",
  });

  useEffect(() => {
    setTimeout(prepareCanvas, 100);

    window.addEventListener("resize", prepareCanvas);

    return () => {
      window.removeEventListener("resize", prepareCanvas);
    };
  }, []);

  useEffect(() => {
    if (participantSigningIndex !== null) {
      setTimeout(prepareModalCanvas, 100);
    }
  }, [participantSigningIndex]);

  function prepareCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 600;
    const height = window.innerWidth <= 768 ? 180 : 220;
    const ratio = window.devicePixelRatio || 1;
    const previous = hasSignature ? canvas.toDataURL("image/png") : null;

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

    if (previous) {
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };

      img.src = previous;
    }
  }

  function prepareModalCanvas() {
    const canvas = modalCanvasRef.current;

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

    const currentSignature =
      participants[participantSigningIndex]?.signatureDataUrl;

    if (currentSignature) {
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };

      img.src = currentSignature;
    }
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
    if (signatureLocked) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    drawingRef.current = true;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event) {
    if (!drawingRef.current || signatureLocked) return;

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
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    setHasSignature(false);
    setSignatureLocked(false);
  }

  function startParticipantSignature(event) {
    if (participantModalLocked) return;

    event.preventDefault();

    const canvas = modalCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    modalDrawingRef.current = true;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawParticipantSignature(event) {
    if (!modalDrawingRef.current || participantModalLocked) return;

    event.preventDefault();

    const canvas = modalCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setParticipantModalHasSignature(true);
  }

  function stopParticipantSignature() {
    modalDrawingRef.current = false;
  }

  function clearParticipantSignature() {
    const canvas = modalCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    setParticipantModalHasSignature(false);
    setParticipantModalLocked(false);
  }

  function openParticipantSignature(index) {
    setParticipantSigningIndex(index);
    setParticipantModalHasSignature(
      Boolean(participants[index]?.signatureDataUrl),
    );
    setParticipantModalLocked(Boolean(participants[index]?.signatureLocked));
  }

  function closeParticipantSignature() {
    setParticipantSigningIndex(null);
    setParticipantModalHasSignature(false);
    setParticipantModalLocked(false);
  }

  function saveParticipantSignature() {
    if (!participantModalHasSignature) {
      alert("El participante debe firmar antes de guardar.");
      return;
    }

    if (!participantModalLocked) {
      alert("Debes bloquear la firma del participante.");
      return;
    }

    const canvas = modalCanvasRef.current;
    const croppedSignatureDataUrl = getCroppedSignatureDataUrl(canvas);

    setParticipants((prev) =>
      prev.map((item, index) =>
        index === participantSigningIndex
          ? {
              ...item,
              signatureDataUrl: croppedSignatureDataUrl,
              signatureLocked: true,
            }
          : item,
      ),
    );

    closeParticipantSignature();
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toggleTalkType(value) {
    setForm((prev) => {
      const exists = prev.type.includes(value);

      const nextTypes = exists
        ? prev.type.filter((item) => item !== value)
        : [...prev.type, value];

      return {
        ...prev,
        type: nextTypes.length > 0 ? nextTypes : prev.type,
      };
    });
  }

  function updateParticipant(index, field, value) {
    setParticipants((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addParticipant() {
    setParticipants((prev) => [...prev, createParticipant()]);
  }

  function removeParticipant(index) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setForm({
      sectionOrWork: "",
      reporterName: "",
      type: ["CHARLA_5_MINUTOS"],
      topicTitle: "",
      topicDetails: "",
    });

    setParticipants([createParticipant(), createParticipant()]);
    clearSignature();
  }

  function closeSuccessModal() {
    setSuccessModalOpen(false);
    resetForm();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const filledParticipants = participants.filter(
        (item) => item.name || item.rut,
      );

      const unsignedParticipant = filledParticipants.find(
        (item) => !item.signatureDataUrl || !item.signatureLocked,
      );

      if (unsignedParticipant) {
        alert(
          "Todos los participantes registrados deben firmar y bloquear su firma.",
        );
        return;
      }

      if (!hasSignature) {
        alert("Debes registrar la firma del relator.");
        return;
      }

      if (!signatureLocked) {
        alert("Debes bloquear la firma del relator antes de guardar.");
        return;
      }

      setLoading(true);

      const canvas = canvasRef.current;
      const croppedSignatureDataUrl = getCroppedSignatureDataUrl(canvas);

      const signatureFile = dataUrlToFile(
        croppedSignatureDataUrl,
        "firma-relator.png",
      );

      const formData = new FormData();

      formData.append("sectionOrWork", form.sectionOrWork);
      formData.append("reporterName", form.reporterName);
      formData.append("type", form.type.join(","));
      formData.append("topicTitle", form.topicTitle);
      formData.append("topicDetails", form.topicDetails);

      formData.append(
        "participants",
        JSON.stringify(
          filledParticipants.map((item) => ({
            name: item.name,
            rut: item.rut,
          })),
        ),
      );

      formData.append("reporterSignature", signatureFile);

      filledParticipants.forEach((participant, index) => {
        const participantFile = dataUrlToFile(
          participant.signatureDataUrl,
          `firma-participante-${index + 1}.png`,
        );

        formData.append("participantSignatures", participantFile);
      });

      const token =
  localStorage.getItem("token") ||
  localStorage.getItem("access_token") ||
  "";

const response = await fetch(`${API_URL}/safety-talks`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

      if (!response.ok) {
        throw new Error("Error guardando charla");
      }

      await response.json();

      setSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Error guardando charla");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="safety-talk-page">
      <div className="safety-talk-header">
        <div>
          <h1>Charlas de Seguridad</h1>
          <p>Registro digital de charlas y participantes</p>
        </div>

        <div className="safety-header-actions">
          <button
            type="button"
            className="history-btn"
            onClick={() => navigate("/charlas/historial")}
          >
            <History size={18} />
            Ver Historial
          </button>

          <div className="safety-icon">
            <ShieldCheck size={34} />
          </div>
        </div>
      </div>

      <form className="safety-form" onSubmit={handleSubmit}>
        <div className="safety-card">
          <div className="card-title">
            <FileText size={18} />
            Información General
          </div>

          <div className="field">
            <label>Tipo de charla</label>

            <div className="talk-type-options">
              {TALK_TYPES.map((item) => (
                <label key={item.value} className="talk-type-option">
                  <input
                    type="checkbox"
                    checked={form.type.includes(item.value)}
                    onChange={() => toggleTalkType(item.value)}
                  />

                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Sección / Obra</label>

            <input
              type="text"
              value={form.sectionOrWork}
              onChange={(e) => updateField("sectionOrWork", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Nombre Relator</label>

            <input
              type="text"
              value={form.reporterName}
              onChange={(e) => updateField("reporterName", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Tema</label>

            <input
              type="text"
              value={form.topicTitle}
              onChange={(e) => updateField("topicTitle", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Detalle charla</label>

            <textarea
              rows={5}
              value={form.topicDetails}
              onChange={(e) => updateField("topicDetails", e.target.value)}
            />
          </div>
        </div>

        <div className="safety-card">
          <div className="card-title">
            <Users size={18} />
            Participantes
          </div>

          <div className="participants-list">
            {participants.map((participant, index) => (
              <div key={index} className="participant-card">
                <div className="participant-header">
                  <h3>Participante {index + 1}</h3>

                  {participants.length > 1 && (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => removeParticipant(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={participant.name}
                    onChange={(e) =>
                      updateParticipant(index, "name", e.target.value)
                    }
                  />

                  <input
                    type="text"
                    placeholder="RUT"
                    value={participant.rut}
                    onChange={(e) =>
                      updateParticipant(index, "rut", e.target.value)
                    }
                  />
                </div>

                <div className="participant-signature-row">
                  <button
                    type="button"
                    className={
                      participant.signatureLocked
                        ? "participant-sign-button signed"
                        : "participant-sign-button"
                    }
                    onClick={() => openParticipantSignature(index)}
                  >
                    <PenLine size={16} />
                    {participant.signatureLocked
                      ? "Firma registrada"
                      : "Firmar participante"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="add-btn" onClick={addParticipant}>
            <Plus size={16} />
            Agregar participante
          </button>
        </div>

        <div className="safety-card">
          <div className="card-title">
            <PenLine size={18} />
            Firma Relator
          </div>

          <div className="signature-section">
            <div className="signature-title">
              <PenLine size={18} />
              Firma del Relator
            </div>

            <div
              className={`signature-box ${
                signatureLocked ? "signature-box-locked" : ""
              }`}
            >
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
                  className="signature-lock-button"
                  onClick={() => setSignatureLocked((prev) => !prev)}
                  disabled={!hasSignature}
                >
                  {signatureLocked ? <Unlock size={16} /> : <Lock size={16} />}
                  {signatureLocked ? "Desbloquear firma" : "Bloquear firma"}
                </button>

                <button
                  type="button"
                  className="signature-clear-button"
                  onClick={clearSignature}
                >
                  <RotateCcw size={16} />
                  Limpiar firma
                </button>
              </div>

              {signatureLocked && (
                <div className="signature-status">Firma bloqueada ✅</div>
              )}
            </div>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Guardando..." : "Guardar charla"}
        </button>
      </form>

      {participantSigningIndex !== null && (
        <div className="participant-signature-modal-backdrop">
          <div className="participant-signature-modal">
            <div className="participant-signature-modal-header">
              <div>
                <h3>Firma Participante</h3>
                <p>
                  {participants[participantSigningIndex]?.name ||
                    `Participante ${participantSigningIndex + 1}`}
                </p>
              </div>

              <button type="button" onClick={closeParticipantSignature}>
                <X size={20} />
              </button>
            </div>

            <div
              className={`signature-box ${
                participantModalLocked ? "signature-box-locked" : ""
              }`}
            >
              <canvas
                ref={modalCanvasRef}
                className="signature-canvas"
                onMouseDown={startParticipantSignature}
                onMouseMove={drawParticipantSignature}
                onMouseUp={stopParticipantSignature}
                onMouseLeave={stopParticipantSignature}
                onTouchStart={startParticipantSignature}
                onTouchMove={drawParticipantSignature}
                onTouchEnd={stopParticipantSignature}
              />

              <div className="signature-actions">
                <button
                  type="button"
                  className="signature-lock-button"
                  onClick={() => setParticipantModalLocked((prev) => !prev)}
                  disabled={!participantModalHasSignature}
                >
                  {participantModalLocked ? (
                    <Unlock size={16} />
                  ) : (
                    <Lock size={16} />
                  )}
                  {participantModalLocked
                    ? "Desbloquear firma"
                    : "Bloquear firma"}
                </button>

                <button
                  type="button"
                  className="signature-clear-button"
                  onClick={clearParticipantSignature}
                >
                  <RotateCcw size={16} />
                  Limpiar firma
                </button>
              </div>

              {participantModalLocked && (
                <div className="signature-status">Firma bloqueada ✅</div>
              )}
            </div>

            <button
              type="button"
              className="participant-save-signature-button"
              onClick={saveParticipantSignature}
            >
              Guardar firma del participante
            </button>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-modal-icon">
              <Check size={36} />
            </div>

            <h3>Charla guardada</h3>

            <p>La charla de seguridad fue registrada exitosamente.</p>

            <button
              type="button"
              className="success-modal-button"
              onClick={closeSuccessModal}
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

export default SafetyTalks;