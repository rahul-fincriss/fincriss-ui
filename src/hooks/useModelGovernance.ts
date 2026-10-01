import { useQuery } from '@tanstack/react-query';
import { modelService } from '@/services/model.service';

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
