import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ClipboardCheck,
  Save,
  History,
  PenLine,
  RotateCcw,
  Check,
  Wrench,
} from "lucide-react";

import "./ToolsEppCheck.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TOOL_ITEMS = [
  "Careta facial dieléctrica con cubre mentón",
  "Bolso de polar protector de careta",
  "Bolso de herramientas Insprotel",
  "Arnés de seguridad",
  "Línea de vida en Y",
  "Cinturón de Posicionamiento",
  "Manguilla Dieléctrica",
  "Cubre Manguillas",
  "Bolso protector de Manguilla dieléctricas",
  "Guantes Dieléctricos",
  "Guantes de Cabritilla",
  "Bolso protector de Guantes dieléctricos",
  "Cubre guantes dieléctricos",
  "Balde porta herramientas",
  "Línea de vida vertical cuerda 12mm",
  "Deslizador arnés de seguridad",
  "Estrobo tipo corbata",
  "Estrobo de posicionamiento",
  "Kit de rescate en altura",
  "Conos de seguridad",
  "Barra delimitadora",
  "Codel perlon amarre al poste",
  "Mensajero",
  "Multitester",
  "Probador de tensión",
  "Llaves C/C",
  "Caja Herramientas",
  "Juego alicates dieléctricos",
  "Juego atornilladores dieléctricos",
  "Pelacable",
  "Linterna",
  "Escala telescópica",
  "Escala de tijera",
  "Casco de seguridad",
  "Barbiquejo para casco",
  "Lentes de seguridad",
  "Geólogo ignífugo",
  "Camisa ignífuga",
  "Pantalón ignífugo",
  "Legionario ignífugo",
  "Polar Insprotel",
  "Calzado de seguridad",
  "Parka Insprotel",
  "Gorro de lana Insprotel",
  "Jockey Insprotel",
  "Credencial",
  "Cubre calzado de seguridad",
  "Traje de agua",
  "Seccionmetro",
  "Flejadora",
  "Calafatera",
  "Marco Sierra",
  "Cartuchera porta herramienta",
  "Chicharra con dados",
  "Llave allen",
  "Taladro inalámbrico",
  "Archivador procedimiento",
  "Llave Francesa",
  "Cooler",
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
  return TOOL_ITEMS.map((name, index) => ({
    number: index + 1,
    name,
    quantity: "",
    status: "",
    observation: "",
  }));
}

