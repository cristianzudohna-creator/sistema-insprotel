import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import VehicleCheckList from "./pages/VehicleCheckList";
import VehicleCheckHistory from "./pages/VehicleCheckHistory";
import Login from "./pages/Login";
import UsersAdmin from "./pages/UsersAdmin";
import ChangePassword from "./pages/ChangePassword";

import {
  getUser,
  isLoggedIn,
  isSuperadmin,
  mustChangePassword,
} from "./auth/auth";

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword()) {
    return <Navigate to="/cambiar-password" replace />;
  }

  return children;
}

function SuperadminRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword()) {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (!isSuperadmin()) {
    return <Navigate to="/check-vehiculos" replace />;
  }

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

        <Route path="/check-vehiculos" element={<VehicleCheckList />} />

        <Route
          path="/check-vehiculos/historial"
          element={<VehicleCheckHistory />}
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