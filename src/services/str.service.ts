import api from '@/lib/api-client';

// STR lifecycle status (backend, uppercase):
// DRAFT → PENDING_APPROVAL → APPROVED → SUBMITTED | REJECTED
export type STRWorkflowStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUBMITTED';

export interface STR {
  id: number;
  caseId: number;
  caseNumber?: string;
  priorityLevel?: string;
  status: STRWorkflowStatus;
  narrative?: string;
  evidenceRefs: string[];
  version: number;
  createdBy?: number;
  createdByUsername?: string;
  approvedBy?: number;
  rejectionReason?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapStr = (s: any): STR => ({
  id: s.id,
  caseId: s.case_id,
  caseNumber: s.case_number,
  priorityLevel: s.priority_level,
  status: (s.status || 'DRAFT') as STRWorkflowStatus,
  narrative: s.narrative,
  evidenceRefs: Array.isArray(s.evidence_refs) ? s.evidence_refs : [],
  version: s.version ?? 1,
  createdBy: s.created_by,
  createdByUsername: s.created_by_username,
  approvedBy: s.approved_by,
  rejectionReason: s.rejection_reason,
  submittedAt: s.submitted_at,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

const extractList = (data: any): any[] =>
  Array.isArray(data) ? data : (data.strs || data.items || []);

export interface ListSTRParams {
  status?: string;
  case_id?: number;
  limit?: number;
  offset?: number;
}

export const strService = {
  async list(params: ListSTRParams = {}): Promise<STR[]> {
    const response = await api.get('/api/str', { params });
    return extractList(response.data).map(mapStr);
  },

  // Principal Officer's pending-approval queue (requires str:approve).
  async listPending(): Promise<STR[]> {
    const response = await api.get('/api/str/pending');
    return extractList(response.data).map(mapStr);
  },

  async get(strId: number): Promise<STR> {
    const response = await api.get(`/api/str/${strId}`);
    return mapStr(response.data);
  },

  // The one active STR for a case (or null). There's no case-embedded STR, so we
  // query by case_id for the id, then fetch full detail — the list endpoint omits
  // the narrative, which only /api/str/{id} returns.
  async getByCase(caseId: string | number): Promise<STR | null> {
    const response = await api.get('/api/str', { params: { case_id: Number(caseId) } });
    const rows = extractList(response.data);
    if (!rows.length) return null;
    return strService.get(rows[0].id);
  },

  async createDraft(
    caseId: string | number,
    body: { narrative?: string; evidence_refs?: string[]; narrative_source?: string }
  ): Promise<any> {
    const response = await api.post(`/api/cases/${caseId}/str`, body);
    return response.data;
  },

  async updateDraft(
    strId: number,
    body: { narrative?: string; evidence_refs?: string[]; narrative_source?: string }
  ): Promise<any> {
    const response = await api.patch(`/api/str/${strId}`, body);
    return response.data;
  },

  async submit(strId: number): Promise<any> {
    const response = await api.post(`/api/str/${strId}/submit`);
    return response.data;
  },

  async approve(strId: number): Promise<any> {
    const response = await api.post(`/api/str/${strId}/approve`);
    return response.data;
  },

  async reject(strId: number, reason: string): Promise<any> {
    const response = await api.post(`/api/str/${strId}/reject`, { reason });
    return response.data;
  },

  async submitToRegulator(strId: number): Promise<any> {
    const response = await api.post(`/api/str/${strId}/submit-to-regulator`);
    return response.data;
  },
};
