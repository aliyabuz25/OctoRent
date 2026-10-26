import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth, ROLE_LABELS, ROLE_PERMS } from "../../context/AuthContext.jsx";
import ToastContainer from "../common/ToastContainer.jsx";

let tid = 0;

const PERM_LABELS = {
  read: "Oxuma",
  write: "Yazma",
  stock: "Stok",
  documents: "Sənədlər",
  employees: "İstifadəçilər",
  settings: "Ayarlar",
  tenant: "İşletme",
  tenants: "Platforma",
};

export default function SettingsPanel() {
  const { user, role, can } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message, type }]);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);

  const load = useCallback(async () => {
    try {
      const res = await api.getTenant();
      const t = res?.tenant || res;
      setTenant(t);
      setName(t?.name || "");
    } catch {
      /* tenant olmaya bilər (super admin) */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await api.updateTenant({ name: name.trim() });
      const t = res?.tenant || res;
      setTenant(t);
      push("İşletme adı yeniləndi", "success");
    } catch (e) {
      push(e.message || "Xəta", "error");
    } finally {
      setBusy(false);
    }
  };

  const perms = ROLE_PERMS[role] || [];

  return (
    <div className="stock-panel" style={{ padding: 12, overflow: "auto" }}>
      <ToastContainer toasts={toasts} onRemove={remove} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <div style={card}>
          <div style={cardTitle}>İşletme (Marka)</div>
          {tenant ? (
            <form onSubmit={save} style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <label className="login-field">
                <span>İşletme adı</span>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={!can("tenant")} />
              </label>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                ID: {tenant.id} · Yaradıldı: {tenant.createdAt?.slice(0, 10)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="btn-primary" disabled={busy || !can("tenant")}>
                  {busy ? "..." : "Yadda saxla"}
                </button>
                <button type="button" onClick={load} disabled={!can("tenant")}>Sıfırla</button>
              </div>
              {!can("tenant") && (
                <div style={{ fontSize: 12, color: "#9d5d00" }}>İşletme adını yalnız Admin dəyişə bilər.</div>
              )}
            </form>
          ) : (
            <div style={{ padding: 12, color: "#64748b", fontSize: 12.5 }}>İşletme məlumatı yoxdur.</div>
          )}
        </div>

        <div style={card}>
          <div style={cardTitle}>Hesab</div>
          <div style={{ padding: 12 }}>
            <Row label="Ad Soyad" value={user?.name || "-"} />
            <Row label="İstifadəçi adı" value={user?.username || "-"} />
            <Row label="Rol" value={ROLE_LABELS[role] || role || "-"} />
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>İcazələr</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {perms.length === 0 && <span style={{ fontSize: 12, color: "#64748b" }}>-</span>}
              {perms.map((p) => (
                <span key={p} style={badge}>{PERM_LABELS[p] || p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={cardTitle}>Tətbiq</div>
        <div style={{ padding: 12 }}>
          <Row label="Versiya" value="1.0.0" />
          <Row label="Server" value="OctoRent API" />
        </div>
      </div>
    </div>
  );
}

const card = { background: "#fff", border: "1px solid #d3dae2", borderRadius: 8 };
const cardTitle = { padding: 10, borderBottom: "1px solid #eef2f6", fontWeight: 600 };
const badge = { display: "inline-block", padding: "2px 8px", borderRadius: 10, background: "#e0e7ff", color: "#3730a3", fontWeight: 600, fontSize: 12 };

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <b>{value}</b>
    </div>
  );
}
