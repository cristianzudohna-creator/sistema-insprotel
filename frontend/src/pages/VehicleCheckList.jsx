import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  History,
  Save,
  Truck,
  User,
  X,
  Image as ImageIcon,
  PenLine,
  RotateCcw,
  Check,
} from "lucide-react";

import "./VehicleCheckList.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const MAX_GENERAL_PHOTOS = 10;

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function generateVisualFolio() {
  const year = new Date().getFullYear();
  const value = Date.now().toString().slice(-4);
  return `CL-${year}-${value}`;
}

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
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

function getSignatureRoleLabel() {
  const user = getLoggedUser();
  const role = String(user?.role || "").toUpperCase();

  if (role === "CONDUCTOR") return "Conductor";
  if (role === "TECNICO") return "Técnico";
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "PREVENCION") return "Prevencionista";
  if (role === "ADMIN") return "Administrador";
  if (role === "SUPERADMIN") return "Superadministrador";

  return "Usuario";
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

const INITIAL_FORM = {
  checklistNumber: generateVisualFolio(),
  date: todayInputDate(),
  patent: "",
  mileage: "",
  maintenanceUpToDate: "",
  vehicleType: "",
  vehicleModel: "",
  padron: "",
  driverName: "",
  supervisorName: "",
  supervisorUserId: "",
  status: "PENDIENTE",

  technicalReview: "",
  technicalReviewStatus: "",

  gasReview: "",
  gasEmissionReviewStatus: "",

  driverLicense: "",
  driverLicenseStatus: "",

  circulationPermit: "",
  circulationPermitStatus: "",

  insurance: "",
  mandatoryInsuranceStatus: "",

  observations: "",
};

const CHECK_ITEMS = [
  "Extintor",
  "Botiquín",
  "Gata / Herramientas",
  "Triángulo",
  "Chaleco Reflectante",
  "Neumáticos",
  "Cuñas",
  "Alarma Retroceso",
  "Conos y Bastones",
  "Rueda Repuesto",
  "Luces",
  "Botellas Hidráulicas Visual",
  "Mangueras Hidráulicas Visual",
  "Nivel Agua Limpia Parabrisas",
  "Comandos Visual",
  "Limpieza Depósito Aceite",
  "Nivel Agua Radiador",
  "Nivel Aceite",
];

function buildInitialChecks() {
  return CHECK_ITEMS.map((item) => ({
    item,
    status: "",
    observation: "",
  }));
}

function getAutomaticStatus(checks) {
  const hasBad = checks.some((item) => item.status === "MALO");
  const allCompleted = checks.every((item) => item.status);

  if (hasBad) return "OBSERVADO";
  if (allCompleted) return "COMPLETADO";

  return "PENDIENTE";
}

function VehicleCheckList() {
  const navigate = useNavigate();
  const loggedUserName = getLoggedUserName();
  const signatureRoleLabel = getSignatureRoleLabel();

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const cameraInputRef = useRef(null);
const galleryInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    checklistNumber: generateVisualFolio(),
    date: todayInputDate(),
    driverName: loggedUserName,
  });

  const [checks, setChecks] = useState(buildInitialChecks());
  const [generalPhotos, setGeneralPhotos] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [showVehicleOptions, setShowVehicleOptions] = useState(false);
  const [searchingVehicles, setSearchingVehicles] = useState(false);
  const [supervisorOptions, setSupervisorOptions] = useState([]);
const [showSupervisorOptions, setShowSupervisorOptions] = useState(false);

const loggedUser = getLoggedUser();
const loggedRole = String(loggedUser?.role || "").toUpperCase();

const reviewerFieldLabel =
  loggedRole === "CONDUCTOR" || loggedRole === "TECNICO"
    ? "Nombre Supervisor o Prevención"
    : loggedRole === "SUPERVISOR" || loggedRole === "PREVENCION"
    ? "Nombre Conductor o Técnico"
    : "Nombre Usuario";

