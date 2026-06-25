import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import VehicleCheckList from "./pages/VehicleCheckList";
import VehicleCheckHistory from "./pages/VehicleCheckHistory";
import VehicleCheckPendingSignatures from "./pages/VehicleCheckPendingSignatures";
import Login from "./pages/Login";
import UsersAdmin from "./pages/UsersAdmin";
import ChangePassword from "./pages/ChangePassword";
import SafetyTalks from "./pages/SafetyTalks";
import SafetyTalkHistory from "./pages/SafetyTalkHistory";
import SafetyTalkPendingSignatures from "./pages/SafetyTalkPendingSignatures";
import HarnessCheck from "./pages/HarnessCheck";
import HarnessCheckHistory from "./pages/HarnessCheckHistory";
import HarnessPendingSignatures from "./pages/HarnessPendingSignatures";
import LadderCheck from "./pages/LadderCheck";
import LadderCheckHistory from "./pages/LadderCheckHistory";
import ScissorLadderCheck from "./pages/ScissorLadderCheck";
import ScissorLadderCheckHistory from "./pages/ScissorLadderCheckHistory";
import ToolsEppCheck from "./pages/ToolsEppCheck";
import ToolsEppCheckHistory from "./pages/ToolsEppCheckHistory";
import ToolsDriverCheck from "./pages/ToolsDriverCheck";
import ToolsDriverCheckHistory from "./pages/ToolsDriverCheckHistory";

import {
  isLoggedIn,
  isSuperadmin,
  mustChangePassword,
} from "./auth/auth";

function getRole() {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("me") ||
      localStorage.getItem("profile");

    const user = raw ? JSON.parse(raw) : null;
    return String(user?.role || "").toUpperCase();
  } catch {
    return "";
  }
}

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (mustChangePassword()) return <Navigate to="/cambiar-password" replace />;
  return children;
}

function SuperadminRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (mustChangePassword()) return <Navigate to="/cambiar-password" replace />;
  if (!isSuperadmin()) return <Navigate to="/inicio" replace />;
  return children;
}

function VehicleChecklistRoute({ children }) {
  const role = getRole();

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (mustChangePassword()) return <Navigate to="/cambiar-password" replace />;

  if (
  !["SUPERADMIN", "SUPERVISOR", "PREVENCION", "CONDUCTOR", "TECNICO"].includes(
    role,
  )
) {
  return <Navigate to="/inicio" replace />;
}

  return children;
}

