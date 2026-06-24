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

          {canCreateSafetyTalks && (
            <NavLink
              to="/charlas"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "menu-item active-link" : "menu-item"
              }
            >
              <ShieldCheck size={20} />
              <span>Charlas Seguridad</span>
            </NavLink>
          )}

          {canSignSafetyTalks && (
            <NavLink
              to="/charlas/pendientes"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "menu-item active-link" : "menu-item"
              }
            >
              <PenLine size={20} />
              <span>Charlas Pendientes de Firma</span>
            </NavLink>
          )}

          {canReviewSafetyTalks && (
            <NavLink
              to="/charlas/historial-todos"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "menu-item active-link" : "menu-item"
              }
            >
              <FileText size={20} />
              <span>Charlas Terminadas</span>
            </NavLink>
          )}

          {canUseVehicleCheck && (
            <>
              <NavLink
                to="/check-vehiculos"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <Car size={20} />
                <span>Check List Vehículos</span>
              </NavLink>

              <NavLink
                to="/check-vehiculos/pendientes-firma"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <PenLine size={20} />
                <span>Firmas Check List Vehículos Pendientes</span>
              </NavLink>

              <NavLink
                to="/check-vehiculos/historial"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <FileText size={20} />
                <span>Mis Check List Vehículos</span>
              </NavLink>
            </>
          )}

          {canSeeAllVehicleChecks && (
  <NavLink
    to="/check-vehiculos/historial-todos"
    onClick={closeMenu}
    className={({ isActive }) =>
      isActive ? "menu-item active-link" : "menu-item"
    }
  >
    <FileText size={20} />
    <span>Check List Vehículos Terminados</span>
  </NavLink>
)}

{canCreateHarnessCheck && (
  <NavLink
    to="/arnes"
    onClick={closeMenu}
    className={({ isActive }) =>
      isActive ? "menu-item active-link" : "menu-item"
    }
  >
    <Shield size={20} />
    <span>Check List Arnés</span>
  </NavLink>
)}
          {canSignHarnessCheck && (
            <NavLink
              to="/arnes/pendientes-firma"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "menu-item active-link" : "menu-item"
              }
            >
              <PenLine size={20} />
              <span>Firmas Check List Arnés Pendientes</span>
            </NavLink>
          )}

          {canReviewHarnessFinished && (
            <NavLink
              to="/arnes/historial"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "menu-item active-link" : "menu-item"
              }
            >
              <FileText size={20} />
              <span>Mis Check List Arnés</span>
            </NavLink>

            
          )}

          {canSeeAllHarnessChecks && (
  <NavLink
    to="/arnes/historial-todos"
    onClick={closeMenu}
    className={({ isActive }) =>
      isActive ? "menu-item active-link" : "menu-item"
    }
  >
    <FileText size={20} />
    <span>Check List Arnés Terminados</span>
  </NavLink>
)}

          {isSuperadmin && (
            <>
              <NavLink
                to="/escalas"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <ClipboardCheck size={20} />
                <span>Check Escalas Telescopica</span>
              </NavLink>

              <NavLink
                to="/escaleras-tijera"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <ClipboardCheck size={20} />
                <span>Check Escaleras Tijera</span>
              </NavLink>

              <NavLink
                to="/check-herramientas"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <Wrench size={20} />
                <span>Check Herramientas y EPP Tecnico</span>
              </NavLink>

              <NavLink
                to="/check-conductor"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <HardHat size={20} />
                <span>Check Herramientas y EPP Conductor</span>
              </NavLink>

              <NavLink
                to="/reuniones"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <Users size={20} />
                <span>Reuniones</span>
              </NavLink>

              <NavLink
                to="/reportes"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <FileText size={20} />
                <span>Reportes</span>
              </NavLink>

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