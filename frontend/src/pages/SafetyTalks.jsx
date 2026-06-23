import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ShieldCheck,
  Save,
  History,
  AlertTriangle,
  Check,
  PenLine,
  RotateCcw,
  ClipboardList,
} from "lucide-react";

import "./HarnessCheck.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const CHECK_ITEMS = [
  "¿El equipo se encuentra debidamente certificado?",
  "¿Los conectores de las colas se encuentran sin deformaciones?",
  "¿Los seguros de los conectores se encuentran operativos?",
  "¿Los herrajes están forjados con identificación del fabricante?",
  "¿Las costuras y fibras de la correa están exentas de roturas, grietas o desgaste excesivo?",
  "¿El arnés de seguridad está libre de quemaduras y de sustancias químicas?",
  "¿El mosquetón cuenta con doble seguro y éste cierra sin trabamientos?",
  "¿Los ganchos, hebillas y mosquetones están libres de deformaciones?",
  "¿El estrobo o cola de seguridad está bien trenzada, es flexible y está sin cortes?",
  "¿Los accesorios del arnés se encuentran sin deformaciones?",
  "¿El equipo cuenta con amortiguador de impacto?",
  "¿El amortiguador está certificado?",
  "¿Las líneas de vida se encuentran en buen estado?",
  '¿Las colas "Y", cuentan con gancho estructurero?',
  "¿Las colas o cabos del arnés se encuentran sin roturas, grietas o desgaste excesivo?",
];

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
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

function buildInitialItems() {
  return CHECK_ITEMS.map((description) => ({
    description,
    status: "",
    observation: "",
  }));
}

function getAutomaticStatus(items) {
  const hasRejected = items.some((item) => item.status === "NO");
  const allCompleted = items.every((item) => item.status);

  if (hasRejected) return "RECHAZADO";
  if (allCompleted) return "APROBADO";

  return "PENDIENTE";
}

