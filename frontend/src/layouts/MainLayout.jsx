import "./MainLayout.css";
import logo from "../assets/logo-insprotel.png";

import { useState } from "react";
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
} from "lucide-react";

import { getUser, logout } from "../auth/auth";

function MainLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getUser();

  const isSuperadmin = user?.role === "SUPERADMIN";

  function closeMenu() {
    setMenuOpen(false);
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
          {isSuperadmin && (
            <>
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
            </>
          )}

          <NavLink
            to="/check-vehiculos"
            onClick={closeMenu}
            className={({ isActive }) =>
              isActive ? "menu-item active-link" : "menu-item"
            }
          >
            <Car size={20} />
            <span>Check Vehículos</span>
          </NavLink>

          {isSuperadmin && (
            <>
              <NavLink
                to="/check-herramientas"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "menu-item active-link" : "menu-item"
                }
              >
                <Wrench size={20} />
                <span>Check Herramientas</span>
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
        </nav>

        <button className="logout-button" onClick={logout} type="button">
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
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