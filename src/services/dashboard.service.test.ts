import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));

import api from '@/lib/api-client';
import { dashboardService } from './dashboard.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;

describe('dashboardService', () => {
  beforeEach(() => { mockGet.mockReset(); });

  it('maps tiles and each list kind from the role-based endpoint', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        role: 'analyst', scope: 'mine',
        tiles: [{ key: 'my_high', label: 'My High Priority Alerts', value: 11, subtitle: 'Assigned to you, open',
                  link: '/alerts/workbench?priority=high&analyst=Arjun+Mehta' }],
        lists: [
          { key: 'my_alerts', kind: 'alerts', title: 'My Priority Alerts', description: '', link: null,
            empty: 'No alerts assigned to you',
            items: [{ alert_id: 'ALT1', priority_level: 'HIGH', priority_score: 91.5, workflow_status: 'ASSIGNED',
                      alert_date: '2026-04-06T00:00:00', amount: 1000, currency: 'INR', customer_name: 'X' }] },
          { key: 'my_escalations', kind: 'cases', title: 'Cases', description: '', link: '/cases', empty: 'none',
            items: [{ case_id: 7, case_number: 'CASE-2026-00007', status: 'UNDER_REVIEW',
                      created_at: '2026-05-01T00:00:00', amount: 5, customer_name: 'Y' }] },
          { key: 'w', kind: 'workload', title: 'W', items: [{ name: 'A', assigned: 2, in_review: 1, total: 3 }] },
        ],
      },
    });

    const d = await dashboardService.getDashboard();

    expect(mockGet).toHaveBeenCalledWith('/api/dashboard');
    expect(d.scope).toBe('mine');
    expect(d.tiles[0]).toMatchObject({ key: 'my_high', value: 11 });
    const [alerts, cases, workload] = d.lists as any[];
    expect(alerts.items[0]).toMatchObject({ alertId: 'ALT1', riskLevel: 'high', workflowStatus: 'ASSIGNED' });
    expect(alerts.items[0].alertDate).toBeInstanceOf(Date);
    expect(cases.items[0]).toMatchObject({ caseId: 7, caseNumber: 'CASE-2026-00007', status: 'under_review',
                                           currency: 'INR' });
    expect(workload.items[0]).toMatchObject({ inReview: 1, total: 3 });
    expect(workload.empty).toBe('Nothing to show');
  });

  it('does not invent tiles when the server omits them', async () => {
    mockGet.mockResolvedValueOnce({ data: { role: 'triage_manager', scope: 'bank', tiles: [], lists: [] } });
    const d = await dashboardService.getDashboard();
    expect(d.tiles).toEqual([]);
    expect(d.lists).toEqual([]);
  });
});
