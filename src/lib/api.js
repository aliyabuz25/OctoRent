const JSON_HEADERS = { "Content-Type": "application/json" };

export const AUTH_EVENT = "auth:expired";

function getStoredAuth() {
  try {
    const raw = localStorage.getItem("runstock.auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredAuth(auth) {
  try {
    if (auth) localStorage.setItem("runstock.auth", JSON.stringify(auth));
    else localStorage.removeItem("runstock.auth");
  } catch {
    /* ignore */
  }
}

function getToken() {
  return getStoredAuth()?.token || null;
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Xəta (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  /* token əlavə edən xam fetch (sənəd POST-u və s. üçün) */
  fetch: (url, options = {}) => {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    return fetch(url, { ...options, headers });
  },

  /* auth */
  login: (username, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request("/api/auth/me"),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  startPairing: () => request("/api/auth/pair/start", { method: "POST" }),
  checkPairingStatus: (code) => request(`/api/auth/pair/status/${code}`),
  getStoredAuth,
  setStoredAuth,

  /* platform: işletme/marka (yalnız sistem admini) */
  listTenants: () => request("/api/tenants"),
  createTenant: (data) => request("/api/tenants", { method: "POST", body: JSON.stringify(data) }),

  /* items */
  listItems: () => request("/api/items"),
  createItem: (item) => request("/api/items", { method: "POST", body: JSON.stringify(item) }),
  updateItem: (id, patch) => request(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  changeStock: (id, delta, note = "") => request(`/api/items/${id}/stock`, { method: "POST", body: JSON.stringify({ delta, note }) }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: "DELETE" }),

  /* generic entities */
  list: (entity) => request(`/api/${entity}`),
  create: (entity, data) => request(`/api/${entity}`, { method: "POST", body: JSON.stringify(data) }),
  update: (entity, id, data) => request(`/api/${entity}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (entity, id) => request(`/api/${entity}/${id}`, { method: "DELETE" }),

  /* employees */
  listUsers: () => request("/api/users"),
  createUser: (data) => request("/api/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),

  /* tenant */
  getTenant: () => request("/api/tenant"),
  updateTenant: (data) => request("/api/tenant", { method: "PUT", body: JSON.stringify(data) }),

  /* misc */
  movements: () => request("/api/movements"),
  audit: () => request("/api/audit"),

  /* invoices */
  listInvoices: () => request("/api/invoices"),
  getInvoice: (id) => request(`/api/invoices/${id}`),
  createInvoice: (data) => request("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
  updateInvoice: (id, data) => request(`/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  payInvoice: (id) => request(`/api/invoices/${id}/pay`, { method: "PUT" }),
  returnInvoiceItem: (invoiceId, itemId) =>
    request(`/api/invoices/${invoiceId}/items/${itemId}/return`, { method: "PUT" }),

  /* maintenance */
  listMaintenance: () => request("/api/maintenance"),
  createMaintenance: (data) => request("/api/maintenance", { method: "POST", body: JSON.stringify(data) }),
  updateMaintenance: (id, data) => request(`/api/maintenance/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMaintenance: (id) => request(`/api/maintenance/${id}`, { method: "DELETE" }),

  /* cashflow */
  listCashflow: () => request("/api/cashflow"),
  createCashflow: (data) => request("/api/cashflow", { method: "POST", body: JSON.stringify(data) }),
  deleteCashflow: (id) => request(`/api/cashflow/${id}`, { method: "DELETE" }),
};
