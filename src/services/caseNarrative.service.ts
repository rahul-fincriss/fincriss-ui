import api from '@/lib/api-client';

// Section keys returned by the backend, in STR order.
export const NARRATIVE_SECTIONS = [
  { key: 'grounds_of_suspicion', label: 'Grounds of Suspicion' },
  { key: 'transaction_analysis', label: 'Transaction Narrative' },
  { key: 'customer_profile_vs_activity', label: 'Customer Profile vs Activity' },
  { key: 'investigation_findings', label: 'Investigation Findings' },
  { key: 'conclusion', label: 'Conclusion' },
] as const;

export type NarrativeSectionKey = (typeof NARRATIVE_SECTIONS)[number]['key'];

export type NarrativeSections = Record<NarrativeSectionKey, string> & { red_flags: string[] };

export interface NarrativeInputs {
  alerts: number;
  transactions: number;
  notes: number;
  riskProfile: boolean;
  frozenFindings: boolean;
}

export interface CaseNarrative {
  version: number;
  sections: NarrativeSections;
  narrativeText: string;
  source: 'AI' | 'EDITED';
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  inputs?: NarrativeInputs;
  createdByName?: string;
  createdAt: Date;
}

export interface NarrativeVersion {
  version: number;
  source: 'AI' | 'EDITED';
  model?: string;
  createdByName?: string;
  createdAt: Date;
}

export interface CaseNarrativeState {
  current: CaseNarrative | null;
  versions: NarrativeVersion[];
}

function mapSections(s: any): NarrativeSections {
  const out: any = { red_flags: Array.isArray(s?.red_flags) ? s.red_flags.map(String) : [] };
  NARRATIVE_SECTIONS.forEach(({ key }) => { out[key] = s?.[key] || ''; });
  return out;
}

function mapNarrative(n: any): CaseNarrative | null {
  if (!n) return null;
  const inputs = n.inputs_summary;
  return {
    version: Number(n.version),
    sections: mapSections(n.sections),
    narrativeText: n.narrative_text || '',
    source: n.source,
    model: n.model || undefined,
    promptTokens: n.prompt_tokens ?? undefined,
    completionTokens: n.completion_tokens ?? undefined,
    inputs: inputs
      ? {
          alerts: Number(inputs.alerts ?? 0),
          transactions: Number(inputs.transactions ?? 0),
          notes: Number(inputs.notes ?? 0),
          riskProfile: !!inputs.risk_profile,
          frozenFindings: !!inputs.frozen_findings,
        }
      : undefined,
    createdByName: n.created_by_name || undefined,
    createdAt: new Date(n.created_at),
  };
}

export const caseNarrativeService = {
  async get(caseId: string): Promise<CaseNarrativeState> {
    const { data } = await api.get(`/api/cases/${caseId}/narrative`);
    return {
      current: mapNarrative(data.current),
      versions: (data.versions || []).map((v: any) => ({
        version: Number(v.version),
        source: v.source,
        model: v.model || undefined,
        createdByName: v.created_by_name || undefined,
        createdAt: new Date(v.created_at),
      })),
    };
  },

  async generate(caseId: string): Promise<CaseNarrative | null> {
    const { data } = await api.post(`/api/cases/${caseId}/narrative/generate`);
    return mapNarrative(data.current);
  },

  async save(caseId: string, sections: NarrativeSections): Promise<CaseNarrative | null> {
    const { data } = await api.put(`/api/cases/${caseId}/narrative`, { sections });
    return mapNarrative(data.current);
  },
};
