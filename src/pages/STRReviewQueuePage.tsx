import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FileText, Loader2, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { STRStatusBadge } from '@/components/str/STRStatusBadge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { useAuth } from '@/contexts/AuthContext';
import { canReadStr, canApproveStr } from '@/lib/permissions';
import { useStrList, usePendingStrs } from '@/hooks/useSTR';
import { STR } from '@/services/str.service';
import { format } from 'date-fns';

const STATUSES = ['all', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUBMITTED'];

function StrTable({ rows, isLoading, emptyText, onOpen }: {
  rows: STR[]; isLoading: boolean; emptyText: string; onOpen: (s: STR) => void;
}) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>STR</TableHead>
            <TableHead>Case</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Drafted By</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">STR #{s.id} · v{s.version}</TableCell>
                <TableCell className="font-mono text-xs">{s.caseNumber || `#${s.caseId}`}</TableCell>
                <TableCell><STRStatusBadge status={s.status} /></TableCell>
                <TableCell>
                  {s.priorityLevel ? <RiskBadge level={s.priorityLevel.toLowerCase()} size="sm" /> : '—'}
                </TableCell>
                <TableCell className="text-sm">{s.createdByUsername || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.updatedAt ? format(new Date(s.updatedAt), 'MMM dd, yyyy') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onOpen(s)}>Open case</Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function STRReviewQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  const listParams = statusFilter === 'all' ? {} : { status: statusFilter };
  const { data: strs = [], isLoading } = useStrList(listParams);
  const canApprove = canApproveStr(user);
  const { data: pending = [], isLoading: pendingLoading } = usePendingStrs();

  if (!canReadStr(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const openCase = (s: STR) => navigate(`/cases/${s.caseId}`);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Suspicious Transaction Reports
          </h1>
          <p className="text-muted-foreground">
            Review, approve, and file STRs with the regulator
          </p>
        </div>

        {/* Principal Officer: pending approvals */}
        {canApprove && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-status-in-progress" />
                Pending My Approval
                {pending.length > 0 && (
                  <Badge className="bg-status-in-progress/20 text-status-in-progress">{pending.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StrTable
                rows={pending}
                isLoading={pendingLoading}
                emptyText="Nothing awaiting your approval."
                onOpen={openCase}
              />
            </CardContent>
          </Card>
        )}

        {/* All STRs */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">All STRs</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <StrTable
          rows={strs}
          isLoading={isLoading}
          emptyText="No STRs found."
          onOpen={openCase}
        />
      </div>
    </AppLayout>
  );
}
