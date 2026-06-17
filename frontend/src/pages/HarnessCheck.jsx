import { useRef, useState } from "react";
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
  "El arnés se encuentra limpio y sin daños visibles.",
  "Las cintas no presentan cortes, quemaduras o desgaste.",
  "Las costuras se encuentran completas y sin hilos sueltos.",
  "Las hebillas se encuentran en buen estado.",
  "Los anillos tipo D no presentan deformaciones.",
  "Los ganchos y conectores funcionan correctamente.",
  "La línea de vida no presenta cortes o desgaste.",
  "El absorbedor de impacto está en buen estado.",
  "La etiqueta de identificación se encuentra legible.",
  "El equipo se encuentra apto para su uso.",
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

function HarnessCheck() {
  const navigate = useNavigate();

  const technicianCanvasRef = useRef(null);
  const supervisorCanvasRef = useRef(null);
  const drawingRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [hasTechnicianSignature, setHasTechnicianSignature] = useState(false);
  const [hasSupervisorSignature, setHasSupervisorSignature] = useState(false);

  const [form, setForm] = useState({
    contract: "",
    technicianName: "",
    mobile: "",
    supervisorInspectorName: "",
    zone: "",
    generalObservation: "",
  });

  const [items, setItems] = useState(buildInitialItems());

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
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
    const height = 180;
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
  }

  function startSignature(event, type) {
    event.preventDefault();

    const canvas =
      type === "technician"
        ? technicianCanvasRef.current
        : supervisorCanvasRef.current;

    if (!canvas) return;

    if (!canvas.width) {
      prepareCanvas(canvas);
    }

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    drawingRef.current = type;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event, type) {
    if (drawingRef.current !== type) return;

    event.preventDefault();

    const canvas =
      type === "technician"
        ? technicianCanvasRef.current
        : supervisorCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    if (type === "technician") {
      setHasTechnicianSignature(true);
    }

    if (type === "supervisor") {
      setHasSupervisorSignature(true);
    }
  }

  function stopSignature() {
    drawingRef.current = null;
  }

  function clearSignature(type) {
    const canvas =
      type === "technician"
        ? technicianCanvasRef.current
        : supervisorCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (type === "technician") {
      setHasTechnicianSignature(false);
    }

    if (type === "supervisor") {
      setHasSupervisorSignature(false);
    }
  }

  function resetForm() {
    setForm({
      contract: "",
      technicianName: "",
      mobile: "",
      supervisorInspectorName: "",
      zone: "",
      generalObservation: "",
    });

    setItems(buildInitialItems());

    clearSignature("technician");
    clearSignature("supervisor");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (!form.technicianName.trim()) {
        alert("Debes ingresar el nombre del técnico.");
        return;
      }

      if (!form.supervisorInspectorName.trim()) {
        alert("Debes ingresar el nombre del supervisor / inspector.");
        return;
      }

      if (!hasTechnicianSignature) {
        alert("Debes registrar la firma del técnico.");
        return;
      }

      if (!hasSupervisorSignature) {
        alert("Debes registrar la firma del supervisor.");
        return;
      }

      setLoading(true);

      const technicianFile = dataUrlToFile(
        technicianCanvasRef.current.toDataURL("image/png"),
        "firma-tecnico.png",
      );

      const supervisorFile = dataUrlToFile(
        supervisorCanvasRef.current.toDataURL("image/png"),
        "firma-supervisor.png",
      );

      const formData = new FormData();

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

      formData.append("technicianSignature", technicianFile);
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
              <label>Contrato</label>
              <input
                type="text"
                value={form.contract}
                onChange={(e) => updateField("contract", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Técnico</label>
              <input
                type="text"
                value={form.technicianName}
                onChange={(e) => updateField("technicianName", e.target.value)}
              />
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
                    <th>Bueno</th>
                    <th>Malo</th>
                    <th>No Aplica</th>
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
          <div className="harness-card-title">
            <PenLine size={20} />
            Firmas
          </div>

          <div className="harness-signature-grid">
            <div className="harness-signature-box">
              <h3>Firma Técnico</h3>

              <canvas
                ref={technicianCanvasRef}
                className="harness-signature-canvas"
                onMouseDown={(e) => startSignature(e, "technician")}
                onMouseMove={(e) => drawSignature(e, "technician")}
                onMouseUp={stopSignature}
                onMouseLeave={stopSignature}
                onTouchStart={(e) => startSignature(e, "technician")}
                onTouchMove={(e) => drawSignature(e, "technician")}
                onTouchEnd={stopSignature}
              />

              <button
                type="button"
                className="signature-clear-button"
                onClick={() => clearSignature("technician")}
              >
                <RotateCcw size={16} />
                Limpiar firma
              </button>
            </div>

            <div className="harness-signature-box">
              <h3>Firma Supervisor</h3>

              <canvas
                ref={supervisorCanvasRef}
                className="harness-signature-canvas"
                onMouseDown={(e) => startSignature(e, "supervisor")}
                onMouseMove={(e) => drawSignature(e, "supervisor")}
                onMouseUp={stopSignature}
                onMouseLeave={stopSignature}
                onTouchStart={(e) => startSignature(e, "supervisor")}
                onTouchMove={(e) => drawSignature(e, "supervisor")}
                onTouchEnd={stopSignature}
              />

              <button
                type="button"
                className="signature-clear-button"
                onClick={() => clearSignature("supervisor")}
              >
                <RotateCcw size={16} />
                Limpiar firma
              </button>
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