const reviewerFieldPlaceholder =
  loggedRole === "CONDUCTOR" || loggedRole === "TECNICO"
    ? "Escriba nombre supervisor o prevención..."
    : loggedRole === "SUPERVISOR" || loggedRole === "PREVENCION"
    ? "Escriba nombre conductor o técnico..."
    : "Escriba nombre usuario...";

  const automaticStatus = useMemo(() => {
    return getAutomaticStatus(checks);
  }, [checks]);

  useEffect(() => {
    prepareCanvas();
    window.addEventListener("resize", prepareCanvas);

    return () => {
      window.removeEventListener("resize", prepareCanvas);
    };
  }, []);

  useEffect(() => {
    const query = form.patent.trim();

    if (query.length < 1) {
      setVehicleOptions([]);
      setShowVehicleOptions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchingVehicles(true);

        const response = await fetch(
          `${API_URL}/vehicle-checklist/vehicles/search?q=${encodeURIComponent(
            query,
          )}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          },
        );

        const data = await response.json();

        setVehicleOptions(Array.isArray(data) ? data : []);
        setShowVehicleOptions(true);
      } catch (error) {
        console.error(error);
        setVehicleOptions([]);
      } finally {
        setSearchingVehicles(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [form.patent]);

  useEffect(() => {
  async function loadUsers() {
    try {
      const response = await fetch(`${API_URL}/users/workers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      let filtered = [];

      if (
  loggedRole === "CONDUCTOR" ||
  loggedRole === "TECNICO"
) {
        filtered = (Array.isArray(data) ? data : []).filter((user) =>
          ["SUPERVISOR", "PREVENCION"].includes(
            String(user.role || "").toUpperCase(),
          ),
        );
      } else if (
        loggedRole === "SUPERVISOR" ||
        loggedRole === "PREVENCION"
      ) {
        filtered = (Array.isArray(data) ? data : []).filter(
  (user) =>
    String(user.role || "").toUpperCase() === "CONDUCTOR",
);
      } else if (loggedRole === "SUPERADMIN") {
        filtered = Array.isArray(data) ? data : [];
      }

      setSupervisorOptions(filtered);
    } catch (error) {
      console.error(error);
    }
  }

  loadUsers();
}, [loggedRole]);

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

  function getCanvasPoint(event) {
    const canvas = canvasRef.current;
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
    const point = getCanvasPoint(event);

    drawingRef.current = true;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function drawSignature(event) {
    if (!drawingRef.current) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event);

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
setSignatureEnabled(true);
  }

  function resetForm() {
    generalPhotos.forEach((photo) => {
      if (photo.preview) URL.revokeObjectURL(photo.preview);
    });

    setForm({
      ...INITIAL_FORM,
      checklistNumber: generateVisualFolio(),
      date: todayInputDate(),
      driverName: getLoggedUserName(),
      supervisorName: "",
      supervisorUserId: "",
      status: "PENDIENTE",
    });

    setChecks(buildInitialChecks());
    setGeneralPhotos([]);
    setVehicleOptions([]);
    setShowVehicleOptions(false);

    clearSignature();
  }

  function updateCheck(index, field, value) {
    const updated = [...checks];
    updated[index][field] = value;
    setChecks(updated);
  }

  function handleInput(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function selectVehicle(vehicle) {
    setForm((prev) => ({
      ...prev,
      patent: vehicle.patent || "",
      vehicleType: vehicle.vehicleType || "",
      vehicleModel: vehicle.vehicleModel || "",
    }));

    setShowVehicleOptions(false);
    setVehicleOptions([]);
  }

  function handleGeneralPhotos(files) {
    if (!files?.length) return;

    const currentCount = generalPhotos.length;
    const availableSlots = MAX_GENERAL_PHOTOS - currentCount;

    if (availableSlots <= 0) {
      alert(`Solo puedes subir hasta ${MAX_GENERAL_PHOTOS} fotos.`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, availableSlots);

    const formatted = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setGeneralPhotos((prev) => [...prev, ...formatted]);

    if (files.length > availableSlots) {
      alert(
        `Solo se agregaron ${availableSlots} foto(s). Máximo ${MAX_GENERAL_PHOTOS}.`,
      );
    }
  }

  function removeGeneralPhoto(index) {
    const photo = generalPhotos[index];

    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }

    const updated = [...generalPhotos];
    updated.splice(index, 1);
    setGeneralPhotos(updated);
  }

  async function saveChecklist() {
    try {
      if (!form.supervisorName.trim()) {
        alert("Debes ingresar el nombre del supervisor.");
        return;
      }

      if (!hasSignature) {
        alert("Debes firmar en el cuadro de firma.");
        return;
      }

      setLoading(true);

      const formData = new FormData();

      const canvas = canvasRef.current;
      const croppedSignatureDataUrl = getCroppedSignatureDataUrl(canvas);

      const signatureFile = dataUrlToFile(
        croppedSignatureDataUrl,
        "firma-usuario.png",
      );

      formData.append("checklistNumber", form.checklistNumber);
      formData.append("date", form.date || todayInputDate());
      formData.append("patent", form.patent);
      formData.append("mileage", String(Number(form.mileage || 0)));
      formData.append("maintenanceUpToDate", form.maintenanceUpToDate);
      formData.append("vehicleType", form.vehicleType);
      formData.append("vehicleModel", form.vehicleModel);
      formData.append("padron", form.padron);

      if (
  loggedRole === "SUPERVISOR" ||
  loggedRole === "PREVENCION" ||
  loggedRole === "SUPERADMIN"
) {
  formData.append("driverName", form.supervisorName);
  formData.append("driverUserId", String(form.supervisorUserId || ""));
  formData.append("supervisorName", loggedUserName);
} else {
  formData.append("driverName", form.driverName || loggedUserName);
  formData.append("supervisorName", form.supervisorName);
  formData.append("supervisorUserId", String(form.supervisorUserId || ""));
}
      formData.append("status", automaticStatus);

      formData.append("technicalReview", form.technicalReview);
      formData.append("technicalReviewStatus", form.technicalReviewStatus);

      formData.append("gasReview", form.gasReview);
      formData.append("gasEmissionReviewStatus", form.gasEmissionReviewStatus);

      formData.append("driverLicense", form.driverLicense);
      formData.append("driverLicenseStatus", form.driverLicenseStatus);

      formData.append("circulationPermit", form.circulationPermit);
      formData.append("circulationPermitStatus", form.circulationPermitStatus);

      formData.append("insurance", form.insurance);
      formData.append("mandatoryInsuranceStatus", form.mandatoryInsuranceStatus);

      formData.append("observations", form.observations);

      formData.append(
        "items",
        JSON.stringify(
          checks.map((item) => ({
            itemName: item.item,
            status: item.status,
            observation: item.observation,
          })),
        ),
      );

      generalPhotos.forEach((photo) => {
        formData.append("photos", photo.file);
      });

      if (
  loggedRole === "SUPERVISOR" ||
  loggedRole === "PREVENCION" ||
  loggedRole === "SUPERADMIN"
) {
  formData.append("inspectorSignature", signatureFile);
} else {
  formData.append("driverSignature", signatureFile);
}

      const response = await fetch(`${API_URL}/vehicle-checklist`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
  const errorText = await response.text();
  console.error("ERROR BACKEND:", response.status, errorText);
  alert(`Error ${response.status}: ${errorText}`);
  return;
}

      await response.json();

      setSuccessModalOpen(true);

    } catch (error) {
      console.error(error);
      alert("Error guardando checklist ❌");
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
    <div className="vehicle-check-page">
      <div className="vehicle-check-header">
        <div>
          <div className="page-chip">
            <ClipboardCheck size={16} />
            CHECK LIST VEHÍCULOS
          </div>

          <h2>Inspección Vehicular</h2>

          <p>
            Revisión operacional de vehículos, documentación, observaciones y
            evidencia fotográfica general del desperfecto.
          </p>
        </div>

        <button
          className="vehicle-history-button"
          onClick={() => navigate("/check-vehiculos/historial")}
          type="button"
        >
          <History size={18} />
          Ver Historial
        </button>
      </div>

      <section className="vehicle-card">
        <div className="card-title">
          <Truck size={22} />
          <h3>Información General</h3>
        </div>

        <div className="vehicle-form-grid">
          <label className="vehicle-autocomplete">
            Patente
            <input
              type="text"
              value={form.patent}
              onChange={(e) =>
                handleInput("patent", e.target.value.toUpperCase())
              }
              onFocus={() => {
                if (vehicleOptions.length > 0) setShowVehicleOptions(true);
              }}
              placeholder="Escriba patente, ej: F"
              autoComplete="off"
            />

            {showVehicleOptions && (
              <div className="vehicle-options">
                {searchingVehicles ? (
                  <div className="vehicle-option muted">Buscando...</div>
                ) : vehicleOptions.length === 0 ? (
                  <div className="vehicle-option muted">
                    No hay vehículos encontrados
                  </div>
                ) : (
                  vehicleOptions.map((vehicle) => (
                    <button
                      type="button"
                      className="vehicle-option"
                      key={vehicle.id}
                      onMouseDown={() => selectVehicle(vehicle)}
                    >
                      <strong>{vehicle.patent}</strong>

                      <span>
                        {vehicle.vehicleModel || "Sin modelo"} ·{" "}
                        {vehicle.vehicleType || "Sin tipo"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </label>

          <label>
            Kilometraje
            <input
              type="number"
              value={form.mileage}
              onChange={(e) => handleInput("mileage", e.target.value)}
              placeholder="Ej: 131441"
            />
          </label>

          <label>
  Padrón
  <input
    type="text"
    value={form.padron}
    onChange={(e) => handleInput("padron", e.target.value)}
    placeholder="Ingrese número de padrón"
  />
</label>

          <label>
            Mantención al día
            <select
              value={form.maintenanceUpToDate}
              onChange={(e) =>
                handleInput("maintenanceUpToDate", e.target.value)
              }
            >
              <option value="">Seleccionar</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </label>
        </div>
      </section>

      <section className="vehicle-card">
        <div className="card-title">
          <CheckCircle2 size={22} />
          <h3>Documentación</h3>
        </div>

        <div className="vehicle-form-grid">
          <label>
            Revisión Técnica
            <div className="document-row">
              <input
                type="date"
                value={form.technicalReview}
                onChange={(e) =>
                  handleInput("technicalReview", e.target.value)
                }
              />

              <select
                value={form.technicalReviewStatus}
                onChange={(e) =>
                  handleInput("technicalReviewStatus", e.target.value)
                }
              >
                <option value="">Estado</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDA">Vencida</option>
                <option value="NO_APLICA">No aplica</option>
              </select>
            </div>
          </label>

          <label>
            Emisión Gases
            <div className="document-row">
              <input
                type="date"
                value={form.gasReview}
                onChange={(e) => handleInput("gasReview", e.target.value)}
              />

              <select
                value={form.gasEmissionReviewStatus}
                onChange={(e) =>
                  handleInput("gasEmissionReviewStatus", e.target.value)
                }
              >
                <option value="">Estado</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDA">Vencida</option>
                <option value="NO_APLICA">No aplica</option>
              </select>
            </div>
          </label>

          <label>
            Licencia Conducir
            <div className="document-row">
              <input
                type="date"
                value={form.driverLicense}
                onChange={(e) =>
                  handleInput("driverLicense", e.target.value)
                }
              />

              <select
                value={form.driverLicenseStatus}
                onChange={(e) =>
                  handleInput("driverLicenseStatus", e.target.value)
                }
              >
                <option value="">Estado</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDA">Vencida</option>
                 <option value="NO_APLICA">No aplica</option>
              </select>
            </div>
          </label>

          <label>
            Permiso Circulación
            <div className="document-row">
              <input
                type="date"
                value={form.circulationPermit}
                onChange={(e) =>
                  handleInput("circulationPermit", e.target.value)
                }
              />

              <select
                value={form.circulationPermitStatus}
                onChange={(e) =>
                  handleInput("circulationPermitStatus", e.target.value)
                }
              >
                <option value="">Estado</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDA">Vencida</option>
                 <option value="NO_APLICA">No aplica</option>
              </select>
            </div>
          </label>

          <label>
            Seguro Obligatorio
            <div className="document-row">
              <input
                type="date"
                value={form.insurance}
                onChange={(e) => handleInput("insurance", e.target.value)}
              />

              <select
                value={form.mandatoryInsuranceStatus}
                onChange={(e) =>
                  handleInput("mandatoryInsuranceStatus", e.target.value)
                }
              >
                <option value="">Estado</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDA">Vencida</option>
                 <option value="NO_APLICA">No aplica</option>
              </select>
            </div>
          </label>
        </div>
      </section>

      <section className="vehicle-card">
        <div className="card-title">
          <AlertTriangle size={22} />
          <h3>Chequeo General</h3>
        </div>

        <div className="vehicle-check-table-card">
          <div className="vehicle-check-table-scroll">
            <table className="vehicle-check-table">
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
                {checks.map((check, index) => (
                  <tr
                    key={check.item}
                    className={check.status === "MALO" ? "check-row-bad" : ""}
                  >
                    <td>{index + 1}</td>

                    <td>{check.item}</td>

                    <td>
                      <input
                        type="radio"
                        name={`vehicle-check-${index}`}
                        checked={check.status === "BUENO"}
                        onChange={() => updateCheck(index, "status", "BUENO")}
                      />
                    </td>

                    <td>
                      <input
                        type="radio"
                        name={`vehicle-check-${index}`}
                        checked={check.status === "MALO"}
                        onChange={() => updateCheck(index, "status", "MALO")}
                      />
                    </td>

                    <td>
                      <input
                        type="radio"
                        name={`vehicle-check-${index}`}
                        checked={check.status === "NO_APLICA"}
                        onChange={() =>
                          updateCheck(index, "status", "NO_APLICA")
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        placeholder="Ingrese observación"
                        value={check.observation}
                        onChange={(e) =>
                          updateCheck(index, "observation", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="vehicle-card">
        <div className="card-title">
          <User size={22} />
          <h3>Observaciones, Fotos y Firmas</h3>
        </div>

        <textarea
          rows="6"
          value={form.observations}
          onChange={(e) => handleInput("observations", e.target.value)}
          placeholder="Ingrese comentarios generales del vehículo o desperfecto detectado..."
        />

        <div className="general-upload-section">

  <input
    ref={cameraInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    multiple
    style={{ display: "none" }}
    onChange={(e) => handleGeneralPhotos(e.target.files)}
  />

  <input
    ref={galleryInputRef}
    type="file"
    accept="image/*"
    multiple
    style={{ display: "none" }}
    onChange={(e) => handleGeneralPhotos(e.target.files)}
  />

  <button
    type="button"
    className="general-photo-upload"
    onClick={() => cameraInputRef.current?.click()}
  >
    📷 Tomar Foto ({generalPhotos.length}/{MAX_GENERAL_PHOTOS})
  </button>

  <button
    type="button"
    className="general-photo-upload"
    onClick={() => galleryInputRef.current?.click()}
  >
    🖼️ Elegir desde Galería
  </button>

</div>

        {generalPhotos.length > 0 && (
          <div className="general-photos-grid">
            {generalPhotos.map((photo, index) => (
              <div className="general-photo-card" key={index}>
                <img src={photo.preview} alt="general" />

                <button
                  type="button"
                  className="remove-photo-button"
                  onClick={() => removeGeneralPhoto(index)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="vehicle-form-grid signature-fields">
  <label className="vehicle-autocomplete">
    {reviewerFieldLabel}

    <input
      type="text"
      value={form.supervisorName}
      onChange={(e) => {
        handleInput("supervisorName", e.target.value);
        setShowSupervisorOptions(true);
      }}
      onFocus={() => setShowSupervisorOptions(true)}
      placeholder={reviewerFieldPlaceholder}
      autoComplete="off"
    />

    {showSupervisorOptions && (
      <div className="vehicle-options">
        {supervisorOptions
          .filter((user) =>
            user.name
              ?.toLowerCase()
              .includes(form.supervisorName.toLowerCase()),
          )
          .slice(0, 10)
          .map((user) => (
            <button
              key={user.id}
              type="button"
              className="vehicle-option"
              onMouseDown={() => {
  handleInput("supervisorName", user.name);
  handleInput("supervisorUserId", user.id);
  setShowSupervisorOptions(false);
}}
            >
              <strong>{user.name}</strong>

              <span>
  {String(user.role || "").toUpperCase() === "SUPERVISOR"
    ? "Supervisor"
    : String(user.role || "").toUpperCase() === "PREVENCION"
    ? "Prevención"
    : String(user.role || "").toUpperCase() === "CONDUCTOR"
    ? "Conductor"
    : String(user.role || "").toUpperCase() === "ADMIN"
    ? "Admin"
    : String(user.role || "").toUpperCase() === "TECNICO"
    ? "Técnico"
    : String(user.role || "").toUpperCase() === "SUPERADMIN"
    ? "Superadmin"
    : "Usuario"}
</span>
            </button>
          ))}
      </div>
    )}
  </label>
</div>

        <div className="signature-separator" />

        <div className={`vehicle-client-signature ${hasSignature ? "signed" : ""}`}>
  <div className="vehicle-client-signature-header">
    <div>
      <div className="vehicle-client-signature-title">
        <PenLine size={22} />
        Firma del Responsable
      </div>

      <h4>
  Firma de {loggedUserName}

  <span>
    {" "}
    ({signatureRoleLabel})
  </span>
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
        onClick={clearSignature}
        disabled={!hasSignature}
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
        <span>Toca aquí para habilitar y que el cliente firme</span>
      </div>
    )}

    <canvas
  ref={canvasRef}
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
    Habilita la firma, pide al cliente que firme dentro del recuadro. Luego
    presiona guardar.
  </p>

  <div className="vehicle-signature-status">
    Estado firma:{" "}
    {hasSignature ? (
      <span className="ok">✅ Firma registrada</span>
    ) : (
      <span className="bad">❌ Falta firma</span>
    )}
  </div>
</div>
      </section>

      <div className="vehicle-form-footer">
        <button
          className="vehicle-save-button footer-save-button"
          onClick={saveChecklist}
          disabled={loading}
          type="button"
        >
          <Save size={18} />
          {loading ? "Guardando..." : "Guardar Check List"}
        </button>
      </div>

      {successModalOpen && (
  <div className="delete-modal-overlay">
    <div className="delete-modal">
      <div className="success-modal-icon">
        <Check size={38} />
      </div>

      <h3>Checklist guardado</h3>

      <p>
        El check list del vehículo fue creado correctamente.
      </p>

      <div className="success-modal-actions">
        <button
  type="button"
  className="success-confirm-button"
  onClick={closeSuccessModal}
>
  <Check size={18} />
  Aceptar
</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default VehicleCheckList;