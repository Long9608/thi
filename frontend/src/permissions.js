import { useMemo } from 'react';

const normalize = (value) => String(value || '').trim().toUpperCase();

export function createPermissionChecker(user) {
  const permissions = new Set((user?.permissions || []).map(normalize));
  const roleCodes = (user?.roleCodes || []).map(normalize);
  const isAdmin = roleCodes.includes('ADMIN');

  const can = (permission) => Boolean(permission) && permissions.has(normalize(permission));
  const canAny = (required = []) => required.some(can);
  const canAll = (required = []) => required.every(can);

  return { can, canAny, canAll, permissions, roleCodes };
}

export function usePermissions(user) {
  return useMemo(() => createPermissionChecker(user), [user]);
}

export function PermissionGate({ permission, any, all, fallback = null, children }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const { can, canAny, canAll } = createPermissionChecker(user);
  const allowed = permission ? can(permission) : any ? canAny(any) : all ? canAll(all) : false;
  return allowed ? children : fallback;
}
