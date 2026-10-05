import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Inbox, Loader2, Users2, UserPlus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { useAuth } from '@/contexts/AuthContext';
import { canAssignAlerts } from '@/lib/permissions';
import { useUnassignedQueue, useWorkload, useBulkAssign, useAlertAssignees } from '@/hooks/useAlerts';
import { formatINRFull } from '@/lib/formatters';
import { format } from 'date-fns';

const PRIORITIES = ['all', 'HIGH', 'MEDIUM', 'LOW'];

export default function TriageQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignee, setAssignee] = useState<string>('');

  const queueParams = priorityFilter === 'all' ? {} : { priority_level: priorityFilter };
  const { data: queue = [], isLoading, error } = useUnassignedQueue(queueParams);
  const { data: workload = [] } = useWorkload();
  const { data: users = [] } = useAlertAssignees();
  const bulkAssign = useBulkAssign();

  // Candidate assignees: active users who work alerts.
  const assignableUsers = useMemo(
    () =>
      (users || []).filter(
        (u: any) =>
          u.status === 'active' &&
          (u.roles || [u.role]).some((r: string) =>
            ['analyst', 'investigator'].includes(r)
          )
      ),
    [users]
  );

  // Only super_admin, triage_manager, investigator can assign. (Guard after hooks.)
  if (!canAssignAlerts(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const allSelected = queue.length > 0 && selected.size === queue.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(queue.map((a: any) => a.alert_id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulkAssign = () => {
    if (!assignee || selected.size === 0) return;
    bulkAssign.mutate(
      { alertIds: Array.from(selected), userId: Number(assignee) },
      {
        onSuccess: () => {
          setSelected(new Set());
          setAssignee('');
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            Triage Queue
          </h1>
          <p className="text-muted-foreground">
            Assign unassigned alerts to analysts and monitor workload distribution
          </p>
        </div>

        {/* Workload overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" />
              Analyst Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workload.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active assignments.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workload.map((w: any) => (
                  <div key={w.user_id} className="rounded-lg border border-border p-3">
                    <div className="font-medium text-sm">{w.full_name || w.username}</div>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>Assigned: <span className="text-foreground font-semibold">{w.assigned_count}</span></span>
                      <span>In review: <span className="text-foreground font-semibold">{w.in_review_count}</span></span>
                      <span>Total: <span className="text-foreground font-semibold">{w.total_active}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk-assign toolbar + filter */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setSelected(new Set()); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{p === 'all' ? 'All Priorities' : p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selected` : 'Select alerts to assign'}
            </span>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Assign to analyst…" />
              </SelectTrigger>
              <SelectContent>
                {assignableUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({(u.roles || [u.role])[0]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBulkAssign}
              disabled={!assignee || selected.size === 0 || bulkAssign.isPending}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Assign{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </div>
        </div>

        {/* Unassigned queue */}
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground animate-pulse">Loading unassigned alerts…</p>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-destructive">
                    Failed to load the unassigned queue.
                  </TableCell>
                </TableRow>
              ) : queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No unassigned alerts. 🎉
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((a: any) => (
                  <TableRow key={a.alert_id} className="cursor-pointer" data-state={selected.has(a.alert_id) ? 'selected' : undefined}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(a.alert_id)}
                        onCheckedChange={() => toggleOne(a.alert_id)}
                        aria-label={`Select ${a.alert_id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs" onClick={() => navigate(`/alerts/${a.alert_id}`)}>
                      {a.alert_id}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/alerts/${a.alert_id}`)}>
                      <RiskBadge level={a.priority_level?.toLowerCase()} size="sm" />
                    </TableCell>
                    <TableCell className="font-mono" onClick={() => navigate(`/alerts/${a.alert_id}`)}>
                      {Math.round(a.priority_score ?? 0)}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/alerts/${a.alert_id}`)}>{a.customer_name || '—'}</TableCell>
                    <TableCell onClick={() => navigate(`/alerts/${a.alert_id}`)}>
                      {a.amount ? formatINRFull(a.amount) : '—'}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/alerts/${a.alert_id}`)}>
                      <Badge variant="outline" className="text-xs">{a.alert_type || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" onClick={() => navigate(`/alerts/${a.alert_id}`)}>
                      {a.alert_date ? format(new Date(a.alert_date), 'MMM dd, yyyy') : '—'}
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
