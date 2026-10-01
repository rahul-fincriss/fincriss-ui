import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { canApproveModel } from '@/lib/permissions';
import { useDecidePromotion } from '@/hooks/useModelGovernance';
import { ModelVersion, PromotionRequest, TrainingJob } from '@/services/model.service';
import { ReasonDialog } from './ReasonDialog';
import { formatAuc, formatGovDate } from './format';

interface Props {
  latestJob?: TrainingJob;
  pending?: PromotionRequest;
  versions: ModelVersion[];
  activeVersion?: string;
  onReview: (version: string) => void;
}

function JobStatus({ job }: { job: TrainingJob }) {
  if (job.status === 'QUEUED' || job.status === 'RUNNING') {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          <strong>{job.status === 'QUEUED' ? 'Retrain queued' : 'Training in progress'}.</strong>{' '}
          Requested by {job.requestedByName ?? 'a Super Admin'}: “{job.reason}”. The new version will need a
          Principal Officer's approval before it goes live.
        </AlertDescription>
      </Alert>
    );
  }
  if (job.status === 'FAILED') {
    return (
      <Alert className="border-status-error/40">
        <XCircle className="h-4 w-4 text-status-error" />
        <AlertDescription>
          <strong>The last retrain did not produce a model</strong> ({formatGovDate(job.finishedAt)}). {job.error}
        </AlertDescription>
      </Alert>
    );
  }
  // SUCCEEDED: the pending-decision card (or version history, once decided) says what happened.
  return null;
}

export function ModelWorkflowPanel({ latestJob, pending, versions, activeVersion, onReview }: Props) {
  const { user } = useAuth();
  const decide = useDecidePromotion();
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);

  const candidate = pending ? versions.find((v) => v.version === pending.version) : undefined;
  const isRequester = pending && user && pending.requestedBy === String(user.id);
  const canDecide = pending && canApproveModel(user) && !isRequester;
  const m = candidate?.metrics;
  const candAuc = m ? (m.testSetAnalystOnly ?? m.testSet).rocAuc : null;
  const activeAuc = m?.comparison ? (m.comparison.testSetAnalystOnly ?? m.comparison.testSet)?.rocAuc : null;

  return (
    <div className="space-y-3">
      {latestJob && <JobStatus job={latestJob} />}

      {pending && (
        <Card className="border-status-warning/50">
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4 text-status-warning" />
                  {pending.kind === 'ROLLBACK'
                    ? `Rollback to ${pending.version} is awaiting approval`
                    : `${pending.version} is awaiting approval to go live`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Requested by {pending.requestedByName ?? '—'} on {formatGovDate(pending.requestedAt)}: “{pending.reason}”
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onReview(pending.version)}>Review validation</Button>
                {canDecide && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setDecision('reject')}>
                      <XCircle className="mr-2 h-4 w-4" />Reject
                    </Button>
                    <Button size="sm" onClick={() => setDecision('approve')}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                    </Button>
                  </>
                )}
              </div>
            </div>

            {m && (
              <p className="text-sm">
                ROC-AUC on investigator-labelled test alerts: <strong>{formatAuc(candAuc)}</strong> for {pending.version}
                {m.comparison && !m.comparison.error && (
                  <> vs <strong>{formatAuc(activeAuc)}</strong> for the live {m.comparison.version} on the same alerts</>
                )}.
              </p>
            )}
            {m?.worseThanActive && (
              <p className="flex items-center gap-2 text-sm text-status-warning">
                <AlertTriangle className="h-4 w-4" />
                This candidate ranks investigator-labelled alerts worse than the model that is live now.
              </p>
            )}
            {!canDecide && (
              <p className="text-xs text-muted-foreground">
                {isRequester
                  ? 'You requested this, so a Principal Officer has to decide it.'
                  : 'Only a Principal Officer who did not request it can approve or reject it.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {pending && (
        <ReasonDialog
          open={decision !== null}
          onOpenChange={(o) => !o && setDecision(null)}
          title={decision === 'approve' ? `Approve ${pending.version}` : `Reject ${pending.version}`}
          description={decision === 'approve' ? (
            <>
              {pending.version} becomes the live model for alerts scored from now on
              {activeVersion ? <>, replacing {activeVersion}</> : null}. Alerts already scored keep their scores.
              Your note is recorded in the audit trail.
            </>
          ) : (
            <>{pending.kind === 'ROLLBACK' ? 'The live model stays as it is.' : `${pending.version} will not go live.`} Your note is recorded in the audit trail.</>
          )}
          label={decision === 'approve' ? 'Approval note' : 'Reason for rejecting'}
          placeholder={decision === 'approve'
            ? 'e.g. Validation reviewed; recall on investigator-labelled alerts improved without loss of precision.'
            : 'e.g. ROC-AUC on investigator labels is below the live model; retrain once more labels are collected.'}
          confirmLabel={decision === 'approve' ? 'Approve and make live' : 'Reject'}
          destructive={decision === 'reject'}
          pending={decide.isPending}
          onConfirm={(note) => decide.mutate(
            { id: pending.id, decision: decision!, note },
            { onSuccess: () => setDecision(null) },
          )}
        />
      )}
    </div>
  );
}
