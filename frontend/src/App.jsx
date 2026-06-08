import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import VehicleCheckList from "./pages/VehicleCheckList";
import VehicleCheckHistory from "./pages/VehicleCheckHistory";
import Login from "./pages/Login";
import UsersAdmin from "./pages/UsersAdmin";
import ChangePassword from "./pages/ChangePassword";
import SafetyTalks from "./pages/SafetyTalks";
import SafetyTalkHistory from "./pages/SafetyTalkHistory";
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
  getUser,
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
  if (!isSuperadmin()) return <Navigate to="/check-vehiculos" replace />;
  return children;
}

function AppRoutes() {
  const user = getUser();
  const isUserSuperadmin = user?.role === "SUPERADMIN";

  return (
    <MainLayout>
      <Routes>
        <Route
          path="/"
          element={
            isUserSuperadmin ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/check-vehiculos" replace />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            isUserSuperadmin ? (
              <Dashboard />
            ) : (
              <Navigate to="/check-vehiculos" replace />
            )
          }
        />

        <Route path="/charlas" element={<SafetyTalks />} />
        <Route path="/charlas/historial" element={<SafetyTalkHistory />} />
        <Route
          path="/charlas/historial-todos"
          element={
            <SuperadminRoute>
              <SafetyTalkHistory />
            </SuperadminRoute>
          }
        />

        <Route path="/check-vehiculos" element={<VehicleCheckList />} />
        <Route
          path="/check-vehiculos/historial"
          element={<VehicleCheckHistory />}
        />
        <Route
          path="/check-vehiculos/historial-todos"
          element={
            <SuperadminRoute>
              <VehicleCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route path="/arnes" element={<HarnessCheck />} />
        <Route path="/arnes/historial" element={<HarnessCheckHistory />} />
        <Route
          path="/arnes/historial-todos"
          element={
            <SuperadminRoute>
              <HarnessCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route path="/escalas" element={<LadderCheck />} />
        <Route path="/escalas/historial" element={<LadderCheckHistory />} />
        <Route
          path="/escalas/historial-todos"
          element={
            <SuperadminRoute>
              <LadderCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route path="/escaleras-tijera" element={<ScissorLadderCheck />} />
        <Route
          path="/escaleras-tijera/historial"
          element={<ScissorLadderCheckHistory />}
        />
        <Route
          path="/escaleras-tijera/historial-todos"
          element={
            <SuperadminRoute>
              <ScissorLadderCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route path="/check-herramientas" element={<ToolsEppCheck />} />
        <Route
          path="/check-herramientas/historial"
          element={<ToolsEppCheckHistory />}
        />
        <Route
          path="/check-herramientas/historial-todos"
          element={
            <SuperadminRoute>
              <ToolsEppCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route path="/check-conductor" element={<ToolsDriverCheck />} />
        <Route
          path="/check-conductor/historial"
          element={<ToolsDriverCheckHistory />}
        />
        <Route
          path="/check-conductor/historial-todos"
          element={
            <SuperadminRoute>
              <ToolsDriverCheckHistory />
            </SuperadminRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <SuperadminRoute>
              <UsersAdmin />
            </SuperadminRoute>
          }
        />

        <Route
          path="*"
          element={
            isUserSuperadmin ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/check-vehiculos" replace />
            )
          }
        />
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
              ) : isSuperadmin() ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/check-vehiculos" replace />
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