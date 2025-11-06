// client/src/utils/auth.js

// ---- API base ----
export const API = import.meta.env.VITE_API_URL || "";

// ---- Token helpers ----
export const getToken = () => localStorage.getItem("token") || "";

export const parseJwt = (token) => {
  try {
    const b64 = token.split(".")[1];
    if (!b64) return null;
    const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
};

export const getUserFromToken = () => {
  const t = getToken();
  return parseJwt(t);
};

export const isAuthed = () => !!getUserFromToken();

export const hasAnyRole = (...roles) => {
  const u = getUserFromToken();
  if (!u?.role) return false;
  return roles.flat().includes(u.role);
};

export const isAdminLike = () =>
  hasAnyRole("superadmin", "admin", "studentAdmin", "teacherAdmin", "nonTeachingAdmin");

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};
