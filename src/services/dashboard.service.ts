import api from '@/lib/api-client';
import { CaseStatus, RiskLevel } from '@/types';

// The server decides what each role sees (GET /api/dashboard); this layer only maps it.

export interface DashboardTile {
  key: string;
  label: string;
  value: number | string;
  subtitle: string;
  link: string | null;
}

export interface DashboardAlertItem {
  alertId: string;
  riskLevel: RiskLevel;
  priorityScore: number;
  workflowStatus: string;
  alertDate: Date | null;
  amount: number;
  currency: string;
  customerName: string;
}

export interface DashboardCaseItem {
  caseId: number;
  caseNumber: string;
  status: CaseStatus;
  createdAt: Date | null;
  amount: number;
  currency: string;
  customerName: string;
}

export interface DashboardStrItem {
  strId: number;
  caseId: number;
  caseNumber: string;
  customerName: string;
  version: number;
  updatedAt: Date | null;
}

export interface DashboardWorkloadItem {
  name: string;
  assigned: number;
  inReview: number;
  total: number;
}

interface ListBase {
  key: string;
  title: string;
  description: string;
  link: string | null;
  empty: string;
}

export type DashboardList =
  | (ListBase & { kind: 'alerts'; items: DashboardAlertItem[] })
  | (ListBase & { kind: 'cases'; items: DashboardCaseItem[] })
  | (ListBase & { kind: 'strs'; items: DashboardStrItem[] })
  | (ListBase & { kind: 'workload'; items: DashboardWorkloadItem[] });

export interface Dashboard {
  role: string;
  scope: 'bank' | 'investigator' | 'mine';
  tiles: DashboardTile[];
  lists: DashboardList[];
}

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

function mapItems(kind: string, items: any[]): any[] {
  switch (kind) {
    case 'alerts':
      return items.map((a) => ({
        alertId: a.alert_id,
        riskLevel: (a.priority_level?.toLowerCase() as RiskLevel) || 'medium',
        priorityScore: a.priority_score ?? 0,
        workflowStatus: a.workflow_status,
        alertDate: toDate(a.alert_date),
        amount: a.amount ?? 0,
        currency: a.currency || 'INR',
        customerName: a.customer_name,
      }));
    case 'cases':
      return items.map((c) => ({
        caseId: c.case_id,
        caseNumber: c.case_number || `Case ${c.case_id}`,
        status: (c.status?.toLowerCase() as CaseStatus) || 'open',
        createdAt: toDate(c.created_at),
        amount: c.amount ?? 0,
        currency: c.currency || 'INR',
        customerName: c.customer_name,
      }));
    case 'strs':
      return items.map((s) => ({
        strId: s.str_id,
        caseId: s.case_id,
        caseNumber: s.case_number || `Case ${s.case_id}`,
        customerName: s.customer_name,
        version: s.version ?? 1,
        updatedAt: toDate(s.updated_at),
      }));
    case 'workload':
      return items.map((w) => ({
        name: w.name, assigned: w.assigned ?? 0, inReview: w.in_review ?? 0, total: w.total ?? 0,
      }));
    default:
      return [];
  }
}

export const dashboardService = {
  async getDashboard(): Promise<Dashboard> {
    const { data } = await api.get('/api/dashboard');
    return {
      role: data.role,
      scope: data.scope,
      tiles: (data.tiles || []).map((t: any) => ({
        key: t.key, label: t.label, value: t.value ?? 0, subtitle: t.subtitle || '', link: t.link ?? null,
      })),
      lists: (data.lists || []).map((l: any) => ({
        key: l.key, kind: l.kind, title: l.title, description: l.description || '',
        link: l.link ?? null, empty: l.empty || 'Nothing to show', items: mapItems(l.kind, l.items || []),
      })),
    };
  },
};
