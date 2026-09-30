import { useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Loader2,
  Play,
  PlusCircle,
  ScrollText,
  Upload,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { SLATimer } from '@/components/shared/SLATimer';
import { STRPanel } from '@/components/str/STRPanel';
import { EntityHistoryCard } from '@/components/shared/EntityHistoryCard';
import { AlertNotesCard } from '@/components/workbench/AlertNotesCard';
import { CaseAlertContextCard } from '@/components/cases/CaseAlertContextCard';
import { CaseCustomerRiskCard } from '@/components/cases/CaseCustomerRiskCard';
import { CaseLinkedAlertsCard } from '@/components/cases/CaseLinkedAlertsCard';
import { CaseTransactionsTable } from '@/components/cases/CaseTransactionsTable';
import { CloseCaseDialog } from '@/components/cases/CloseCaseDialog';
import { formatINRFull } from '@/lib/formatters';
import { canCloseCase, isCaseClosed } from '@/lib/caseStatus';
import { canCloseCases, canWriteCases } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { CaseOutcome } from '@/services/cases.service';
import { format } from 'date-fns';
import {
  useCase,
  useCaseAssignees,
  useUpdateCase,
  useCloseCase,
  useAddCaseNote,
  useUploadEvidence,
} from '@/hooks/useCases';

// Evidence upload: register → presigned S3 PUT. Enabled 2026-09-29 once the
// backend AWS creds were restored and a CORS policy was set on the bucket
// (PUT/GET/HEAD from app.fincriss.com). See IMPLEMENTATION_PLAN.md (Phase 3).
const EVIDENCE_UPLOAD_ENABLED = true;

const UNASSIGNED = 'unassigned';

export default function CaseWorkspacePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canWrite = canWriteCases(user);
  const canClose = canCloseCases(user);

  const { data: caseData, isLoading, error } = useCase(caseId || '');
  const { data: assignees = [] } = useCaseAssignees(canWrite);
  const updateCaseMutation = useUpdateCase();
  const closeCaseMutation = useCloseCase();
  const addNoteMutation = useAddCaseNote();
  const uploadEvidenceMutation = useUploadEvidence();

  const handleAddNote = () => {
    if (!newNote.trim() || !caseId) return;
    addNoteMutation.mutate(
      { caseId, note: newNote.trim() },
      { onSuccess: () => setNewNote('') }
    );
  };

  const handleEvidenceSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseId) return;
    uploadEvidenceMutation.mutate({ caseId, file });
    e.target.value = ''; // allow re-selecting the same file
  };

  const handleStartInvestigation = () => {
    if (!caseId) return;
    updateCaseMutation.mutate({ caseId, request: { status: 'IN_PROGRESS' } });
  };

  const handleAssign = (value: string) => {
    if (!caseId || value === UNASSIGNED) return;
    updateCaseMutation.mutate({ caseId, request: { assigned_to_user_id: Number(value) } });
  };

  const handleCloseCase = (outcome: CaseOutcome, rationale: string) => {
    if (!caseId) return;
    closeCaseMutation.mutate(
      { caseId, outcome, rationale },
      { onSuccess: () => setCloseOpen(false) }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading case workspace...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !caseData) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h2 className="text-xl font-bold">Case Not Found</h2>
            <p className="text-muted-foreground">The case ID might be invalid or has been deleted.</p>
          </div>
          <Button onClick={() => navigate('/cases')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cases
          </Button>
        </div>
      </AppLayout>
    );
  }

  const closed = isCaseClosed(caseData.status);
  const caseLabel = caseData.caseNumber || `Case ${caseData.id}`;
  const txnTotal = caseData.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-mono">{caseLabel}</h1>
                <StatusBadge status={caseData.status} />
                {caseData.priority && <RiskBadge level={caseData.priority} />}
              </div>
              <p className="text-muted-foreground mt-1">
                <Link
                  to={`/customers?id=${encodeURIComponent(caseData.customerId)}`}
                  className="hover:underline hover:text-foreground"
                >
                  {caseData.customerName}
                </Link>
                {caseData.alertId && (
                  <>
                    {' · escalated from '}
                    <Link to={`/alerts/${caseData.alertId}`} className="font-mono text-primary hover:underline">
                      {caseData.alertId}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {closed ? (
              <span className="text-sm text-muted-foreground">
                {caseData.closedAt ? `Closed ${format(caseData.closedAt, 'MMM dd, yyyy')}` : 'Closed'}
              </span>
            ) : (
              <SLATimer deadline={caseData.slaDeadline} />
            )}
            {caseData.alertId && (
              <Button variant="outline" asChild>
                <Link to={`/alerts/${caseData.alertId}`}>
                  View originating alert <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
            {canWrite && caseData.status === 'open' && (
              <Button onClick={handleStartInvestigation} disabled={updateCaseMutation.isPending}>
                <Play className="mr-2 h-4 w-4" />
                Start Investigation
              </Button>
            )}
            {canClose && canCloseCase(caseData.status) && (
              <Button variant="outline" onClick={() => setCloseOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Close Case
              </Button>
            )}
          </div>
        </div>

        {caseData.status === 'under_review' && (
          <div className="rounded-lg border border-status-in-progress/30 bg-status-in-progress/10 px-4 py-3 text-sm">
            An STR for this case is pending Principal Officer approval. The case can't be closed until it's approved or rejected.
          </div>
        )}

        {/* Case Info Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Investigator</p>
                {canWrite && !closed ? (
                  <Select
                    value={caseData.assignedToUserId ? String(caseData.assignedToUserId) : UNASSIGNED}
                    onValueChange={handleAssign}
                    disabled={updateCaseMutation.isPending}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Assign…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED} disabled>Unassigned</SelectItem>
                      {assignees.map((a) => (
                        <SelectItem key={a.userId} value={String(a.userId)}>{a.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{caseData.investigatorName}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Linked Alerts</p>
                <p className="font-medium">{caseData.linkedAlerts.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                <p className="font-medium">
                  {caseData.transactions.length}
                  {caseData.transactions.length > 0 && (
                    <span className="font-mono text-muted-foreground"> · {formatINRFull(txnTotal)}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Opened</p>
                <p className="font-medium">{format(caseData.createdAt, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Customer ID</p>
                <p className="font-mono text-sm">{caseData.customerId}</p>
              </div>
            </div>
            {caseData.summary && (
              <p className="text-sm text-muted-foreground mt-4 border-t border-border pt-3">{caseData.summary}</p>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions ({caseData.transactions.length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({caseData.notes.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({caseData.documents.length})</TabsTrigger>
            <TabsTrigger value="str-draft" className="gap-1.5">
              <ScrollText className="h-4 w-4" />
              STR Draft
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <CaseAlertContextCard caseData={caseData} />
              <CaseCustomerRiskCard caseData={caseData} />
            </div>
            <CaseLinkedAlertsCard caseData={caseData} />
          </TabsContent>

          <TabsContent value="transactions">
            <CaseTransactionsTable transactions={caseData.transactions} />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Investigation Notes</CardTitle>
                <CardDescription>
                  Case notes record your findings. Keep customer names and account numbers out of notes —
                  they'll feed the AI case narrative.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {caseData.notes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No case notes yet.</p>
                )}
                <div className="space-y-4">
                  {caseData.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{note.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(note.timestamp, 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>

                {!closed && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add an investigation note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim() || addNoteMutation.isPending}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {addNoteMutation.isPending ? 'Adding…' : 'Add Note'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {caseData.alertId && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Notes recorded on the originating alert{' '}
                  <Link to={`/alerts/${caseData.alertId}`} className="font-mono text-primary hover:underline">
                    {caseData.alertId}
                  </Link>
                  {' '}before escalation:
                </p>
                <AlertNotesCard alertId={caseData.alertId} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Documents & Evidence</CardTitle>
                  <CardDescription>Uploaded supporting documentation</CardDescription>
                </div>
                {EVIDENCE_UPLOAD_ENABLED && canWrite && !closed && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadEvidenceMutation.isPending}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadEvidenceMutation.isPending ? 'Uploading…' : 'Upload Document'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleEvidenceSelected}
                    />
                  </>
                )}
              </CardHeader>
              <CardContent>
                {caseData.documents.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] rounded-lg border border-dashed border-border bg-muted/30">
                    <div className="text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No documents uploaded yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {caseData.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {doc.uploadedBy} • {format(doc.uploadedAt, 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="str-draft">
            <STRPanel caseId={caseData.id} />
          </TabsContent>
        </Tabs>

        {/* Activity History */}
        <EntityHistoryCard entityType="case" entityId={caseData.id} />
      </div>

      <CloseCaseDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        caseLabel={caseLabel}
        onConfirm={handleCloseCase}
        isPending={closeCaseMutation.isPending}
      />
    </AppLayout>
  );
}
