import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ModelVersion, ModelVersionStatus } from '@/services/model.service';
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

export function VersionHistoryTab({ versions }: { versions: ModelVersion[] }) {
  return (
    <div className="space-y-4">
      {versions.map((v) => {
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
              {(v.reason || v.decisionNote) && (
                <div className="space-y-1 border-t pt-3 text-sm">
                  {v.reason && <p><span className="text-muted-foreground">Reason: </span>{v.reason}</p>}
                  {v.decisionNote && <p><span className="text-muted-foreground">Decision: </span>{v.decisionNote}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Approvals before the retraining workflow are not tracked: ml-1.0 was registered retrospectively.
      </p>
    </div>
  );
}
