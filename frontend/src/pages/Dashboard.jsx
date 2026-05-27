import {
  ShieldCheck,
  Car,
  Wrench,
  Users,
  FileText,
  PlusCircle,
} from "lucide-react";

import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen general de registros y documentos de seguridad.</p>
        </div>

        <button className="primary-button">
          <PlusCircle size={18} />
          Nuevo Registro
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <ShieldCheck />
          <div>
            <span>Charlas</span>
            <strong>0</strong>
          </div>
        </div>

        <div className="stat-card">
          <Car />
          <div>
            <span>Check Vehículos</span>
            <strong>0</strong>
          </div>
        </div>

        <div className="stat-card">
          <Wrench />
          <div>
            <span>Herramientas y EPP</span>
            <strong>0</strong>
          </div>
        </div>

        <div className="stat-card">
          <Users />
          <div>
            <span>Reuniones</span>
            <strong>0</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Accesos Rápidos</h3>
          </div>

          <div className="quick-actions">
            <button>
              <ShieldCheck size={20} />
              Nueva Charla de Seguridad
            </button>

            <button>
              <Car size={20} />
              Nuevo Check Vehículo
            </button>

            <button>
              <Wrench size={20} />
              Nuevo Check Herramientas
            </button>

            <button>
              <Users size={20} />
              Nueva Reunión
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Registros Recientes</h3>
            <FileText size={20} />
          </div>

          <div className="empty-state">
            <p>No hay registros recientes.</p>
            <span>Cuando se creen registros aparecerán aquí.</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;