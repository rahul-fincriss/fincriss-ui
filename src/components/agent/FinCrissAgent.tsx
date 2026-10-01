import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, Minimize2, Send, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { errorDetail, useAgentConversation, useAskAgent } from '@/hooks/useAgent';
import { AgentSource } from '@/services/agent.service';
import { AlertAction, AlertAnswer, AnswerBoundary, CaseAction, CaseAnswer, CaseLabel } from './AgentAnswers';
import { AgentTextAnswer } from './AgentTextAnswer';

// The assistant is on every page, for every role. On an alert or case it answers
// about that record (quick actions read its data directly); elsewhere it answers
// about the work in front of the user. Free-text questions go to /api/agent/chat,
// where the server looks things up with the asker's own permissions. It is
// read-only: it never escalates, dismisses, closes or files.

type Context = { type: 'alert' | 'case' | 'page'; id: string };

// Pages without a record: route → page key the API knows, and a display name.
const PAGES: { path: string; key: string; name: string }[] = [
  { path: '/dashboard', key: 'dashboard', name: 'Dashboard' },
  { path: '/alerts/workbench', key: 'workbench', name: 'Alert workbench' },
  { path: '/triage', key: 'triage', name: 'Triage queue' },
  { path: '/cases', key: 'cases', name: 'Cases' },
  { path: '/str', key: 'str', name: 'STR reports' },
  { path: '/customers', key: 'customers', name: 'Customer 360' },
  { path: '/audit', key: 'audit', name: 'Audit trail' },
  { path: '/ml-status', key: 'model', name: 'Model governance' },
  { path: '/rules-engine', key: 'rules', name: 'Rules engine' },
  { path: '/reference-data', key: 'reference', name: 'Reference data' },
  { path: '/workforce', key: 'workforce', name: 'Workforce' },
  { path: '/settings', key: 'settings', name: 'Settings' },
];
const pageName = (key: string) => PAGES.find((p) => p.key === key)?.name ?? key;

// Suggested questions per page, shown only when the role can see the answer.
const PAGE_SUGGESTIONS: Record<string, { text: string; needs: string[] }[]> = {
  dashboard: [
    { text: "What's in my queue, oldest first?", needs: ['alerts:read'] },
    { text: 'How many HIGH alerts are unassigned?', needs: ['alerts:read'] },
    { text: 'Which STRs are waiting for approval?', needs: ['str:read'] },
  ],
  workbench: [
    { text: 'What are the oldest HIGH alerts not yet started?', needs: ['alerts:read'] },
    { text: "What's in my queue, oldest first?", needs: ['alerts:read'] },
  ],
  triage: [
    { text: 'How many HIGH alerts are unassigned, and how old is the oldest?', needs: ['alerts:read'] },
    { text: 'Who on the team has the most open work?', needs: ['alerts:assign'] },
  ],
  cases: [
    { text: 'Which open cases have no one assigned?', needs: ['cases:read'] },
    { text: 'Which cases have an STR in progress?', needs: ['cases:read'] },
  ],
  str: [
    { text: 'Which STRs are waiting for my approval?', needs: ['str:approve'] },
    { text: 'Which STRs are still in draft?', needs: ['str:read'] },
  ],
  audit: [{ text: 'What were the most common actions this month?', needs: ['audit_log:read'] }],
  model: [{ text: "What's the state of the scoring model? Is anything pending?", needs: ['model:read'] }],
};
const DEFAULT_SUGGESTIONS = [{ text: "What's in my queue, oldest first?", needs: ['alerts:read'] }];

type Message =
  | { id: string; role: 'agent' | 'user'; text: string }
  | { id: string; role: 'divider'; context: Context }
  | { id: string; role: 'agent'; free: { text: string; sources: AgentSource[]; toolsUsed?: string[] } }
  | {
      id: string;
      role: 'agent';
      // Bound to the record it was asked about, not to whatever page is showing now.
      answer: { kind: 'alert'; action: AlertAction; recordId: string } | { kind: 'case'; action: CaseAction; recordId: string };
    };

// Each quick action needs the permissions to read what it shows.
const alertQuickActions: { label: string; action: AlertAction; needs: string[] }[] = [
  { label: 'Summarize why flagged', action: 'why-flagged', needs: ['alerts:read'] },
  { label: 'Show key transactions', action: 'key-transactions', needs: ['alerts:read', 'customers:read'] },
  { label: 'Explain risk drivers', action: 'risk-drivers', needs: ['alerts:read'] },
  { label: 'View raw payload', action: 'raw-payload', needs: ['alerts:read'] },
];

