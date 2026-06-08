import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ClipboardList,
  Save,
  History,
  AlertTriangle,
  Check,
  PenLine,
  RotateCcw,
  Image as ImageIcon,
  X,
} from "lucide-react";

import "./LadderCheck.css";

const API_URL = "http://localhost:3000";
const MAX_LADDER_PHOTOS = 2;

const GENERAL_ITEMS = [
  "Peldaños NO torcidos, antideslizante en buen estado.",
  "Conjunto peldaño-largueros en buen estado.",
  "Largueros en buen estado.",
  "Conjunto zapatas antideslizantes en buen estado.",
  "Abrazaderas o dispositivos de sustentación en buen estado.",
  "Taparieles plásticos en buen estado.",
  "Aseo / contaminación.",
  "Rotulación / certificación fabricante indica peso máximo.",
  "Identificación interna legible, logo de Insprotel.",
];

const TELESCOPIC_ITEMS = [
  "Cuerdas, cable o grapa aseguradora en buen estado.",
  "Sistema de polea en buen estado.",
  "Guías externas en buen estado.",
  "Trabapeldaño con uñeta de seguridad en buen estado.",
  "Peldaño en V en buen estado.",
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
  return [
    ...GENERAL_ITEMS.map((description) => ({
      section: "CHEQUEO GENERAL",
      description,
      status: "",
      observation: "",
    })),
    ...TELESCOPIC_ITEMS.map((description) => ({
      section: "CHEQUEO ESCALERA TELESCÓPICA",
      description,
      status: "",
      observation: "",
    })),
  ];
}

