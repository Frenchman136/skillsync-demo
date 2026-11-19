// Calls the Skill Sync API. In development Vite forwards /api to localhost:4000 (see vite.config.js).
// In production set VITE_API_URL to the Render address, e.g. https://skillsync-api.onrender.com
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";
const KEY = "ss_token";

export const getToken = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: ignore */
  }
};

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function call(method, path, body) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach the server. Check your connection. If the server was asleep, wait a minute and try again.",
    );
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      onUnauthorized();
    }
    throw new ApiError(
      res.status,
      data?.error || "Something went wrong. Please try again.",
      data?.fields,
    );
  }
  return data;
}

export const api = {
  get: (p) => call("GET", p),
  post: (p, b) => call("POST", p, b ?? {}),
  patch: (p, b) => call("PATCH", p, b ?? {}),
  del: (p) => call("DELETE", p),
};
