import { Component, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAlert, useGenerateSummary } from '@/hooks/useAlerts';
import { useCase } from '@/hooks/useCases';
import { useCaseNarrative } from '@/hooks/useCaseNarrative';
import { useCustomerAlerts, useCustomerTransactions } from '@/hooks/useCustomer360';
import { formatINRFull } from '@/lib/formatters';

// Each quick action renders one of these. They read the same data the page
// shows (through the existing hooks) and never change anything.

export type AlertAction = 'why-flagged' | 'key-transactions' | 'risk-drivers' | 'raw-payload';
export type CaseAction = 'case-summary' | 'evidence-checklist' | 'str-points' | 'related-alerts';

const KEY_TXN_WINDOW_DAYS = 30;
const KEY_TXN_COUNT = 8;

function Loading() {
  return <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Looking that up…</p>;
}

function Failed() {
  return <p className="text-muted-foreground">I couldn't load that just now. Try again from the page itself.</p>;
}

function Source({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="text-xs font-medium text-primary hover:underline">{children} →</Link>;
}

const fmtDate = (d?: Date | string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** rule_reasons is either {RULE: points} (seeded / API) or a list of strings (Lambda). */
function ruleList(reasons: unknown): { rule: string; points?: number }[] {
  if (Array.isArray(reasons)) return reasons.map((r) => ({ rule: String(r) }));
  if (reasons && typeof reasons === 'object') {
    return Object.entries(reasons as Record<string, unknown>)
      .map(([rule, v]) => ({ rule, points: typeof v === 'number' ? v : Number(v) || undefined }))
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }
  return [];
}

// ── Alert answers ──────────────────────────────────────────────────────────

function WhyFlagged({ alertId }: { alertId: string }) {
  const { data: alert, isLoading, isError } = useAlert(alertId);
  const generate = useGenerateSummary();
  if (isLoading) return <Loading />;
  if (isError || !alert) return <Failed />;
  const s = (alert as any).aiSummary;
  if (!s) {
    return (
      <div className="space-y-2">
        <p>There's no AI summary for this alert yet.</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={generate.isPending}
                onClick={() => generate.mutate({ alertId })}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />{generate.isPending ? 'Generating…' : 'Generate summary'}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p>{s.alertSummary}</p>
      {s.riskSignals?.length > 0 && (
        <ul className="list-disc space-y-1 pl-4">
          {/* Signals are {signal, description} objects; older summaries may hold plain strings. */}
          {s.riskSignals.map((r: any, i: number) => (
            <li key={i}>
              {typeof r === 'string' ? r : <><span className="font-medium">{r.signal}</span>{r.description ? <>: {r.description}</> : null}</>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">AI-generated ({s.model ?? 'model unknown'}), {fmtDate(s.generatedAt)}. Review before relying on it.</p>
    </div>
  );
}

function KeyTransactions({ alertId }: { alertId: string }) {
  const { data: alert, isLoading, isError } = useAlert(alertId);
  const a = alert as any;
  const customerId = a?.customer?.customerId ?? null;
  const end = a?.alertDate ? new Date(a.alertDate) : null;
  const start = end ? new Date(end.getTime() - KEY_TXN_WINDOW_DAYS * 86400000) : null;
  const { data: txns, isLoading: txLoading } = useCustomerTransactions(customerId, {
    date_from: start?.toISOString().slice(0, 10),
    date_to: end?.toISOString().slice(0, 10),
    limit: 500,
  });
  if (isLoading || txLoading) return <Loading />;
  if (isError || !a) return <Failed />;
  const list = [...(txns?.transactions ?? [])].sort((x, y) => y.amount - x.amount).slice(0, KEY_TXN_COUNT);
  if (list.length === 0) return <p>No transactions for this customer in the {KEY_TXN_WINDOW_DAYS} days before the alert.</p>;
  return (
    <div className="space-y-2">
      <p>Largest of {txns!.total} transactions in the {KEY_TXN_WINDOW_DAYS} days up to the alert ({fmtDate(end!)}):</p>
      <table className="w-full text-xs">
        <tbody>
          {list.map((t) => (
            <tr key={t.id} className={t.id === a.transId ? 'font-semibold' : ''}>
              <td className="py-0.5 pr-2 whitespace-nowrap">{fmtDate(t.date)}</td>
              <td className="py-0.5 pr-2">{t.type}{t.is_cash ? ' · cash' : ''}{t.is_cross_border ? ` · ${t.country}` : ''}</td>
              <td className="py-0.5 text-right tabular-nums whitespace-nowrap">{t.direction === 'C' ? '+' : '−'}{formatINRFull(t.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.some((t) => t.id === a.transId) && <p className="text-xs text-muted-foreground">Bold: the transaction this alert was raised on.</p>}
      {customerId && <Source to={`/customers?id=${encodeURIComponent(customerId)}`}>All transactions in Customer 360</Source>}
    </div>
  );
}

function RiskDrivers({ alertId }: { alertId: string }) {
  const { data: alert, isLoading, isError } = useAlert(alertId);
  if (isLoading) return <Loading />;
  if (isError || !alert) return <Failed />;
  const a = alert as any;
  const rules = ruleList(a.ruleReasons);
  const ml = a.mlScore != null ? Math.round(Number(a.mlScore) * 100) : null;
  return (
    <div className="space-y-2">
      <p>
        Priority <strong>{a.priorityScore != null ? Math.round(a.priorityScore) : '—'}</strong>
        {a.riskLevel ? <> ({String(a.riskLevel).toUpperCase()})</> : null}, from a rule score of{' '}
        <strong>{a.ruleScore ?? '—'}</strong> (60% weight) and a model probability of <strong>{ml ?? '—'}%</strong> (40% weight).
      </p>
      {rules.length > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground">Rules that fired:</p>
          <ul className="space-y-0.5">
            {rules.map((r) => (
              <li key={r.rule} className="flex justify-between gap-2">
                <span>{r.rule}</span>{r.points != null && <span className="tabular-nums">{r.points} pts</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : <p>No rules fired; the priority comes from the model.</p>}
      {a.customer && (
        <p className="text-xs text-muted-foreground">
          Customer risk {a.customer.riskRating ?? '—'}{a.customer.isPep ? ' · PEP' : ''}.
        </p>
      )}
    </div>
  );
}

function RawPayload({ alertId }: { alertId: string }) {
  const { data: alert, isLoading, isError } = useAlert(alertId);
  if (isLoading) return <Loading />;
  if (isError || !alert) return <Failed />;
  const raw = (alert as any).rawData;
  if (!raw) return <p>The monitoring system sent no raw payload with this alert.</p>;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">As received from {(alert as any).sourceSystem ?? 'the monitoring system'}:</p>
      <pre className="max-h-64 overflow-auto rounded bg-background p-2 text-xs">{JSON.stringify(raw, null, 2)}</pre>
    </div>
  );
}

// ── Case answers ───────────────────────────────────────────────────────────

function CaseSummary({ caseId }: { caseId: string }) {
  const { data: n, isLoading, isError } = useCaseNarrative(caseId);
  const { data: c } = useCase(caseId);
  if (isLoading) return <Loading />;
  if (isError) return <Failed />;
  const cur = n?.current;
  if (!cur) {
    return (
      <div className="space-y-2">
        <p>{c?.summary || "There's no AI case narrative yet."}</p>
        <Source to={`/cases/${caseId}?tab=narrative`}>Generate one in the AI Narrative tab</Source>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p><span className="text-xs text-muted-foreground">Grounds of suspicion: </span>{cur.sections.grounds_of_suspicion}</p>
      <p><span className="text-xs text-muted-foreground">Conclusion: </span>{cur.sections.conclusion}</p>
      <p className="text-xs text-muted-foreground">
        Narrative v{cur.version} ({cur.source === 'EDITED' ? 'edited by an investigator' : 'AI-generated'}), {fmtDate(cur.createdAt)}.
      </p>
      <Source to={`/cases/${caseId}?tab=narrative`}>Full narrative</Source>
    </div>
  );
}

/** The case detail carries the case status, not the STR status (only the list does). */
function strDecision(c: { status: string; strStatus?: unknown }): { done: boolean; detail?: string } {
  const str = c.strStatus ? String(c.strStatus).toUpperCase() : null;
  if (str === 'SUBMITTED') return { done: true, detail: 'STR filed' };
  if (c.status === 'closed') return { done: true, detail: 'closed' };
  if (c.status === 'closed_false_positive') return { done: true, detail: 'closed as false positive' };
  if (c.status === 'under_review' || str === 'PENDING_APPROVAL') return { done: false, detail: 'STR awaiting approval' };
  if (str === 'APPROVED') return { done: false, detail: 'STR approved, not yet filed' };
  if (c.status === 'str_draft' || str === 'DRAFT') return { done: false, detail: 'STR draft in progress' };
  return { done: false, detail: 'not started' };
}

function EvidenceChecklist({ caseId }: { caseId: string }) {
  const { data: c, isLoading, isError } = useCase(caseId);
  const { data: n } = useCaseNarrative(caseId);
  if (isLoading) return <Loading />;
  if (isError || !c) return <Failed />;
  const items: { label: string; done: boolean; detail?: string; tab: string }[] = [
    { label: 'Rule and model findings captured', done: !!c.frozenFindings, tab: 'overview' },
    { label: 'Customer risk profile on record', done: !!c.customerRiskRating, detail: c.customerRiskRating, tab: 'overview' },
    { label: 'Transactions linked', done: c.transactions.length > 0, detail: `${c.transactions.length}`, tab: 'transactions' },
    { label: 'Investigation notes', done: c.notes.length > 0, detail: `${c.notes.length}`, tab: 'notes' },
    { label: 'Supporting documents', done: c.documents.length > 0, detail: `${c.documents.length}`, tab: 'documents' },
    { label: 'Case narrative written', done: !!n?.current, detail: n?.current ? `v${n.current.version}` : undefined, tab: 'narrative' },
    { label: 'STR decision', ...strDecision(c), tab: 'str-draft' },
  ];
  const done = items.filter((i) => i.done).length;
  return (
    <div className="space-y-2">
      <p>{done} of {items.length} in place.</p>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            {i.done ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-success" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <Link to={`/cases/${caseId}?tab=${i.tab}`} className="hover:underline">{i.label}</Link>
            {i.detail && <span className="text-xs text-muted-foreground">({i.detail})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StrPoints({ caseId }: { caseId: string }) {
  const { data: n, isLoading, isError } = useCaseNarrative(caseId);
  if (isLoading) return <Loading />;
  if (isError) return <Failed />;
  const cur = n?.current;
  if (!cur) {
    return (
      <div className="space-y-2">
        <p>STR points come from the case narrative, and there isn't one yet.</p>
        <Source to={`/cases/${caseId}?tab=narrative`}>Generate it in the AI Narrative tab</Source>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {cur.sections.red_flags.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Red flags:</p>
          <ul className="list-disc space-y-0.5 pl-4">{cur.sections.red_flags.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      )}
      <p><span className="text-xs text-muted-foreground">Grounds of suspicion: </span>{cur.sections.grounds_of_suspicion}</p>
      <p className="text-xs text-muted-foreground">From narrative v{cur.version}. Put it into the STR draft from the AI Narrative tab.</p>
      <Source to={`/cases/${caseId}?tab=narrative`}>Open the AI Narrative tab</Source>
    </div>
  );
}

function RelatedAlerts({ caseId }: { caseId: string }) {
  const { data: c, isLoading, isError } = useCase(caseId);
  const { data: history, isLoading: hLoading } = useCustomerAlerts(c?.customerId ?? null);
  if (isLoading || hLoading) return <Loading />;
  if (isError || !c) return <Failed />;
  const linked = c.linkedAlertDetails ?? [];
  const linkedIds = new Set(linked.map((l) => l.alertId));
  const others = (history ?? []).filter((h) => !linkedIds.has(h.alertId));
  const row = (id: string, date?: Date, level?: string, status?: string) => (
    <li key={id} className="flex items-center justify-between gap-2">
      <Link to={`/alerts/${id}`} className="font-mono text-xs text-primary hover:underline">{id}</Link>
      <span className="text-xs text-muted-foreground">{fmtDate(date)} · {level ?? '—'}{status ? ` · ${status.toLowerCase().replace(/_/g, ' ')}` : ''}</span>
    </li>
  );
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Linked to this case ({linked.length}):</p>
      <ul className="space-y-0.5">{linked.map((l) => row(l.alertId, l.alertDate, l.priorityLevel, l.workflowStatus))}</ul>
      <p className="text-xs text-muted-foreground">Other alerts for this customer ({others.length}):</p>
      {others.length > 0
        ? <ul className="space-y-0.5">{others.slice(0, 10).map((h) => row(h.alertId, h.alertDate, h.priorityLevel, h.workflowStatus))}</ul>
        : <p>None.</p>}
      {others.length > 10 && <p className="text-xs text-muted-foreground">Showing the 10 most recent.</p>}
    </div>
  );
}

/** A failing answer must never take the page down with it. */
export class AnswerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('FinCrisS Agent answer failed', error); }
  render() {
    return this.state.failed ? <Failed /> : this.props.children;
  }
}

export function AlertAnswer({ action, alertId }: { action: AlertAction; alertId: string }) {
  switch (action) {
    case 'why-flagged': return <WhyFlagged alertId={alertId} />;
    case 'key-transactions': return <KeyTransactions alertId={alertId} />;
    case 'risk-drivers': return <RiskDrivers alertId={alertId} />;
    case 'raw-payload': return <RawPayload alertId={alertId} />;
  }
}

export function CaseAnswer({ action, caseId }: { action: CaseAction; caseId: string }) {
  switch (action) {
    case 'case-summary': return <CaseSummary caseId={caseId} />;
    case 'evidence-checklist': return <EvidenceChecklist caseId={caseId} />;
    case 'str-points': return <StrPoints caseId={caseId} />;
    case 'related-alerts': return <RelatedAlerts caseId={caseId} />;
  }
}

/** The case number investigators see on the page (the URL carries the internal id). */
export function CaseLabel({ caseId }: { caseId: string }) {
  const { data: c } = useCase(caseId);
  return <>{c?.caseNumber ?? `Case ${caseId}`}</>;
}
