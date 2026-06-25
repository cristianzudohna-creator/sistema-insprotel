import "./MainLayout.css";
import logo from "../assets/logo-insprotel.png";

import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  ShieldCheck,
  Car,
  Wrench,
  Users,
  FileText,
  LogOut,
  Bell,
  UserCircle2,
  Menu,
  X,
  UserCog,
  Shield,
  ClipboardCheck,
  HardHat,
  PenLine,
  Home,
} from "lucide-react";

import { getUser, logout } from "../auth/auth";
import { registerPushNotifications } from "../firebase";

function MainLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    registerPushNotifications().catch(console.error);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const user = getUser();
  const role = String(user?.role || "").toUpperCase();

  const isSuperadmin = role === "SUPERADMIN";

  const canUseToolsDriver =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION" ||
  role === "CONDUCTOR";

const canSeeAllToolsDriver =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION";

  const canSeeAllVehicleChecks =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION";

const canSeeAllHarnessChecks =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION";

  const canUseVehicleCheck =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION" ||
  role === "CONDUCTOR" ||
  role === "TECNICO";

  const canCreateSafetyTalks =
    role === "SUPERADMIN" ||
    role === "TECNICO" ||
    role === "CONDUCTOR" ||
    role === "SUPERVISOR" ||
    role === "PREVENCION";

  const canSignSafetyTalks = canCreateSafetyTalks;

  const canReviewSafetyTalks =
    role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";

  const canCreateHarnessCheck =
    role === "SUPERADMIN" || role === "SUPERVISOR" || role === "PREVENCION";

  const canSignHarnessCheck =
    role === "SUPERADMIN" ||
    role === "SUPERVISOR" ||
    role === "PREVENCION" ||
    role === "TECNICO";

  const canReviewHarnessFinished = canSignHarnessCheck;
  const canUseToolsEpp =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION" ||
  role === "TECNICO";

