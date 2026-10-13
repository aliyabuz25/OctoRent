const JSON_HEADERS = { "Content-Type": "application/json" };

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `İstek başarısız (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  listItems: () => request("/api/items"),

  createItem: (item) =>
    request("/api/items", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(item) }),

  updateItem: (id, patch) =>
    request(`/api/items/${id}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(patch) }),

  changeStock: (id, delta) =>
    request(`/api/items/${id}/stock`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ delta }),
    }),

  deleteItem: (id) => request(`/api/items/${id}`, { method: "DELETE" }),
};
