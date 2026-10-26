import { useCallback, useMemo, useState } from 'react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext.jsx';
import { getActAs, setActAs } from './api.js';

/* superadmin konkret müəssisə kontekstində bütün admin hüquqları əldə edir */
const ADMIN_PERMS = ['read', 'write', 'stock', 'documents', 'employees', 'settings', 'tenant'];

export function usePerms() {
  const { user, role, can, logout, authed, loading } = useAuth();
  const [actAs, setActAsState] = useState(getActAs);

  const effectiveRole = role === 'superadmin' ? (actAs ? 'admin' : 'superadmin') : role;

  const check = useCallback(
    (perm) => {
      if (role === 'superadmin') return actAs ? ADMIN_PERMS.includes(perm) : perm === 'tenants';
      return can(perm);
    },
    [role, actAs, can]
  );

  const switchTenant = useCallback((tenant) => {
    setActAs(tenant);
    setActAsState(tenant);
  }, []);

  const clearTenant = useCallback(() => {
    setActAs(null);
    setActAsState(null);
  }, []);

  return useMemo(
    () => ({
      user,
      authed,
      loading,
      realRole: role,
      role: effectiveRole,
      roleLabel: ROLE_LABELS[effectiveRole] || effectiveRole,
      can: check,
      actAs,
      switchTenant,
      clearTenant,
      logout,
    }),
    [user, authed, loading, role, effectiveRole, check, actAs, switchTenant, clearTenant, logout]
  );
}
