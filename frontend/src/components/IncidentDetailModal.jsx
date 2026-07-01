import { useState } from "react";
import { Camera, CheckCircle2, FileText, User, X } from "lucide-react";

import "./IncidentDetailModal.css";

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "/api";

function text(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL");
}

function formatStatus(status) {
  return status === "REVISADO" ? "REVISADO POR PREVENCIÓN" : "PENDIENTE REVISIÓN";
}

function InfoItem({ label, value }) {
  return (
    <div className="incident-detail-item">
      <span>{label}</span>
      <strong>{text(value)}</strong>
    </div>
  );
}

function IncidentDetailModal({ report, onClose }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!report) return null;

  return (
    <div className="incident-detail-overlay">
      <div className="incident-detail-modal">
        <div className="incident-detail-header">
          <div>
            <h2>Detalle Incidente / Hallazgo</h2>
            <p>{report.folio || `Reporte #${report.id}`}</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="incident-detail-body">
          <section>
            <div className="incident-detail-section-title">
              <FileText size={18} />
              Datos del suceso
            </div>

            <div className="incident-detail-grid">
              <InfoItem label="Suceso" value={report.eventType} />
              <InfoItem label="Tipo" value={report.category} />
              <InfoItem label="Dirección" value={report.address} />
              <InfoItem label="Área / Zona" value={report.area} />
              <InfoItem label="Patente" value={report.vehiclePatent} />
              <InfoItem label="Empresa" value={report.company} />
            </div>

            <div className="incident-detail-description">
              <span>Descripción</span>
              <p>{text(report.description)}</p>
            </div>
          </section>

          <section>
            <div className="incident-detail-section-title">
              <FileText size={18} />
              Información CGE / Supervisión
            </div>

            <div className="incident-detail-grid">
              <InfoItem label="N° CGED" value={report.cgedNumber} />
              <InfoItem label="Supervisor" value={report.supervisor} />
              <InfoItem label="Responsable CGE" value={report.cgeResponsible} />
              <InfoItem label="N° Prodity" value={report.prodityNumber} />
              <InfoItem label="¿Fotografía?" value={report.hasPhotographs ? "Sí" : "No"} />
              <InfoItem
                label="Avisó Supervisor CGE"
                value={report.notifiedSupervisor ? "Sí" : "No"}
              />
            </div>
          </section>

          <section>
            <div className="incident-detail-section-title">
              <User size={18} />
              Datos de quien reporta
            </div>

            <div className="incident-detail-grid">
              <InfoItem label="Teléfono" value={report.phone} />
              <InfoItem label="N° Brigada" value={report.brigadeNumber} />
              <InfoItem label="Fecha reporte" value={formatDate(report.createdAt)} />
              <InfoItem label="Usuario creador" value={report.user?.name || report.reporterName} />
            </div>
          </section>

          <section>
            <div className="incident-detail-section-title">
              <CheckCircle2 size={18} />
              Revisión Prevención
            </div>

            <div className="incident-detail-grid">
              <InfoItem label="Estado revisión" value={formatStatus(report.status)} />
              <InfoItem label="Revisado por" value={report.reviewedBy?.name} />
              <InfoItem label="Fecha revisión" value={formatDate(report.reviewedAt)} />
            </div>
          </section>

          <section>
            <div className="incident-detail-section-title">
              <Camera size={18} />
              Fotografías
            </div>

            {report.photos?.length ? (
              <div className="incident-detail-photo-grid">
                {report.photos.map((photo) => (
                  <button
                    type="button"
                    key={photo.id}
                    className="incident-detail-photo"
                    onClick={() => setSelectedPhoto(photo.imageUrl)}
                  >
                    <img src={`${API_URL}${photo.imageUrl}`} alt="Evidencia" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="incident-detail-no-photos">
                Sin fotografías adjuntas.
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="incident-photo-viewer"
          onClick={() => setSelectedPhoto(null)}
        >
          <button type="button" onClick={() => setSelectedPhoto(null)}>
            <X size={26} />
          </button>

          <img src={`${API_URL}${selectedPhoto}`} alt="Evidencia ampliada" />
        </div>
      )}
    </div>
  );
}

export default IncidentDetailModal;