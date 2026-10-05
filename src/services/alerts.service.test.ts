import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api-client';
import { alertsService } from './alerts.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('analyst workflow actions', () => {
  it('startReview POSTs to the start-review endpoint (no body)', async () => {
    mockPost.mockResolvedValueOnce({ data: { workflow_status: 'IN_REVIEW' } });
    await alertsService.startReview('ALT1');
    expect(mockPost).toHaveBeenCalledWith('/api/alerts/ALT1/start-review');
  });

  it('escalateAlert POSTs notes + assignee', async () => {
    mockPost.mockResolvedValueOnce({ data: { case_id: 5, created: true } });
    await alertsService.escalateAlert('ALT1', { notes: 'esc', assigned_to_user_id: 6 });
    expect(mockPost).toHaveBeenCalledWith('/api/alerts/ALT1/escalate', {
      notes: 'esc',
      assigned_to_user_id: 6,
    });
  });

  it('dismissAlert POSTs the reason', async () => {
    mockPost.mockResolvedValueOnce({ data: { workflow_status: 'DISMISSED' } });
    await alertsService.dismissAlert('ALT1', 'false positive - payroll');
    expect(mockPost).toHaveBeenCalledWith('/api/alerts/ALT1/dismiss', {
      reason: 'false positive - payroll',
    });
  });
});

describe('triage actions', () => {
  it('bulkAssign POSTs alert_ids + user_id', async () => {
    mockPost.mockResolvedValueOnce({ data: { assigned: ['A', 'B'], skipped: [] } });
    await alertsService.bulkAssign(['A', 'B'], 5);
    expect(mockPost).toHaveBeenCalledWith('/api/alerts/bulk-assign', {
      alert_ids: ['A', 'B'],
      user_id: 5,
    });
  });

  it('getMyQueue unwraps the {alerts} envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 1, alerts: [{ alert_id: 'A' }] } });
    const rows = await alertsService.getMyQueue({ workflow_status: 'ASSIGNED' });
    expect(mockGet).toHaveBeenCalledWith('/api/alerts/queue/mine', {
      params: { workflow_status: 'ASSIGNED' },
    });
    expect(rows).toHaveLength(1);
  });

  it('getUnassignedQueue unwraps the {alerts} envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { alerts: [{ alert_id: 'A' }, { alert_id: 'B' }] } });
    const rows = await alertsService.getUnassignedQueue();
    expect(mockGet).toHaveBeenCalledWith('/api/alerts/queue/unassigned', { params: {} });
    expect(rows).toHaveLength(2);
  });

  it('getWorkload unwraps the {analysts} envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { analysts: [{ user_id: 1 }] } });
    const rows = await alertsService.getWorkload();
    expect(mockGet).toHaveBeenCalledWith('/api/alerts/queue/workload');
    expect(rows).toHaveLength(1);
  });
});

describe('alert notes', () => {
  it('getNotes unwraps the {notes} envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { alert_id: 'A', notes: [{ id: 1, note: 'hi' }] } });
    const rows = await alertsService.getNotes('A');
    expect(mockGet).toHaveBeenCalledWith('/api/alerts/A/notes');
    expect(rows).toHaveLength(1);
  });

  it('addNote POSTs the note body', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 2, note: 'flagged' } });
    await alertsService.addNote('A', 'flagged');
    expect(mockPost).toHaveBeenCalledWith('/api/alerts/A/notes', { note: 'flagged' });
  });
});

describe('alert detail for the FinCrisS Agent', () => {
  it('maps the raw payload and the alert transaction id', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        alert_id: 'ALT1', alert_date: '2026-04-06T10:00:00', priority_level: 'HIGH',
        trans_id: 'TXN42', raw_data: { channel: 'SWIFT', scenario: 'DORMANT' },
      },
    });
    const a: any = await alertsService.getAlert('ALT1');
    expect(a.transId).toBe('TXN42');
    expect(a.rawData).toEqual({ channel: 'SWIFT', scenario: 'DORMANT' });
  });
});

describe('record visibility support', () => {
  it('lists alert assignees in the user shape the assignment UI expects', async () => {
    mockGet.mockResolvedValueOnce({
      data: { assignees: [{ user_id: 5, username: 'analyst1', full_name: 'Arjun Mehta', role: 'analyst' }] },
    });
    const list = await alertsService.listAssignees();
    expect(mockGet).toHaveBeenCalledWith('/api/alerts/assignees');
    expect(list[0]).toMatchObject({ id: '5', name: 'Arjun Mehta', role: 'analyst', roles: ['analyst'], status: 'active' });
  });

  it('maps the alert date for the workbench age column', async () => {
    mockGet.mockResolvedValueOnce({
      data: { alerts: [{ alert_id: 'ALT1', alert_date: '2026-04-06T00:00:00', priority_level: 'HIGH' }] },
    });
    const [a] = await alertsService.listAlerts({ workflow_status: 'ESCALATED' } as any);
    expect(mockGet).toHaveBeenCalledWith('/api/alerts/open', { params: { workflow_status: 'ESCALATED' } });
    expect(a.alertDate).toBeInstanceOf(Date);
  });
});