function HarnessCheck() {
  const navigate = useNavigate();

  const supervisorCanvasRef = useRef(null);
  const drawingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [workers, setWorkers] = useState([]);
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [technicianSearching, setTechnicianSearching] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");

  const [hasSupervisorSignature, setHasSupervisorSignature] = useState(false);
  const [signatureEnabled, setSignatureEnabled] = useState(false);

  const [form, setForm] = useState({
    expirationDate: "",
    contract: "",
    technicianName: "",
    mobile: "",
    supervisorInspectorName: "",
    zone: "",
    generalObservation: "",
  });

  const [items, setItems] = useState(buildInitialItems());

  const automaticStatus = getAutomaticStatus(items);

  useEffect(() => {
    loadWorkers();
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
      setWorkers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setWorkers([]);
      alert("Error cargando trabajadores");
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleTechnicianSearch(value) {
    setTechnicianSearch(value);
    setTechnicianSearching(true);
    setSelectedTechnicianId("");

    setForm((prev) => ({
      ...prev,
      technicianName: value,
    }));
  }

  function getTechnicianSuggestions() {
    const search = String(technicianSearch || "").trim().toLowerCase();

    if (!search || selectedTechnicianId) return [];

    return workers
      .filter((worker) => {
        const name = String(worker.name || "").toLowerCase();
        const rut = String(worker.rut || "").toLowerCase();

        return name.includes(search) || rut.includes(search);
      })
      .slice(0, 8);
  }

  function selectTechnician(worker) {
    setSelectedTechnicianId(worker.id);
    setTechnicianSearch(worker.name || "");
    setTechnicianSearching(false);

    setForm((prev) => ({
      ...prev,
      technicianName: worker.name || "",
    }));
  }

  function clearTechnician() {
    setSelectedTechnicianId("");
    setTechnicianSearch("");
    setTechnicianSearching(false);

    setForm((prev) => ({
      ...prev,
      technicianName: "",
    }));
  }

  function updateItem(index, field, value) {
    setItems((prev) =>
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

  function getCanvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0];

    return {
      x: (touch ? touch.clientX : event.clientX) - rect.left,
      y: (touch ? touch.clientY : event.clientY) - rect.top,
    };
  }

  function prepareCanvas(canvas) {
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 600;
    const height = window.innerWidth <= 768 ? 180 : 260;
    const ratio = window.devicePixelRatio || 1;
    const previous = hasSupervisorSignature
      ? canvas.toDataURL("image/png")
      : null;

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

  function startSignature(event) {
    event.preventDefault();

    const canvas = supervisorCanvasRef.current;
    if (!canvas || !signatureEnabled) return;

    if (!canvas.width) {
      prepareCanvas(canvas);
    }

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    drawingRef.current = true;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event) {
    if (!drawingRef.current || !signatureEnabled) return;

    event.preventDefault();

    const canvas = supervisorCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setHasSupervisorSignature(true);
  }

  function stopSignature() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = supervisorCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    setHasSupervisorSignature(false);
    setSignatureEnabled(true);
  }

  function resetForm() {
    setForm({
      expirationDate: "",
      contract: "",
      technicianName: "",
      mobile: "",
      supervisorInspectorName: "",
      zone: "",
      generalObservation: "",
    });

    setTechnicianSearch("");
    setTechnicianSearching(false);
    setSelectedTechnicianId("");

    setItems(buildInitialItems());
    clearSignature();
    setSignatureEnabled(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (!form.technicianName.trim()) {
        alert("Debes seleccionar o ingresar el nombre del técnico.");
        return;
      }

      if (!form.supervisorInspectorName.trim()) {
        alert("Debes ingresar el nombre del supervisor / inspector.");
        return;
      }

      if (!hasSupervisorSignature) {
        alert("Debes registrar la firma del supervisor.");
        return;
      }

      setLoading(true);

      const supervisorFile = dataUrlToFile(
        supervisorCanvasRef.current.toDataURL("image/png"),
        "firma-supervisor.png",
      );

      const formData = new FormData();

      formData.append("expirationDate", form.expirationDate);
      formData.append("status", automaticStatus);
      formData.append("contract", form.contract);
      formData.append("technicianName", form.technicianName);
      formData.append("mobile", form.mobile);
      formData.append("supervisorInspectorName", form.supervisorInspectorName);
      formData.append("zone", form.zone);
      formData.append("generalObservation", form.generalObservation);

      formData.append(
        "items",
        JSON.stringify(
          items.map((item) => ({
            description: item.description,
            status: item.status,
            observation: item.observation,
          })),
        ),
      );

      formData.append("supervisorSignature", supervisorFile);

      const response = await fetch(`${API_URL}/harness-check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error guardando check list de arnés");
      }

      await response.json();

      setSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Error guardando check list de arnés ❌");
    } finally {
      setLoading(false);
    }
  }

  function closeSuccessModal() {
    setSuccessModalOpen(false);
    resetForm();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const technicianSuggestions = getTechnicianSuggestions();

  return (
    <div className="harness-page">
      <div className="harness-header">
        <div>
          <h1>Check List Arnés</h1>
          <p>Inspección de arnés de seguridad y línea de vida.</p>
        </div>

        <button
          className="harness-history-btn"
          type="button"
          onClick={() => navigate("/arnes/historial")}
        >
          <History size={18} />
          Ver Historial
        </button>
      </div>

      <form className="harness-form" onSubmit={handleSubmit}>
        <div className="harness-card">
          <div className="harness-card-title">
            <ShieldCheck size={20} />
            Información General
          </div>

          <div className="harness-grid">
            <div className="field">
              <label>Vencimiento</label>
              <input
                type="date"
                value={form.expirationDate}
                onChange={(e) =>
                  updateField("expirationDate", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Aprobado</label>
              <input
                type="text"
                value={automaticStatus === "APROBADO" ? "APROBADO" : ""}
                readOnly
                placeholder="Se completa automáticamente"
              />
            </div>

            <div className="field">
              <label>Rechazado</label>
              <input
                type="text"
                value={automaticStatus === "RECHAZADO" ? "RECHAZADO" : ""}
                readOnly
                placeholder="Se completa automáticamente"
              />
            </div>

            <div className="field">
              <label>Contrato</label>
              <input
                type="text"
                value={form.contract}
                onChange={(e) => updateField("contract", e.target.value)}
              />
            </div>

            <div className="field technician-search-field">
              <label>Técnico</label>

              <div className="participant-search-wrap">
                <input
                  type="text"
                  value={technicianSearch}
                  placeholder="Escriba nombre del técnico"
                  autoComplete="off"
                  onChange={(e) => handleTechnicianSearch(e.target.value)}
                  onFocus={() => setTechnicianSearching(true)}
                  onBlur={() => {
                    setTimeout(() => setTechnicianSearching(false), 150);
                  }}
                />

                {form.technicianName && (
                  <button
                    type="button"
                    className="participant-clear-button"
                    onClick={clearTechnician}
                  >
                    Limpiar
                  </button>
                )}

                {technicianSearching && technicianSuggestions.length > 0 && (
                  <div className="participant-suggestions">
                    {technicianSuggestions.map((worker) => (
                      <button
                        type="button"
                        key={worker.id}
                        className="participant-suggestion-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectTechnician(worker)}
                      >
                        {worker.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="field">
              <label>Móvil</label>
              <input
                type="text"
                value={form.mobile}
                onChange={(e) => updateField("mobile", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Supervisor / Inspector</label>
              <input
                type="text"
                value={form.supervisorInspectorName}
                onChange={(e) =>
                  updateField("supervisorInspectorName", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Zona</label>
              <input
                type="text"
                value={form.zone}
                onChange={(e) => updateField("zone", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="harness-card">
          <div className="harness-card-title">
            <AlertTriangle size={20} />
            Inspección del Arnés
          </div>

          <div className="harness-check-table-card">
            <div className="harness-check-table-title">
              <ClipboardList size={18} />
              <h3>Chequeo General</h3>
            </div>

            <div className="harness-check-table-scroll">
              <table className="harness-check-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Elemento a revisar</th>
                    <th>SI</th>
                    <th>NO</th>
                    <th>NO APLICA</th>
                    <th>Observación</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.description}>
                      <td>{index + 1}</td>

                      <td>{item.description}</td>

                      <td>
                        <input
                          type="radio"
                          name={`status-${index}`}
                          checked={item.status === "SI"}
                          onChange={() => updateItem(index, "status", "SI")}
                        />
                      </td>

                      <td>
                        <input
                          type="radio"
                          name={`status-${index}`}
                          checked={item.status === "NO"}
                          onChange={() => updateItem(index, "status", "NO")}
                        />
                      </td>

                      <td>
                        <input
                          type="radio"
                          name={`status-${index}`}
                          checked={item.status === "NO_APLICA"}
                          onChange={() =>
                            updateItem(index, "status", "NO_APLICA")
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          placeholder="Ingrese observación"
                          value={item.observation}
                          onChange={(e) =>
                            updateItem(index, "observation", e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="harness-card">
          <div className="harness-card-title">
            <AlertTriangle size={20} />
            Observaciones Generales
          </div>

          <div className="field">
            <textarea
              rows={6}
              value={form.generalObservation}
              onChange={(e) =>
                updateField("generalObservation", e.target.value)
              }
              placeholder="Ingrese observaciones generales..."
            />
          </div>
        </div>

        <div className="harness-card">
          <div
            className={`vehicle-client-signature ${
              hasSupervisorSignature ? "signed" : ""
            }`}
          >
            <div className="vehicle-client-signature-header">
              <div>
                <div className="vehicle-client-signature-title">
                  <PenLine size={22} />
                  Firma del Responsable
                </div>

                <h4>
                  Firma de{" "}
                  {form.supervisorInspectorName || "Supervisor / Inspector"}
                  <span> (Supervisor / Inspector)</span>
                </h4>

                <p>
                  {signatureEnabled
                    ? "🔓 Firma habilitada"
                    : "🔒 Firma bloqueada (habilita antes de firmar)"}
                </p>
              </div>

              <div className="vehicle-client-signature-actions">
                <button
                  type="button"
                  className="vehicle-enable-signature-button"
                  onClick={() => setSignatureEnabled((prev) => !prev)}
                >
                  <PenLine size={18} />
                  {signatureEnabled ? "Bloquear firma" : "Habilitar firma"}
                </button>

                <button
                  type="button"
                  className="vehicle-clear-signature-button"
                  onClick={clearSignature}
                  disabled={!hasSupervisorSignature}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="vehicle-signature-pad">
              {!signatureEnabled && (
                <div className="vehicle-signature-placeholder">
                  <div>🔒</div>
                  <strong>Firma deshabilitada</strong>
                  <span>
                    Toca aquí para habilitar y que el supervisor firme
                  </span>
                </div>
              )}

              <canvas
                ref={supervisorCanvasRef}
                className="signature-canvas"
                onMouseDown={signatureEnabled ? startSignature : undefined}
                onMouseMove={signatureEnabled ? drawSignature : undefined}
                onMouseUp={signatureEnabled ? stopSignature : undefined}
                onMouseLeave={signatureEnabled ? stopSignature : undefined}
                onTouchStart={signatureEnabled ? startSignature : undefined}
                onTouchMove={signatureEnabled ? drawSignature : undefined}
                onTouchEnd={signatureEnabled ? stopSignature : undefined}
              />
            </div>

            <p className="vehicle-signature-help">
              Habilita la firma y solicita al supervisor que firme dentro del
              recuadro. Luego presiona guardar.
            </p>

            <div className="vehicle-signature-status">
              Estado firma:{" "}
              {hasSupervisorSignature ? (
                <span className="ok">✅ Firma registrada</span>
              ) : (
                <span className="bad">❌ Falta firma</span>
              )}
            </div>
          </div>
        </div>

        <button type="submit" className="harness-submit-btn" disabled={loading}>
          <Save size={18} />
          {loading ? "Guardando..." : "Guardar Check List"}
        </button>
      </form>

      {successModalOpen && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-modal-icon">
              <Check size={36} />
            </div>

            <h3>Check list guardado</h3>

            <p>El check list de arnés fue registrado exitosamente.</p>

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

export default HarnessCheck;