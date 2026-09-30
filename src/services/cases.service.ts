import api from '@/lib/api-client';
import { Case, CaseFindings, CaseLinkedAlert, CaseStatus, CaseStrStatus, CaseTransaction, RiskLevel } from '@/types';

function mapFindings(f: any): CaseFindings | undefined {
  if (!f) return undefined;
  return {
    ruleScore: f.rule_score,
    ruleReasons: f.rule_reasons,
    mlScore: f.ml_score,
    priorityScore: f.priority_score,
    explanation: f.explanation,
    modelVersion: f.model_version,
    sourceAlertId: f.source_alert_id,
    frozenAt: f.frozen_at ? new Date(f.frozen_at) : undefined,
  };
}

function mapTransactions(txns: any[]): CaseTransaction[] {
  return (txns || []).map((t: any) => ({
    transId: String(t.trans_id),
    accountId: t.account_id,
    customerId: t.customer_id,
    date: new Date(t.trans_date),
    amount: t.amount || 0,
    currency: t.currency || 'INR',
    transType: t.trans_type,
    description: t.description,
    counterpartyId: t.counterparty_id,
    country: t.country,
    channel: t.channel,
    sourceAlertId: t.source_alert_id,
  }));
}

function mapLinkedAlerts(alerts: any[]): CaseLinkedAlert[] {
  return (alerts || []).map((a: any) => ({
    alertId: a.alert_id,
    alertType: a.alert_type,
    amount: a.amount,
    currency: a.currency,
    alertDate: a.alert_date ? new Date(a.alert_date) : undefined,
    priorityScore: a.priority_score,
    priorityLevel: a.priority_level,
    ruleReasons: a.rule_reasons,
    workflowStatus: a.workflow_status,
    linkedAt: a.linked_at ? new Date(a.linked_at) : undefined,
  }));
}

