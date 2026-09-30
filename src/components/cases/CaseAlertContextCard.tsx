import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { formatINRFull } from '@/lib/formatters';
import { Case } from '@/types';
import { format } from 'date-fns';

function priorityClass(score?: number) {
  if (score == null) return 'badge-risk-low';
  if (score >= 70) return 'badge-risk-high';
  if (score >= 40) return 'badge-risk-medium';
  return 'badge-risk-low';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium text-sm">{children}</div>
    </div>
  );
}

export function CaseAlertContextCard({ caseData }: { caseData: Case }) {
  const findings = caseData.frozenFindings;
  const priorityScore = findings?.priorityScore ?? caseData.priorityScore;
  const ruleScore = findings?.ruleScore ?? caseData.ruleScore;
  const mlScore = findings?.mlScore ?? caseData.mlScore;
  const ruleReasons = findings?.ruleReasons;
  const summary = caseData.alertAiSummary;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Originating Alert
          </CardTitle>
          <CardDescription>What triggered this case, as scored at escalation</CardDescription>
        </div>
        {caseData.alertId && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/alerts/${caseData.alertId}`}>
              Open alert <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Alert ID">
            {caseData.alertId ? (
              <Link to={`/alerts/${caseData.alertId}`} className="font-mono text-primary hover:underline">
                {caseData.alertId}
              </Link>
            ) : '—'}
          </Field>
          <Field label="Alert type">{caseData.alertType?.replace(/_/g, ' ') || '—'}</Field>
          <Field label="Scenario">
            <span className="font-mono text-xs">{caseData.scenarioCode || '—'}</span>
          </Field>
          <Field label="Severity">
            {caseData.severity ? <RiskBadge level={caseData.severity.toLowerCase()} size="sm" /> : '—'}
          </Field>
          <Field label="Alert date">
            {caseData.alertDate ? format(caseData.alertDate, 'MMM dd, yyyy HH:mm') : '—'}
          </Field>
          <Field label="Alert amount">
            <span className="font-mono">{formatINRFull(caseData.totalAmount)}</span>
          </Field>
        </div>

        <div className="ai-generated rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={priorityClass(priorityScore)}>
              Priority {priorityScore != null ? priorityScore.toFixed(0) : '—'}
            </Badge>
            {ruleScore != null && <Badge variant="outline">Rule score {ruleScore}</Badge>}
            {mlScore != null && <Badge variant="outline">ML score {(mlScore * 100).toFixed(0)}%</Badge>}
            {findings?.modelVersion && <Badge variant="outline">{findings.modelVersion}</Badge>}
          </div>
          {findings?.explanation && (
            <p className="text-sm text-muted-foreground">{findings.explanation}</p>
          )}
        </div>

        {ruleReasons && (
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium mb-3">Rules triggered</p>
            <div className="space-y-2">
              {Array.isArray(ruleReasons) ? (
                ruleReasons.map((reason, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{String(reason)}</p>
                ))
              ) : (
                Object.entries(ruleReasons as Record<string, unknown>).map(([rule, score]) => (
                  <div key={rule} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{rule.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground font-mono">{String(score)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI alert summary
            </p>
            <p className="text-sm text-muted-foreground">{summary.alertSummary}</p>
            {summary.riskSignals.length > 0 && (
              <ul className="list-disc pl-5 space-y-1">
                {summary.riskSignals.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{s.signal}:</span>{' '}
                    <span className="text-muted-foreground">{s.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {findings?.frozenAt && (
          <p className="text-xs text-muted-foreground">
            Scores frozen at escalation on {format(findings.frozenAt, 'MMM dd, yyyy HH:mm')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