function LadderCheck() {
  const navigate = useNavigate();

  const technicianCanvasRef = useRef(null);
  const inspectorCanvasRef = useRef(null);
  const drawingRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [hasTechnicianSignature, setHasTechnicianSignature] = useState(false);
  const [hasInspectorSignature, setHasInspectorSignature] = useState(false);

  const [ladderPhotos, setLadderPhotos] = useState([]);

  const [form, setForm] = useState({
    contract: "",
    technicianName: "",
    mobile: "",
    inspectorName: "",
    zone: "",
    status: "PENDIENTE",
    generalObservation: "",
  });

  const [items, setItems] = useState(buildInitialItems());

  const generalItems = items.filter(
    (item) => item.section === "CHEQUEO GENERAL",
  );

  const telescopicItems = items.filter(
    (item) => item.section === "CHEQUEO ESCALERA TELESCÓPICA",
  );

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateItem(globalIndex, field, value) {
    setItems((prev) =>
      prev.map((item, index) =>
        index === globalIndex
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function getGlobalIndex(section, localIndex) {
    return items.findIndex((item, index) => {
      const sectionItems = items
        .map((currentItem, currentIndex) => ({
          ...currentItem,
          globalIndex: currentIndex,
        }))
        .filter((currentItem) => currentItem.section === section);

      return sectionItems[localIndex]?.globalIndex === index;
    });
  }

  function handleLadderPhotos(files) {
    if (!files?.length) return;

    const currentCount = ladderPhotos.length;
    const availableSlots = MAX_LADDER_PHOTOS - currentCount;

    if (availableSlots <= 0) {
      alert(`Solo puedes subir hasta ${MAX_LADDER_PHOTOS} fotos.`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, availableSlots);

    const formatted = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setLadderPhotos((prev) => [...prev, ...formatted]);

    if (files.length > availableSlots) {
      alert(
        `Solo se agregaron ${availableSlots} foto(s). Máximo ${MAX_LADDER_PHOTOS}.`,
      );
    }
  }

  function removeLadderPhoto(index) {
    const photo = ladderPhotos[index];

    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }

    const updated = [...ladderPhotos];
    updated.splice(index, 1);

    setLadderPhotos(updated);
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
        : inspectorCanvasRef.current;

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
        : inspectorCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event, canvas);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    if (type === "technician") setHasTechnicianSignature(true);
    if (type === "inspector") setHasInspectorSignature(true);
  }

  function stopSignature() {
    drawingRef.current = null;
  }

  function clearSignature(type) {
    const canvas =
      type === "technician"
        ? technicianCanvasRef.current
        : inspectorCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (type === "technician") setHasTechnicianSignature(false);
    if (type === "inspector") setHasInspectorSignature(false);
  }

  function resetForm() {
    ladderPhotos.forEach((photo) => {
      if (photo.preview) URL.revokeObjectURL(photo.preview);
    });

    setForm({
      contract: "",
      technicianName: "",
      mobile: "",
      inspectorName: "",
      zone: "",
      status: "PENDIENTE",
      generalObservation: "",
    });

    setItems(buildInitialItems());
    setLadderPhotos([]);

    clearSignature("technician");
    clearSignature("inspector");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (!form.technicianName.trim()) {
        alert("Debes ingresar el nombre del técnico.");
        return;
      }

      if (!form.inspectorName.trim()) {
        alert("Debes ingresar el nombre del inspector.");
        return;
      }

      if (!hasTechnicianSignature) {
        alert("Debes registrar la firma del técnico.");
        return;
      }

      if (!hasInspectorSignature) {
        alert("Debes registrar la firma del inspector.");
        return;
      }

      setLoading(true);

      const technicianFile = dataUrlToFile(
        technicianCanvasRef.current.toDataURL("image/png"),
        "firma-tecnico.png",
      );

      const inspectorFile = dataUrlToFile(
        inspectorCanvasRef.current.toDataURL("image/png"),
        "firma-inspector.png",
      );

      const formData = new FormData();

      formData.append("contract", form.contract);
      formData.append("technicianName", form.technicianName);
      formData.append("mobile", form.mobile);
      formData.append("inspectorName", form.inspectorName);
      formData.append("zone", form.zone);
      formData.append("status", form.status);
      formData.append("generalObservation", form.generalObservation);

      formData.append(
        "items",
        JSON.stringify(
          items.map((item) => ({
            section: item.section,
            description: item.description,
            status: item.status,
            observation: item.observation,
          })),
        ),
      );

      ladderPhotos.forEach((photo) => {
        formData.append("photos", photo.file);
      });

      formData.append("technicianSignature", technicianFile);
      formData.append("inspectorSignature", inspectorFile);

      const response = await fetch(`${API_URL}/ladder-check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error guardando checklist");
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

  function renderInspectionTable(title, sectionItems, section) {
    return (
      <div className="ladder-check-table-card">
        <div className="ladder-check-table-title">
          <ClipboardList size={18} />
          <h3>{title}</h3>
        </div>

        <div className="ladder-check-table-scroll">
          <table className="ladder-check-table">
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
              {sectionItems.map((item, index) => {
                const globalIndex = getGlobalIndex(section, index);

                return (
                  <tr key={`${section}-${index}`}>
                    <td>{index + 1}</td>

                    <td>{item.description}</td>

                    <td>
                      <input
                        type="radio"
                        name={`status-${section}-${index}`}
                        checked={item.status === "BUENO"}
                        onChange={() =>
                          updateItem(globalIndex, "status", "BUENO")
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="radio"
                        name={`status-${section}-${index}`}
                        checked={item.status === "MALO"}
                        onChange={() =>
                          updateItem(globalIndex, "status", "MALO")
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="radio"
                        name={`status-${section}-${index}`}
                        checked={item.status === "NO_APLICA"}
                        onChange={() =>
                          updateItem(globalIndex, "status", "NO_APLICA")
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        placeholder="Ingrese observación"
                        value={item.observation}
                        onChange={(e) =>
                          updateItem(
                            globalIndex,
                            "observation",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="ladder-page">
      <div className="ladder-header">
        <div>
          <h1>Check List Escalas</h1>
          <p>Inspección de escalas telescópicas y seguridad.</p>
        </div>

        <button
          className="ladder-history-btn"
          type="button"
          onClick={() => navigate("/escalas/historial")}
        >
          <History size={18} />
          Ver Historial
        </button>
      </div>

      <form className="ladder-form" onSubmit={handleSubmit}>
        <div className="ladder-card">
          <div className="ladder-card-title">
            <ClipboardList size={20} />
            Información General
          </div>

          <div className="ladder-grid">
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
              <label>Inspector</label>
              <input
                type="text"
                value={form.inspectorName}
                onChange={(e) => updateField("inspectorName", e.target.value)}
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

        <div className="ladder-card">
          <div className="ladder-card-title">
            <AlertTriangle size={20} />
            Inspección de Escala
          </div>

          <div className="ladder-inspection-split">
            {renderInspectionTable(
              "Chequeo General",
              generalItems,
              "CHEQUEO GENERAL",
            )}

            {renderInspectionTable(
              "Chequeo Escaleras Telescópica",
              telescopicItems,
              "CHEQUEO ESCALERA TELESCÓPICA",
            )}
          </div>
        </div>

        <div className="ladder-card">
          <div className="ladder-card-title">
            <ImageIcon size={20} />
            Fotos de la Escala
          </div>

          <div className="ladder-photo-upload-section">
            <label className="ladder-photo-upload">
              <ImageIcon size={18} />
              Subir fotos de la escala ({ladderPhotos.length}/
              {MAX_LADDER_PHOTOS})
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleLadderPhotos(e.target.files)}
              />
            </label>
          </div>

          {ladderPhotos.length > 0 && (
            <div className="ladder-photos-grid">
              {ladderPhotos.map((photo, index) => (
                <div className="ladder-photo-card" key={index}>
                  <img src={photo.preview} alt="escala" />

                  <button
                    type="button"
                    className="ladder-remove-photo-button"
                    onClick={() => removeLadderPhoto(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ladder-card">
          <div className="ladder-card-title">
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

        <div className="ladder-card">
          <div className="ladder-card-title">
            <PenLine size={20} />
            Firmas
          </div>

          <div className="ladder-signature-grid">
            <div className="ladder-signature-box">
              <h3>Firma Técnico</h3>

              <canvas
                ref={technicianCanvasRef}
                className="ladder-signature-canvas"
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

            <div className="ladder-signature-box">
              <h3>Firma Inspector</h3>

              <canvas
                ref={inspectorCanvasRef}
                className="ladder-signature-canvas"
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

        <button type="submit" className="ladder-submit-btn" disabled={loading}>
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
            <p>El check list de escala fue registrado exitosamente.</p>

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

export default LadderCheck;