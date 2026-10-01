import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

import api from '@/lib/api-client';
import { agentService } from './agent.service';

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockPut = api.put as unknown as ReturnType<typeof vi.fn>;

describe('agentService', () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); mockPut.mockReset(); });

  it('asks about the record on screen and maps the answer', async () => {
    mockPost.mockResolvedValueOnce({ data: {
      id: 7, answer: 'Paid Amit Pillai (CP000062) twice.', created_at: '2026-10-01T10:00:00',
      sources: [{ kind: 'transactions', ref: 'CUST1', label: 'Customer transactions', href: '/customers?id=CUST1' }],
      tools_used: ['summarize_transactions'],
    } });
    const a = await agentService.ask('Who did they pay most?', { type: 'case', id: '122' });
    expect(mockPost).toHaveBeenCalledWith('/api/agent/chat',
      { message: 'Who did they pay most?', context: { type: 'case', id: '122' } });
    expect(a.toolsUsed).toEqual(['summarize_transactions']);
    expect(a.sources[0].href).toBe('/customers?id=CUST1');
    expect(a.createdAt).toBeInstanceOf(Date);
  });

  it('restores the conversation with context and remaining questions', async () => {
    mockGet.mockResolvedValueOnce({ data: {
      conversation_id: 3, enabled: true, hourly_limit: 30, questions_left: 25,
      messages: [{ id: 1, role: 'user', content: 'Any PEP?', context_type: 'alert', context_id: 'ALT1',
                   sources: null, created_at: '2026-10-01T10:00:00' }],
    } });
    const c = await agentService.getConversation();
    expect(c.questionsLeft).toBe(25);
    expect(c.messages[0]).toMatchObject({ role: 'user', contextType: 'alert', contextId: 'ALT1', sources: [] });
  });

  it('reads and saves the assistant settings', async () => {
    mockPut.mockResolvedValueOnce({ data: { enabled: false, hourly_limit: 10,
                                            last_24h: { questions: 4, users: 2, tokens: 900 } } });
    const s = await agentService.updateSettings({ enabled: false, hourlyLimit: 10 });
    expect(mockPut).toHaveBeenCalledWith('/api/settings/agent', { enabled: false, hourly_limit: 10 });
    expect(s).toEqual({ enabled: false, hourlyLimit: 10, last24h: { questions: 4, users: 2, tokens: 900 } });
  });
});
