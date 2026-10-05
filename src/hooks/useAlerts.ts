import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsService, ListAlertsParams, OpenCaseRequest } from '@/services/alerts.service';
import { userManagementService } from '@/services/user-management.service';
import { toast } from 'sonner';

function extractErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
  return fallback;
}

export function useAlerts(params: ListAlertsParams = {}) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertsService.listAlerts(params),
  });
}

export function useAlert(alertId: string) {
  return useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => alertsService.getAlert(alertId),
    enabled: !!alertId,
  });
}

export function useOpenCase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, request }: { alertId: string; request: OpenCaseRequest }) => 
      alertsService.openCase(alertId, request),
    onSuccess: (_, { alertId }) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert', alertId] });
      toast.success('Case opened successfully');
    },
    onError: (error: any) => {
      console.error('Failed to open case:', error);
      toast.error(extractErrorMessage(error, 'Failed to open case'));
    }
  });
}

export function useGenerateSummary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, regenerate }: { alertId: string; regenerate?: boolean }) =>
      alertsService.generateSummary(alertId, regenerate),
    onSuccess: (_, { alertId }) => {
      queryClient.invalidateQueries({ queryKey: ['alert', alertId] });
      toast.success('AI summary generated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to generate summary:', error);
      toast.error(extractErrorMessage(error, 'Failed to generate AI summary'));
    }
  });
}

export function useAssignAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, assignedTo, workflowStatus }: { alertId: string; assignedTo: string; workflowStatus?: string }) => {
      const shouldReassign = workflowStatus === 'ASSIGNED' || workflowStatus === 'IN_REVIEW' || workflowStatus === 'ESCALATED';
      console.log(`[assign] alert=${alertId} workflowStatus=${workflowStatus} → ${shouldReassign ? 'reassign' : 'assign'}`);
      return shouldReassign
        ? alertsService.reassignAlert(alertId, assignedTo)
        : alertsService.assignAlert(alertId, assignedTo);
    },
    onSuccess: (_, { workflowStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success(workflowStatus === 'NEW' ? 'Alert assigned successfully' : 'Alert reassigned successfully');
    },
    onError: (error: any) => {
      console.error('Failed to assign alert:', error);
      toast.error(extractErrorMessage(error, 'Failed to assign alert'));
    },
  });
}

export function useAlertAssignees(enabled = true) {
  return useQuery({
    queryKey: ['alert-assignees'],
    queryFn: () => alertsService.listAssignees(),
    enabled,
  });
}

export function useUsers(params: any = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userManagementService.listUsers(params),
  });
}

// ── Analyst workflow mutations ───────────────────────────────────────────────

function invalidateAlert(queryClient: ReturnType<typeof useQueryClient>, alertId: string) {
  queryClient.invalidateQueries({ queryKey: ['alerts'] });
  queryClient.invalidateQueries({ queryKey: ['alert', alertId] });
  queryClient.invalidateQueries({ queryKey: ['entity-history', 'alert', alertId] });
  queryClient.invalidateQueries({ queryKey: ['alert-queue'] });
}

export function useStartReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => alertsService.startReview(alertId),
    onSuccess: (_, alertId) => {
      invalidateAlert(queryClient, alertId);
      toast.success('Review started');
    },
    onError: (error: any) => toast.error(extractErrorMessage(error, 'Failed to start review')),
  });
}

export function useEscalateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, notes, assignedToUserId }: { alertId: string; notes?: string; assignedToUserId?: number }) =>
      alertsService.escalateAlert(alertId, { notes, assigned_to_user_id: assignedToUserId }),
    onSuccess: (data, { alertId }) => {
      invalidateAlert(queryClient, alertId);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success(data?.created === false ? 'Alert escalated (case already existed)' : 'Alert escalated to case');
    },
    onError: (error: any) => toast.error(extractErrorMessage(error, 'Failed to escalate alert')),
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, reason }: { alertId: string; reason: string }) =>
      alertsService.dismissAlert(alertId, reason),
    onSuccess: (_, { alertId }) => {
      invalidateAlert(queryClient, alertId);
      toast.success('Alert dismissed');
    },
    onError: (error: any) => toast.error(extractErrorMessage(error, 'Failed to dismiss alert')),
  });
}

export function useBulkAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertIds, userId }: { alertIds: string[]; userId: number }) =>
      alertsService.bulkAssign(alertIds, userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-queue'] });
      const assigned = data?.assigned?.length ?? 0;
      const skipped = data?.skipped?.length ?? 0;
      toast.success(`Assigned ${assigned} alert${assigned === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}`);
    },
    onError: (error: any) => toast.error(extractErrorMessage(error, 'Failed to bulk-assign alerts')),
  });
}

// ── Triage queues ────────────────────────────────────────────────────────────

export function useMyQueue(params: { workflow_status?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['alert-queue', 'mine', params],
    queryFn: () => alertsService.getMyQueue(params),
  });
}

export function useUnassignedQueue(params: { priority_level?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['alert-queue', 'unassigned', params],
    queryFn: () => alertsService.getUnassignedQueue(params),
  });
}

export function useWorkload() {
  return useQuery({
    queryKey: ['alert-queue', 'workload'],
    queryFn: () => alertsService.getWorkload(),
  });
}

// ── Alert notes ──────────────────────────────────────────────────────────────

export function useAlertNotes(alertId: string) {
  return useQuery({
    queryKey: ['alert-notes', alertId],
    queryFn: () => alertsService.getNotes(alertId),
    enabled: !!alertId,
  });
}

export function useAddAlertNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, note }: { alertId: string; note: string }) =>
      alertsService.addNote(alertId, note),
    onSuccess: (_, { alertId }) => {
      queryClient.invalidateQueries({ queryKey: ['alert-notes', alertId] });
      toast.success('Note added');
    },
    onError: (error: any) => toast.error(extractErrorMessage(error, 'Failed to add note')),
  });
}