function ToolsEppCheck() {
  const navigate = useNavigate();
  const loggedUserName = getLoggedUserName();

  const technicianCanvasRef = useRef(null);
  const drawingRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [hasTechnicianSignature, setHasTechnicianSignature] = useState(false);

  const [form, setForm] = useState({
  contract: "",
  technicianName: loggedUserName,
  mobile: "",
  supervisorInspectorName: "",
  supervisorInspectorUserId: "",
  zone: "",
  generalObservation: "",
});

  const [items, setItems] = useState(buildInitialItems());
  const [signatureEnabled, setSignatureEnabled] = useState(false);
const [supervisorOptions, setSupervisorOptions] = useState([]);
const [showSupervisorOptions, setShowSupervisorOptions] = useState(false);

useEffect(() => {
  async function loadUsers() {
    try {
      const response = await fetch(`${API_URL}/users/workers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      const filtered = (Array.isArray(data) ? data : []).filter((user) =>
        ["SUPERVISOR", "PREVENCION"].includes(
          String(user.role || "").toUpperCase(),
        ),
      );

      setSupervisorOptions(filtered);
    } catch (error) {
      console.error(error);
    }
  }

  loadUsers();
}, []);

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

    const canvas = technicianCanvasRef.current;

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

    const canvas = technicianCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    if (type === "technician") setHasTechnicianSignature(true);
  }

  function stopSignature() {
    drawingRef.current = null;
  }

  function clearSignature(type) {
    const canvas = technicianCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (type === "technician") {
  setHasTechnicianSignature(false);
  setSignatureEnabled(true);
}
  }

  function resetForm() {
    setForm({
  contract: "",
  technicianName: getLoggedUserName(),
  mobile: "",
  supervisorInspectorName: "",
  supervisorInspectorUserId: "",
  zone: "",
  generalObservation: "",
});

    setItems(buildInitialItems());

    clearSignature("technician");
    setSignatureEnabled(false);
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

      setLoading(true);

      const technicianFile = dataUrlToFile(
        technicianCanvasRef.current.toDataURL("image/png"),
        "firma-tecnico.png",
      );

      const formData = new FormData();

      formData.append("contract", form.contract);
      formData.append("technicianName", form.technicianName);
      formData.append("mobile", form.mobile);
      formData.append(
        "supervisorInspectorName",
        form.supervisorInspectorName,
      );
      formData.append(
  "supervisorInspectorUserId",
  String(form.supervisorInspectorUserId || ""),
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

      formData.append("technicianSignature", technicianFile);

      const response = await fetch(`${API_URL}/tools-epp-check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error guardando check list de herramientas");
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
    <div className="tools-page">
      <div className="tools-header">
        <div>
          <h1>Check List Herramientas y EPP</h1>
          <p>Lista de chequeo herramientas y elementos de protección personal.</p>
        </div>

        <button
          className="tools-history-btn"
          type="button"
          onClick={() => navigate("/check-herramientas/historial")}
        >
          <History size={18} />
          Ver Historial
        </button>
      </div>

      <form className="tools-form" onSubmit={handleSubmit}>
        <div className="tools-card">
          <div className="tools-card-title">
            <ClipboardCheck size={20} />
            Información General
          </div>

          <div className="tools-grid">
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

            <div className="field vehicle-autocomplete">
  <label>Supervisor o Prevención</label>

  <input
    type="text"
    value={form.supervisorInspectorName}
    onChange={(e) => {
      updateField("supervisorInspectorName", e.target.value);
      setShowSupervisorOptions(true);
    }}
    onFocus={() => setShowSupervisorOptions(true)}
    placeholder="Escriba nombre supervisor o prevención..."
    autoComplete="off"
  />

  {showSupervisorOptions && (
    <div className="vehicle-options">
      {supervisorOptions
        .filter((user) =>
          user.name
            ?.toLowerCase()
            .includes(form.supervisorInspectorName.toLowerCase()),
        )
        .slice(0, 10)
        .map((user) => (
          <button
            key={user.id}
            type="button"
            className="vehicle-option"
            onMouseDown={() => {
  updateField("supervisorInspectorName", user.name);
  updateField("supervisorInspectorUserId", user.id);
  setShowSupervisorOptions(false);
}}
          >
            <strong>{user.name}</strong>

            <span>
              {String(user.role || "").toUpperCase() === "SUPERVISOR"
                ? "Supervisor"
                : "Prevención"}
            </span>
          </button>
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

        <div className="tools-card">
          <div className="tools-card-title">
            <Wrench size={20} />
            Estado de EPP y Herramientas
          </div>

          <div className="tools-table-wrapper">
            <table className="tools-table">
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
                        type="number"
                        min="0"
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

        <div className="tools-card">
          <div className="tools-card-title">
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

        <div className="tools-card">
          <div className="tools-card-title">
            <PenLine size={20} />
            Firmas
          </div>

          <div style={{ width: "100%" }}>
            <div
  className={`vehicle-client-signature ${
    hasTechnicianSignature ? "signed" : ""
  }`}
>
  <div className="vehicle-client-signature-header">
    <div>
      <div className="vehicle-client-signature-title">
        <PenLine size={22} />
        Firma del Técnico
      </div>

      <h4>
        Firma de {loggedUserName}
        <span> (Técnico)</span>
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
        onClick={() => {
          setSignatureEnabled((prev) => !prev);
        }}
      >
        <PenLine size={18} />
        {signatureEnabled ? "Bloquear firma" : "Habilitar firma"}
      </button>

      <button
        type="button"
        className="vehicle-clear-signature-button"
        onClick={() => clearSignature("technician")}
        disabled={!hasTechnicianSignature}
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
      ref={technicianCanvasRef}
      className="signature-canvas"
      onMouseDown={
        signatureEnabled
          ? (e) => startSignature(e, "technician")
          : undefined
      }
      onMouseMove={
        signatureEnabled
          ? (e) => drawSignature(e, "technician")
          : undefined
      }
      onMouseUp={signatureEnabled ? stopSignature : undefined}
      onMouseLeave={signatureEnabled ? stopSignature : undefined}
      onTouchStart={
        signatureEnabled
          ? (e) => startSignature(e, "technician")
          : undefined
      }
      onTouchMove={
        signatureEnabled
          ? (e) => drawSignature(e, "technician")
          : undefined
      }
      onTouchEnd={signatureEnabled ? stopSignature : undefined}
    />
  </div>

  <p className="vehicle-signature-help">
    Habilita la firma y firma dentro del recuadro antes de guardar.
  </p>

  <div className="vehicle-signature-status">
    Estado firma:{" "}
    {hasTechnicianSignature ? (
      <span className="ok">✅ Firma registrada</span>
    ) : (
      <span className="bad">❌ Falta firma</span>
    )}
  </div>
</div>

          </div>
        </div>

        <button type="submit" className="tools-submit-btn" disabled={loading}>
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
            <p>El check list de herramientas fue registrado exitosamente.</p>

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

export default ToolsEppCheck;