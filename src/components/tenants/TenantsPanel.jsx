import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import FeatherIcon from "../common/FeatherIcon.jsx";
import ToastContainer from "../common/ToastContainer.jsx";

let tid = 0;

export default function TenantsPanel() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message, type }]);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTenants(await api.listTenants());
    } catch (e) {
      push(e.message || "Yüklənə bilmədi", "error");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (form) => {
    setBusy(true);
    try {
      await api.createTenant({
        tenantName: form.tenantName.trim(),
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      push("İşletmə yaradıldı", "success");
      setModal(false);
      load();
    } catch (e) {
      push(e.message || "Xəta", "error");
    } finally {
      setBusy(false);
    }
  };

  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filteredTenants = tenants.filter((t) => {
    if (!q) return true;
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.adminUsername && t.adminUsername.toLowerCase().includes(q))
    );
  });

  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="İşletmə axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {search && (
            <button onClick={() => setSearch("")} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <FeatherIcon name="X" size={13} /> Təmizlə
            </button>
          )}
          <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <FeatherIcon name="RefreshCw" size={13} className={loading ? "spin-icon" : ""} /> Yenilə
          </button>
          <button className="default" onClick={() => setModal(true)}>+ Yeni İşletmə</button>
        </div>
      </div>

      <div style={{ overflow: "auto", padding: 12 }}>
        {loading ? (
          <div style={{ padding: 20, color: "#64748b" }}>Yüklənir...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={cellHead}>İşletmə / Marka</th>
                <th style={cellHead}>Admin</th>
                <th style={cellHead}>İstifadəçi sayı</th>
                <th style={cellHead}>Yaradılma</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={cell}>{t.name}</td>
                  <td style={cell}>{t.admins?.join(", ") || "-"}</td>
                  <td style={cell}>{t.userCount ?? 0}</td>
                  <td style={cell}>{t.createdAt ? t.createdAt.slice(0, 10) : "-"}</td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 18, color: "#64748b" }}>
                    İşletmə yoxdur
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && <TenantModal busy={busy} onClose={() => setModal(false)} onSubmit={create} />}
    </div>
  );
}

const cellHead = { padding: "9px 10px", fontWeight: 700, color: "#334155" };
const cell = { padding: "9px 10px" };

function TenantModal({ busy, onClose, onSubmit }) {
  const [form, setForm] = useState({ tenantName: "", name: "", username: "", password: "" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Yeni işletmə (marka)</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field field-wide">
                <label>İşletme adı (Marka)</label>
                <input value={form.tenantName} onChange={set("tenantName")} placeholder="Məs. Mağaza A" required />
              </div>
              <div className="field">
                <label>Admin adı</label>
                <input value={form.name} onChange={set("name")} placeholder="Ad Soyad" required />
              </div>
              <div className="field">
                <label>Admin istifadəçi adı</label>
                <input value={form.username} onChange={set("username")} required />
              </div>
              <div className="field field-wide">
                <label>Admin şifrəsi (min 4 simvol)</label>
                <input type="password" value={form.password} onChange={set("password")} required minLength={4} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>İmtina</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "..." : "Yarat"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
