import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FileText,
  Plus,
  Trash2,
  Users,
  ShieldCheck,
  History,
  Check,
  PenLine,
  Lock,
  Unlock,
} from "lucide-react";

import "./SafetyTalks.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const SAFETY_TALK_PARTICIPANT_ROLES = [
  "SUPERADMIN",
  "TECNICO",
  "CONDUCTOR",
  "SUPERVISOR",
  "PREVENCION",
];

function todayInputDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function currentInputTime() {
  return new Date().toTimeString().slice(0, 5);
}

function getLoggedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function normalizeRole(role) {
  return String(role || "").toUpperCase();
}

function getRoleLabel(role) {
  const normalized = normalizeRole(role);

  if (normalized === "SUPERADMIN") return "Superadministrador";
  if (normalized === "ADMIN") return "Administrador";
  if (normalized === "SUPERVISOR") return "Supervisor";
  if (normalized === "PREVENCION") return "Prevencionista";
  if (normalized === "CONDUCTOR") return "Conductor";
  if (normalized === "TECNICO") return "Técnico";

  return "Responsable";
}

function getCreatorRole(user) {
  const role = normalizeRole(user?.role);

  if (SAFETY_TALK_PARTICIPANT_ROLES.includes(role)) {
    return role;
  }

  return "TECNICO";
}

