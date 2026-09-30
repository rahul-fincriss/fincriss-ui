import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { formatINRFull } from '@/lib/formatters';
import { Case } from '@/types';
import { format } from 'date-fns';

export function CaseLinkedAlertsCard({ caseData }: { caseData: Case }) {
  const alerts = caseData.linkedAlertDetails || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Linked Alerts ({alerts.length})
        </CardTitle>
        <CardDescription>Every alert rolled into this case</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts linked.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.alertId} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/alerts/${a.alertId}`} className="font-mono text-sm text-primary hover:underline">
                      {a.alertId}
                    </Link>
                    {a.alertId === caseData.alertId && <Badge variant="secondary">Originating</Badge>}
                    {a.priorityLevel && <RiskBadge level={a.priorityLevel.toLowerCase()} size="sm" />}
                    {a.workflowStatus && <Badge variant="outline">{a.workflowStatus}</Badge>}
                  </div>
                  <div className="text-right text-sm">
                    {a.amount != null && <span className="font-mono">{formatINRFull(a.amount)}</span>}
                    {a.alertDate && (
                      <span className="text-muted-foreground ml-2">{format(a.alertDate, 'MMM dd, yyyy')}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.alertType?.replace(/_/g, ' ')}
                  {a.ruleReasons && !Array.isArray(a.ruleReasons) &&
                    ` · rules: ${Object.keys(a.ruleReasons as Record<string, unknown>).join(', ')}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
