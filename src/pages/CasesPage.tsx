import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileCheck, Search, SortAsc, SortDesc, Loader2, AlertCircle } from 'lucide-react';
import { useCases } from '@/hooks/useCases';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { STRStatusBadge } from '@/components/str/STRStatusBadge';
import { SLATimer } from '@/components/shared/SLATimer';
import { Case } from '@/types';
import { formatINRFull } from '@/lib/formatters';
import { isCaseClosed } from '@/lib/caseStatus';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type SortField = 'createdAt' | 'strStatus' | 'slaDeadline';
type SortDirection = 'asc' | 'desc';

// APPROVED = approved by the Principal Officer and ready to file with FIU-IND.
const strStatusOrder: Record<string, number> = {
  APPROVED: 0,
  PENDING_APPROVAL: 1,
  DRAFT: 2,
  REJECTED: 3,
  none: 4,
  SUBMITTED: 5,
};

const strKey = (c: Case) => c.strStatus || 'none';

export default function CasesPage() {
  const navigate = useNavigate();
  // Filtering/sorting is client-side, so fetch the full set rather than the API's default page of 50.
  const { data: casesData, isLoading, error } = useCases({ limit: 500 });
  const cases = useMemo(() => casesData || [], [casesData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [strStatusFilter, setStrStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSTRReadyFirst, setShowSTRReadyFirst] = useState(false);

  const filteredAndSortedCases = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = cases.filter((caseItem) => {
      const matchesSearch =
        caseItem.id.toLowerCase().includes(q) ||
        (caseItem.caseNumber || '').toLowerCase().includes(q) ||
        caseItem.customerName.toLowerCase().includes(q) ||
        (caseItem.alertId || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
      const matchesSTRStatus = strStatusFilter === 'all' || strKey(caseItem) === strStatusFilter;
      return matchesSearch && matchesStatus && matchesSTRStatus;
    });

    result.sort((a, b) => {
      if (showSTRReadyFirst) {
        if (a.strStatus === 'APPROVED' && b.strStatus !== 'APPROVED') return -1;
        if (a.strStatus !== 'APPROVED' && b.strStatus === 'APPROVED') return 1;
      }

      let comparison = 0;
      if (sortField === 'strStatus') {
        comparison = strStatusOrder[strKey(a)] - strStatusOrder[strKey(b)];
      } else if (sortField === 'createdAt') {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortField === 'slaDeadline') {
        comparison = a.slaDeadline.getTime() - b.slaDeadline.getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [cases, searchQuery, statusFilter, strStatusFilter, sortField, sortDirection, showSTRReadyFirst]);

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const strReadyCount = cases.filter((c) => c.strStatus === 'APPROVED').length;
  const draftCount = cases.filter((c) => c.strStatus === 'DRAFT').length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Case Management</h1>
            <p className="text-muted-foreground">
              Track and manage investigation cases with STR status visibility
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="badge-status-pending">
              {cases.filter((c) => c.status === 'open').length} Open
            </Badge>
            <Badge variant="outline" className="badge-status-in-progress">
              {cases.filter((c) => c.status === 'in_progress').length} In Progress
            </Badge>
            <Badge variant="outline" className="badge-status-pending">
              {cases.filter((c) => c.status === 'under_review').length} STR Under Review
            </Badge>
            {strReadyCount > 0 && (
              <Badge
                variant="outline"
                className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-400 font-semibold"
              >
                <FileCheck className="h-3 w-3 mr-1" />
                {strReadyCount} STR Ready to File
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={strStatusFilter === 'APPROVED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStrStatusFilter(strStatusFilter === 'APPROVED' ? 'all' : 'APPROVED')}
            className={cn(
              strStatusFilter === 'APPROVED'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950'
            )}
          >
            <FileCheck className="h-4 w-4 mr-1.5" />
            STR Ready to File ({strReadyCount})
          </Button>
          <Button
            variant={strStatusFilter === 'DRAFT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStrStatusFilter(strStatusFilter === 'DRAFT' ? 'all' : 'DRAFT')}
            className={cn(strStatusFilter === 'DRAFT' && 'bg-amber-600 hover:bg-amber-700')}
          >
            STR Draft In Progress ({draftCount})
          </Button>
          <Button
            variant={showSTRReadyFirst ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowSTRReadyFirst(!showSTRReadyFirst)}
          >
            {showSTRReadyFirst ? <SortDesc className="h-4 w-4 mr-1.5" /> : <SortAsc className="h-4 w-4 mr-1.5" />}
            Show STR Ready First
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search case no., customer or alert..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Case Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Case Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="str_draft">STR Draft</SelectItem>
              <SelectItem value="under_review">STR Under Review</SelectItem>
              <SelectItem value="closed">Closed – True Positive</SelectItem>
              <SelectItem value="closed_false_positive">Closed – False Positive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={strStatusFilter} onValueChange={setStrStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="STR Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All STR Status</SelectItem>
              <SelectItem value="none">No STR</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
              <SelectItem value="APPROVED">Approved (Ready to File)</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortField}-${sortDirection}`} onValueChange={(v) => {
            const [field, dir] = v.split('-') as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(dir);
          }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="strStatus-asc">STR Status (Ready First)</SelectItem>
              <SelectItem value="strStatus-desc">STR Status (Submitted First)</SelectItem>
              <SelectItem value="slaDeadline-asc">SLA (Urgent First)</SelectItem>
              <SelectItem value="slaDeadline-desc">SLA (Most Time First)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cases Table */}
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Case</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Linked Alerts</TableHead>
                <TableHead>Investigator</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Case Status</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => toggleSort('strStatus')}
                  >
                    STR Status
                    {sortField === 'strStatus' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading cases...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-destructive">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8" />
                      <span>Failed to load cases. Please check your connection.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                    No cases match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedCases.map((caseItem) => (
                  <TableRow
                    key={caseItem.id}
                    className={cn(
                      'table-row-interactive',
                      caseItem.strStatus === 'APPROVED' && 'bg-emerald-500/5 hover:bg-emerald-500/10'
                    )}
                    onClick={() => handleViewCase(caseItem.id)}
                  >
                    <TableCell>
                      <p className="font-mono text-sm font-medium">{caseItem.caseNumber || caseItem.id}</p>
                      {caseItem.alertId && (
                        <p className="font-mono text-xs text-muted-foreground">{caseItem.alertId}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{caseItem.customerName}</p>
                        <p className="text-xs text-muted-foreground">{caseItem.customerId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {caseItem.alertsCount ?? 0} alert{caseItem.alertsCount !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>{caseItem.investigatorName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatINRFull(caseItem.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={caseItem.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      {caseItem.strStatus ? (
                        <STRStatusBadge status={caseItem.strStatus} />
                      ) : (
                        <span className="text-xs text-muted-foreground">No STR</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isCaseClosed(caseItem.status) ? (
                        <span className="text-xs text-muted-foreground">
                          {caseItem.closedAt ? `Closed ${format(caseItem.closedAt, 'MMM dd, yyyy')}` : 'Closed'}
                        </span>
                      ) : (
                        <SLATimer deadline={caseItem.slaDeadline} />
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewCase(caseItem.id)}
                          title="View case"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