function HarnessRoute({ children }) {
  const role = getRole();

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (mustChangePassword()) return <Navigate to="/cambiar-password" replace />;

  if (!["SUPERADMIN", "SUPERVISOR", "PREVENCION", "TECNICO"].includes(role)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}

function ToolsEppRoute({ children }) {
  const role = getRole();

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (mustChangePassword()) return <Navigate to="/cambiar-password" replace />;

  if (!["SUPERADMIN", "SUPERVISOR", "PREVENCION", "TECNICO"].includes(role)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}

function ToolsDriverRoute({ children }) {
  const role = getRole();

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (mustChangePassword()) return <Navigate to="/cambiar-password" replace />;

  if (!["SUPERADMIN", "SUPERVISOR", "PREVENCION", "CONDUCTOR"].includes(role)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        <Route path="/inicio" element={<Home />} />

        <Route
          path="/dashboard"
          element={
            <SuperadminRoute>
              <Dashboard />
            </SuperadminRoute>
          }
        />

        <Route
          path="/check-vehiculos"
          element={
            <VehicleChecklistRoute>
              <VehicleCheckList />
            </VehicleChecklistRoute>
          }
        />

        <Route
          path="/check-vehiculos/historial"
          element={
            <VehicleChecklistRoute>
              <VehicleCheckHistory />
            </VehicleChecklistRoute>
          }
        />

        <Route
          path="/check-vehiculos/pendientes-firma"
          element={
            <VehicleChecklistRoute>
              <VehicleCheckPendingSignatures />
            </VehicleChecklistRoute>
          }
        />

        <Route
          path="/check-vehiculos/historial-todos"
          element={
            <SuperadminRoute>
              <VehicleCheckHistory />
            </SuperadminRoute>
          }
        />

        {/* CHARLAS */}
        <Route path="/charlas" element={<SafetyTalks />} />
        <Route path="/charlas/historial" element={<SafetyTalkHistory />} />
        <Route
          path="/charlas/pendientes"
          element={<SafetyTalkPendingSignatures />}
        />
        <Route path="/charlas/historial-todos" element={<SafetyTalkHistory />} />

        {/* ARNES */}
        <Route
          path="/arnes"
          element={
            <HarnessRoute>
              <HarnessCheck />
            </HarnessRoute>
          }
        />

        <Route
          path="/arnes/historial"
          element={
            <HarnessRoute>
              <HarnessCheckHistory />
            </HarnessRoute>
          }
        />

        <Route
          path="/arnes/pendientes-firma"
          element={
            <HarnessRoute>
              <HarnessPendingSignatures />
            </HarnessRoute>
          }
        />

        <Route
          path="/arnes/historial-todos"
          element={
            <SuperadminRoute>
              <HarnessCheckHistory />
            </SuperadminRoute>
          }
        />

        {/* ESCALAS */}
        <Route
          path="/escalas"
          element={
            <SuperadminRoute>
              <LadderCheck />
            </SuperadminRoute>
          }
        />

        <Route
          path="/escalas/historial"
          element={
            <SuperadminRoute>
              <LadderCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route
          path="/escalas/historial-todos"
          element={
            <SuperadminRoute>
              <LadderCheckHistory />
            </SuperadminRoute>
          }
        />

        {/* ESCALERAS TIJERA */}
        <Route
          path="/escaleras-tijera"
          element={
            <SuperadminRoute>
              <ScissorLadderCheck />
            </SuperadminRoute>
          }
        />

        <Route
          path="/escaleras-tijera/historial"
          element={
            <SuperadminRoute>
              <ScissorLadderCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route
          path="/escaleras-tijera/historial-todos"
          element={
            <SuperadminRoute>
              <ScissorLadderCheckHistory />
            </SuperadminRoute>
          }
        />

        {/* HERRAMIENTAS TECNICO */}
        <Route
  path="/check-herramientas"
  element={
    <ToolsEppRoute>
      <ToolsEppCheck />
    </ToolsEppRoute>
  }
/>

        <Route
  path="/check-herramientas/historial"
  element={
    <ToolsEppRoute>
      <ToolsEppCheckHistory />
    </ToolsEppRoute>
  }
/>

        <Route
  path="/check-herramientas/historial-todos"
  element={
    <ToolsEppRoute>
      <ToolsEppCheckHistory />
    </ToolsEppRoute>
  }
/>

        {/* HERRAMIENTAS CONDUCTOR */}
        <Route
  path="/check-conductor"
  element={
    <ToolsDriverRoute>
      <ToolsDriverCheck />
    </ToolsDriverRoute>
  }
/>

        <Route
  path="/check-conductor/historial"
  element={
    <ToolsDriverRoute>
      <ToolsDriverCheckHistory />
    </ToolsDriverRoute>
  }
/>

        <Route
  path="/check-conductor/historial-todos"
  element={
    <ToolsDriverRoute>
      <ToolsDriverCheckHistory />
    </ToolsDriverRoute>
  }
/>

        {/* USUARIOS */}
        <Route
          path="/usuarios"
          element={
            <SuperadminRoute>
              <UsersAdmin />
            </SuperadminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn() ? (
              mustChangePassword() ? (
                <Navigate to="/cambiar-password" replace />
              ) : (
                <Navigate to="/inicio" replace />
              )
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/cambiar-password"
          element={
            isLoggedIn() ? <ChangePassword /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppRoutes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;