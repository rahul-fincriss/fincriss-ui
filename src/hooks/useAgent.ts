import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agentService, AgentContextType } from '@/services/agent.service';

export function errorDetail(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

/** Keyed by user, so a different sign-in in the same tab never sees someone else's conversation. */
export function useAgentConversation(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['agent-conversation', userId],
    queryFn: () => agentService.getConversation(),
    enabled,
    staleTime: Infinity,   // the chat keeps its own state once loaded
  });
}

export function useAskAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ message, context }: { message: string; context: { type: AgentContextType; id: string } }) =>
      agentService.ask(message, context),
    onSettled: () => qc.invalidateQueries({ queryKey: ['agent-settings'] }),
  });
}

export function useAgentSettings(enabled: boolean) {
  return useQuery({ queryKey: ['agent-settings'], queryFn: () => agentService.getSettings(), enabled });
}

export function useUpdateAgentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: { enabled: boolean; hourlyLimit: number }) => agentService.updateSettings(s),
    onSuccess: (data) => {
      qc.setQueryData(['agent-settings'], data);
      qc.invalidateQueries({ queryKey: ['agent-conversation'] });
      toast.success('Assistant settings saved');
    },
    onError: (e: any) => toast.error(errorDetail(e, 'Could not save the settings')),
  });
}
