import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  FileText,
  Loader2,
  Save,
  X,
} from "lucide-react";

import "./IncidentReport.css";

const API_URL = "http://localhost:3000";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getUser() {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("me") ||
      localStorage.getItem("profile");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const initialForm = {
  eventType: "INCIDENTE",
  category: "LABORAL",
  address: "",
  area: "",
  description: "",
  cgedNumber: "",
  supervisor: "",
  preventionUserId: "",
  preventionName: "",
  cgeResponsible: "",
  prodityNumber: "",
  hasPhotographs: "NO",
  notifiedSupervisor: "NO",
  reporterName: "",
  brigadeNumber: "",
  vehiclePatent: "",
  phone: "",
  rut: "",
};

function IncidentReport() {
  const user = useMemo(() => getUser(), []);

  const [form, setForm] = useState({
    ...initialForm,
    reporterName: user?.name || "",
    rut: user?.rut || "",
  });

  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [showVehicleOptions, setShowVehicleOptions] = useState(false);
  const [searchingVehicles, setSearchingVehicles] = useState(false);

  const [supervisorOptions, setSupervisorOptions] = useState([]);
  const [showSupervisorOptions, setShowSupervisorOptions] = useState(false);
  const [searchingSupervisors, setSearchingSupervisors] = useState(false);
  const [preventionUsers, setPreventionUsers] = useState([]);
  const [preventionOptions, setPreventionOptions] = useState([]);
const [showPreventionOptions, setShowPreventionOptions] = useState(false);
const [searchingPrevention, setSearchingPrevention] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = form.vehiclePatent.trim();

    if (query.length < 1) {
      setVehicleOptions([]);
      setShowVehicleOptions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchingVehicles(true);

        const response = await fetch(`${API_URL}/incidents/vehicles`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        const data = await response.json();

        const filtered = (Array.isArray(data) ? data : []).filter((vehicle) =>
          String(vehicle.patent || "")
            .toUpperCase()
            .includes(query.toUpperCase()),
        );

        setVehicleOptions(filtered);
        setShowVehicleOptions(true);
      } catch (err) {
        console.error(err);
        setVehicleOptions([]);
      } finally {
        setSearchingVehicles(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [form.vehiclePatent]);

  useEffect(() => {
    const query = form.supervisor.trim();

    if (query.length < 1) {
      setSupervisorOptions([]);
      setShowSupervisorOptions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchingSupervisors(true);

        const response = await fetch(`${API_URL}/incidents/supervisors`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        const data = await response.json();

        const filtered = (Array.isArray(data) ? data : []).filter((item) =>
          String(item.name || "")
            .toUpperCase()
            .includes(query.toUpperCase()),
        );

        setSupervisorOptions(filtered);
        setShowSupervisorOptions(true);
      } catch (err) {
        console.error(err);
        setSupervisorOptions([]);
      } finally {
        setSearchingSupervisors(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [form.supervisor]);
  useEffect(() => {
  async function loadPreventionUsers() {
    try {
      const response = await fetch(`${API_URL}/incidents/prevention-users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      setPreventionUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPreventionUsers([]);
    }
  }

  loadPreventionUsers();
}, []);

useEffect(() => {
  const query = String(form.preventionName || "").trim();

  if (query.length < 1) {
    setPreventionOptions([]);
    setShowPreventionOptions(false);
    return;
  }

  const filtered = preventionUsers.filter((item) =>
    String(item.name || "")
      .toUpperCase()
      .includes(query.toUpperCase()),
  );

  setPreventionOptions(filtered);
  setShowPreventionOptions(true);
}, [form.preventionName, preventionUsers]);

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function selectVehicle(vehicle) {
    setForm((prev) => ({
      ...prev,
      vehiclePatent: vehicle.patent || "",
    }));

    setShowVehicleOptions(false);
    setVehicleOptions([]);
  }

  function selectSupervisor(supervisor) {
    setForm((prev) => ({
      ...prev,
      supervisor: supervisor.name || "",
    }));

    setShowSupervisorOptions(false);
    setSupervisorOptions([]);
  }

  function selectPreventionUser(preventionUser) {
  setForm((prev) => ({
    ...prev,
    preventionUserId: preventionUser.id,
    preventionName: preventionUser.name || "",
  }));

  setShowPreventionOptions(false);
  setPreventionOptions([]);
}

  function handlePhotos(e) {
    const selected = Array.from(e.target.files || []);
    const total = [...photos, ...selected].slice(0, 5);

    setPhotos(total);
    setPreviews(total.map((file) => URL.createObjectURL(file)));

    setForm((prev) => ({
      ...prev,
      hasPhotographs: total.length > 0 ? "SI" : prev.hasPhotographs,
    }));
  }

  function removePhoto(index) {
    const nextPhotos = photos.filter((_, i) => i !== index);

    setPhotos(nextPhotos);
    setPreviews(nextPhotos.map((file) => URL.createObjectURL(file)));

    if (nextPhotos.length === 0) {
      setForm((prev) => ({
        ...prev,
        hasPhotographs: "NO",
      }));
    }
  }

  function resetForm() {
    setForm({
      ...initialForm,
      reporterName: user?.name || "",
      rut: user?.rut || "",
    });

    setPhotos([]);
    setPreviews([]);
    setVehicleOptions([]);
    setSupervisorOptions([]);
    setShowVehicleOptions(false);
    setShowSupervisorOptions(false);
  }

  function closeSuccessModal() {
    setSuccessModalOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.description.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });

      photos.forEach((photo) => {
        formData.append("photos", photo);
      });

      const response = await fetch(`${API_URL}/incidents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "No se pudo guardar el reporte");
      }

      await response.json();

      resetForm();
      setSuccessModalOpen(true);
    } catch (err) {
      setError(err.message || "Error al guardar el reporte.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="incident-page">
      <div className="incident-header">
        <div>
          <h1>Incidentes / Hallazgos</h1>
          <p>Registra un nuevo reporte operacional o de seguridad.</p>
        </div>

        <div className="incident-header-icon">
          <AlertTriangle size={38} />
        </div>
      </div>

      {error && <div className="incident-alert error">{error}</div>}

      <form className="incident-form" onSubmit={handleSubmit}>
        <section className="incident-card">
          <div className="incident-card-title">
            <FileText size={20} />
            <h2>Datos del suceso</h2>
          </div>

          <div className="incident-grid">
            <label>
              Suceso
              <select
                value={form.eventType}
                onChange={(e) => updateField("eventType", e.target.value)}
              >
                <option value="INCIDENTE">Incidente</option>
                <option value="HALLAZGO">Hallazgo</option>
              </select>
            </label>

            <label>
              Tipo
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="LABORAL">Laboral</option>
                <option value="INDUSTRIAL">Industrial</option>
              </select>
            </label>

            <label>
              Dirección
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </label>

            <label>
              Área / Zona
              <input
                value={form.area}
                onChange={(e) => updateField("area", e.target.value)}
              />
            </label>

            <label className="vehicle-autocomplete">
              Patente vehículo
              <input
                type="text"
                value={form.vehiclePatent}
                onChange={(e) =>
                  updateField("vehiclePatent", e.target.value.toUpperCase())
                }
                onFocus={() => {
                  if (vehicleOptions.length > 0) {
                    setShowVehicleOptions(true);
                  }
                }}
                placeholder="Escriba patente..."
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
                        key={vehicle.id}
                        type="button"
                        className="vehicle-option"
                        onMouseDown={() => selectVehicle(vehicle)}
                      >
                        <strong>{vehicle.patent}</strong>
                        <span>{vehicle.vehicleModel || "Sin modelo"}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </label>
          </div>

          <label className="full-label">
            Descripción
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe claramente lo ocurrido o el hallazgo encontrado..."
              rows={8}
            />
          </label>
        </section>

        <section className="incident-card">
          <div className="incident-card-title">
            <FileText size={20} />
            <h2>Información CGE / Supervisión</h2>
          </div>

          <div className="incident-grid">
            <label>
              N° CGED
              <input
                value={form.cgedNumber}
                onChange={(e) => updateField("cgedNumber", e.target.value)}
              />
            </label>

            <label className="vehicle-autocomplete">
              Supervisor
              <input
                type="text"
                value={form.supervisor}
                onChange={(e) => updateField("supervisor", e.target.value)}
                onFocus={() => {
                  if (supervisorOptions.length > 0) {
                    setShowSupervisorOptions(true);
                  }
                }}
                placeholder="Buscar supervisor..."
                autoComplete="off"
              />

              {showSupervisorOptions && (
                <div className="vehicle-options">
                  {searchingSupervisors ? (
                    <div className="vehicle-option muted">Buscando...</div>
                  ) : supervisorOptions.length === 0 ? (
                    <div className="vehicle-option muted">
                      No hay supervisores encontrados
                    </div>
                  ) : (
                    supervisorOptions.map((supervisor) => (
                      <button
                        key={supervisor.id}
                        type="button"
                        className="vehicle-option"
                        onMouseDown={() => selectSupervisor(supervisor)}
                      >
                        <strong>{supervisor.name}</strong>
                        <span>{supervisor.role}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </label>
            <label className="vehicle-autocomplete">
  Prevencionista

  <input
    type="text"
    value={form.preventionName}
    onChange={(e) => {
      updateField("preventionName", e.target.value);
      updateField("preventionUserId", "");
    }}
    onFocus={() => {
      if (preventionOptions.length > 0) {
        setShowPreventionOptions(true);
      }
    }}
    placeholder="Buscar prevencionista..."
    autoComplete="off"
  />

  {showPreventionOptions && (
    <div className="vehicle-options">
      {searchingPrevention ? (
        <div className="vehicle-option muted">Buscando...</div>
      ) : preventionOptions.length === 0 ? (
        <div className="vehicle-option muted">
          No hay prevencionistas encontrados
        </div>
      ) : (
        preventionOptions.map((preventionUser) => (
          <button
            key={preventionUser.id}
            type="button"
            className="vehicle-option"
            onMouseDown={() => selectPreventionUser(preventionUser)}
          >
            <strong>{preventionUser.name}</strong>
            <span>{preventionUser.role}</span>
          </button>
        ))
      )}
    </div>
  )}
</label>

            <label>
              Responsable CGE
              <input
                value={form.cgeResponsible}
                onChange={(e) => updateField("cgeResponsible", e.target.value)}
              />
            </label>

            <label>
              N° Prodity
              <input
                value={form.prodityNumber}
                onChange={(e) => updateField("prodityNumber", e.target.value)}
              />
            </label>

            <label>
              ¿Fotografía?
              <select
                value={form.hasPhotographs}
                onChange={(e) => updateField("hasPhotographs", e.target.value)}
              >
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </label>

            <label>
              ¿Se dio aviso al Supervisor CGE?
              <select
                value={form.notifiedSupervisor}
                onChange={(e) =>
                  updateField("notifiedSupervisor", e.target.value)
                }
              >
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </label>
          </div>
        </section>

        <section className="incident-card">
          <div className="incident-card-title">
            <FileText size={20} />
            <h2>Datos de quien reporta</h2>
          </div>

          <div className="incident-grid">
            <label>
              Teléfono
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </label>

            <label>
              N° Brigada
              <input
                value={form.brigadeNumber}
                onChange={(e) => updateField("brigadeNumber", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="incident-card">
          <div className="incident-card-title">
            <Camera size={20} />
            <h2>Fotografías</h2>
          </div>

          <div className="incident-upload">
  <input
    id="incident-camera"
    type="file"
    accept="image/*"
    capture="environment"
    multiple
    onChange={handlePhotos}
  />

  <input
    id="incident-gallery"
    type="file"
    accept="image/*"
    multiple
    onChange={handlePhotos}
  />

  <div className="incident-photo-buttons">
    <label htmlFor="incident-camera">
      📷 Tomar Foto ({photos.length}/5)
    </label>

    <label htmlFor="incident-gallery">
      🖼️ Elegir desde Galería
    </label>
  </div>

  <span>{photos.length}/5 imágenes seleccionadas</span>
</div>

          {previews.length > 0 && (
            <div className="incident-preview-grid">
              {previews.map((src, index) => (
                <div className="incident-preview" key={src}>
                  <img src={src} alt={`Foto ${index + 1}`} />

                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    title="Quitar fotografía"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="incident-actions">
          <button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="spin" size={20} />
            ) : (
              <Save size={20} />
            )}

            {saving ? "Guardando..." : "Guardar Reporte"}
          </button>
        </div>
      </form>

      {successModalOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="success-modal-icon">
              <Check size={38} />
            </div>

            <h3>Incidente registrado</h3>

            <p>El incidente fue creado correctamente y enviado a revisión.</p>

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

export default IncidentReport;