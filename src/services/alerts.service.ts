import api from '@/lib/api-client';
import { PrioritizedAlert, AlertStatus, RiskLevel } from '@/types';

export interface ListAlertsParams {
  priority_level?: string;
  status?: string;
  has_case?: boolean;
  limit?: number;
  offset?: number;
}

export interface OpenCaseRequest {
  assigned_to?: string;
  notes?: string;
}

export const alertsService = {
  async listAlerts(params: ListAlertsParams = {}): Promise<PrioritizedAlert[]> {
    const response = await api.get('/api/alerts/open', { params });
    // Note: We might need to map the API response to our internal PrioritizedAlert type
    // if the field names differ (e.g., camelCase vs snake_case)
    const data = response.data;
    
    // Preliminary mapping based on common patterns
    const alerts = Array.isArray(data) ? data : (data.alerts || data.items || []);
    return alerts.map((alert: any) => ({
      id: alert.alert_id || alert.id,
      sourceSystem: alert.source_system || alert.sourceSystem || 'Legacy',
      alertType: alert.alert_type || alert.alertType || 'behavior_deviation',
      customerId: alert.customer_id || alert.customerId,
      customerName: alert.customer_name || alert.customerName,
      amount: alert.amount || 0,
      currency: alert.currency || 'INR',
      timestamp: new Date(alert.timestamp || alert.created_at),
      status: (alert.status?.toLowerCase() as AlertStatus) || 'new',
      mapsScore: alert.priority_score || alert.mapsScore || 0,
      riskLevel: (alert.priority_level?.toLowerCase() as RiskLevel) || 'medium',
      riskDrivers: alert.risk_drivers || alert.riskDrivers || [],
      slaDeadline: new Date(alert.sla_deadline || Date.now() + 86400000),
      rawPayload: alert.raw_payload || {},
      assignedTo: alert.assigned_to_username || alert.assigned_to,
      workflowStatus: alert.workflow_status,
    }));
  },

  async getAlert(alertId: string): Promise<any> {
    const response = await api.get(`/api/alerts/${alertId}`);
    const alert = response.data;
    
    // Return full API response with normalized base fields
    return {
      // Base PrioritizedAlert fields
      id: alert.alert_id || alert.id,
      sourceSystem: alert.source_system || alert.sourceSystem || 'Legacy',
      alertType: alert.alert_type || alert.alertType || 'behavior_deviation',
      customerId: alert.customer?.customer_id || alert.customer_id || alert.customerId,
      customerName: alert.customer?.full_name || alert.customer_name || alert.customerName,
      amount: alert.amount || 0,
      currency: alert.currency || 'INR',
      timestamp: new Date(alert.alert_date || alert.timestamp || alert.created_at || Date.now()),
      status: (alert.status?.toLowerCase() as AlertStatus) || 'new',
      mapsScore: alert.priority_score || alert.mapsScore || 0,
      riskLevel: (alert.priority_level?.toLowerCase() as RiskLevel) || 'medium',
      riskDrivers: alert.risk_drivers || alert.riskDrivers || [],
      slaDeadline: new Date(alert.sla_deadline || Date.now() + 86400000),
      rawPayload: alert.raw_payload || alert,
      assignedTo: alert.assigned_to,
      workflowStatus: alert.workflow_status || alert.workflowStatus,
      // Extended fields from full API response
      priorityScore: alert.priority_score,
      ruleScore: alert.rule_score,
      mlScore: alert.ml_score,
      ruleReasons: alert.rule_reasons || {},
      explanation: alert.explanation,
      modelVersion: alert.model_version,
      severity: alert.severity,
      scenarioCode: alert.scenario_code,
      scoredAt: alert.scored_at,
      investigatedAt: alert.investigated_at,
      alertDate: alert.alert_date,
      transId: alert.trans_id ?? undefined,
      rawData: alert.raw_data ?? null,
      // Nested customer object
      customer: alert.customer ? {
        customerId: alert.customer.customer_id,
        fullName: alert.customer.full_name,
        type: alert.customer.type,
        riskRating: alert.customer.risk_rating,
        isPep: alert.customer.is_pep,
        nationality: alert.customer.nationality,
        industryCode: alert.customer.industry_code,
        occupation: alert.customer.occupation,
        customerSince: alert.customer.customer_since,
        kycLastUpdated: alert.customer.kyc_last_updated,
      } : null,
      // Transaction features
      features: alert.features ? {
        txnCount7d: alert.features.txn_count_7d,
        txnCount30d: alert.features.txn_count_30d,
        txnCount90d: alert.features.txn_count_90d,
        avgAmount30d: alert.features.avg_amount_30d,
        maxAmount30d: alert.features.max_amount_30d,
        uniqueCounterparties30d: alert.features.unique_counterparties_30d,
        countriesCount30d: alert.features.countries_count_30d,
        highRiskCountryTxns30d: alert.features.high_risk_country_txns_30d,
        cashIntensiveRatio: alert.features.cash_intensive_ratio,
        alertCount30d: alert.features.alert_count_30d,
        alertCount90d: alert.features.alert_count_90d,
        featuresComputedAt: alert.features.features_computed_at,
      } : null,
      // Case info
      caseInfo: alert.case || null,
      // AI summary
      aiSummary: alert.ai_summary ? {
        alertSummary: alert.ai_summary.alert_summary,
        riskSignals: alert.ai_summary.risk_signals || [],
        profileAnalysis: alert.ai_summary.profile_analysis,
        model: alert.ai_summary.model,
        generatedAt: alert.ai_summary.generated_at,
      } : null,
    };
  },

  async openCase(alertId: string, request: OpenCaseRequest): Promise<{ case_id: number; created: boolean }> {
    const response = await api.post(`/api/alerts/${alertId}/open-case`, request);
    return response.data;
  },

  async generateSummary(alertId: string, regenerate = false): Promise<any> {
    const response = await api.post(`/api/alerts/${alertId}/generate-summary`, null, {
      params: regenerate ? { regenerate: true } : undefined,
    });
    return response.data;
  },

  async assignAlert(alertId: string, assignedTo: string): Promise<any> {
    const response = await api.post(`/api/alerts/${alertId}/assign`, { user_id: Number(assignedTo) });
    return response.data;
  },

  async reassignAlert(alertId: string, assignedTo: string): Promise<any> {
    const response = await api.post(`/api/alerts/${alertId}/reassign`, { user_id: Number(assignedTo) });
    return response.data;
  },

  // ── Analyst workflow (require alerts:write) ────────────────────────────────

  // ASSIGNED → IN_REVIEW
  async startReview(alertId: string): Promise<any> {
    const response = await api.post(`/api/alerts/${alertId}/start-review`);
    return response.data;
  },

  // IN_REVIEW → ESCALATED (creates/links a case)
  async escalateAlert(
    alertId: string,
    options: { assigned_to_user_id?: number; notes?: string } = {}
  ): Promise<any> {
    const response = await api.post(`/api/alerts/${alertId}/escalate`, options);
    return response.data;
  },

  // IN_REVIEW → DISMISSED (reason is mandatory, min 5 chars server-side)
  async dismissAlert(alertId: string, reason: string): Promise<any> {
    const response = await api.post(`/api/alerts/${alertId}/dismiss`, { reason });
    return response.data;
  },

  // ── Triage (require alerts:assign) ─────────────────────────────────────────

  async bulkAssign(alertIds: string[], userId: number): Promise<any> {
    const response = await api.post('/api/alerts/bulk-assign', {
      alert_ids: alertIds,
      user_id: userId,
    });
    return response.data;
  },

  async getMyQueue(params: { workflow_status?: string; limit?: number; offset?: number } = {}): Promise<any[]> {
    const response = await api.get('/api/alerts/queue/mine', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data.alerts || data.items || []);
  },

  async getUnassignedQueue(params: { priority_level?: string; limit?: number; offset?: number } = {}): Promise<any[]> {
    const response = await api.get('/api/alerts/queue/unassigned', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data.alerts || data.items || []);
  },

  async getWorkload(): Promise<any[]> {
    const response = await api.get('/api/alerts/queue/workload');
    const data = response.data;
    return Array.isArray(data) ? data : (data.analysts || data.items || []);
  },

  // ── Alert notes (require alerts:read) ──────────────────────────────────────

  async getNotes(alertId: string): Promise<any[]> {
    const response = await api.get(`/api/alerts/${alertId}/notes`);
    const data = response.data;
    return Array.isArray(data) ? data : (data.notes || data.items || []);
  },

  async addNote(alertId: string, note: string): Promise<any> {
    const response = await api.post(`/api/alerts/${alertId}/notes`, { note });
    return response.data;
  },
};
