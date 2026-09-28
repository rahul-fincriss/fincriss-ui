import { User } from '@/types';

/**
 * Fine-grained permission check against the 'resource:action' strings
 * returned by /auth/me. super_admin implicitly has everything.
 *
 * Falls back to a role→permission map when the permissions array is absent
 * (e.g. the demo switchRole path), so gating still behaves sensibly.
 */

// Mirror of the seeded role_permissions in the DB — used only as a fallback
// when user.permissions is not populated.
const ROLE_FALLBACK: Record<string, string[]> = {
  super_admin: ['*'],
  analyst: ['alerts:read', 'alerts:write', 'cases:read', 'reference:read'],
  investigator: [
    'alerts:read', 'alerts:write', 'alerts:assign',
    'cases:read', 'cases:write', 'cases:close', 'str:read', 'str:write', 'reference:read',
  ],
  triage_manager: ['alerts:read', 'alerts:assign'],
  principal_officer: [
    'alerts:read', 'alerts:write', 'cases:read', 'cases:write', 'cases:close',
    'str:read', 'str:write', 'str:approve', 'rules:read', 'reference:read', 'audit_log:read',
  ],
  compliance: ['alerts:read', 'cases:read', 'str:read', 'rules:read', 'reference:read', 'audit_log:read'],
};

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  const perms =
    user.permissions && user.permissions.length > 0
      ? user.permissions
      : ROLE_FALLBACK[user.role] || [];

  return perms.includes('*') || perms.includes(permission);
}

export function canWriteAlerts(user: User | null | undefined): boolean {
  return hasPermission(user, 'alerts:write');
}

export function canAssignAlerts(user: User | null | undefined): boolean {
  return hasPermission(user, 'alerts:assign');
}

export function canWriteStr(user: User | null | undefined): boolean {
  return hasPermission(user, 'str:write');
}

export function canApproveStr(user: User | null | undefined): boolean {
  return hasPermission(user, 'str:approve');
}

export function canReadStr(user: User | null | undefined): boolean {
  return hasPermission(user, 'str:read');
}
