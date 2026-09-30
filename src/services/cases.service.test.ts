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
