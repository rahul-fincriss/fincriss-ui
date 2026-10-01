import api from '@/lib/api-client';

export type AgentContextType = 'alert' | 'case' | 'page';

export interface AgentSource {
  kind: string;
  ref: string;
  label: string;
  href?: string | null;
}

export interface AgentAnswer {
  id: number;
  answer: string;
  sources: AgentSource[];
  toolsUsed: string[];
  createdAt: Date;
}

export interface AgentHistoryMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  contextType?: AgentContextType;
  contextId?: string;
  sources: AgentSource[];
  createdAt: Date;
}

export interface AgentConversation {
  conversationId: number | null;
  messages: AgentHistoryMessage[];
  enabled: boolean;
  hourlyLimit: number;
  questionsLeft: number;
}

export interface AgentSettings {
  enabled: boolean;
  hourlyLimit: number;
  last24h: { questions: number; users: number; tokens: number };
}

const mapSettings = (d: any): AgentSettings => ({
  enabled: !!d.enabled,
  hourlyLimit: Number(d.hourly_limit),
  last24h: d.last_24h ?? { questions: 0, users: 0, tokens: 0 },
});

export const agentService = {
  async ask(message: string, context: { type: AgentContextType; id: string }): Promise<AgentAnswer> {
    const { data } = await api.post('/api/agent/chat', { message, context });
    return {
      id: data.id,
      answer: data.answer,
      sources: data.sources || [],
      toolsUsed: data.tools_used || [],
      createdAt: new Date(data.created_at),
    };
  },

  async getConversation(): Promise<AgentConversation> {
    const { data } = await api.get('/api/agent/conversation');
    return {
      conversationId: data.conversation_id ?? null,
      messages: (data.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content ?? '',
        contextType: m.context_type ?? undefined,
        contextId: m.context_id ?? undefined,
        sources: m.sources || [],
        createdAt: new Date(m.created_at),
      })),
      enabled: !!data.enabled,
      hourlyLimit: Number(data.hourly_limit),
      questionsLeft: Number(data.questions_left),
    };
  },

  async endConversation(): Promise<void> {
    await api.post('/api/agent/conversation/end');
  },

  async getSettings(): Promise<AgentSettings> {
    const { data } = await api.get('/api/settings/agent');
    return mapSettings(data);
  },

  async updateSettings(s: { enabled: boolean; hourlyLimit: number }): Promise<AgentSettings> {
    const { data } = await api.put('/api/settings/agent', { enabled: s.enabled, hourly_limit: s.hourlyLimit });
    return mapSettings(data);
  },
};
