const TOKEN_KEY = "adminToken";
const USER_KEY = "adminUser";

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAdminSession({ token, user }) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  // Descarta también JWT de la implementación antigua.
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAdminUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || "{}");
  } catch {
    return {};
  }
}
