import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form.username.trim(), form.password);
    } catch (e) {
      setError(e.message || "Xəta baş verdi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-form" onSubmit={submit}>
        <div className="login-brand">
          <div className="login-logo">OctoRent</div>
          <div className="login-sub">İcarə və Stok İdarəetmə Sistemi</div>
        </div>

        <label className="login-field">
          <span>İstifadəçi adı</span>
          <input value={form.username} onChange={set("username")} autoComplete="username" placeholder="istifadeci" required autoFocus />
        </label>
        <label className="login-field">
          <span>Şifrə</span>
          <input type="password" value={form.password} onChange={set("password")} autoComplete="current-password" placeholder="••••••" required />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-submit" disabled={busy}>
          {busy ? "Gözləyin..." : "Daxil ol"}
        </button>
      </form>
    </div>
  );
}
