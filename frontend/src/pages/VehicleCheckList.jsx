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
} from "lucide-react";

import "./VehicleCheckList.css";

const API_URL = "http://localhost:3000";
const MAX_GENERAL_PHOTOS = 10;

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function generateVisualFolio() {
  const year = new Date().getFullYear();
  const value = Date.now().toString().slice(-4);
  return `CL-${year}-${value}`;
}

function getLoggedUserName() {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("me") ||
      localStorage.getItem("profile");

    if (!raw) return "Usuario logueado";

    const user = JSON.parse(raw);

    return (
      user.name ||
      user.fullName ||
      user.nombre ||
      user.displayName ||
      "Usuario logueado"
    );
  } catch {
    return "Usuario logueado";
  }
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
  driverName: "",
  supervisorName: "",
  status: "PENDIENTE",
  technicalReview: "",
  gasReview: "",
  driverLicense: "",
  circulationPermit: "",
  insurance: "",
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

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

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

  const goodChecksCount = useMemo(() => {
    return checks.filter((item) => item.status === "BUENO").length;
  }, [checks]);

  const badChecksCount = useMemo(() => {
    return checks.filter((item) => item.status === "MALO").length;
  }, [checks]);

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
        "firma-conductor.png",
      );

      formData.append("checklistNumber", form.checklistNumber);
      formData.append("date", form.date || todayInputDate());
      formData.append("patent", form.patent);
      formData.append("mileage", String(Number(form.mileage || 0)));
      formData.append("maintenanceUpToDate", form.maintenanceUpToDate);
      formData.append("vehicleType", form.vehicleType);
      formData.append("vehicleModel", form.vehicleModel);

      formData.append("driverName", form.driverName || loggedUserName);
      formData.append("supervisorName", form.supervisorName);
      formData.append("status", automaticStatus);

      formData.append("technicalReview", form.technicalReview);
      formData.append("gasReview", form.gasReview);
      formData.append("driverLicense", form.driverLicense);
      formData.append("circulationPermit", form.circulationPermit);
      formData.append("insurance", form.insurance);
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

      formData.append("driverSignature", signatureFile);

      const response = await fetch(`${API_URL}/vehicle-checklist`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error guardando checklist");
      }

      await response.json();

      alert("Checklist guardado correctamente ✅");
      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("Error guardando checklist ❌");
    } finally {
      setLoading(false);
    }
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
            <input
              type="date"
              value={form.technicalReview}
              onChange={(e) => handleInput("technicalReview", e.target.value)}
            />
          </label>

          <label>
            Emisión Gases
            <input
              type="date"
              value={form.gasReview}
              onChange={(e) => handleInput("gasReview", e.target.value)}
            />
          </label>

          <label>
            Licencia Conducir
            <input
              type="date"
              value={form.driverLicense}
              onChange={(e) => handleInput("driverLicense", e.target.value)}
            />
          </label>

          <label>
            Permiso Circulación
            <input
              type="date"
              value={form.circulationPermit}
              onChange={(e) => handleInput("circulationPermit", e.target.value)}
            />
          </label>

          <label>
            Seguro Obligatorio
            <input
              type="date"
              value={form.insurance}
              onChange={(e) => handleInput("insurance", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="vehicle-card">
        <div className="card-title">
          <AlertTriangle size={22} />
          <h3>Chequeo General</h3>
        </div>

        <div className="check-table-header check-table-header-no-photo">
          <span>Elemento</span>
          <span>Estado</span>
          <span>Observación</span>
        </div>

        <div className="check-table">
          {checks.map((check, index) => (
            <div
              className={`check-row check-row-no-photo ${
                check.status === "MALO" ? "check-row-bad" : ""
              }`}
              key={check.item}
            >
              <div className="check-name">
                <div className="check-number">{index + 1}</div>
                <span>{check.item}</span>
              </div>

              <select
                value={check.status}
                onChange={(e) => updateCheck(index, "status", e.target.value)}
                className={
                  check.status === "BUENO"
                    ? "status-good"
                    : check.status === "MALO"
                    ? "status-bad"
                    : ""
                }
              >
                <option value="">Seleccionar</option>
                <option value="BUENO">Bueno</option>
                <option value="MALO">Malo</option>
                <option value="NO_APLICA">No aplica</option>
              </select>

              <input
                type="text"
                placeholder="Ingrese observación"
                value={check.observation}
                onChange={(e) =>
                  updateCheck(index, "observation", e.target.value)
                }
              />
            </div>
          ))}
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
          <label className="general-photo-upload">
            <ImageIcon size={18} />
            Subir Fotos del Desperfecto ({generalPhotos.length}/
            {MAX_GENERAL_PHOTOS})
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleGeneralPhotos(e.target.files)}
            />
          </label>
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
          <label>
            Nombre Supervisor
            <input
              type="text"
              value={form.supervisorName}
              onChange={(e) => handleInput("supervisorName", e.target.value)}
              placeholder="Ingrese nombre del supervisor"
            />
          </label>
        </div>

        <div className="signature-section">
          <div className="signature-title">
            <PenLine size={18} />
            Firma del Conductor
          </div>

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

            {hasSignature && (
              <div className="signature-status">Firma registrada ✅</div>
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
    </div>
  );
}

export default VehicleCheckList;