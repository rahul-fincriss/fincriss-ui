import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Send, Save, CheckCircle2, XCircle, Landmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canWriteStr, canApproveStr } from '@/lib/permissions';
import {
  useStrByCase, useCreateStrDraft, useUpdateStrDraft, useSubmitStr,
  useApproveStr, useSubmitStrToRegulator,
} from '@/hooks/useSTR';
import { RejectStrDialog } from './RejectStrDialog';
import { STRStatusBadge } from './STRStatusBadge';
import { format } from 'date-fns';

const NARRATIVE_TEMPLATE = `GROUNDS OF SUSPICION:
(Why this activity is suspicious.)

TRANSACTION NARRATIVE:
(What happened — accounts, amounts, dates, counterparties.)

CUSTOMER PROFILE:
(KYC, expected vs actual behaviour.)

CONCLUSION:
(Rationale for filing.)`;

interface STRPanelProps {
  caseId: string;
}

export function STRPanel({ caseId }: STRPanelProps) {
  const { user } = useAuth();
  const { data: str, isLoading } = useStrByCase(caseId);
  const [narrative, setNarrative] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  const createDraft = useCreateStrDraft();
  const updateDraft = useUpdateStrDraft();
  const submit = useSubmitStr();
  const approve = useApproveStr();
  const submitToReg = useSubmitStrToRegulator();

  const canWrite = canWriteStr(user);
  const canApprove = canApproveStr(user);

  // Seed the editor from the loaded STR (or the template for a fresh draft).
  useEffect(() => {
    if (str) setNarrative(str.narrative || '');
    else setNarrative(NARRATIVE_TEMPLATE);
  }, [str]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading STR…</span>
      </div>
    );
  }

  const status = str?.status;
  // A REJECTED STR can be edited but NOT resubmitted (backend: submit requires
  // DRAFT). The path forward from REJECTED is to create a fresh draft.
  const editable = canWrite && (!str || status === 'DRAFT' || status === 'REJECTED');
  const strId = str?.id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Suspicious Transaction Report
          </CardTitle>
          <CardDescription>
            {str
              ? `STR #${str.id} · v${str.version}${str.createdByUsername ? ` · by ${str.createdByUsername}` : ''}`
              : 'No STR drafted for this case yet'}
          </CardDescription>
        </div>
        {str && <STRStatusBadge status={str.status} />}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rejection banner */}
        {str?.status === 'REJECTED' && str.rejectionReason && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive mb-1">Rejected by Principal Officer</p>
            <p className="text-sm">{str.rejectionReason}</p>
          </div>
        )}

        {/* Submitted banner */}
        {str?.status === 'SUBMITTED' && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <p className="text-sm">
              Filed with the regulator{str.submittedAt ? ` on ${format(new Date(str.submittedAt), 'MMM dd, yyyy HH:mm')}` : ''}.
            </p>
          </div>
        )}

        {/* Narrative */}
        {editable ? (
          <Textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            className="min-h-[280px] font-mono text-sm"
            placeholder="STR narrative…"
          />
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap break-words text-sm font-sans">
              {str?.narrative || 'No narrative.'}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* No STR yet → create */}
          {!str && canWrite && (
            <Button
              onClick={() => createDraft.mutate({ caseId, narrative })}
              disabled={createDraft.isPending}
            >
              <FileText className="mr-2 h-4 w-4" />
              {createDraft.isPending ? 'Creating…' : 'Create STR Draft'}
            </Button>
          )}

          {/* Draft → save + submit */}
          {str && status === 'DRAFT' && canWrite && (
            <>
              <Button
                variant="outline"
                onClick={() => updateDraft.mutate({ strId: strId!, caseId, narrative })}
                disabled={updateDraft.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateDraft.isPending ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button
                onClick={() => submit.mutate({ strId: strId!, caseId })}
                disabled={submit.isPending || !str.narrative}
                title={!str.narrative ? 'Save the draft before submitting' : undefined}
              >
                <Send className="mr-2 h-4 w-4" />
                {submit.isPending ? 'Submitting…' : 'Submit for Approval'}
              </Button>
            </>
          )}

          {/* Rejected → revise into a fresh draft (the rejected STR can't be resubmitted) */}
          {str && status === 'REJECTED' && canWrite && (
            <Button
              onClick={() => createDraft.mutate({ caseId, narrative })}
              disabled={createDraft.isPending}
            >
              <FileText className="mr-2 h-4 w-4" />
              {createDraft.isPending ? 'Creating…' : 'Revise & Create New Draft'}
            </Button>
          )}

          {/* Pending approval → PO can approve/reject */}
          {str?.status === 'PENDING_APPROVAL' && (
            canApprove ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  disabled={approve.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => approve.mutate({ strId: strId!, caseId })}
                  disabled={approve.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {approve.isPending ? 'Approving…' : 'Approve'}
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Awaiting Principal Officer approval.</span>
            )
          )}

          {/* Approved → PO submits to regulator */}
          {str?.status === 'APPROVED' && (
            canApprove ? (
              <Button
                onClick={() => submitToReg.mutate({ strId: strId!, caseId })}
                disabled={submitToReg.isPending}
              >
                <Landmark className="mr-2 h-4 w-4" />
                {submitToReg.isPending ? 'Submitting…' : 'Submit to Regulator'}
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Approved — awaiting submission to regulator.</span>
            )
          )}
        </div>
      </CardContent>

      {strId && (
        <RejectStrDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          strId={strId}
          caseId={caseId}
        />
      )}
    </Card>
  );
}