const caseQuickActions: { label: string; action: CaseAction; needs: string[] }[] = [
  { label: 'Case summary', action: 'case-summary', needs: ['cases:read'] },
  { label: 'Evidence checklist', action: 'evidence-checklist', needs: ['cases:read'] },
  { label: 'Draft STR points', action: 'str-points', needs: ['cases:read', 'str:read'] },
  { label: 'Show related alerts', action: 'related-alerts', needs: ['cases:read', 'customers:read'] },
];

function getContextFromPath(pathname: string): Context | null {
  const alertMatch = pathname.match(/^\/alerts\/([^/]+)$/);
  if (alertMatch && alertMatch[1] !== 'workbench') return { type: 'alert', id: decodeURIComponent(alertMatch[1]) };
  const caseMatch = pathname.match(/^\/cases\/([^/]+)$/);
  if (caseMatch) return { type: 'case', id: decodeURIComponent(caseMatch[1]) };
  const page = PAGES.find((p) => pathname === p.path);
  return page ? { type: 'page', id: page.key } : null;
}

function greeting(userName: string, context: Context): string {
  const firstName = userName.split(' ')[0];
  const subject = context.type === 'alert' ? `alert ${context.id}`
    : context.type === 'case' ? 'this case' : 'your work: queues, alerts, cases and more';
  return `Hi ${firstName}. Ask me anything about ${subject}, or pick a question below. ` +
    "I look things up with your own access rights and I can't change anything.";
}

function ContextName({ context }: { context: Context }) {
  if (context.type === 'alert') return <>Alert {context.id}</>;
  if (context.type === 'case') return <CaseLabel caseId={context.id} />;
  return <>{pageName(context.id)}</>;
}

let seq = 0;
const nextId = () => `m${++seq}`;

