import api from '@/lib/api-client';
import { AuditEntry } from '@/types';
import { AdminAuditEntry } from '@/types/admin';

const extractArray = <T>(data: any, keys: string[]): T[] => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  const nestedData = data?.data;
  if (Array.isArray(nestedData)) return nestedData;

  if (nestedData && typeof nestedData === 'object') {
    for (const key of keys) {
      if (Array.isArray(nestedData[key])) return nestedData[key];
    }
  }

  return [];
};

// workflow_audit_log returns old_value / new_value as JSONB objects (or null).
// Render a compact, human-readable summary of what changed.
const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const summarizeChange = (oldValue: unknown, newValue: unknown): string => {
  const oldObj =
    oldValue && typeof oldValue === 'object' ? (oldValue as Record<string, unknown>) : null;
  const newObj =
    newValue && typeof newValue === 'object' ? (newValue as Record<string, unknown>) : null;

  if (!oldObj && !newObj) {
    return [formatValue(oldValue), formatValue(newValue)].filter(Boolean).join(' → ');
  }

  const keys = Array.from(new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]));
  const parts = keys.map((k) => {
    const before = oldObj ? oldObj[k] : undefined;
    const after = newObj ? newObj[k] : undefined;
    if (before !== undefined && after !== undefined && formatValue(before) !== formatValue(after)) {
      return `${k}: ${formatValue(before)} → ${formatValue(after)}`;
    }
    if (after !== undefined) return `${k}: ${formatValue(after)}`;
    if (before !== undefined) return `${k}: ${formatValue(before)}`;
    return '';
  });
  return parts.filter(Boolean).join('; ');
};

export const auditService = {
  // General platform audit logs — alert / case / STR / role workflow events.
  // Backed by workflow_audit_log via GET /api/audit-logs.
  async listLogs(params: any = {}): Promise<AuditEntry[]> {
    const response = await api.get('/api/audit-logs', { params });
    const logs = extractArray<any>(response.data, ['logs', 'items', 'audit_logs', 'entries']);
    return logs.map((log: any) => ({
      id: (log.id || log.audit_id || Math.random()).toString(),
      entityType: (log.entity_type || 'alert').toLowerCase(),
      entityId: (log.entity_id || '').toString(),
      action: log.action || 'Updated',
      performedBy: log.username || log.performed_by || 'System',
      performedAt: new Date(log.timestamp || log.performed_at || Date.now()),
      details: log.details || summarizeChange(log.old_value, log.new_value),
      modelVersion: log.new_value?.model_version || log.model_version || log.version,
    }));
  },

  // Full audit history for one entity — GET /api/audit-logs/{entity_type}/{entity_id}.
  // Used by alert / case detail pages.
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditEntry[]> {
    const response = await api.get(
      `/api/audit-logs/${entityType.toUpperCase()}/${encodeURIComponent(entityId)}`
    );
    const logs = extractArray<any>(response.data, ['logs', 'items', 'entries']);
    return logs.map((log: any) => ({
      id: (log.id || log.audit_id || Math.random()).toString(),
      entityType: (log.entity_type || entityType || 'alert').toLowerCase(),
      entityId: (log.entity_id || entityId || '').toString(),
      action: log.action || 'Updated',
      performedBy: log.username || log.performed_by || 'System',
      performedAt: new Date(log.timestamp || log.performed_at || Date.now()),
      details: log.details || summarizeChange(log.old_value, log.new_value),
      modelVersion: log.new_value?.model_version || log.model_version || log.version,
    }));
  },

  // Rule configuration specific audit logs — GET /api/rules/audit-log (shape: { total, entries }).
  // Correctly points at the rules endpoint; do not repoint this one.
  async listRuleAuditLogs(params: any = {}): Promise<any[]> {
    const response = await api.get('/api/rules/audit-log', { params });
    const logs = extractArray<any>(response.data, ['entries', 'items', 'audit_logs', 'logs']);
    return logs.map((log: any) => ({
      id: (log.id || log.audit_id || Math.random()).toString(),
      ruleId: log.rule_id,
      action: log.action || 'Threshold Updated',
      performedBy: log.changed_by || log.performed_by || 'System',
      performedAt: new Date(log.performed_at || log.timestamp || Date.now()),
      previousValue: log.previous_value,
      newValue: log.new_value,
      details: log.details || `Rule ${log.rule_id} updated`,
    }));
  },

  // Workforce / Admin audit logs — user / role / permission / queue events.
  // Backed by workflow_audit_log; filtered client-side to admin entity types since the
  // endpoint filters a single entity_type at a time.
  async listAdminLogs(params: any = {}): Promise<AdminAuditEntry[]> {
    const response = await api.get('/api/audit-logs', {
      params: { limit: 100, ...params },
    });
    const logs = extractArray<any>(response.data, ['logs', 'items', 'audit_logs', 'entries']);
    const adminEntities = new Set(['user', 'role', 'permission', 'queue']);
    return logs
      .filter((log: any) => adminEntities.has((log.entity_type || '').toLowerCase()))
      .map((log: any) => ({
        id: (log.id || log.audit_id || Math.random()).toString(),
        actionType: (log.action_type || log.action || 'user_updated').toLowerCase(),
        entityType: (log.entity_type || 'user').toLowerCase(),
        entityId: (log.entity_id || '').toString(),
        entityName: (log.entity_name || log.entity_id || '').toString(),
        performedBy: log.username || log.performed_by || 'System',
        performedAt: new Date(log.timestamp || log.performed_at || Date.now()),
        previousValue: formatValue(log.old_value) || undefined,
        newValue: formatValue(log.new_value) || undefined,
        details: log.details || summarizeChange(log.old_value, log.new_value),
      }));
  },
};
