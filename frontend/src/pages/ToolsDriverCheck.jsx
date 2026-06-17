import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ClipboardCheck,
  Save,
  History,
  PenLine,
  RotateCcw,
  Check,
  HardHat,
} from "lucide-react";

import "./ToolsDriverCheck.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const DRIVER_ITEMS = [
  "Geólogo azul insprotel",
  "Camisa insprotel",
  "Pantalón insprotel",
  "Polar insprotel",
  "Lente de seguridad",
  "Casco de seguridad",
  "Legionario",
  "Barbiquejo de casco",
  "Guantes cabritilla corto",
  "Parka insprotel",
  "Gorro de lana insprotel",
  "Jockey Insprotel",
  "Credencial",
  "Cubre calzado de seguridad",
  "Traje de agua",
  "Licencia de conducir al día",
  "Permiso de circulación al día",
  "Seguro obligatorio al día",
  "Revisión técnica al día",
  "Extintor con carga",
  "Botiquín",
  "Triángulo",
  "Rueda de repuesto",
  "Gata",
  "Llave de ruedas",
  "Estado de neumáticos",
  "Estado de parabrisas y vidrios",
  "Mantención al día",
  "Kilometraje actual",
  "Logos visibles en vehículo",
  "Banderín de escala",
  "Bolso para cordel de escala",
  "Zapato de seguridad",
];

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
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
  return DRIVER_ITEMS.map((name, index) => ({
    number: index + 1,
    name,
    quantity: "",
    status: "",
    observation: "",
  }));
}

