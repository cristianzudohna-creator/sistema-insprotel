const API_URL = "http://localhost:3000";

const TOKEN_KEY = "token";
const OLD_TOKEN_KEY = "access_token";
const USER_KEY = "user";

export async function login(rut, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rut,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error iniciando sesión");
  }

  saveAuth(data);

  return data;
}

export async function changePassword(payload) {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error cambiando contraseña");
  }

  saveAuth(data);

  return data;
}

export function saveAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(OLD_TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function getToken() {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(OLD_TOKEN_KEY) ||
    ""
  );
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken() && getUser());
}

export function isSuperadmin() {
  return getUser()?.role === "SUPERADMIN";
}

export function mustChangePassword() {
  return getUser()?.mustChangePassword === true;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(OLD_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.location.href = "/login";
}

export function authHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}