const canSeeAllToolsEpp =
  role === "SUPERADMIN" ||
  role === "SUPERVISOR" ||
  role === "PREVENCION";

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    closeMenu();
    logout();
  }

  return (
    <div className="layout">
      <button
        className="mobile-menu-button"
        onClick={() => setMenuOpen(!menuOpen)}
        type="button"
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {menuOpen && <div className="mobile-overlay" onClick={closeMenu} />}

      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="logo-container">
          <img src={logo} alt="Insprotel" className="logo-image" />
        </div>

        <div className="menu-title">MENÚ PRINCIPAL</div>

        <nav className="menu">
  <NavLink
    to="/inicio"
    onClick={closeMenu}
    className={({ isActive }) =>
      isActive ? "menu-item active-link" : "menu-item"
    }
  >
    <Home size={20} />
    <span>Inicio</span>
  </NavLink>

  {isSuperadmin && (
    <NavLink
      to="/dashboard"
      onClick={closeMenu}
      className={({ isActive }) =>
        isActive ? "menu-item active-link" : "menu-item"
      }
    >
      <LayoutDashboard size={20} />
      <span>Dashboard</span>
    </NavLink>
  )}

  {(canCreateSafetyTalks || canSignSafetyTalks || canReviewSafetyTalks) && (
    <details className="menu-group">
      <summary className="menu-group-title">
        <ShieldCheck size={20} />
        <span>Check List Charlas de Seguridad</span>
      </summary>

      {canCreateSafetyTalks && (
        <NavLink to="/charlas" onClick={closeMenu} className="menu-subitem">
          Crear Charla
        </NavLink>
      )}

      {canSignSafetyTalks && (
        <NavLink
          to="/charlas/pendientes"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Pendientes de Firma
        </NavLink>
      )}

      {canReviewSafetyTalks && (
        <NavLink
          to="/charlas/historial-todos"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Charlas Terminadas
        </NavLink>
      )}
    </details>
  )}

  {(canUseVehicleCheck || canSeeAllVehicleChecks) && (
    <details className="menu-group">
      <summary className="menu-group-title">
        <Car size={20} />
        <span>Check List Vehículos</span>
      </summary>

      {canUseVehicleCheck && (
        <>
          <NavLink
            to="/check-vehiculos"
            onClick={closeMenu}
            className="menu-subitem"
          >
            Crear Check List
          </NavLink>

          <NavLink
            to="/check-vehiculos/pendientes-firma"
            onClick={closeMenu}
            className="menu-subitem"
          >
            Firmas Pendientes
          </NavLink>

          <NavLink
            to="/check-vehiculos/historial"
            onClick={closeMenu}
            className="menu-subitem"
          >
            Mis Check List
          </NavLink>
        </>
      )}

      {canSeeAllVehicleChecks && (
        <NavLink
          to="/check-vehiculos/historial-todos"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Check List Terminados
        </NavLink>
      )}
    </details>
  )}

  {(canCreateHarnessCheck ||
    canSignHarnessCheck ||
    canReviewHarnessFinished ||
    canSeeAllHarnessChecks) && (
    <details className="menu-group">
      <summary className="menu-group-title">
        <Shield size={20} />
        <span>Check List Arnés</span>
      </summary>

      {canCreateHarnessCheck && (
        <NavLink to="/arnes" onClick={closeMenu} className="menu-subitem">
          Crear Check List
        </NavLink>
      )}

      {canSignHarnessCheck && (
        <NavLink
          to="/arnes/pendientes-firma"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Firmas Pendientes
        </NavLink>
      )}

      {canReviewHarnessFinished && (
        <NavLink
          to="/arnes/historial"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Mis Check List
        </NavLink>
      )}

      {canSeeAllHarnessChecks && (
        <NavLink
          to="/arnes/historial-todos"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Check List Terminados
        </NavLink>
      )}
    </details>
  )}

  {(canUseToolsEpp || canSeeAllToolsEpp) && (
    <details className="menu-group">
      <summary className="menu-group-title">
        <Wrench size={20} />
        <span>Autoinspección Técnico</span>
      </summary>

      {canUseToolsEpp && (
        <>
          <NavLink
            to="/check-herramientas"
            onClick={closeMenu}
            className="menu-subitem"
          >
            Crear Autoinspección
          </NavLink>

          <NavLink
            to="/check-herramientas/historial"
            onClick={closeMenu}
            className="menu-subitem"
          >
            Mis Autoinspecciones
          </NavLink>
        </>
      )}

      {canSeeAllToolsEpp && (
        <NavLink
          to="/check-herramientas/historial-todos"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Autoinspecciones Terminadas
        </NavLink>
      )}
    </details>
  )}

  {(canUseToolsDriver || canSeeAllToolsDriver) && (
  <details className="menu-group">
    <summary className="menu-group-title">
      <HardHat size={20} />
      <span>Autoinspección Conductor</span>
    </summary>

    {canUseToolsDriver && (
      <>
        <NavLink
          to="/check-conductor"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Crear Autoinspección
        </NavLink>

        <NavLink
          to="/check-conductor/historial"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Mis Autoinspecciones
        </NavLink>
      </>
    )}

    {canSeeAllToolsDriver && (
      <NavLink
        to="/check-conductor/historial-todos"
        onClick={closeMenu}
        className="menu-subitem"
      >
        Autoinspecciones Terminadas
      </NavLink>
    )}
  </details>
)}

  {isSuperadmin && (
    <>
      

      <details className="menu-group">
        <summary className="menu-group-title">
          <ClipboardCheck size={20} />
          <span>Check List Escaleras Tijera</span>
        </summary>

        <NavLink
          to="/escaleras-tijera"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Crear Check List
        </NavLink>

        <NavLink
          to="/escaleras-tijera/historial-todos"
          onClick={closeMenu}
          className="menu-subitem"
        >
          Historial
        </NavLink>
      </details>

      <NavLink
        to="/usuarios"
        onClick={closeMenu}
        className={({ isActive }) =>
          isActive ? "menu-item active-link" : "menu-item"
        }
      >
        <UserCog size={20} />
        <span>Usuarios</span>
      </NavLink>
    </>
  )}

  <button className="logout-button" onClick={handleLogout} type="button">
    <LogOut size={18} />
    <span>Cerrar Sesión</span>
  </button>
</nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <h1 className="page-title">Sistema Insprotel</h1>

            <p className="page-subtitle">
              Plataforma de gestión y seguridad operacional
            </p>
          </div>

          <div className="topbar-right">
            <button className="notification-button" type="button">
              <Bell size={20} />
            </button>

            <div className="user-box">
              <UserCircle2 size={34} />

              <div>
                <strong>{user?.name || "Usuario"}</strong>
                <span>{user?.role || "SIN_ROL"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;