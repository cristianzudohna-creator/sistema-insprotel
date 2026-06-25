import { useEffect, useRef, useState } from "react";
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
  "Polar Insprotel",
  "Lente de seguridad",
  "Casco de seguridad",
  "Legionario",
  "Barbiquejo de casco",
  "Guantes cabretilla corto",
  "Parka Insprotel",
  "Gorro de lana Insprotel",
  "Jockey Insprotel",
  "Credencial",
  "Cubre calzado de seguridad",
  "Traje de agua",
  "Zapato de Seguridad",
  "MOSQUETON (Y) AL 3T ANSI N-2852G-TR",
  "ANCLAJE PORTATIL TIE OFF TUBULAR CESLI 25 MM X 0",
  "CUERDA KORDAS SEMIEST BLANCA 11MM TITANIA11",
  "DESCENDEDOR SKYLOTEC LORY PRO A-041",
  "DESLIZADOR (K) ANTICAIDA ROKER CUERDA RG07",
  "ANILLA PETZL ANNEAU ROJO 150 CM C40A_150",
  "CUCHILLO PETZL SPATHA AMARILLO S92AY",
  "ARNES DE SEGURIDAD",
  "ESTROBO DE POSICIONAMIENTO",
  "LINEA DE VIDA EN Y",
  "BOLSO KITE DE RESCATE",
];

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getLoggedUser() {
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

function getLoggedUserName() {
  const user = getLoggedUser();

  return (
    user?.name ||
    user?.fullName ||
    user?.nombre ||
    user?.displayName ||
    "Usuario logueado"
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
  const loggedUserName = getLoggedUserName();

  const driverCanvasRef = useRef(null);
  const drawingRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [hasDriverSignature, setHasDriverSignature] = useState(false);
  const [signatureEnabled, setSignatureEnabled] = useState(false);

  const [form, setForm] = useState({
  contract: "",
  mobile: "",
  licenseExpiration: "",
  supervisorInspectorName: "",
  supervisorInspectorUserId: "",
  zone: "",
  generalObservation: "",
});

  const [items, setItems] = useState(buildInitialItems());
  useEffect(() => {
  async function loadSupervisors() {
    try {
      const response = await fetch(`${API_URL}/users/workers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      setSupervisors(
  data.filter((u) => {
    const userRole = String(u.role || "").toUpperCase();

    return userRole === "SUPERVISOR" || userRole === "PREVENCION";
  }),
);
    } catch (error) {
      console.error(error);
    }
  }

  loadSupervisors();
}, []);
  const [supervisors, setSupervisors] = useState([]);
const [showSupervisorList, setShowSupervisorList] = useState(false);

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

    const canvas = driverCanvasRef.current;

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

    if (type === "driver") {
  setHasDriverSignature(false);
  setSignatureEnabled(true);
}
}

  function resetForm() {
    setForm({
  contract: "",
  mobile: "",
  licenseExpiration: "",
  supervisorInspectorName: "",
  supervisorInspectorUserId: "",
  zone: "",
  generalObservation: "",
});

    setItems(buildInitialItems());

    clearSignature("driver");
    setSignatureEnabled(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {

      if (!form.supervisorInspectorName.trim()) {
        alert("Debes ingresar el nombre del supervisor / inspector.");
        return;
      }

      if (!hasDriverSignature) {
        alert("Debes registrar la firma del conductor.");
        return;
      }

      setLoading(true);

      const driverFile = dataUrlToFile(
        driverCanvasRef.current.toDataURL("image/png"),
        "firma-conductor.png",
      );

      const formData = new FormData();

      formData.append("contract", form.contract);
      formData.append("mobile", form.mobile);
      formData.append(
  "heightExamExpiration",
  form.licenseExpiration,
);
      formData.append(
        "supervisorInspectorName",
        form.supervisorInspectorName,
      );
      formData.append(
  "supervisorInspectorUserId",
  form.supervisorInspectorUserId,
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
              <label>Móvil</label>
              <input
                type="text"
                value={form.mobile}
                onChange={(e) => updateField("mobile", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Vencimiento Licencia</label>

<input
  type="date"
  value={form.licenseExpiration}
  onChange={(e) =>
    updateField("licenseExpiration", e.target.value)
  }
/>
            </div>

            <div className="field" style={{ position: "relative" }}>
  <label>Supervisor / Inspector</label>

  <input
    type="text"
    value={form.supervisorInspectorName}
    placeholder="Escriba un nombre..."
    onFocus={() => setShowSupervisorList(true)}
    onChange={(e) => {
      updateField("supervisorInspectorName", e.target.value);
      updateField("supervisorInspectorUserId", "");
      setShowSupervisorList(true);
    }}
  />

  {showSupervisorList &&
    form.supervisorInspectorName.trim() !== "" && (
      <div className="autocomplete-list">
        {supervisors
          .filter((user) =>
            user.name
              .toLowerCase()
              .includes(form.supervisorInspectorName.toLowerCase())
          )
          .map((user) => (
            <div
              key={user.id}
              className="autocomplete-item"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  supervisorInspectorName: user.name,
                  supervisorInspectorUserId: user.id,
                }));

                setShowSupervisorList(false);
              }}
            >
              {user.name}
            </div>
          ))}
      </div>
    )}
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

          <div style={{ width: "100%" }}>
  <div
    className={`vehicle-client-signature ${
      hasDriverSignature ? "signed" : ""
    }`}
  >
    <div className="vehicle-client-signature-header">
      <div>
        <div className="vehicle-client-signature-title">
          <PenLine size={22} />
          Firma del Conductor
        </div>

        <h4>
          Firma de {loggedUserName}
          <span> (Conductor)</span>
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
          onClick={() => clearSignature("driver")}
          disabled={!hasDriverSignature}
        >
          <RotateCcw size={18} />
          Limpiar
        </button>
      </div>
    </div>

    <div className="vehicle-signature-pad">
      {!signatureEnabled && (
        <div className="vehicle-signature-placeholder">
          <div>🔒</div>
          <strong>Firma deshabilitada</strong>
          <span>Presiona el boton habilitar firma para comenzar</span>
        </div>
      )}

      <canvas
        ref={driverCanvasRef}
        className="signature-canvas"
        onMouseDown={
          signatureEnabled ? (e) => startSignature(e, "driver") : undefined
        }
        onMouseMove={
          signatureEnabled ? (e) => drawSignature(e, "driver") : undefined
        }
        onMouseUp={signatureEnabled ? stopSignature : undefined}
        onMouseLeave={signatureEnabled ? stopSignature : undefined}
        onTouchStart={
          signatureEnabled ? (e) => startSignature(e, "driver") : undefined
        }
        onTouchMove={
          signatureEnabled ? (e) => drawSignature(e, "driver") : undefined
        }
        onTouchEnd={signatureEnabled ? stopSignature : undefined}
      />
    </div>

    <p className="vehicle-signature-help">
      Habilita la firma y firma dentro del recuadro antes de guardar.
    </p>

    <div className="vehicle-signature-status">
      Estado firma:{" "}
      {hasDriverSignature ? (
        <span className="ok">✅ Firma registrada</span>
      ) : (
        <span className="bad">❌ Falta firma</span>
      )}
    </div>
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