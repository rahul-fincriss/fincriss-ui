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
import { STRDraftTab } from '@/components/str/STRDraftTab';
import { EntityHistoryCard } from '@/components/shared/EntityHistoryCard';
import { 
  getExtendedCustomerProfile, 
  getTransactionsByCustomerId,
  mockExtendedCustomerProfiles
} from '@/data/mockData';
import { formatINRFull } from '@/lib/formatters';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useCase, useUpdateCase, useCloseCase } from '@/hooks/useCases';
import { Loader2, AlertCircle } from 'lucide-react';

export default function CaseWorkspacePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState('');

  // Real API data
  const { data: caseData, isLoading, error } = useCase(caseId || '');
  const updateCaseMutation = useUpdateCase();
  const closeCaseMutation = useCloseCase();

  const handleAddNote = () => {
    if (!newNote.trim() || !caseId) return;
    
    // In a real app we'd call an API to add a note
    toast.success('Note added successfully');
    setNewNote('');
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

  const handleSubmitSTRToPO = () => {
    toast.success('STR submitted to Principal Officer for review');
    navigate('/cases');
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

  // Look up customer and transactions (keeping mock for now)
  const customerProfile = getExtendedCustomerProfile(caseData.customerId) || mockExtendedCustomerProfiles[0];
  const transactions = getTransactionsByCustomerId(caseData.customerId);
  const customer = customerProfile.kyc;

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
                <CardDescription>All transactions linked to this case</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions found for this customer</p>
                  ) : (
                    transactions.map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`rounded-full p-2 ${txn.type === 'credit' ? 'bg-risk-low/20' : 'bg-risk-high/20'}`}>
                            <AlertTriangle className={`h-4 w-4 ${txn.type === 'credit' ? 'text-risk-low' : 'text-risk-high'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{txn.counterparty}</p>
                            <p className="text-sm text-muted-foreground">{txn.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{txn.channel}</Badge>
                              <Badge variant="outline" className="text-xs">{txn.country}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono text-lg font-bold ${txn.type === 'credit' ? 'text-risk-low' : 'text-risk-high'}`}>
                            {txn.type === 'credit' ? '+' : '-'}{formatINRFull(txn.amount)}
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
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
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
                <CardDescription>AI-generated analysis and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dynamic findings based on case */}
                {caseData.id === 'CASE-PONZI-2025-001' ? (
                  <>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">Investment Fraud / Ponzi Scheme Typology Match</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Account exhibits classic Ponzi scheme pattern: High-value inflows from 12 unrelated "investors" 
                        totaling ₹1.5 Crore with memos like "Fund Commitment" and "Seed Capital". Rapid layering via 
                        internal transfer to related party LLP (R.K. Health Investment LLP) within 72 hours. Cyclical 
                        "Quarterly Profit Share" payouts to original investors on 45-day cycles.
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">High-Value Unrelated Investor Inflows</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Dr. Ravi Gopal Kumar, a cardiologist with declared monthly income of ₹4,00,000, received 
                        ₹1.5 Crore from 12 unrelated third-party individuals via RTGS/NEFT over 23 days. Transaction 
                        memos reference investment terminology ("Seed Capital", "Fund Commitment") inconsistent with 
                        medical practice operations.
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">Rapid Layering via Related LLP Account</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₹1.5 Crore transferred from personal savings to R.K. Health Investment LLP (related party entity) 
                        within 72 hours of final investor deposit. LLP is controlled by Dr. Kumar as sole authorized 
                        signatory. Declared LLP business activity ("Consulting") inconsistent with investment fund collection.
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">Cyclical Payouts Labeled "Profit Distribution"</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "Quarterly Profit Share" payments totaling ₹1.2 Crore+ disbursed to original investors on 
                        approximately 45-day cycles. Payout schedule does not align with any legitimate investment 
                        instrument. Pattern indicates returns funded from subsequent investor inflows (classic pyramid structure).
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-medium">Medium Confidence</Badge>
                        <span className="text-sm font-medium">Integration via ₹50L Personal Real Estate Purchase</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₹50,00,000 transferred to Goa Seaside Properties Pvt Ltd for "Commercial Real Estate Purchase" 
                        (luxury villa in Goa). Payment sourced from business LLP account - personal asset acquisition 
                        funded via investor capital indicates integration phase of proceeds.
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Advisory</Badge>
                        <span className="text-sm font-medium">No SEBI Registration Indication</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No evidence of SEBI registration found for any collective investment scheme operated by 
                        Dr. Ravi Gopal Kumar or R.K. Health Investment LLP. Operating an unregistered CIS is a violation 
                        under SEBI Act, 1992. Consider referral to SEBI and Enforcement Directorate.
                      </p>
                    </div>
                  </>
                ) : caseData.id === 'CASE-MM-2026-001' ? (
                  <>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">Money Mule / Funnel Account Typology Match</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Account exhibits classic funnel pattern: Multiple unrelated domestic inflows from 8 geographically 
                        dispersed sources (Delhi, Jaipur, Mumbai, Kolkata, Hyderabad, Chennai, Ahmedabad, Indore) rapidly 
                        aggregated, followed by single large international outflow to high-risk jurisdiction (Cyprus).
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">Severe Profile Mismatch</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Account holder is a homemaker with zero declared income and expected turnover of ₹0-₹50,000. 
                        Actual inflows of ₹12,00,000 over 10 days represent a deviation exceeding 24,000% from declared profile.
                        No commercial rationale exists for "Consulting Fee" payment to Cyprus entity.
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">Rapid Transfer to High-Risk Jurisdiction</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₹10,00,000 transferred to Eurolink Consulting Ltd (Cyprus) within 48 hours of final domestic deposit.
                        Cyprus is classified as a high-risk jurisdiction for money laundering under FATF assessment.
                        Timing pattern consistent with layering phase of ML typology.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-high">High Confidence</Badge>
                        <span className="text-sm font-medium">Trade-Based Money Laundering Pattern</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Analysis indicates systematic over-invoicing of goods through shell companies 
                        in high-risk jurisdictions. Transaction velocity and amounts are inconsistent 
                        with declared business operations.
                      </p>
                    </div>
                    <div className="ai-generated rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="badge-risk-medium">Medium Confidence</Badge>
                        <span className="text-sm font-medium">Layering Through Multiple Accounts</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Funds appear to be moved rapidly through multiple intermediary accounts 
                        before settling in offshore entities. Pattern consistent with layering phase.
                      </p>
                    </div>
                  </>
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
                  <Button onClick={handleAddNote}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Note
                  </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* STR Draft Tab */}
          <TabsContent value="str-draft">
            <STRDraftTab 
              caseData={caseData} 
              onSubmitToPO={handleSubmitSTRToPO}
            />
          </TabsContent>
        </Tabs>

        {/* Activity History */}
        <EntityHistoryCard entityType="case" entityId={caseData.id} />
      </div>
    </AppLayout>
  );
}