import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import VehicleCheckList from "./pages/VehicleCheckList";
import VehicleCheckHistory from "./pages/VehicleCheckHistory";
import Login from "./pages/Login";
import UsersAdmin from "./pages/UsersAdmin";
import ChangePassword from "./pages/ChangePassword";
import SafetyTalks from "./pages/SafetyTalks";
import SafetyTalkHistory from "./pages/SafetyTalkHistory";
import SafetyTalkPendingSignatures from "./pages/SafetyTalkPendingSignatures";
import HarnessCheck from "./pages/HarnessCheck";
import HarnessCheckHistory from "./pages/HarnessCheckHistory";
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

        <Route path="/check-vehiculos" element={<VehicleCheckList />} />
        <Route path="/check-vehiculos/historial" element={<VehicleCheckHistory />} />

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
        <Route path="/charlas/pendientes" element={<SafetyTalkPendingSignatures />} />
        <Route path="/charlas/historial-todos" element={<SafetyTalkHistory />} />

        {/* ARNES */}
        <Route
          path="/arnes"
          element={
            <SuperadminRoute>
              <HarnessCheck />
            </SuperadminRoute>
          }
        />

        <Route
          path="/arnes/historial"
          element={
            <SuperadminRoute>
              <HarnessCheckHistory />
            </SuperadminRoute>
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
            <SuperadminRoute>
              <ToolsEppCheck />
            </SuperadminRoute>
          }
        />

        <Route
          path="/check-herramientas/historial"
          element={
            <SuperadminRoute>
              <ToolsEppCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route
          path="/check-herramientas/historial-todos"
          element={
            <SuperadminRoute>
              <ToolsEppCheckHistory />
            </SuperadminRoute>
          }
        />

        {/* HERRAMIENTAS CONDUCTOR */}
        <Route
          path="/check-conductor"
          element={
            <SuperadminRoute>
              <ToolsDriverCheck />
            </SuperadminRoute>
          }
        />

        <Route
          path="/check-conductor/historial"
          element={
            <SuperadminRoute>
              <ToolsDriverCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route
          path="/check-conductor/historial-todos"
          element={
            <SuperadminRoute>
              <ToolsDriverCheckHistory />
            </SuperadminRoute>
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