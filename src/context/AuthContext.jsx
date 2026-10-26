import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, AUTH_EVENT } from "../lib/api.js";

export const ROLE_PERMS = {
  superadmin: ["tenants"],
  admin: ["read", "write", "stock", "documents", "employees", "settings", "tenant"],
  manager: ["read", "write", "stock", "documents"],
  worker: ["read", "stock"],
};

export const ROLE_LABELS = {
  superadmin: "Sistem Admini",
  admin: "Admin",
  manager: "Menecer",
  worker: "İşçi",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => api.getStoredAuth());
  const [loading, setLoading] = useState(() => !!api.getStoredAuth()?.token);

  const clear = useCallback(() => {
    api.setStoredAuth(null);
    setAuth(null);
  }, []);

  const applySession = useCallback((session) => {
    api.setStoredAuth(session);
    setAuth(session);
  }, []);

  /* validate stored token on mount */
  useEffect(() => {
    let cancelled = false;
    if (!auth?.token) return undefined;
    setLoading(true);
    api
      .me()
      .then((res) => {
        if (cancelled) return;
        const next = { token: auth.token, user: res.user };
        api.setStoredAuth(next);
        setAuth(next);
      })
      .catch(() => {
        if (!cancelled) clear();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* react to 401 from any request */
  useEffect(() => {
    const onExpired = () => clear();
    window.addEventListener(AUTH_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EVENT, onExpired);
  }, [clear]);

  const login = useCallback(async (username, password) => {
    const session = await api.login(username, password);
    applySession(session);
    return session.user;
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    clear();
  }, [clear]);

  const user = auth?.user || null;
  const role = user?.role || null;
  const perms = ROLE_PERMS[role] || [];

  const can = useCallback((perm) => perms.includes(perm), [perms]);

  const value = useMemo(
    () => ({ user, role, perms, can, authed: !!user, loading, login, logout, applySession }),
    [user, role, perms, can, loading, login, logout, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
