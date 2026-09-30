import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import api from '@/lib/api-client';
import { caseNarrativeService } from './caseNarrative.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockPut = api.put as unknown as ReturnType<typeof vi.fn>;

const apiNarrative = {
  version: 2.0,
  sections: {
    grounds_of_suspicion: 'PEP with large inflows.',
    transaction_analysis: 'SWIFT credit from CPTY-1.',
    customer_profile_vs_activity: 'Income does not support activity.',
    investigation_findings: 'Source of funds not evidenced.',
    conclusion: 'Reportable.',
    red_flags: ['PEP', 'High-risk jurisdiction'],
  },
  narrative_text: 'GROUNDS OF SUSPICION:\nPEP with large inflows.',
  source: 'EDITED',
  model: null,
  inputs_summary: { alerts: 1, transactions: 2, notes: 3, risk_profile: true, frozen_findings: true },
  created_by_name: 'Super Admin',
  created_at: '2026-10-01T10:00:00',
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
});

describe('caseNarrativeService', () => {
  it('maps the current narrative, inputs and version history', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        current: apiNarrative,
        versions: [
          { version: 2.0, source: 'EDITED', created_by_name: 'Super Admin', created_at: '2026-10-01T10:00:00' },
          { version: 1.0, source: 'AI', model: 'gpt-4o', created_at: '2026-10-01T09:00:00' },
        ],
      },
    });

    const state = await caseNarrativeService.get('122');

    expect(mockGet).toHaveBeenCalledWith('/api/cases/122/narrative');
    expect(state.current?.version).toBe(2);
    expect(state.current?.source).toBe('EDITED');
    expect(state.current?.sections.investigation_findings).toBe('Source of funds not evidenced.');
    expect(state.current?.sections.red_flags).toEqual(['PEP', 'High-risk jurisdiction']);
    expect(state.current?.inputs).toEqual({
      alerts: 1, transactions: 2, notes: 3, riskProfile: true, frozenFindings: true,
    });
    expect(state.versions.map((v) => v.version)).toEqual([2, 1]);
  });

  it('returns a null current narrative when none exists yet', async () => {
    mockGet.mockResolvedValueOnce({ data: { current: null, versions: [] } });
    const state = await caseNarrativeService.get('8');
    expect(state.current).toBeNull();
    expect(state.versions).toEqual([]);
  });

  it('POSTs to generate and PUTs edited sections', async () => {
    mockPost.mockResolvedValueOnce({ data: { current: { ...apiNarrative, source: 'AI', version: 1 } } });
    const generated = await caseNarrativeService.generate('122');
    expect(mockPost).toHaveBeenCalledWith('/api/cases/122/narrative/generate');
    expect(generated?.source).toBe('AI');

    mockPut.mockResolvedValueOnce({ data: { current: apiNarrative } });
    const sections = generated!.sections;
    await caseNarrativeService.save('122', sections);
    expect(mockPut).toHaveBeenCalledWith('/api/cases/122/narrative', { sections });
  });
});