function createParticipant() {
  return {
    userId: "",
    name: "",
    rut: "",
    role: "",
    search: "",
    isSearching: false,
    compliesRest: true,
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

function SafetyTalks() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const user = getLoggedUser();

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [signatureLocked, setSignatureLocked] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [workers, setWorkers] = useState([]);

  const [participants, setParticipants] = useState([
    createParticipant(),
    createParticipant(),
  ]);

  const [form, setForm] = useState({
    date: todayInputDate(),
    meetingTime: currentInputTime(),
    areaLocationInstallation: "",
    workOrderProject: "",
    workPermitActivity: "",
    worksToDo: "",
    foremanOrBrigadeName: user?.name || "",
    foremanCompany: "INSPROTEL",
    workTypes: "",
    significantRisks: "",
    analyzedAccident: "",
    creatorRole: getCreatorRole(user),
    createdByName: user?.name || "",
    createdByRut: user?.rut || "",
    controlMeasure1: "",
    controlMeasure2: "",
    controlMeasure3: "",
    controlMeasure4: "",
    controlMeasure5: "",
    controlMeasure6: "",
    controlMeasure7: "",
    controlMeasure8: "",
    controlMeasure9: "",
    controlMeasure10: "",
    controlMeasure11: "",
    controlMeasure12: "",
  });

  useEffect(() => {
    setTimeout(prepareCanvas, 100);
    window.addEventListener("resize", prepareCanvas);
    loadWorkers();

    return () => {
      window.removeEventListener("resize", prepareCanvas);
    };
  }, []);

  async function loadWorkers() {
    try {
      const response = await fetch(`${API_URL}/users/workers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error cargando trabajadores");
      }

      const data = await response.json();

      const filteredWorkers = Array.isArray(data)
        ? data.filter((worker) => {
            const isAllowedRole = SAFETY_TALK_PARTICIPANT_ROLES.includes(
              normalizeRole(worker.role),
            );

            const isCurrentUser = String(worker.id) === String(user?.id);

            return isAllowedRole && !isCurrentUser;
          })
        : [];

      setWorkers(filteredWorkers);
    } catch (error) {
      console.error(error);
      setWorkers([]);
      alert("Error cargando trabajadores");
    }
  }

  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 600;
    const height = window.innerWidth <= 768 ? 180 : 260;
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

    if (signatureDataUrl) {
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };

      img.src = signatureDataUrl;
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
    if (signatureLocked || !signatureEnabled) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event) {
    if (!drawingRef.current || signatureLocked || !signatureEnabled) return;

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
    setSignatureDataUrl("");
    setSignatureLocked(false);
    setSignatureEnabled(true);
  }

  function handleSignatureMainButton() {
    const canvas = canvasRef.current;

    if (signatureLocked) {
      setSignatureLocked(false);
      setSignatureEnabled(true);
      return;
    }

    if (!signatureEnabled) {
      setSignatureEnabled(true);
      return;
    }

    if (!hasSignature) {
      alert("Primero debes firmar antes de bloquear la firma.");
      return;
    }

    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }

    setSignatureLocked(true);
    setSignatureEnabled(false);
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  function handleParticipantSearch(index, value) {
    setParticipants((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              userId: "",
              name: "",
              rut: "",
              role: "",
              search: value,
              isSearching: true,
            }
          : item,
      ),
    );
  }

  function clearParticipant(index) {
    setParticipants((prev) =>
      prev.map((item, i) => (i === index ? createParticipant() : item)),
    );
  }

  function getWorkerSuggestions(participant) {
    const search = String(participant.search || "").trim().toLowerCase();

    if (search.length < 2 || participant.userId) return [];

    return workers
      .filter((worker) => {
        const name = String(worker.name || "").toLowerCase();
        const rut = String(worker.rut || "").toLowerCase();
        const role = normalizeRole(worker.role);

        return (
          SAFETY_TALK_PARTICIPANT_ROLES.includes(role) &&
          (name.includes(search) || rut.includes(search))
        );
      })
      .slice(0, 8);
  }

  function selectWorker(index, worker) {
    const alreadySelected = participants.some(
      (participant, participantIndex) =>
        participantIndex !== index &&
        String(participant.userId) === String(worker.id),
    );

    if (alreadySelected) {
      alert("Este trabajador ya fue agregado como participante.");
      return;
    }

    setParticipants((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              userId: worker.id,
              name: worker.name || "",
              rut: worker.rut || "",
              role: normalizeRole(worker.role),
              search: worker.name || "",
              isSearching: false,
            }
          : item,
      ),
    );
  }

  function addParticipant() {
    if (participants.length >= 12) {
      alert("Máximo 12 participantes.");
      return;
    }

    setParticipants((prev) => [...prev, createParticipant()]);
  }

  function removeParticipant(index) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setForm({
      date: todayInputDate(),
      meetingTime: currentInputTime(),
      areaLocationInstallation: "",
      workOrderProject: "",
      workPermitActivity: "",
      worksToDo: "",
      foremanOrBrigadeName: user?.name || "",
      foremanCompany: "INSPROTEL",
      workTypes: "",
      significantRisks: "",
      analyzedAccident: "",
      creatorRole: getCreatorRole(user),
      createdByName: user?.name || "",
      createdByRut: user?.rut || "",
      controlMeasure1: "",
      controlMeasure2: "",
      controlMeasure3: "",
      controlMeasure4: "",
      controlMeasure5: "",
      controlMeasure6: "",
      controlMeasure7: "",
      controlMeasure8: "",
      controlMeasure9: "",
      controlMeasure10: "",
      controlMeasure11: "",
      controlMeasure12: "",
    });

    setParticipants([createParticipant(), createParticipant()]);
    clearSignature();
    setSignatureEnabled(false);
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
      const filledParticipants = participants.filter((item) => item.userId);

      if (filledParticipants.length === 0) {
        alert("Debes seleccionar al menos un trabajador participante.");
        return;
      }

      if (!hasSignature) {
        alert("Debes registrar la firma de quien realiza la reunión.");
        return;
      }

      onClick={handleSignatureMainButton}

      setLoading(true);

      const canvas = canvasRef.current;
      const croppedSignatureDataUrl = getCroppedSignatureDataUrl(canvas);

      const signatureFile = dataUrlToFile(
        croppedSignatureDataUrl,
        "firma-creador-charla.png",
      );

      const formData = new FormData();

      Object.entries({
        ...form,
        foremanOrBrigadeName: user?.name || form.foremanOrBrigadeName || "",
        foremanCompany: "INSPROTEL",
        creatorRole: getCreatorRole(user),
        createdByName: user?.name || form.createdByName || "",
        createdByRut: user?.rut || form.createdByRut || "",
      }).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });

      formData.append("peopleCount", String(filledParticipants.length + 1));

      formData.append(
        "participants",
        JSON.stringify(
          filledParticipants.map((item) => ({
            userId: item.userId,
            name: item.name,
            rut: item.rut,
            compliesRest: item.compliesRest,
          })),
        ),
      );

      formData.append("reporterSignature", signatureFile);

      const response = await fetch(`${API_URL}/safety-talks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error guardando reunión");
      }

      await response.json();
      setSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Error guardando reunión de seguridad");
    } finally {
      setLoading(false);
    }
  }

  const controlMeasures = Array.from({ length: 12 }, (_, index) => ({
    key: `controlMeasure${index + 1}`,
    number: index + 1,
  }));

  return (
    <div className="safety-talk-page">
      <div className="safety-talk-header">
        <div>
          <h1>Reunión Previa de Seguridad en el Trabajo</h1>
          <p>Formulario digital según formato Insprotel</p>
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
            Encabezado
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Área, lugar, instalación</label>
              <input
                type="text"
                value={form.areaLocationInstallation}
                onChange={(e) =>
                  updateField("areaLocationInstallation", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Orden de trabajo / Proyecto</label>
              <input
                type="text"
                value={form.workOrderProject}
                onChange={(e) =>
                  updateField("workOrderProject", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>N° Permiso de Faena / Actividad</label>
              <input
                type="text"
                value={form.workPermitActivity}
                onChange={(e) =>
                  updateField("workPermitActivity", e.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Se realizarán trabajos de</label>
            <textarea
              rows={4}
              value={form.worksToDo}
              onChange={(e) => updateField("worksToDo", e.target.value)}
              placeholder="- Retiro de acometidas&#10;- Reposición de suministro eléctrico"
            />
          </div>
        </div>

        <div className="safety-card">
          <div className="card-title">
            <ShieldCheck size={18} />
            Evaluación de riesgos
          </div>

          <div className="field">
            <label>Tipo de trabajos</label>
            <textarea
              rows={5}
              value={form.workTypes}
              onChange={(e) => updateField("workTypes", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Riesgos previstos más significativos</label>
            <textarea
              rows={5}
              value={form.significantRisks}
              onChange={(e) => updateField("significantRisks", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Accidente e incidente analizado</label>
            <textarea
              rows={4}
              value={form.analyzedAccident}
              onChange={(e) => updateField("analyzedAccident", e.target.value)}
            />
          </div>
        </div>

        <div className="safety-card">
          <div className="card-title">
            <Check size={18} />
            Medidas de control
          </div>

          <div className="grid-2">
            {controlMeasures.map((item) => (
              <div className="field" key={item.key}>
                <label>{item.number}.- Medida de control</label>
                <input
                  type="text"
                  value={form[item.key]}
                  onChange={(e) => updateField(item.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="safety-card">
          <div className="card-title">
            <Users size={18} />
            Listado e información trabajadores
          </div>

          <div className="participants-list">
            {participants.map((participant, index) => {
              const suggestions = getWorkerSuggestions(participant);

              return (
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

                  <div className="grid-3">
                    <div className="participant-search-wrap">
                      <input
                        type="text"
                        placeholder="Escriba nombre del trabajador"
                        value={participant.search}
                        onChange={(e) =>
                          handleParticipantSearch(index, e.target.value)
                        }
                        onFocus={() =>
                          updateParticipant(index, "isSearching", true)
                        }
                      />

                      {participant.userId && (
                        <button
                          type="button"
                          className="participant-clear-button"
                          onClick={() => clearParticipant(index)}
                        >
                          Limpiar
                        </button>
                      )}

                      {participant.isSearching && suggestions.length > 0 && (
                        <div className="participant-suggestions">
                          {suggestions.map((worker) => (
                            <button
                              type="button"
                              key={worker.id}
                              className="participant-suggestion-item"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectWorker(index, worker)}
                            >
                              {worker.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="RUT"
                      value={participant.rut}
                      readOnly
                    />

                    <select
                      value={participant.compliesRest ? "SI" : "NO"}
                      onChange={(e) =>
                        updateParticipant(
                          index,
                          "compliesRest",
                          e.target.value === "SI",
                        )
                      }
                    >
                      <option value="SI">Cumple descanso: Sí</option>
                      <option value="NO">Cumple descanso: No</option>
                    </select>
                  </div>

                  {participant.name && (
                    <p className="participant-selected-name">
                      Seleccionado: <strong>{participant.name}</strong>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" className="add-btn" onClick={addParticipant}>
            <Plus size={16} />
            Agregar participante
          </button>
        </div>

        <div
          className={`vehicle-client-signature ${
            hasSignature ? "signed" : ""
          }`}
        >
          <div className="vehicle-client-signature-header">
            <div>
              <div className="vehicle-client-signature-title">
                <PenLine size={22} />
                Firma del Responsable
              </div>

              <h4>
                Firma de {user?.name || "Responsable"}

                <span>
                  {" "}
                  ({getRoleLabel(user?.role)})
                </span>
              </h4>

              <p>
                {signatureLocked
                  ? "🔒 Firma bloqueada"
                  : signatureEnabled
                  ? "🔓 Firma habilitada"
                  : "🔒 Firma bloqueada (habilita antes de firmar)"}
              </p>
            </div>

            <div className="vehicle-client-signature-actions">
              <button
                type="button"
                className="vehicle-enable-signature-button"
                onClick={handleSignatureMainButton}
              >
                {signatureLocked ? (
                  <Unlock size={18} />
                ) : signatureEnabled ? (
                  <Lock size={18} />
                ) : (
                  <PenLine size={18} />
                )}

                {signatureLocked
                  ? "Desbloquear firma"
                  : signatureEnabled
                  ? "Bloquear firma"
                  : "Habilitar firma"}
              </button>

              <button
                type="button"
                className="vehicle-clear-signature-button"
                onClick={clearSignature}
                disabled={!hasSignature}
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="vehicle-signature-pad">
            {!signatureEnabled && (
              <div
  className="vehicle-signature-placeholder"
  onClick={() => {
    if (!signatureLocked) {
      setSignatureEnabled(true);
    }
  }}
>
                <div>🔒</div>
                <strong>Firma deshabilitada</strong>
                <span>Toca el boton habilitar firma</span>
              </div>
            )}

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
          </div>

          <p className="vehicle-signature-help">
            Habilita la firma y firma dentro del recuadro. Luego bloquea la
            firma antes de guardar.
          </p>

          <div className="vehicle-signature-status">
            Estado firma:{" "}
            {hasSignature ? (
              signatureLocked ? (
                <span className="ok">✅ Firma bloqueada</span>
              ) : (
                <span className="ok">✅ Firma registrada</span>
              )
            ) : (
              <span className="bad">❌ Falta firma</span>
            )}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Guardando..." : "Guardar reunión"}
        </button>
      </form>

      {successModalOpen && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-modal-icon">
              <Check size={36} />
            </div>

            <h3>Reunión guardada</h3>
            <p>La reunión previa de seguridad fue registrada correctamente.</p>

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