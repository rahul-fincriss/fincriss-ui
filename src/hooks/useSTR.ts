import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { strService, ListSTRParams } from '@/services/str.service';
import { toast } from 'sonner';

function errMsg(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
  return fallback;
}

export function useStrList(params: ListSTRParams = {}) {
  return useQuery({
    queryKey: ['strs', params],
    queryFn: () => strService.list(params),
  });
}

export function usePendingStrs() {
  return useQuery({
    queryKey: ['strs', 'pending'],
    queryFn: () => strService.listPending(),
  });
}

export function useStr(strId?: number) {
  return useQuery({
    queryKey: ['str', strId],
    queryFn: () => strService.get(strId!),
    enabled: !!strId,
  });
}

export function useStrByCase(caseId?: string) {
  return useQuery({
    queryKey: ['str', 'by-case', caseId],
    queryFn: () => strService.getByCase(caseId!),
    enabled: !!caseId,
  });
}

function invalidateStr(qc: ReturnType<typeof useQueryClient>, caseId?: string | number) {
  qc.invalidateQueries({ queryKey: ['strs'] });
  qc.invalidateQueries({ queryKey: ['str'] });
  qc.invalidateQueries({ queryKey: ['cases'] });
  if (caseId != null) {
    qc.invalidateQueries({ queryKey: ['case', String(caseId)] });
  }
}

export function useCreateStrDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, narrative, evidenceRefs, narrativeSource }: { caseId: string | number; narrative?: string; evidenceRefs?: string[]; narrativeSource?: string }) =>
      strService.createDraft(caseId, { narrative, evidence_refs: evidenceRefs, narrative_source: narrativeSource }),
    onSuccess: (_, { caseId }) => {
      invalidateStr(qc, caseId);
      toast.success('STR draft created');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to create STR draft')),
  });
}

export function useUpdateStrDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ strId, narrative, evidenceRefs, narrativeSource }: { strId: number; caseId?: string | number; narrative?: string; evidenceRefs?: string[]; narrativeSource?: string }) =>
      strService.updateDraft(strId, { narrative, evidence_refs: evidenceRefs, narrative_source: narrativeSource }),
    onSuccess: (_, { caseId }) => {
      invalidateStr(qc, caseId);
      toast.success('STR saved');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to save STR')),
  });
}

export function useSubmitStr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ strId }: { strId: number; caseId?: string | number }) => strService.submit(strId),
    onSuccess: (_, { caseId }) => {
      invalidateStr(qc, caseId);
      toast.success('STR submitted for approval');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to submit STR')),
  });
}

export function useApproveStr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ strId }: { strId: number; caseId?: string | number }) => strService.approve(strId),
    onSuccess: (_, { caseId }) => {
      invalidateStr(qc, caseId);
      toast.success('STR approved');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to approve STR')),
  });
}

export function useRejectStr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ strId, reason }: { strId: number; reason: string; caseId?: string | number }) =>
      strService.reject(strId, reason),
    onSuccess: (_, { caseId }) => {
      invalidateStr(qc, caseId);
      toast.success('STR rejected');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to reject STR')),
  });
}

export function useSubmitStrToRegulator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ strId }: { strId: number; caseId?: string | number }) => strService.submitToRegulator(strId),
    onSuccess: (_, { caseId }) => {
      invalidateStr(qc, caseId);
      toast.success('STR submitted to regulator');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to submit to regulator')),
  });
}