export function FinCrissAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [questionsLeft, setQuestionsLeft] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const prevContext = useRef<string | null>(null);
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const askAgent = useAskAgent();

  const context = getContextFromPath(location.pathname);
  const contextKey = context ? `${context.type}:${context.id}` : null;
  const { data: conversation } = useAgentConversation(user?.id, isOpen && !!user && !!context);

  // On open: the greeting, then this sign-in's earlier questions and answers.
  useEffect(() => {
    if (!isOpen || !user || !context || !conversation || loadedRef.current) return;
    loadedRef.current = true;
    const restored: Message[] = [];
    let last: string | null = null;
    for (const m of conversation.messages) {
      const key = m.contextType ? `${m.contextType}:${m.contextId}` : null;
      if (key && key !== last && m.contextType) {
        restored.push({ id: nextId(), role: 'divider', context: { type: m.contextType, id: m.contextId! } });
        last = key;
      }
      restored.push(m.role === 'user'
        ? { id: nextId(), role: 'user', text: m.content }
        : { id: nextId(), role: 'agent', free: { text: m.content, sources: m.sources } });
    }
    if (restored.length && last !== contextKey) restored.push({ id: nextId(), role: 'divider', context });
    setMessages([{ id: nextId(), role: 'agent', text: greeting(user.name, context) }, ...restored]);
    setQuestionsLeft(conversation.questionsLeft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, conversation, user?.id]);

  // A new record while the panel stays open: mark the switch.
  useEffect(() => {
    if (prevContext.current && contextKey && prevContext.current !== contextKey && context && messages.length) {
      setMessages((prev) => [...prev, { id: nextId(), role: 'divider', context }]);
    }
    prevContext.current = contextKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey]);

  // Bring the newest question to the top of the panel; its answer unfolds below it.
  useEffect(() => {
    const asked = listRef.current?.querySelectorAll('[data-role="user"]');
    asked?.[asked.length - 1]?.scrollIntoView({ block: 'start' });
  }, [messages.length]);

  if (!user || !context) return null;

  const can = (needs: string[]) => needs.every((p) => hasPermission(user, p));
  const quickActions = context.type === 'alert' ? alertQuickActions.filter((qa) => can(qa.needs))
    : context.type === 'case' ? caseQuickActions.filter((qa) => can(qa.needs)) : [];
  const suggestions = context.type === 'page'
    ? (PAGE_SUGGESTIONS[context.id] ?? DEFAULT_SUGGESTIONS).filter((q) => can(q.needs)) : [];
  const freeTextEnabled = conversation?.enabled ?? true;

  const ask = (label: string, action: AlertAction | CaseAction) => {
    if (context.type === 'page') return;   // record quick actions only exist on alert and case pages
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: label },
      context.type === 'alert'
        ? { id: nextId(), role: 'agent', answer: { kind: 'alert', action: action as AlertAction, recordId: context.id } }
        : { id: nextId(), role: 'agent', answer: { kind: 'case', action: action as CaseAction, recordId: context.id } },
    ]);
  };

  const handleSend = (content: string) => {
    const message = content.trim();
    if (message.length < 2 || askAgent.isPending) return;
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
    setInputValue('');
    askAgent.mutate({ message, context }, {
      onSuccess: (a) => {
        setMessages((prev) => [...prev, { id: nextId(), role: 'agent',
          free: { text: a.answer, sources: a.sources, toolsUsed: a.toolsUsed } }]);
        setQuestionsLeft((n) => (n == null ? n : Math.max(0, n - 1)));
        qc.invalidateQueries({ queryKey: ['agent-conversation'] });
      },
      onError: (e: any) => {
        setMessages((prev) => [...prev, { id: nextId(), role: 'agent',
          text: errorDetail(e, "I couldn't answer just now. Please try again.") }]);
      },
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => { setIsOpen(true); setIsMinimized(false); }}
            size="lg"
            className={cn(
              'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
              'bg-primary hover:bg-primary/90 text-primary-foreground',
              'transition-all duration-200 hover:scale-105',
              isMinimized && 'animate-pulse'
            )}
          >
            <Bot className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">FinCrisS Agent</TooltipContent>
      </Tooltip>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-base font-semibold">FinCrisS Agent</SheetTitle>
                  <p className="text-xs text-muted-foreground">Answers with your access rights. Read-only.</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setIsMinimized(true); setIsOpen(false); }}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="px-4 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Context:</span>
              <span className="font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                <ContextName context={context} />
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
            <div ref={listRef} className="space-y-4">
              {messages.map((m) => {
                if (m.role === 'divider') {
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      <span>Now looking at <ContextName context={m.context} /></span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  );
                }
                return (
                  <div key={m.id} data-role={m.role}
                       className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      m.role === 'user' ? 'max-w-[85%] bg-primary text-primary-foreground' : 'w-full max-w-[95%] bg-muted text-foreground'
                    )}>
                      {'answer' in m ? (
                        <AnswerBoundary>
                          {m.answer.kind === 'alert'
                            ? <AlertAnswer action={m.answer.action} alertId={m.answer.recordId} />
                            : <CaseAnswer action={m.answer.action} caseId={m.answer.recordId} />}
                        </AnswerBoundary>
                      ) : 'free' in m ? (
                        <AnswerBoundary>
                          <AgentTextAnswer text={m.free.text} sources={m.free.sources} toolsUsed={m.free.toolsUsed} />
                        </AnswerBoundary>
                      ) : (
                        <p className="whitespace-pre-line">{m.text}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {askAgent.isPending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />Looking into it…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="space-y-2 p-4 border-t border-border bg-background">
            {suggestions.length > 0 && freeTextEnabled && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <Button key={q.text} variant="outline" size="sm" className="h-auto min-h-7 whitespace-normal py-1 text-left text-xs"
                          disabled={askAgent.isPending} onClick={() => handleSend(q.text)}>
                    {q.text}
                  </Button>
                ))}
              </div>
            )}
            {quickActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickActions.map((qa) => (
                  <Button key={qa.action} variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => ask(qa.label, qa.action)}>
                    {qa.label}
                  </Button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={!freeTextEnabled ? 'Free-text questions are switched off'
                  : context.type === 'page' ? 'Ask about your work…' : 'Ask about this record…'}
                disabled={!freeTextEnabled || askAgent.isPending}
                maxLength={1000}
                className="flex-1"
              />
              <Button type="submit" size="icon"
                      disabled={!freeTextEnabled || inputValue.trim().length < 2 || askAgent.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {freeTextEnabled && questionsLeft != null && (
              <p className="text-[11px] text-muted-foreground">{questionsLeft} question{questionsLeft === 1 ? '' : 's'} left this hour</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
