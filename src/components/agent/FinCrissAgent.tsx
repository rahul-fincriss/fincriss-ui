import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Minimize2, Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { AlertAction, AlertAnswer, AnswerBoundary, CaseAction, CaseAnswer, CaseLabel } from './AgentAnswers';

// The assistant answers questions about the alert or case on screen, from that
// record's own data. It is read-only: it never escalates, dismisses, closes or
// files anything. Free-text questions are step 2 (not built yet).

const AGENT_ROLES: UserRole[] = ['analyst', 'investigator'];

type Context = { type: 'alert'; id: string } | { type: 'case'; id: string };

type Message =
  | { id: string; role: 'agent' | 'user'; text: string }
  | {
      id: string;
      role: 'agent';
      // Bound to the record it was asked about, not to whatever page is showing now.
      answer: { kind: 'alert'; action: AlertAction; recordId: string } | { kind: 'case'; action: CaseAction; recordId: string };
    };

const alertQuickActions: { label: string; action: AlertAction }[] = [
  { label: 'Summarize why flagged', action: 'why-flagged' },
  { label: 'Show key transactions', action: 'key-transactions' },
  { label: 'Explain risk drivers', action: 'risk-drivers' },
  { label: 'View raw payload', action: 'raw-payload' },
];

const caseQuickActions: { label: string; action: CaseAction }[] = [
  { label: 'Case summary', action: 'case-summary' },
  { label: 'Evidence checklist', action: 'evidence-checklist' },
  { label: 'Draft STR points', action: 'str-points' },
  { label: 'Show related alerts', action: 'related-alerts' },
];

const COMING_SOON =
  'Free-text questions are coming soon. For now, use the quick actions above: they answer from this record\'s own data.';

function getContextFromPath(pathname: string): Context | null {
  const alertMatch = pathname.match(/^\/alerts\/([^/]+)$/);
  if (alertMatch && alertMatch[1] !== 'workbench') return { type: 'alert', id: decodeURIComponent(alertMatch[1]) };
  const caseMatch = pathname.match(/^\/cases\/([^/]+)$/);
  if (caseMatch) return { type: 'case', id: decodeURIComponent(caseMatch[1]) };
  return null;
}

function greeting(userName: string, context: Context): string {
  const firstName = userName.split(' ')[0];
  const subject = context.type === 'alert' ? `alert ${context.id}` : `this case`;
  return `Hi ${firstName}. I can pull together details about ${subject} from its own records. Pick a question below.`;
}

let seq = 0;
const nextId = () => `m${++seq}`;

export function FinCrissAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const location = useLocation();

  const context = getContextFromPath(location.pathname);
  const contextKey = context ? `${context.type}:${context.id}` : null;

  // Start a fresh conversation when the chat opens or the record changes. Keyed
  // on the user's id, not the user object: the auth layer re-fetches the user
  // after load, and a new object must not wipe the conversation.
  useEffect(() => {
    if (isOpen && user && context) {
      setMessages([{ id: nextId(), role: 'agent', text: greeting(user.name, context) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contextKey, user?.id]);

  // Bring the newest question to the top of the panel; its answer (which loads
  // and grows after a moment) then unfolds in view below it.
  useEffect(() => {
    const asked = listRef.current?.querySelectorAll('[data-role="user"]');
    asked?.[asked.length - 1]?.scrollIntoView({ block: 'start' });
  }, [messages.length]);

  if (!user || !AGENT_ROLES.includes(user.role) || !context) return null;

  const quickActions = context.type === 'alert' ? alertQuickActions : caseQuickActions;

  const ask = (label: string, action: AlertAction | CaseAction) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: label },
      context.type === 'alert'
        ? { id: nextId(), role: 'agent', answer: { kind: 'alert', action: action as AlertAction, recordId: context.id } }
        : { id: nextId(), role: 'agent', answer: { kind: 'case', action: action as CaseAction, recordId: context.id } },
    ]);
  };

  const handleSend = (content: string) => {
    if (!content.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: content.trim() },
      { id: nextId(), role: 'agent', text: COMING_SOON },
    ]);
    setInputValue('');
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
                  <p className="text-xs text-muted-foreground">Answers from this record's data. Read-only.</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setIsMinimized(true); setIsOpen(false); }}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setIsOpen(false); setMessages([]); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="px-4 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Context:</span>
              <span className="font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                {context.type === 'alert' ? `Alert ${context.id}` : <CaseLabel caseId={context.id} />}
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
            <div ref={listRef} className="space-y-4">
              {messages.map((m) => (
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
                    ) : (
                      <p className="whitespace-pre-line">{m.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-3 p-4 border-t border-border bg-background">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((qa) => (
                <Button key={qa.action} variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => ask(qa.label, qa.action)}>
                  {qa.label}
                </Button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Free-text questions coming soon"
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
