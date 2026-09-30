import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import api from '@/lib/api-client';
import { casesService } from './cases.service';

const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockPost.mockReset();
  mockGet.mockReset();
});

describe('casesService.listCases', () => {
  it('maps the list fields the API actually sends (counts, totals, assignee, STR status)', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        total: 1,
        cases: [{
          case_id: 122,
          case_number: 'CASE-2026-00121',
          alert_id: 'ALT20260406000252',
          customer_id: 'CUST000217',
          customer_name: 'Indira Mehta',
          priority_level: 'HIGH',
          status: 'IN_PROGRESS',
          assigned_to_user_id: 4,
          assigned_to_username: 'Vikram Rao',
          amount: 100,
          total_amount: 9182424.63,
          alerts_count: 2,
          str_status: 'DRAFT',
          created_at: '2026-09-30T16:18:28Z',
        }],
      },
    });

    const [c] = await casesService.listCases({ limit: 500 });

    expect(mockGet).toHaveBeenCalledWith('/api/cases', { params: { limit: 500 } });
    expect(c.caseNumber).toBe('CASE-2026-00121');
    expect(c.alertId).toBe('ALT20260406000252');
    expect(c.status).toBe('in_progress');
    expect(c.priority).toBe('high');
    expect(c.alertsCount).toBe(2);
    expect(c.totalAmount).toBe(9182424.63);
    expect(c.investigatorName).toBe('Vikram Rao');
    expect(c.assignedToUserId).toBe(4);
    expect(c.strStatus).toBe('DRAFT');
  });

  it('falls back to the alert amount and "Unassigned" when there are no transactions or assignee', async () => {
    mockGet.mockResolvedValueOnce({
      data: { cases: [{ case_id: 8, status: 'CLOSED_FALSE_POSITIVE', amount: 250, str_status: null }] },
    });

    const [c] = await casesService.listCases();

    expect(c.status).toBe('closed_false_positive');
    expect(c.totalAmount).toBe(250);
    expect(c.investigatorName).toBe('Unassigned');
    expect(c.strStatus).toBeNull();
  });
});

describe('casesService.closeCase', () => {
  it('sends outcome and rationale (the backend rejects anything else)', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await casesService.closeCase('122', 'FALSE_POSITIVE', 'Funds traced to property sale');
    expect(mockPost).toHaveBeenCalledWith('/api/cases/122/close', {
      outcome: 'FALSE_POSITIVE',
      rationale: 'Funds traced to property sale',
    });
  });
});

describe('casesService.getCase', () => {
  it('maps frozen_findings, transactions and linked_alerts instead of discarding them', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        case_id: 122,
        case_number: 'CASE-2026-00121',
        customer_id: 'CUST000217',
        status: 'OPEN',
        priority_level: 'HIGH',
        created_at: '2026-09-30T16:18:28Z',
        frozen_findings: {
          rule_score: 100,
          rule_reasons: { PEP: 100 },
          ml_score: 1.0,
          priority_score: 100.0,
          explanation: 'PEP detected.',
          model_version: 'v2.1',
          source_alert_id: 'ALT20260406000252',
          frozen_at: '2026-09-30T10:48:28Z',
        },
        transactions: [
          {
            trans_id: 448706,
            trans_date: '2026-01-14T17:53:03Z',
            amount: 9182424.63,
            currency: 'INR',
            trans_type: 'WIRE',
            description: 'WIRE via SWIFT',
            country: 'IND',
            channel: 'SWIFT',
          },
        ],
        linked_alerts: [
          { alert_id: 'ALT20260406000252', priority_level: 'HIGH', rule_reasons: { PEP: 100 }, workflow_status: 'ESCALATED' },
        ],
      },
    });

    const c = await casesService.getCase('122');

    expect(c.frozenFindings?.ruleScore).toBe(100);
    expect(c.frozenFindings?.ruleReasons).toEqual({ PEP: 100 });
    expect(c.frozenFindings?.sourceAlertId).toBe('ALT20260406000252');
    expect(c.transactions).toHaveLength(1);
    expect(c.transactions[0].transId).toBe('448706');
    expect(c.transactions[0].amount).toBe(9182424.63);
    expect(c.linkedAlertDetails).toHaveLength(1);
    expect(c.linkedAlertDetails?.[0].ruleReasons).toEqual({ PEP: 100 });
    expect(c.caseNumber).toBe('CASE-2026-00121');
  });

  it('maps customer features and the originating alert AI summary', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        case_id: 122,
        alert_id: 'ALT20260406000252',
        status: 'OPEN',
        customer_features: { txn_count_30d: 12, avg_amount_30d: 5000 },
        alert_ai_summary: {
          alert_summary: 'PEP with large cross-border flows.',
          risk_signals: [{ signal: 'PEP', description: 'Government employee' }],
          profile_analysis: 'Activity exceeds declared income.',
          model: 'gpt-4o',
        },
      },
    });

    const c = await casesService.getCase('122');

    expect(c.alertId).toBe('ALT20260406000252');
    expect(c.customerFeatures).toEqual({ txn_count_30d: 12, avg_amount_30d: 5000 });
    expect(c.alertAiSummary?.alertSummary).toBe('PEP with large cross-border flows.');
    expect(c.alertAiSummary?.riskSignals).toHaveLength(1);
  });

  it('leaves frozenFindings undefined and transactions empty when the case predates the feature', async () => {
    mockGet.mockResolvedValueOnce({
      data: { case_id: 8, customer_id: 'CUST000003', status: 'OPEN', frozen_findings: null, transactions: [], linked_alerts: [] },
    });

    const c = await casesService.getCase('8');

    expect(c.frozenFindings).toBeUndefined();
    expect(c.transactions).toEqual([]);
  });
});

describe('casesService.addNote', () => {
  it('POSTs the note to the case notes endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 1, note: 'reviewed' } });
    await casesService.addNote('120', 'reviewed');
    expect(mockPost).toHaveBeenCalledWith('/api/cases/120/notes', { note: 'reviewed' });
  });
});

describe('casesService.uploadEvidence', () => {
  it('registers the file, then PUTs bytes to the presigned URL', async () => {
    mockPost.mockResolvedValueOnce({
      data: { evidence_id: 9, upload_url: 'https://s3.example/put?sig=abc' },
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['data'], 'statement.pdf', { type: 'application/pdf' });
    const res = await casesService.uploadEvidence('120', file);

    // registration call carries the file name as a query param
    expect(mockPost).toHaveBeenCalledWith('/api/cases/120/evidence', null, {
      params: { file_name: 'statement.pdf' },
    });
    // direct S3 PUT of the bytes
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.example/put?sig=abc',
      expect.objectContaining({ method: 'PUT', body: file })
    );
    expect(res.evidence_id).toBe(9);

    vi.unstubAllGlobals();
  });

  it('throws if the S3 PUT fails', async () => {
    mockPost.mockResolvedValueOnce({ data: { upload_url: 'https://s3.example/put' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const file = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    await expect(casesService.uploadEvidence('120', file)).rejects.toThrow(/403/);
    vi.unstubAllGlobals();
  });
});