function ToolsDriverCheck() {
  const navigate = useNavigate();

  const driverCanvasRef = useRef(null);
  const inspectorCanvasRef = useRef(null);
  const drawingRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [hasDriverSignature, setHasDriverSignature] = useState(false);
  const [hasInspectorSignature, setHasInspectorSignature] = useState(false);

  const [form, setForm] = useState({
    contract: "",
    driverName: "",
    mobile: "",
    heightExamExpiration: "",
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
      type === "driver" ? driverCanvasRef.current : inspectorCanvasRef.current;

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
      type === "driver" ? driverCanvasRef.current : inspectorCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    if (type === "driver") setHasDriverSignature(true);
    if (type === "inspector") setHasInspectorSignature(true);
  }

  function stopSignature() {
    drawingRef.current = null;
  }

  function clearSignature(type) {
    const canvas =
      type === "driver" ? driverCanvasRef.current : inspectorCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (type === "driver") setHasDriverSignature(false);
    if (type === "inspector") setHasInspectorSignature(false);
  }

  function resetForm() {
    setForm({
      contract: "",
      driverName: "",
      mobile: "",
      heightExamExpiration: "",
      supervisorInspectorName: "",
      zone: "",
      generalObservation: "",
    });

    setItems(buildInitialItems());

    clearSignature("driver");
    clearSignature("inspector");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (!form.driverName.trim()) {
        alert("Debes ingresar el nombre del conductor.");
        return;
      }

      if (!form.supervisorInspectorName.trim()) {
        alert("Debes ingresar el nombre del supervisor / inspector.");
        return;
      }

      if (!hasDriverSignature) {
        alert("Debes registrar la firma del conductor.");
        return;
      }

      if (!hasInspectorSignature) {
        alert("Debes registrar la firma del supervisor / inspector.");
        return;
      }

      setLoading(true);

      const driverFile = dataUrlToFile(
        driverCanvasRef.current.toDataURL("image/png"),
        "firma-conductor.png",
      );

      const inspectorFile = dataUrlToFile(
        inspectorCanvasRef.current.toDataURL("image/png"),
        "firma-inspector.png",
      );

      const formData = new FormData();

      formData.append("contract", form.contract);
      formData.append("driverName", form.driverName);
      formData.append("mobile", form.mobile);
      formData.append("heightExamExpiration", form.heightExamExpiration);
      formData.append(
        "supervisorInspectorName",
        form.supervisorInspectorName,
      );
      formData.append("zone", form.zone);
      formData.append("generalObservation", form.generalObservation);

      formData.append(
        "items",
        JSON.stringify(
          items.map((item) => ({
            number: item.number,
            name: item.name,
            quantity: item.quantity,
            status: item.status,
            observation: item.observation,
          })),
        ),
      );

      formData.append("driverSignature", driverFile);
      formData.append("inspectorSignature", inspectorFile);

      const response = await fetch(`${API_URL}/tools-driver-check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error guardando check list conductor");
      }

      await response.json();

      setSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Error guardando check list ❌");
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
    <div className="driver-tools-page">
      <div className="driver-tools-header">
        <div>
          <h1>Check List Herramientas y EPP Conductor</h1>
          <p>Lista de chequeo para conductor, documentación, vehículo y EPP.</p>
        </div>

        <button
          className="driver-tools-history-btn"
          type="button"
          onClick={() => navigate("/check-conductor/historial")}
        >
          <History size={18} />
          Ver Historial
        </button>
      </div>

      <form className="driver-tools-form" onSubmit={handleSubmit}>
        <div className="driver-tools-card">
          <div className="driver-tools-card-title">
            <ClipboardCheck size={20} />
            Información General
          </div>

          <div className="driver-tools-grid">
            <div className="field">
              <label>Contrato</label>
              <input
                type="text"
                value={form.contract}
                onChange={(e) => updateField("contract", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Nombre Conductor</label>
              <input
                type="text"
                value={form.driverName}
                onChange={(e) => updateField("driverName", e.target.value)}
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
              <label>Vigencia examen de altura</label>
              <input
                type="date"
                value={form.heightExamExpiration}
                onChange={(e) =>
                  updateField("heightExamExpiration", e.target.value)
                }
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

        <div className="driver-tools-card">
          <div className="driver-tools-card-title">
            <HardHat size={20} />
            Estado de EPP y Herramienta
          </div>

          <div className="driver-tools-table-wrapper">
            <table className="driver-tools-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nombre de la Herramienta</th>
                  <th>Cantidad</th>
                  <th>Bueno</th>
                  <th>Malo</th>
                  <th>N/A</th>
                  <th>Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.name}>
                    <td>{item.number}</td>

                    <td>{item.name}</td>

                    <td>
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="radio"
                        name={`status-${index}`}
                        checked={item.status === "BUENO"}
                        onChange={() => updateItem(index, "status", "BUENO")}
                      />
                    </td>

                    <td>
                      <input
                        type="radio"
                        name={`status-${index}`}
                        checked={item.status === "MALO"}
                        onChange={() => updateItem(index, "status", "MALO")}
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
                        value={item.observation}
                        onChange={(e) =>
                          updateItem(index, "observation", e.target.value)
                        }
                        placeholder="Observación"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="driver-tools-card">
          <div className="driver-tools-card-title">
            <ClipboardCheck size={20} />
            Observaciones Generales
          </div>

          <div className="field">
            <textarea
              rows={5}
              value={form.generalObservation}
              onChange={(e) =>
                updateField("generalObservation", e.target.value)
              }
              placeholder="Ingrese observaciones generales..."
            />
          </div>
        </div>

        <div className="driver-tools-card">
          <div className="driver-tools-card-title">
            <PenLine size={20} />
            Firmas
          </div>

          <div className="driver-tools-signature-grid">
            <div className="driver-tools-signature-box">
              <h3>Firma Conductor</h3>

              <canvas
                ref={driverCanvasRef}
                className="driver-tools-signature-canvas"
                onMouseDown={(e) => startSignature(e, "driver")}
                onMouseMove={(e) => drawSignature(e, "driver")}
                onMouseUp={stopSignature}
                onMouseLeave={stopSignature}
                onTouchStart={(e) => startSignature(e, "driver")}
                onTouchMove={(e) => drawSignature(e, "driver")}
                onTouchEnd={stopSignature}
              />

              <button
                type="button"
                className="signature-clear-button"
                onClick={() => clearSignature("driver")}
              >
                <RotateCcw size={16} />
                Limpiar firma
              </button>
            </div>

            <div className="driver-tools-signature-box">
              <h3>Firma Supervisor / Inspector</h3>

              <canvas
                ref={inspectorCanvasRef}
                className="driver-tools-signature-canvas"
                onMouseDown={(e) => startSignature(e, "inspector")}
                onMouseMove={(e) => drawSignature(e, "inspector")}
                onMouseUp={stopSignature}
                onMouseLeave={stopSignature}
                onTouchStart={(e) => startSignature(e, "inspector")}
                onTouchMove={(e) => drawSignature(e, "inspector")}
                onTouchEnd={stopSignature}
              />

              <button
                type="button"
                className="signature-clear-button"
                onClick={() => clearSignature("inspector")}
              >
                <RotateCcw size={16} />
                Limpiar firma
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="driver-tools-submit-btn"
          disabled={loading}
        >
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
            <p>El check list del conductor fue registrado exitosamente.</p>

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

export default ToolsDriverCheck;