export interface ListCasesParams {
  priority?: string;
  status?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateCaseRequest {
  status?: string;
  assigned_to_user_id?: number;
  summary?: string;
}

export type CaseOutcome = 'TRUE_POSITIVE' | 'FALSE_POSITIVE';

export interface CaseAssignee {
  userId: number;
  username: string;
  fullName: string;
}

// Fields shared by the list, by-customer and detail responses.
function mapCaseSummary(c: any): Case {
  const assignee = c.assigned_to_username || undefined;
  return {
    id: String(c.case_id ?? c.id),
    caseNumber: c.case_number,
    alertId: c.alert_id,
    title: c.case_number || `Investigation: ${c.customer_name || 'Customer'}`,
    customerId: String(c.customer_id ?? ''),
    customerName: c.customer_name || 'Unknown Customer',
    status: (c.status?.toLowerCase() as CaseStatus) || 'open',
    priority: (c.priority_level || 'medium').toLowerCase() as RiskLevel,
    priorityScore: c.priority_score ?? undefined,
    ruleScore: c.rule_score ?? undefined,
    mlScore: c.ml_score ?? undefined,
    strStatus: (c.str_status as CaseStrStatus) ?? null,
    createdAt: new Date(c.created_at || Date.now()),
    updatedAt: new Date(c.updated_at || c.created_at || Date.now()),
    closedAt: c.closed_at ? new Date(c.closed_at) : undefined,
    assignedTo: assignee,
    assignedToUserId: c.assigned_to_user_id ?? undefined,
    investigatorId: c.investigator_id != null ? String(c.investigator_id) : undefined,
    investigatorName: assignee || 'Unassigned',
    summary: c.summary || '',
    description: c.summary || '',
    alertsCount: c.alerts_count ?? (Array.isArray(c.linked_alerts) ? c.linked_alerts.length : 0),
    linkedAlerts: [],
    // The backend has no SLA field yet; assume 3 days from creation.
    slaDeadline: new Date(new Date(c.created_at || Date.now()).getTime() + 86400000 * 3),
    totalAmount: c.total_amount ?? c.amount ?? 0,
    currency: c.currency || 'INR',
    alertType: c.alert_type,
    alertDate: c.alert_date ? new Date(c.alert_date) : undefined,
    customerRiskRating: c.risk_rating,
    customerIsPep: !!c.is_pep,
    notes: [],
    documents: [],
    transactions: [],
  };
}

export const casesService = {
  async listCases(params: ListCasesParams = {}): Promise<Case[]> {
    const response = await api.get('/api/cases', { params });
    const data = response.data;
    const cases = Array.isArray(data) ? data : (data.cases || data.items || []);
    return cases.map(mapCaseSummary);
  },

  async getCase(caseId: string): Promise<Case> {
    const response = await api.get(`/api/cases/${caseId}`);
    const c = response.data;
    const summary = c.alert_ai_summary;

    return {
      ...mapCaseSummary(c),
      alertsCount: (c.linked_alerts || []).length,
      linkedAlerts: (c.linked_alerts || []).map((a: any) => typeof a === 'string' ? a : a.alert_id || a.id),
      linkedAlertDetails: mapLinkedAlerts(c.linked_alerts),
      notes: (c.notes || []).map((n: any) => ({
        id: String(n.id || Math.random()),
        authorId: n.user_id || '',
        authorName: n.full_name || n.username || 'System',
        content: n.note || n.content || '',
        timestamp: new Date(n.created_at || Date.now()),
      })),
      documents: (c.documents || c.evidence || []).map((d: any) => ({
        id: String(d.id || Math.random()),
        name: d.file_name || d.name || d.filename || 'Document',
        type: d.type || d.file_type || 'file',
        uploadedBy: d.full_name || d.username || d.uploaded_by || d.uploadedBy || 'Unknown',
        uploadedAt: new Date(d.uploaded_at || d.created_at || Date.now()),
        url: d.url || d.file_url || '#',
      })),
      frozenFindings: mapFindings(c.frozen_findings),
      transactions: mapTransactions(c.transactions),
      severity: c.severity,
      scenarioCode: c.scenario_code,
      customerNationality: c.nationality,
      customerIndustryCode: c.industry_code,
      customerOccupation: c.occupation,
      customerSince: c.customer_since,
      customerType: c.customer_type,
      customerFeatures: c.customer_features || null,
      alertAiSummary: summary
        ? {
            alertSummary: summary.alert_summary,
            riskSignals: summary.risk_signals || [],
            profileAnalysis: summary.profile_analysis,
            model: summary.model,
            generatedAt: summary.generated_at ? new Date(summary.generated_at) : undefined,
          }
        : null,
    };
  },

  async updateCase(caseId: string, request: UpdateCaseRequest): Promise<void> {
    await api.patch(`/api/cases/${caseId}`, request);
  },

  async closeCase(caseId: string, outcome: CaseOutcome, rationale: string): Promise<void> {
    await api.post(`/api/cases/${caseId}/close`, { outcome, rationale });
  },

  async getCasesByCustomer(customerId: string): Promise<Case[]> {
    const response = await api.get(`/api/customers/${customerId}/cases`);
    const data = response.data;
    const cases = Array.isArray(data) ? data : (data.cases || data.items || []);
    return cases.map(mapCaseSummary);
  },

  // Active users whose role grants cases:write (requires cases:write).
  async listAssignees(): Promise<CaseAssignee[]> {
    const response = await api.get('/api/cases/assignees');
    return (response.data?.users || []).map((u: any) => ({
      userId: u.user_id,
      username: u.username,
      fullName: u.full_name,
    }));
  },

  async attachAlertToCase(caseId: string, alertId: string): Promise<void> {
    await api.post(`/api/cases/${caseId}/attach-alert`, { alert_id: alertId });
  },

  // Add a note to a case (cases:read). Returns the created note.
  async addNote(caseId: string, note: string): Promise<any> {
    const response = await api.post(`/api/cases/${caseId}/notes`, { note });
    return response.data;
  },

  // Upload evidence: register the file to get a presigned S3 PUT URL, then
  // upload the bytes directly to S3 (not through the API). Requires cases:write
  // and S3 configured server-side (503 otherwise).
  async uploadEvidence(caseId: string, file: File): Promise<any> {
    const { data } = await api.post(
      `/api/cases/${caseId}/evidence`,
      null,
      { params: { file_name: file.name } }
    );
    if (data?.upload_url) {
      const put = await fetch(data.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) {
        throw new Error(`Upload to storage failed (HTTP ${put.status})`);
      }
    }
    return data;
  },
};
