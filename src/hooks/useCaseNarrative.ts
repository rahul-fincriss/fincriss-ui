import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { caseNarrativeService, NarrativeSections } from '@/services/caseNarrative.service';

function errMsg(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

function invalidate(qc: ReturnType<typeof useQueryClient>, caseId: string) {
  qc.invalidateQueries({ queryKey: ['case-narrative', caseId] });
  qc.invalidateQueries({ queryKey: ['entity-history', 'case', caseId] });
}

export function useCaseNarrative(caseId?: string) {
  return useQuery({
    queryKey: ['case-narrative', caseId],
    queryFn: () => caseNarrativeService.get(caseId!),
    enabled: !!caseId,
  });
}

export function useGenerateCaseNarrative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => caseNarrativeService.generate(caseId),
    onSuccess: (_, caseId) => {
      invalidate(qc, caseId);
      toast.success('AI narrative generated');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to generate the AI narrative')),
  });
}

export function useSaveCaseNarrative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, sections }: { caseId: string; sections: NarrativeSections }) =>
      caseNarrativeService.save(caseId, sections),
    onSuccess: (_, { caseId }) => {
      invalidate(qc, caseId);
      toast.success('Narrative saved as a new version');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to save the narrative')),
  });
}
