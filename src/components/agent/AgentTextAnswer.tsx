import { Fragment, ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AgentSource } from '@/services/agent.service';

// The model is asked for plain text with "- " bullets, but sometimes adds
// **bold** or numbered lists. Render just those, safely (no HTML).

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>,
  );
}

export function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((raw, i) => {
        if (!raw.trim()) return <div key={i} className="h-1" />;
        const indent = Math.min(Math.floor((raw.length - raw.trimStart().length) / 2), 3);
        const bullet = raw.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = raw.match(/^\s*(\d+)\.\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-1.5" style={{ paddingLeft: `${indent * 0.75}rem` }}>
              <span className="text-muted-foreground">•</span><span>{inline(bullet[1])}</span>
            </div>
          );
        }
        if (numbered) {
          return (
            <div key={i} className="flex gap-1.5" style={{ paddingLeft: `${indent * 0.75}rem` }}>
              <span className="text-muted-foreground tabular-nums">{numbered[1]}.</span><span>{inline(numbered[2])}</span>
            </div>
          );
        }
        return <p key={i}>{inline(raw.trim())}</p>;
      })}
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  get_alert: 'Read the alert',
  get_case: 'Read the case',
  get_customer_profile: "Read the customer's risk profile",
  search_transactions: 'Searched transactions',
  summarize_transactions: 'Totalled transactions',
  counterparty_history: "Checked a counterparty's history",
  get_related_alerts: "Listed the customer's alerts",
  get_notes: 'Read investigator notes',
  get_case_narrative: 'Read the case narrative',
  get_str: 'Read the STR',
  get_activity_history: 'Read the activity history',
};

export function AgentTextAnswer({ text, sources, toolsUsed }: {
  text: string; sources: AgentSource[]; toolsUsed?: string[];
}) {
  const [showTools, setShowTools] = useState(false);
  return (
    <div className="space-y-2">
      <FormattedText text={text} />
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {sources.map((s) => (
            s.href
              ? <Link key={`${s.kind}:${s.ref}`} to={s.href}
                      className="rounded border bg-background px-1.5 py-0.5 text-xs text-primary hover:underline">{s.label}</Link>
              : <span key={`${s.kind}:${s.ref}`} className="rounded border bg-background px-1.5 py-0.5 text-xs">{s.label}</span>
          ))}
        </div>
      )}
      {toolsUsed && toolsUsed.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowTools((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {showTools ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            How I answered ({toolsUsed.length} look-up{toolsUsed.length === 1 ? '' : 's'})
          </button>
          {showTools && (
            <ul className="mt-1 space-y-0.5 pl-4 text-xs text-muted-foreground">
              {toolsUsed.map((t, i) => <li key={i}>{TOOL_LABELS[t] ?? t}</li>)}
            </ul>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">AI-generated from FinCrisS data you can access. Check before relying on it.</p>
    </div>
  );
}
