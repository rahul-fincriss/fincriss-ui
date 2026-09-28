import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityHistory } from '@/hooks/useAudit';
import { format } from 'date-fns';
import { History, Loader2 } from 'lucide-react';

interface EntityHistoryCardProps {
  entityType: 'alert' | 'case' | 'str';
  entityId: string;
}

/**
 * Full audit history for a single entity, backed by
 * GET /api/audit-logs/{entity_type}/{entity_id} (workflow_audit_log).
 */
export function EntityHistoryCard({ entityType, entityId }: EntityHistoryCardProps) {
  const { data: history, isLoading, error } = useEntityHistory(entityType, entityId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Activity History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading history…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">Failed to load activity history.</p>
        ) : !history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No recorded activity yet.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {history.map((entry) => (
              <li key={entry.id} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {entry.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(entry.performedAt, 'MMM dd, HH:mm:ss')}
                  </span>
                  <span className="text-xs text-muted-foreground">· {entry.performedBy}</span>
                </div>
                {entry.details && (
                  <p className="mt-1 text-sm text-muted-foreground break-words">{entry.details}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
