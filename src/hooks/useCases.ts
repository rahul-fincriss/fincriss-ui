import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesService, CaseOutcome, ListCasesParams, UpdateCaseRequest } from '@/services/cases.service';
import { toast } from 'sonner';

export function useCases(params: ListCasesParams = {}) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => casesService.listCases(params),
  });
}

export function useCase(caseId: string) {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: () => casesService.getCase(caseId),
    enabled: !!caseId,
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ caseId, request }: { caseId: string; request: UpdateCaseRequest }) => 
      casesService.updateCase(caseId, request),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      toast.success('Case updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update case:', error);
      toast.error(error.response?.data?.detail || 'Failed to update case');
    }
  });
}

export function useCaseAssignees(enabled = true) {
  return useQuery({
    queryKey: ['case-assignees'],
    queryFn: () => casesService.listAssignees(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCasesByCustomer(customerId?: string) {
  return useQuery({
    queryKey: ['cases', 'customer', customerId],
    queryFn: () => casesService.getCasesByCustomer(customerId!),
    enabled: !!customerId,
  });
}

export function useAttachAlertToCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, alertId }: { caseId: string; alertId: string }) =>
      casesService.attachAlertToCase(caseId, alertId),
    onSuccess: (_, { alertId }) => {
      queryClient.invalidateQueries({ queryKey: ['alert', alertId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Alert added to case successfully');
    },
    onError: (error: any) => {
      console.error('Failed to attach alert to case:', error);
      toast.error(error.response?.data?.detail || 'Failed to add alert to case');
    },
  });
}

export function useCloseCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, outcome, rationale }: { caseId: string; outcome: CaseOutcome; rationale: string }) =>
      casesService.closeCase(caseId, outcome, rationale),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      toast.success('Case closed successfully');
    },
    onError: (error: any) => {
      console.error('Failed to close case:', error);
      toast.error(error.response?.data?.detail || 'Failed to close case');
    }
  });
}

export function useAddCaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, note }: { caseId: string; note: string }) =>
      casesService.addNote(caseId, note),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['entity-history', 'case', caseId] });
      toast.success('Note added');
    },
    onError: (error: any) => {
      console.error('Failed to add note:', error);
      toast.error(error.response?.data?.detail || 'Failed to add note');
    },
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, file }: { caseId: string; file: File }) =>
      casesService.uploadEvidence(caseId, file),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      toast.success('Evidence uploaded');
    },
    onError: (error: any) => {
      console.error('Failed to upload evidence:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to upload evidence');
    },
  });
}
