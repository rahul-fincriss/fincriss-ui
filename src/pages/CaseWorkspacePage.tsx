import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  MessageSquare, 
  Network, 
  PlusCircle, 
  Upload, 
  XCircle,
  Clock,
  AlertTriangle,
  ScrollText
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SLATimer } from '@/components/shared/SLATimer';
import { STRPanel } from '@/components/str/STRPanel';
import { EntityHistoryCard } from '@/components/shared/EntityHistoryCard';
import { formatINRFull } from '@/lib/formatters';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useCase, useUpdateCase, useCloseCase, useAddCaseNote, useUploadEvidence } from '@/hooks/useCases';
import { Loader2, AlertCircle } from 'lucide-react';
import { useRef } from 'react';

// Evidence upload: register → presigned S3 PUT. Enabled 2026-09-29 once the
// backend AWS creds were restored and a CORS policy was set on the bucket
// (PUT/GET/HEAD from app.fincriss.com). See IMPLEMENTATION_PLAN.md (Phase 3).
const EVIDENCE_UPLOAD_ENABLED = true;

export default function CaseWorkspacePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real API data
  const { data: caseData, isLoading, error } = useCase(caseId || '');
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

  const handleCloseCase = () => {
    if (!caseId) return;
    
    toast.promise(
      closeCaseMutation.mutateAsync({ caseId, notes: 'Closed from workspace' }),
      {
        loading: 'Closing case...',
        success: () => {
          navigate('/cases');
          return 'Case closed successfully';
        },
        error: 'Failed to close case',
      }
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

  const transactions = caseData.transactions;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{caseData.id}</h1>
                <StatusBadge status={caseData.status} />
              </div>
              <p className="text-muted-foreground">{caseData.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SLATimer deadline={caseData.slaDeadline} />
            <Button 
              variant="outline" 
              onClick={handleCloseCase}
              disabled={closeCaseMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {closeCaseMutation.isPending ? 'Closing...' : 'Close as False Positive'}
            </Button>
          </div>
        </div>

        {/* Case Info Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Investigator</p>
                <p className="font-medium">{caseData.investigatorName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Linked Alerts</p>
                <p className="font-medium">{caseData.linkedAlerts.length} alerts</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-mono font-medium">
                  {formatINRFull(caseData.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">{format(caseData.createdAt, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer ID</p>
                <p className="font-mono text-sm">{caseData.customerId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="network">Network Graph</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="findings">System Findings</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="str-draft" className="gap-1.5">
              <ScrollText className="h-4 w-4" />
              STR Draft
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction History</CardTitle>
                <CardDescription>
                  Transactions linked to this case's alert{caseData.linkedAlerts.length > 1 ? 's' : ''}, frozen at escalation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions linked to this case</p>
                  ) : (
                    transactions.map((txn) => (
                      <div
                        key={txn.transId}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="rounded-full p-2 bg-muted">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{txn.transType || 'Transaction'} · {txn.transId}</p>
                            <p className="text-sm text-muted-foreground">{txn.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {txn.channel && <Badge variant="outline" className="text-xs">{txn.channel}</Badge>}
                              {txn.country && <Badge variant="outline" className="text-xs">{txn.country}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold">
                            {formatINRFull(txn.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(txn.date, 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network / Relationship Graph</CardTitle>
                <CardDescription>Entity connections and relationships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[400px] rounded-lg border border-dashed border-border bg-muted/30">
                  <div className="text-center">
                    <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Network visualization would be displayed here
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Showing connections between entities, accounts, and counterparties
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Documents & Evidence</CardTitle>
                  <CardDescription>Uploaded supporting documentation</CardDescription>
                </div>
                {EVIDENCE_UPLOAD_ENABLED && (
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
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded by {doc.uploadedBy} • {format(doc.uploadedAt, 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Findings</CardTitle>
                <CardDescription>Rule and ML findings that led to this case, frozen at escalation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!caseData.frozenFindings ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No frozen findings for this case — it may predate system-findings tracking.
                  </p>
                ) : (
                  <>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={
                          (caseData.frozenFindings.priorityScore ?? 0) >= 70 ? 'badge-risk-high'
                          : (caseData.frozenFindings.priorityScore ?? 0) >= 40 ? 'badge-risk-medium'
                          : 'badge-risk-low'
                        }>
                          Priority {caseData.frozenFindings.priorityScore?.toFixed(0) ?? '—'}
                        </Badge>
                        {caseData.frozenFindings.ruleScore != null && (
                          <Badge variant="outline">Rule score {caseData.frozenFindings.ruleScore}</Badge>
                        )}
                        {caseData.frozenFindings.mlScore != null && (
                          <Badge variant="outline">ML score {(caseData.frozenFindings.mlScore * 100).toFixed(0)}%</Badge>
                        )}
                        {caseData.frozenFindings.modelVersion && (
                          <Badge variant="outline">{caseData.frozenFindings.modelVersion}</Badge>
                        )}
                      </div>
                      {caseData.frozenFindings.explanation && (
                        <p className="text-sm text-muted-foreground">{caseData.frozenFindings.explanation}</p>
                      )}
                    </div>

                    {caseData.frozenFindings.ruleReasons && (
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-sm font-medium mb-3">Rules triggered</p>
                        <div className="space-y-2">
                          {Array.isArray(caseData.frozenFindings.ruleReasons) ? (
                            caseData.frozenFindings.ruleReasons.map((reason, i) => (
                              <p key={i} className="text-sm text-muted-foreground">{String(reason)}</p>
                            ))
                          ) : (
                            Object.entries(caseData.frozenFindings.ruleReasons as Record<string, unknown>).map(([rule, score]) => (
                              <div key={rule} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{rule.replace(/_/g, ' ')}</span>
                                <span className="text-muted-foreground font-mono">{String(score)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {caseData.frozenFindings.frozenAt && (
                      <p className="text-xs text-muted-foreground">
                        Frozen at escalation: {format(caseData.frozenFindings.frozenAt, 'MMM dd, yyyy HH:mm')}
                        {caseData.frozenFindings.sourceAlertId && ` · from ${caseData.frozenFindings.sourceAlertId}`}
                      </p>
                    )}
                  </>
                )}

                {(caseData.linkedAlertDetails?.length ?? 0) > 1 && (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-medium">Additional linked alerts</p>
                    {caseData.linkedAlertDetails
                      .filter(a => a.alertId !== caseData.frozenFindings?.sourceAlertId)
                      .map((a) => (
                        <div key={a.alertId} className="text-sm border-t border-border pt-2 first:border-t-0 first:pt-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{a.alertId}</span>
                            {a.priorityLevel && <Badge variant="outline">{a.priorityLevel}</Badge>}
                            {a.workflowStatus && <Badge variant="outline">{a.workflowStatus}</Badge>}
                          </div>
                          {a.ruleReasons && !Array.isArray(a.ruleReasons) && (
                            <p className="text-muted-foreground mt-1">
                              {Object.keys(a.ruleReasons as Record<string, unknown>).join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Investigation Notes</CardTitle>
                <CardDescription>Add and view case notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {caseData.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{note.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(note.timestamp, 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button onClick={handleAddNote} disabled={!newNote.trim() || addNoteMutation.isPending}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {addNoteMutation.isPending ? 'Adding…' : 'Add Note'}
                  </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* STR Draft Tab */}
          <TabsContent value="str-draft">
            <STRPanel caseId={caseData.id} />
          </TabsContent>
        </Tabs>

        {/* Activity History */}
        <EntityHistoryCard entityType="case" entityId={caseData.id} />
      </div>
    </AppLayout>
  );
}