import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import api from '@/lib/api-client';
import { strService } from './str.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockPatch = api.patch as unknown as ReturnType<typeof vi.fn>;

const row = {
  id: 5, case_id: 120, case_number: 'CASE-2026-120', priority_level: 'HIGH',
  status: 'PENDING_APPROVAL', narrative: 'text', evidence_refs: ['k1'],
  version: 2, created_by: 6, created_by_username: 'investigator1',
  submitted_at: '2026-09-29T10:00:00Z', created_at: '2026-09-29T09:00:00Z',
};

beforeEach(() => {
  mockGet.mockReset(); mockPost.mockReset(); mockPatch.mockReset();
});

describe('strService.list / mapping', () => {
  it('unwraps {strs} and maps snake_case → camelCase', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 1, strs: [row] } });
    const [s] = await strService.list({ status: 'PENDING_APPROVAL' });
    expect(mockGet).toHaveBeenCalledWith('/api/str', { params: { status: 'PENDING_APPROVAL' } });
    expect(s.id).toBe(5);
    expect(s.caseId).toBe(120);
    expect(s.caseNumber).toBe('CASE-2026-120');
    expect(s.status).toBe('PENDING_APPROVAL');
    expect(s.evidenceRefs).toEqual(['k1']);
    expect(s.createdByUsername).toBe('investigator1');
  });
});

describe('strService.getByCase', () => {
  it('queries by case_id then fetches full detail (list omits narrative)', async () => {
    // 1st call: list by case_id (returns id, no narrative). 2nd: detail by id.
    mockGet
      .mockResolvedValueOnce({ data: { strs: [{ id: 5, case_id: 120 }] } })
      .mockResolvedValueOnce({ data: row });
    const s = await strService.getByCase('120');
    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/str', { params: { case_id: 120 } });
    expect(mockGet).toHaveBeenNthCalledWith(2, '/api/str/5');
    expect(s?.id).toBe(5);
    expect(s?.narrative).toBe('text');
  });

  it('returns null when the case has no STR', async () => {
    mockGet.mockResolvedValueOnce({ data: { strs: [] } });
    expect(await strService.getByCase('999')).toBeNull();
  });
});

describe('strService lifecycle calls', () => {
  it('createDraft POSTs to the case STR endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { str_id: 5 } });
    await strService.createDraft(120, { narrative: 'n', evidence_refs: [] });
    expect(mockPost).toHaveBeenCalledWith('/api/cases/120/str', { narrative: 'n', evidence_refs: [] });
  });

  it('updateDraft PATCHes the STR', async () => {
    mockPatch.mockResolvedValueOnce({ data: { version: 3 } });
    await strService.updateDraft(5, { narrative: 'n2' });
    expect(mockPatch).toHaveBeenCalledWith('/api/str/5', { narrative: 'n2', evidence_refs: undefined });
  });

  it('submit / approve / submitToRegulator hit the right endpoints', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await strService.submit(5);
    await strService.approve(5);
    await strService.submitToRegulator(5);
    expect(mockPost).toHaveBeenCalledWith('/api/str/5/submit');
    expect(mockPost).toHaveBeenCalledWith('/api/str/5/approve');
    expect(mockPost).toHaveBeenCalledWith('/api/str/5/submit-to-regulator');
  });

  it('reject POSTs the reason', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await strService.reject(5, 'insufficient detail provided');
    expect(mockPost).toHaveBeenCalledWith('/api/str/5/reject', { reason: 'insufficient detail provided' });
  });
});
