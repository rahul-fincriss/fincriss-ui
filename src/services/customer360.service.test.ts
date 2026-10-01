import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn() } }));

import api from '@/lib/api-client';
import { customer360Service } from './customer360.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;

describe('customer alert history', () => {
  it('uses the analyst workflow status, not the legacy scored_alerts status', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        alerts: [{
          alert_id: 'ALT9', alert_date: '2026-04-06T10:00:00', priority_level: 'MEDIUM', priority_score: '55.5',
          workflow_status: 'PENDING', alert_workflow_status: 'DISMISSED', amount: '1200.00', currency: 'INR',
        }],
      },
    });
    const [a] = await customer360Service.getAlertHistory('CUS1');
    expect(mockGet).toHaveBeenCalledWith('/api/customers/CUS1/alerts', { params: { limit: 50 } });
    expect(a.workflowStatus).toBe('DISMISSED');
    expect(a.priorityScore).toBe(55.5);
    expect(a.alertDate).toBeInstanceOf(Date);
  });
});
