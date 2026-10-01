import { Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ModelVersion, ModelVersionStatus, PromotionRequest } from '@/services/model.service';
import { formatAuc, formatGovDate } from './format';

const STATUS_LABEL: Record<ModelVersionStatus, string> = {
  ACTIVE: 'Active',
  CANDIDATE: 'Awaiting approval',
  RETIRED: 'Retired',
  REJECTED: 'Rejected',
};

export function VersionStatusBadge({ status }: { status: ModelVersionStatus }) {
  const cls =
    status === 'ACTIVE' ? 'bg-status-success/15 text-status-success border-status-success/30'
    : status === 'CANDIDATE' ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
    : status === 'REJECTED' ? 'bg-status-error/15 text-status-error border-status-error/30'
    : '';
  return <Badge variant="outline" className={`whitespace-nowrap ${cls}`}>{STATUS_LABEL[status] ?? status}</Badge>;
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

const DECISION_TEXT: Record<PromotionRequest['status'], string> = {
  PENDING: 'awaiting decision',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

function Timeline({ requests }: { requests: PromotionRequest[] }) {
  return (
    <ol className="space-y-2 border-t pt-3 text-sm">
      {requests.map((p) => (
        <li key={p.id}>
          <span className="font-medium">{p.kind === 'ROLLBACK' ? 'Rollback' : 'Promotion'} {DECISION_TEXT[p.status]}</span>
          <span className="text-muted-foreground">
            {' '}· requested by {p.requestedByName ?? '—'} on {formatGovDate(p.requestedAt)}
            {p.decidedAt && <> · decided by {p.decidedByName ?? '—'} on {formatGovDate(p.decidedAt)}</>}
            {p.replacedVersion && <> · replaced {p.replacedVersion}</>}
          </span>
          <p className="text-muted-foreground">Reason: {p.reason}</p>
          {p.decisionNote && <p className="text-muted-foreground">Decision: {p.decisionNote}</p>}
        </li>
      ))}
    </ol>
  );
}

interface Props {
  versions: ModelVersion[];
  promotions?: PromotionRequest[];
  /** Set when the user may request rollbacks; the string explains why it's blocked, if it is. */
  rollback?: { blockedReason: string | null; onRequest: (version: string) => void };
}

export function VersionHistoryTab({ versions, promotions = [], rollback }: Props) {
  return (
    <div className="space-y-4">
      {versions.map((v) => {
        const requests = promotions.filter((p) => p.version === v.version);
        const evalSet = v.metrics ? v.metrics.testSetAnalystOnly ?? v.metrics.testSet : null;
        const live = v.activatedAt
          ? `${formatGovDate(v.activatedAt)}${v.retiredAt ? ` to ${formatGovDate(v.retiredAt)}` : ''}`
          : '—';
        return (
          <Card key={v.version} className="break-inside-avoid">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-base font-semibold">{v.version}</span>
                <VersionStatusBadge status={v.status} />
                <span className="text-sm text-muted-foreground">{v.modelType}</span>
                {rollback && v.status === 'RETIRED' && v.s3ModelKey && (
                  <Button variant="outline" size="sm" className="ml-auto print:hidden"
                          disabled={!!rollback.blockedReason} title={rollback.blockedReason ?? undefined}
                          onClick={() => rollback.onRequest(v.version)}>
                    <Undo2 className="mr-2 h-4 w-4" />Request rollback to {v.version}
                  </Button>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <Field label="Trained" value={formatGovDate(v.trainedAt)} />
                <Field label="Live" value={live} />
                <Field label="Requested by" value={v.requestedByName ?? '—'}
                       sub={v.requestedAt ? formatGovDate(v.requestedAt) : undefined} />
                <Field label="Approved by" value={v.approvedByName ?? '—'}
                       sub={v.approvedAt ? formatGovDate(v.approvedAt) : undefined} />
                <Field label="ROC-AUC (investigator labels)"
                       value={evalSet ? formatAuc(evalSet.rocAuc) : 'Not recorded'} />
              </dl>
              {/* A version that never went through a promotion request (ml-1.0) keeps its own note. */}
              {!requests.some((p) => p.kind === 'PROMOTE') && v.reason && (
                <p className="border-t pt-3 text-sm"><span className="text-muted-foreground">Note: </span>{v.reason}</p>
              )}
              {requests.length > 0 && <Timeline requests={requests} />}
            </CardContent>
          </Card>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Versions trained before the approval workflow have no recorded request or approval: ml-1.0 was
        registered retrospectively. Dates above are the latest activation; the timeline lists every request.
      </p>
    </div>
  );
}
