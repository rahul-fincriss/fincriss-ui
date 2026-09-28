import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  DollarSign,
  FolderPlus,
  Globe,
  TrendingUp,
  User,
  XCircle,
  FileCode,
  ExternalLink,
  Shield,
  Activity,
  Calendar,
  Hash,
  AlertTriangle,
  Link2,
  FolderOpen
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { SLATimer } from '@/components/shared/SLATimer';
import { RawAlertDrawer } from '@/components/workbench/RawAlertDrawer';
import { Customer360Drawer } from '@/components/customer360/Customer360Drawer';
import { EntityHistoryCard } from '@/components/shared/EntityHistoryCard';
import { formatINRFull } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAlert, useOpenCase, useGenerateSummary } from '@/hooks/useAlerts';
import { useCasesByCustomer, useAttachAlertToCase } from '@/hooks/useCases';
import { Loader2, Sparkles } from 'lucide-react';

function safeDate(val: any): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return format(d, 'dd MMM yyyy, HH:mm');
  } catch { return '—'; }
}

function safeDateShort(val: any): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return format(d, 'dd MMM yyyy');
  } catch { return '—'; }
}

export default function AlertDetailsPage() {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rawAlertDrawerOpen, setRawAlertDrawerOpen] = useState(false);
  const [customer360Open, setCustomer360Open] = useState(false);

  const { data: alert, isLoading, error } = useAlert(alertId || '');
  const openCaseMutation = useOpenCase();
  const generateSummaryMutation = useGenerateSummary();
  const attachAlertMutation = useAttachAlertToCase();

  const hasOwnCase = !!alert?.caseInfo;
  const { data: customerCases = [] } = useCasesByCustomer(
    !hasOwnCase && alert?.customerId ? alert.customerId : undefined
  );
  const CLOSED_STATUSES = ['closed', 'closed_false_positive'];
  const openCustomerCases = customerCases.filter(c => !CLOSED_STATUSES.includes(c.status));
  const canAttachCase = user?.role === 'investigator' || user?.role === 'principal_officer' || user?.role === 'super_admin';
  
  const handleCreateCase = async () => {
    if (!alert) return;
    toast.promise(
      openCaseMutation.mutateAsync({ 
        alertId: alert.id, 
        request: { notes: `Case manually opened for alert ${alert.id}` } 
      }),
      {
        loading: 'Opening case...',
        success: () => { navigate('/cases'); return 'Case created successfully'; },
        error: 'Failed to create case',
      }
    );
  };

  const handleDropAlert = () => {
    toast.success('Alert dropped');
    navigate('/alerts/workbench');
  };

  const handleRawPayloadAuditLog = (alertId: string, userId: string, userName: string) => {
    toast.info(`Raw payload view logged for ${alertId}`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Fetching alert details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !alert) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h2 className="text-xl font-bold">Alert Not Found</h2>
            <p className="text-muted-foreground">The alert ID might be invalid or you don't have permission to view it.</p>
          </div>
          <Button onClick={() => navigate('/alerts/workbench')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workbench
          </Button>
        </div>
      </AppLayout>
    );
  }

  const customer = alert.customer;
  const features = alert.features;
  const aiSummary = alert.aiSummary;
  const ruleReasons = alert.ruleReasons || {};

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
                <h1 className="text-2xl font-bold font-mono">{alert.id}</h1>
                <RiskBadge level={alert.riskLevel} />
                <Badge variant="outline" className="font-mono text-xs">{alert.status?.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <span>{alert.customerName}</span>
                <span>•</span>
                <span>{alert.alertType?.toUpperCase()}</span>
                <span>•</span>
                <span>{alert.sourceSystem}</span>
                {alert.scenarioCode && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{alert.scenarioCode}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SLATimer deadline={alert.slaDeadline} />
            <Button variant="outline" onClick={() => setRawAlertDrawerOpen(true)}>
              <FileCode className="mr-2 h-4 w-4" />
              Raw Payload
            </Button>
            <Button variant="outline" onClick={handleDropAlert}>
              <XCircle className="mr-2 h-4 w-4" />
              Drop
            </Button>
            <Button onClick={handleCreateCase} disabled={hasOwnCase} title={hasOwnCase ? 'A case already exists for this alert' : undefined}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Case
            </Button>
          </div>
        </div>

        {/* Case Banner — Scenario 1: alert has its own case */}
        {hasOwnCase && (
          <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-muted-foreground">This alert is linked to</span>
              <span className="font-semibold text-primary font-mono">Case #{alert.caseInfo.case_id}</span>
              <Badge variant="outline" className="text-xs">{alert.caseInfo.status?.toUpperCase()}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
              onClick={() => navigate(`/cases/${alert.caseInfo.case_id}`)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Case
            </Button>
          </div>
        )}

        {/* Case Banner — Scenario 2: customer has other open cases */}
        {!hasOwnCase && openCustomerCases.length > 0 && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="font-medium text-amber-800 dark:text-amber-400">
                This customer has {openCustomerCases.length} open case{openCustomerCases.length > 1 ? 's' : ''} for other alerts
              </span>
            </div>
            <div className="space-y-1.5">
              {openCustomerCases.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-semibold">Case #{c.id}</span>
                    <Badge variant="outline" className="text-xs">{c.status?.toUpperCase()}</Badge>
                    {c.assignedTo && <span className="text-xs text-muted-foreground">Assigned to {c.assignedTo}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {canAttachCase && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-amber-700 border-amber-400/60 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                        disabled={attachAlertMutation.isPending}
                        onClick={() => attachAlertMutation.mutate({ caseId: c.id, alertId: alert.id })}
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        Add to this Case
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => navigate(`/cases/${c.id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Banner */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Priority Score</p>
            <p className="text-2xl font-bold text-primary font-mono">{alert.priorityScore ?? alert.mapsScore}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Rule Score</p>
            <p className="text-2xl font-bold font-mono">{alert.ruleScore ?? '—'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">ML Score</p>
            <p className="text-2xl font-bold font-mono">{alert.mlScore != null ? alert.mlScore.toFixed(2) : '—'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Alert Amount</p>
            <p className="text-xl font-bold font-mono">{formatINRFull(alert.amount)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Alert Date</p>
            <p className="text-sm font-medium">{safeDateShort(alert.alertDate || alert.timestamp)}</p>
          </Card>
        </div>

        {/* Explanation bar */}
        {alert.explanation && (
          <Card className="p-4 border-primary/30 bg-primary/5">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-primary mb-1">Scoring Explanation</p>
                <p className="text-sm">{alert.explanation}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Main 2x2 Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Panel 1: AI Summary & Risk Signals */}
          <Card className="card-interactive">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">AI Analysis</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={generateSummaryMutation.isPending}
                  onClick={() => generateSummaryMutation.mutate(alert.id)}
                >
                  {generateSummaryMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {generateSummaryMutation.isPending ? 'Generating...' : 'Generate Summary'}
                </Button>
              </div>
              {aiSummary?.model && (
                <CardDescription className="font-mono text-xs">{aiSummary.model} • {safeDate(aiSummary.generatedAt)}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {aiSummary?.alertSummary && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">Alert Summary</p>
                  <p className="text-sm leading-relaxed">{aiSummary.alertSummary}</p>
                </div>
              )}
              
              {aiSummary?.riskSignals && aiSummary.riskSignals.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Risk Signals</span>
                  {aiSummary.riskSignals.map((signal: any, i: number) => (
                    <div key={i} className="ai-generated rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{signal.signal}</span>
                        <Badge className="badge-risk-high text-xs">Detected</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{signal.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {aiSummary?.profileAnalysis && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <p className="text-xs font-medium text-accent-foreground mb-1">Profile Analysis</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{aiSummary.profileAnalysis}</p>
                </div>
              )}

              {/* Rule reasons */}
              {Object.keys(ruleReasons).length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Rule Triggers</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ruleReasons).map(([rule, score]) => (
                      <Badge key={rule} variant="outline" className="font-mono">
                        {rule}: {String(score)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {alert.modelVersion && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <p className="text-xs font-medium text-primary mb-1">Model Version</p>
                  <p className="text-sm font-mono">{alert.modelVersion}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel 2: Customer KYC */}
          <Card className="card-interactive">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Customer KYC Snapshot</CardTitle>
              </div>
              <CardDescription>From alert payload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Customer ID</p>
                      <p className="font-mono text-sm">{customer.customerId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-medium">{customer.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer Type</p>
                      <p className="font-medium capitalize">{customer.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Risk Rating</p>
                      <RiskBadge level={customer.riskRating?.toLowerCase()} size="sm" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nationality</p>
                      <p className="font-medium">{customer.nationality}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Industry</p>
                      <p className="font-medium capitalize">{customer.industryCode?.toLowerCase()?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Occupation</p>
                      <p className="font-medium">{customer.occupation}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer Since</p>
                      <p className="font-medium">{safeDateShort(customer.customerSince)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {customer.isPep ? <Badge variant="destructive">PEP</Badge> : null}
                      {!customer.isPep && <Badge variant="secondary">No PEP/Sanctions</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      KYC updated: {safeDate(customer.kycLastUpdated)}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomer360Open(true)}
                    className="gap-1.5 w-full"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Customer 360
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No customer data in alert</p>
              )}
            </CardContent>
          </Card>

          {/* Panel 3: Transaction Features / Aggregates */}
          <Card className="card-interactive">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Transaction Features</CardTitle>
              </div>
              <CardDescription>
                Computed behavioral features
                {features?.featuresComputedAt && (
                  <span className="ml-2 font-mono text-xs">as of {safeDate(features.featuresComputedAt)}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {features ? (
                <div className="space-y-4">
                  {/* Transaction counts */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Transaction Counts</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-2xl font-bold font-mono">{features.txnCount7d}</p>
                        <p className="text-xs text-muted-foreground">7 Days</p>
                      </div>
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-2xl font-bold font-mono">{features.txnCount30d}</p>
                        <p className="text-xs text-muted-foreground">30 Days</p>
                      </div>
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-2xl font-bold font-mono">{features.txnCount90d}</p>
                        <p className="text-xs text-muted-foreground">90 Days</p>
                      </div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Amount Analysis (30d)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Average</p>
                        <p className="font-mono font-medium">{formatINRFull(features.avgAmount30d)}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Maximum</p>
                        <p className="font-mono font-medium text-risk-high">{formatINRFull(features.maxAmount30d)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Risk indicators */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Risk Indicators (30d)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <span className="text-xs text-muted-foreground">Unique Counterparties</span>
                        <span className="font-mono font-bold">{features.uniqueCounterparties30d}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <span className="text-xs text-muted-foreground">Countries</span>
                        <span className="font-mono font-bold">{features.countriesCount30d}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <span className="text-xs text-muted-foreground">High-Risk Country Txns</span>
                        <span className="font-mono font-bold text-risk-high">{features.highRiskCountryTxns30d}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <span className="text-xs text-muted-foreground">Cash Intensive Ratio</span>
                        <span className="font-mono font-bold">{(features.cashIntensiveRatio * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Past alerts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <span className="text-xs text-muted-foreground">Alerts (30d)</span>
                      <span className="font-mono font-bold">{features.alertCount30d}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <span className="text-xs text-muted-foreground">Alerts (90d)</span>
                      <span className="font-mono font-bold">{features.alertCount90d}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No feature data available</p>
              )}
            </CardContent>
          </Card>

          {/* Panel 4: Metadata & Case Info */}
          <Card className="card-interactive">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Alert Metadata</CardTitle>
              </div>
              <CardDescription>Processing & investigation details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Source System</p>
                  <p className="font-medium capitalize">{alert.sourceSystem}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alert Type</p>
                  <p className="font-medium">{alert.alertType?.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scenario Code</p>
                  <p className="font-mono text-sm">{alert.scenarioCode || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Severity</p>
                  <Badge variant={alert.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                    {alert.severity || '—'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scored At</p>
                  <p className="text-sm">{safeDate(alert.scoredAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Investigated At</p>
                  <p className="text-sm">{safeDate(alert.investigatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="text-sm">{alert.assignedTo || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline">{alert.status?.toUpperCase()}</Badge>
                </div>
              </div>

              {/* Case info */}
              {alert.caseInfo ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary mb-2">Linked Case</p>
                  <p className="font-mono text-sm">{alert.caseInfo.case_id || alert.caseInfo.id}</p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">No case linked to this alert</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity History */}
      <div className="mt-6">
        <EntityHistoryCard entityType="alert" entityId={alert.id} />
      </div>

      {/* Raw Alert Drawer */}
      <RawAlertDrawer
        open={rawAlertDrawerOpen}
        onOpenChange={setRawAlertDrawerOpen}
        alert={alert}
        onAuditLog={handleRawPayloadAuditLog}
      />

      {/* Customer 360 Drawer */}
      <Customer360Drawer
        open={customer360Open}
        onOpenChange={setCustomer360Open}
        customerId={alert.customerId}
        alert={alert}
      />
    </AppLayout>
  );
}
