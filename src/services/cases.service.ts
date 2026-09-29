import api from '@/lib/api-client';
import { Case, CaseStatus, RiskLevel } from '@/types';

export interface ListCasesParams {
  priority?: string;
  status?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateCaseRequest {
  status?: string;
  assigned_to?: string;
}

export const casesService = {
  async listCases(params: ListCasesParams = {}): Promise<Case[]> {
    const response = await api.get('/api/cases', { params });
    const data = response.data;
    
    const cases = Array.isArray(data) ? data : (data.cases || data.items || []);
    return cases.map((c: any) => ({
      id: (c.case_id || c.id).toString(),
      title: c.title || `Investigation: ${c.customer_name || 'Customer'}`,
      customerId: (c.customer_id || '').toString(),
      customerName: c.customer_name || 'Unknown Customer',
      status: (c.status?.toLowerCase() as CaseStatus) || 'open',
      priority: (c.priority?.toLowerCase() as RiskLevel) || 'medium',
      createdAt: new Date(c.created_at || c.timestamp),
      updatedAt: new Date(c.updated_at || c.created_at || c.timestamp),
      assignedTo: c.assigned_to,
      description: c.description || '',
      alertsCount: c.alerts_count || 0,
      linkedAlerts: c.linked_alerts || [],
      slaDeadline: new Date(c.sla_deadline || c.created_at || Date.now() + 86400000 * 3), // Default 3 days
      totalAmount: c.total_amount || 0,
      currency: c.currency || 'INR',
      notes: [],
      documents: [],
    }));
  },

  async getCase(caseId: string): Promise<Case> {
    const response = await api.get(`/api/cases/${caseId}`);
    const c = response.data;
    
    return {
      id: (c.case_id || c.id).toString(),
      title: c.title || c.case_number || `Investigation: ${c.customer_name || 'Customer'}`,
      customerId: (c.customer_id || '').toString(),
      customerName: c.customer_name || 'Unknown Customer',
      status: (c.status?.toLowerCase() as CaseStatus) || 'open',
      priority: ((c.priority_level || c.priority || 'medium').toLowerCase() as RiskLevel),
      createdAt: new Date(c.created_at || Date.now()),
      updatedAt: new Date(c.updated_at || c.created_at || Date.now()),
      assignedTo: c.assigned_to || c.investigator_id,
      investigatorId: c.investigator_id,
      investigatorName: c.investigator_name || c.assigned_to || 'Unassigned',
      description: c.description || c.summary || '',
      alertsCount: c.alerts_count || (c.linked_alerts || []).length,
      linkedAlerts: (c.linked_alerts || []).map((a: any) => typeof a === 'string' ? a : a.alert_id || a.id),
      slaDeadline: new Date(c.sla_deadline || new Date(c.created_at || Date.now()).getTime() + 86400000 * 3),
      totalAmount: c.total_amount || c.amount || 0,
      currency: c.currency || 'INR',
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
    };
  },

  async updateCase(caseId: string, request: UpdateCaseRequest): Promise<void> {
    await api.patch(`/api/cases/${caseId}`, request);
  },

  async closeCase(caseId: string, notes: string): Promise<void> {
    await api.post(`/api/cases/${caseId}/close`, { notes });
  },

  async getCasesByCustomer(customerId: string): Promise<Case[]> {
    const response = await api.get(`/api/customers/${customerId}/cases`);
    const data = response.data;
    const cases = Array.isArray(data) ? data : (data.cases || data.items || []);
    return cases.map((c: any) => ({
      id: (c.case_id || c.id).toString(),
      title: c.title || c.case_number || `Investigation: ${c.customer_name || 'Customer'}`,
      customerId: (c.customer_id || '').toString(),
      customerName: c.customer_name || 'Unknown Customer',
      status: (c.status?.toLowerCase() as CaseStatus) || 'open',
      priority: ((c.priority_level || c.priority || 'medium').toLowerCase() as RiskLevel),
      createdAt: new Date(c.created_at || Date.now()),
      updatedAt: new Date(c.updated_at || c.created_at || Date.now()),
      assignedTo: c.assigned_to_username || c.assigned_to,
      description: c.summary || c.description || '',
      alertsCount: c.alerts_count || 0,
      linkedAlerts: c.linked_alerts || [],
      slaDeadline: new Date(c.sla_deadline || new Date(c.created_at || Date.now()).getTime() + 86400000 * 3),
      totalAmount: c.total_amount || c.amount || 0,
      currency: c.currency || 'INR',
      notes: [],
      documents: [],
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
