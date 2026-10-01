import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { modelService } from '@/services/model.service';

function errMsg(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export function useModelStatus() {
  return useQuery({ queryKey: ['model-status'], queryFn: () => modelService.getStatus() });
}

export function useModelVersions() {
  return useQuery({ queryKey: ['model-versions'], queryFn: () => modelService.listVersions() });
}

export function useModelMonitoring(from?: string, to?: string) {
  return useQuery({
    queryKey: ['model-monitoring', from ?? null, to ?? null],
    queryFn: () => modelService.getMonitoring(from, to),
  });
}

export function useTrainingJobs() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['model-jobs'],
    queryFn: () => modelService.listJobs(),
    // Poll while a retrain is queued or running.
    refetchInterval: (q) => {
      const latest = q.state.data?.[0];
      return latest && (latest.status === 'QUEUED' || latest.status === 'RUNNING') ? 5000 : false;
    },
  });

  // When the latest job finishes, it has produced a candidate (or failed):
  // refresh the views that show versions and pending decisions.
  const latest = query.data?.[0];
  const finishedKey = latest && (latest.status === 'SUCCEEDED' || latest.status === 'FAILED')
    ? `${latest.id}:${latest.status}` : null;
  useEffect(() => {
    if (!finishedKey) return;
    qc.invalidateQueries({ queryKey: ['model-versions'] });
    qc.invalidateQueries({ queryKey: ['model-promotions'] });
  }, [finishedKey, qc]);

  return query;
}

export function useModelPromotions() {
  return useQuery({ queryKey: ['model-promotions'], queryFn: () => modelService.listPromotions() });
}

function useGovernanceMutation<V>(fn: (v: V) => Promise<void>, success: string, failure: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      ['model-jobs', 'model-promotions', 'model-versions', 'model-status'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }));
      toast.success(success);
    },
    onError: (e: any) => toast.error(errMsg(e, failure)),
  });
}

export function useRequestRetrain() {
  return useGovernanceMutation((reason: string) => modelService.requestRetrain(reason),
    'Retrain requested. The training worker will pick it up shortly.', 'Could not request the retrain');
}

export function useRequestRollback() {
  return useGovernanceMutation(
    ({ version, reason }: { version: string; reason: string }) => modelService.requestRollback(version, reason),
    'Rollback requested. It needs a Principal Officer\'s approval.', 'Could not request the rollback');
}

export function useDecidePromotion() {
  return useGovernanceMutation(
    ({ id, decision, note }: { id: number; decision: 'approve' | 'reject'; note: string }) =>
      decision === 'approve' ? modelService.approve(id, note) : modelService.reject(id, note),
    'Decision recorded', 'Could not record the decision');
}
