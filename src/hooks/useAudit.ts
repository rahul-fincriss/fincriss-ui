import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/audit.service';

export function useAuditLogs(params: any = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditService.listLogs(params),
  });
}

// Rule configuration specific audit logs
export function useRuleAuditLogs(params: any = {}) {
  return useQuery({
    queryKey: ['rule-audit-logs', params],
    queryFn: () => auditService.listRuleAuditLogs(params),
  });
}

// Workforce/Admin audit logs
export function useAdminAuditLogs(params: any = {}) {
  return useQuery({
    queryKey: ['admin-audit-logs', params],
    queryFn: () => auditService.listAdminLogs(params),
  });
}

// Full audit history for a single entity (alert / case / str), for detail pages
export function useEntityHistory(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['entity-history', entityType, entityId],
    queryFn: () => auditService.getEntityHistory(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
}
