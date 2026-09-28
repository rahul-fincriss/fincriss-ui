import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the axios instance the service imports.
vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));

import api from '@/lib/api-client';
import { auditService } from './audit.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;

// A representative workflow_audit_log row as returned by GET /api/audit-logs.
const alertRow = {
  id: 39,
  user_id: 1,
  username: 'admin',
  action: 'ALERT_ASSIGNED',
  entity_type: 'ALERT',
  entity_id: 'ALT20260406000107',
  old_value: { workflow_status: 'NEW' },
  new_value: { workflow_status: 'ASSIGNED', assigned_to_user_id: 5 },
  timestamp: '2026-05-26T15:13:40.464619+05:30',
};

const roleRow = {
  id: 42,
  user_id: 1,
  username: 'admin',
  action: 'ROLE_CREATED',
  entity_type: 'ROLE',
  entity_id: '7',
  old_value: null,
  new_value: { role_name: 'analyst' },
  timestamp: '2026-05-26T15:14:00+05:30',
};

beforeEach(() => {
  mockGet.mockReset();
});

describe('auditService.listLogs', () => {
  it('hits the real /api/audit-logs endpoint (not the rules fallback)', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 1, logs: [alertRow] } });
    await auditService.listLogs();
    expect(mockGet).toHaveBeenCalledWith('/api/audit-logs', { params: {} });
  });

  it('lowercases entity_type and synthesizes details from old/new value', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 1, logs: [alertRow] } });
    const [entry] = await auditService.listLogs();
    expect(entry.entityType).toBe('alert');
    expect(entry.entityId).toBe('ALT20260406000107');
    expect(entry.action).toBe('ALERT_ASSIGNED');
    expect(entry.performedBy).toBe('admin');
    expect(entry.performedAt).toBeInstanceOf(Date);
    // details should reflect the NEW -> ASSIGNED transition and the new assignee
    expect(entry.details).toContain('workflow_status: NEW → ASSIGNED');
    expect(entry.details).toContain('assigned_to_user_id: 5');
  });
});

describe('auditService.getEntityHistory', () => {
  it('calls the per-entity endpoint with an upper-cased type', async () => {
    mockGet.mockResolvedValueOnce({
      data: { entity_type: 'ALERT', entity_id: 'ALT1', logs: [alertRow] },
    });
    const history = await auditService.getEntityHistory('alert', 'ALT1');
    expect(mockGet).toHaveBeenCalledWith('/api/audit-logs/ALERT/ALT1');
    expect(history).toHaveLength(1);
    expect(history[0].entityType).toBe('alert');
  });
});

describe('auditService.listAdminLogs', () => {
  it('hits /api/audit-logs and keeps only admin entity types', async () => {
    mockGet.mockResolvedValueOnce({ data: { logs: [alertRow, roleRow] } });
    const entries = await auditService.listAdminLogs();
    expect(mockGet).toHaveBeenCalledWith('/api/audit-logs', {
      params: { limit: 100 },
    });
    // ALERT row filtered out; only the ROLE row survives
    expect(entries).toHaveLength(1);
    expect(entries[0].entityType).toBe('role');
    expect(entries[0].actionType).toBe('role_created');
  });
});

describe('auditService.listRuleAuditLogs', () => {
  it('still targets the rules audit-log endpoint', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0, entries: [] } });
    await auditService.listRuleAuditLogs();
    expect(mockGet).toHaveBeenCalledWith('/api/rules/audit-log', { params: {} });
  });
});
