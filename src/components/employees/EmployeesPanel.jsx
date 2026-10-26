import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth, ROLE_LABELS } from "../../context/AuthContext.jsx";
import FeatherIcon from "../common/FeatherIcon.jsx";
import ToastContainer from "../common/ToastContainer.jsx";

let tid = 0;

const ROLES = ["admin", "manager", "worker"];

export default function EmployeesPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");

  const push = useCallback((message, type = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message, type }]);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      push(e.message || "Yüklənə bilmədi", "error");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (form) => {
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), role: form.role, active: !!form.active };
      if (form.id) {
        if (form.password) payload.password = form.password;
        await api.updateUser(form.id, payload);
        push("İstifadəçi yeniləndi", "success");
      } else {
        payload.username = form.username.trim();
        payload.password = form.password;
        await api.createUser(payload);
        push("İstifadəçi yaradıldı", "success");
      }
      setModal(null);
      load();
    } catch (e) {
      push(e.message || "Xəta", "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async (u) => {
    if (!confirm(`"${u.name || u.username}" silinsin mi?`)) return;
    try {
      await api.deleteUser(u.id);
      push("Silindi", "success");
      load();
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const q = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="İstifadəçi axtar..."
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
          <button
            className="default"
            onClick={() =>
              setModal({
                mode: "create",
                form: { name: "", username: "", password: "", role: "worker", active: true },
              })
            }
          >
            + Yeni İstifadəçi
          </button>
        </div>
      </div>

      <div style={{ overflow: "auto", padding: 12 }}>
        {loading ? (
          <div style={{ padding: 20, color: "#64748b" }}>Yüklənir...</div>
        ) : (
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={cellHead}>Ad Soyad</th>
                <th style={cellHead}>İstifadəçi adı</th>
                <th style={cellHead}>Rol</th>
                <th style={cellHead}>Status</th>
                <th style={{ ...cellHead, textAlign: "right" }}>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={cell}>
                    {u.name} {String(u.id) === String(me?.id) && <span style={{ color: "#64748b" }}>(siz)</span>}
                  </td>
                  <td style={cell}>{u.username}</td>
                  <td style={cell}>
                    <span style={badge}>{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td style={cell}>
                    <span style={{ color: u.active ? "#16a34a" : "#b91c1c", fontWeight: 600 }}>
                      {u.active ? "Aktiv" : "Deaktiv"}
                    </span>
                  </td>
                  <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() =>
                        setModal({
                          mode: "edit",
                          form: {
                            id: u.id,
                            name: u.name,
                            username: u.username,
                            password: "",
                            role: u.role,
                            active: u.active,
                          },
                        })
                      }
                    >
                      Düzəliş
                    </button>{" "}
                    <button
                      disabled={String(u.id) === String(me?.id)}
                      onClick={() => del(u)}
                      style={{ color: String(u.id) === String(me?.id) ? "#94a3b8" : "#b91c1c" }}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 18, color: "#64748b", textAlign: "center" }}>
                    {search ? "Axtarışa uyğun istifadəçi tapılmadı." : "İstifadəçi yoxdur"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && <UserModal state={modal} busy={busy} onClose={() => setModal(null)} onSubmit={save} />}
    </div>
  );
}

const cellHead = { padding: "9px 10px", fontWeight: 700, color: "#334155" };
const cell = { padding: "9px 10px" };
const badge = { display: "inline-block", padding: "2px 8px", borderRadius: 10, background: "#e0e7ff", color: "#3730a3", fontWeight: 600, fontSize: 12 };

function UserModal({ state, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(state.form);
  const isEdit = state.mode === "edit";
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? "İstifadəçi düzəlişi" : "Yeni istifadəçi"}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field">
                <label>Ad Soyad</label>
                <input value={form.name} onChange={set("name")} required />
              </div>
              <div className="field">
                <label>İstifadəçi adı</label>
                <input value={form.username} onChange={set("username")} disabled={isEdit} required />
              </div>
              <div className="field">
                <label>Rol</label>
                <select value={form.role} onChange={set("role")}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Şifrə {isEdit && "(boş buraxsanız dəyişməz)"}</label>
                <input type="password" value={form.password} onChange={set("password")} required={!isEdit} autoComplete="new-password" />
              </div>
              <div className="field field-wide">
                <label>
                  <input type="checkbox" checked={!!form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Aktiv hesab
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>İmtina</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "..." : "Yadda saxla"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
